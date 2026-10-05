// Pesanan (koleksi orders). Pesanan SELALU disimpan sebelum pembayaran dibuat,
// dan status hanya boleh maju sesuai lib/order-status.js.
import { getDb } from '@/lib/mongo'
import { ensureSchema } from '@/lib/schema'
import { canTransition, normalizeStatus, targetStatusFromMidtrans, adminCanSet, ORDER_STATUSES } from '@/lib/order-status'
import { amountMatches } from '@/lib/midtrans-signature'
import { releaseStock } from '@/lib/stock'
import { releaseSlot } from '@/lib/delivery'
import { releaseVoucher } from '@/lib/vouchers'

async function col() {
  const db = getDb()
  if (!db) throw new Error('Database belum tersambung (MONGO_URL).')
  await ensureSchema()
  return db.collection('orders')
}

// extra: { weightKg, pricing, delivery, location, slotReservation, voucherCode } (lihat app/api/checkout)
export async function createOrder({ orderId, items, customer, shipping, grossAmount, stockReservation = [], extra = {} }) {
  const c = await col()
  const now = new Date().toISOString()
  await c.insertOne({
    orderId,
    items,
    customer,
    shipping: shipping || { method: 'internal', note: '' },
    grossAmount,
    stockReservation,
    stockReleased: false,
    weightKg: extra.weightKg ?? null,
    pricing: extra.pricing ?? null,
    delivery: extra.delivery ?? null,
    location: extra.location ?? null,
    slotReservation: extra.slotReservation ?? null,
    voucherReserved: extra.voucherCode ?? null,
    status: 'menunggu_bayar',
    statusHistory: [{ status: 'menunggu_bayar', at: now, by: 'sistem' }],
    payment: { status: null, type: null, updatedAt: null },
    needsReview: false,
    createdAt: now,
    updatedAt: now,
  })
}

export async function getOrder(orderId) {
  const c = await col()
  return c.findOne({ orderId })
}

export async function attachSnapToken(orderId, token) {
  const c = await col()
  await c.updateOne({ orderId }, { $set: { snapToken: token } })
}

// Pindahkan status satu langkah. Aman dari balapan: update hanya berhasil bila
// status di database masih sama dengan yang dibaca.
export async function transitionOrder(orderId, to, by = 'sistem') {
  const c = await col()
  const order = await c.findOne({ orderId })
  if (!order) return { ok: false, reason: 'not_found' }
  const from = normalizeStatus(order.status)
  if (from === to) return { ok: true, unchanged: true }
  if (!canTransition(from, to)) return { ok: false, reason: 'invalid_transition', from }
  const at = new Date().toISOString()
  const res = await c.updateOne(
    { orderId, status: order.status },
    { $set: { status: to, updatedAt: at }, $push: { statusHistory: { status: to, at, by } } }
  )
  if (!res.modifiedCount) return { ok: false, reason: 'conflict' }
  // Pesanan batal/gagal/kedaluwarsa: kembalikan stok yang tadi ditahan (sekali saja).
  if (['batal', 'gagal', 'kedaluwarsa'].includes(to)) await releaseOrderStock(orderId)
  return { ok: true, from }
}

async function releaseOrderStock(orderId) {
  try {
    const c = await col()
    const claimed = await c.updateOne({ orderId, stockReleased: { $ne: true } }, { $set: { stockReleased: true } })
    if (!claimed.modifiedCount) return
    const order = await c.findOne({ orderId })
    // Stok, kapasitas slot kirim, dan kuota voucher dikembalikan bersama (masing-masing
    // dijaga supaya satu gagal tidak menghalangi yang lain).
    for (const [nama, kerja] of [
      ['stok', () => releaseStock(order?.stockReservation || [])],
      ['slot kirim', () => releaseSlot(order?.slotReservation)],
      ['voucher', () => releaseVoucher(order?.voucherReserved)],
    ]) {
      try {
        await kerja()
      } catch (e) {
        console.error(`[orders] gagal mengembalikan ${nama}:`, e?.message || e)
      }
    }
  } catch (e) {
    console.error('[orders] gagal mengembalikan sumber daya pesanan:', e?.message || e)
  }
}

// Dipakai bila Midtrans gagal membuat transaksi: pesanan ditandai gagal.
export async function failOrderBeforePayment(orderId) {
  try {
    await transitionOrder(orderId, 'gagal', 'sistem')
  } catch (e) {
    console.error('[orders] gagal menandai pesanan gagal:', e?.message || e)
  }
}

