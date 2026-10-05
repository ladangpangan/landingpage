// Pesanan (koleksi orders). Pesanan SELALU disimpan sebelum pembayaran dibuat,
// dan status hanya boleh maju sesuai lib/order-status.js.
import { getDb } from '@/lib/mongo'
import { ensureSchema } from '@/lib/schema'
import { canTransition, normalizeStatus, targetStatusFromMidtrans } from '@/lib/order-status'
import { amountMatches } from '@/lib/midtrans-signature'

async function col() {
  const db = getDb()
  if (!db) throw new Error('Database belum tersambung (MONGO_URL).')
  await ensureSchema()
  return db.collection('orders')
}

export async function createOrder({ orderId, items, customer, shipping, grossAmount }) {
  const c = await col()
  const now = new Date().toISOString()
  await c.insertOne({
    orderId,
    items,
    customer,
    shipping: shipping || { method: 'internal', note: '' },
    grossAmount,
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
  return res.modifiedCount ? { ok: true, from } : { ok: false, reason: 'conflict' }
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

export async function listOrders({ limit = 100 } = {}) {
  try {
    const c = await col()
    const docs = await c.find({}).sort({ createdAt: -1 }).limit(limit).toArray()
    return docs.map((d) => ({
      orderId: d.orderId,
      items: d.items || [],
      customer: d.customer || {},
      shipping: d.shipping || { method: 'internal', note: '' },
      grossAmount: d.grossAmount || 0,
      status: normalizeStatus(d.status),
      needsReview: !!d.needsReview,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  } catch (e) {
    console.error('[orders] gagal membaca daftar order:', e?.message || e)
    return []
  }
}