// Menerapkan notifikasi Midtrans (signature sudah diverifikasi pemanggil).
// Mengembalikan { ok, reason? }.
export async function applyPaymentNotification(notification) {
  const { order_id, transaction_status, fraud_status, gross_amount, payment_type } = notification
  const c = await col()
  const order = await c.findOne({ orderId: order_id })
  if (!order) return { ok: false, reason: 'not_found' }

  if (!amountMatches(gross_amount, order.grossAmount)) {
    await c.updateOne({ orderId: order_id }, { $set: { needsReview: true, updatedAt: new Date().toISOString() } })
    return { ok: false, reason: 'amount_mismatch' }
  }

  const now = new Date().toISOString()
  await c.updateOne(
    { orderId: order_id },
    {
      $set: {
        payment: {
          status: transaction_status || null,
          fraud: fraud_status || null,
          type: payment_type || null,
          updatedAt: now,
        },
        updatedAt: now,
      },
    }
  )

  const target = targetStatusFromMidtrans(transaction_status, fraud_status)
  if (!target) return { ok: true, changed: false }

  const result = await transitionOrder(order_id, target, 'midtrans')
  if (result.ok) return { ok: true, changed: !result.unchanged }

  // Uang masuk tetapi pesanan sudah tidak bisa dibayar (batal/kedaluwarsa/gagal):
  // jangan mundurkan status, tandai agar dicek pemilik.
  if (target === 'dibayar' && result.reason === 'invalid_transition') {
    const current = normalizeStatus(order.status)
    if (['batal', 'gagal', 'kedaluwarsa'].includes(current)) {
      await c.updateOne({ orderId: order_id }, { $set: { needsReview: true } })
    }
  }
  return { ok: true, changed: false }
}

function publicOrder(d) {
  return {
    orderId: d.orderId,
    items: d.items || [],
    customer: d.customer || {},
    shipping: d.shipping || { method: 'internal', note: '' },
    grossAmount: d.grossAmount || 0,
    weightKg: d.weightKg ?? null,
    pricing: d.pricing ?? null,
    delivery: d.delivery ?? null,
    location: d.location ?? null,
    status: normalizeStatus(d.status),
    needsReview: !!d.needsReview,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

// filter: { status?, q? } (q = nomor pesanan / nama / nomor WA)
export async function listOrders({ limit = 100, status, q } = {}) {
  try {
    const c = await col()
    const query = {}
    if (status) query.status = status
    const docs = await c.find(query).sort({ createdAt: -1 }).limit(q ? 500 : limit).toArray()
    let list = docs.map(publicOrder)
    const needle = String(q || '').trim().toLowerCase()
    if (needle) {
      const digits = needle.replace(/\D/g, '')
      list = list
        .filter(
          (o) =>
            o.orderId.toLowerCase().includes(needle) ||
            (o.customer.name || '').toLowerCase().includes(needle) ||
            (digits && (o.customer.phone || '').replace(/\D/g, '').includes(digits))
        )
        .slice(0, limit)
    }
    return list
  } catch (e) {
    console.error('[orders] gagal membaca daftar order:', e?.message || e)
    return []
  }
}

export async function getOrdersByIds(ids) {
  const c = await col()
  const docs = await c.find({ orderId: { $in: ids } }).toArray()
  const map = new Map(docs.map((d) => [d.orderId, publicOrder(d)]))
  return ids.map((id) => map.get(id)).filter(Boolean)
}

// Admin mengubah status: hanya maju satu langkah (atau batalkan pesanan belum bayar).
export async function adminSetStatus(orderId, to, adminLabel) {
  const c = await col()
  const order = await c.findOne({ orderId })
  if (!order) return { ok: false, status: 404, error: 'Pesanan tidak ditemukan.' }
  const from = normalizeStatus(order.status)
  if (!adminCanSet(from, to)) {
    return { ok: false, status: 409, error: 'Status itu tidak bisa dipilih dari status sekarang.' }
  }
  const r = await transitionOrder(orderId, to, adminLabel || 'admin')
  if (!r.ok) return { ok: false, status: 409, error: 'Status pesanan baru saja berubah. Muat ulang halaman.' }
  return { ok: true, status: to }
}

// Ringkasan untuk halaman "Hari ini".
export async function todaySummary(today) {
  const c = await col()
  const [byStatus, needsReview, newest, deliveries] = await Promise.all([
    Promise.all(ORDER_STATUSES.map(async (st) => ({ _id: st, n: await c.countDocuments({ status: st }) }))),
    c.countDocuments({ needsReview: true }),
    c.find({ status: 'dibayar' }).sort({ updatedAt: -1 }).limit(1).toArray(),
    c.find({ status: { $in: ['dibayar', 'dikemas', 'dikirim'] }, 'delivery.date': today }).toArray(),
  ])
  const counts = {}
  for (const row of byStatus) counts[normalizeStatus(row._id)] = (counts[normalizeStatus(row._id)] || 0) + row.n
  return {
    counts,
    needsReview,
    latestPaidAt: newest[0]?.updatedAt || null,
    deliveriesToday: deliveries.length,
    kgToday: Math.round(deliveries.reduce((a, d) => a + (d.weightKg || 0), 0) * 10) / 10,
  }
}

// Pesanan siap kirim pada satu tanggal, dikelompokkan per slot.
export async function deliveryList(date) {
  const c = await col()
  const docs = await c
    .find({ status: { $in: ['dibayar', 'dikemas', 'dikirim', 'diterima'] }, 'delivery.date': date })
    .sort({ createdAt: 1 })
    .toArray()
  return docs.map(publicOrder)
}
