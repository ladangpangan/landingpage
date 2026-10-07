// Pesanan (koleksi orders). Pesanan SELALU disimpan sebelum pembayaran dibuat,
// dan status hanya boleh maju sesuai lib/order-status.js.
import { getDb } from '@/lib/mongo'
import { ensureSchema } from '@/lib/schema'
import { canTransition, normalizeStatus, targetStatusFromMidtrans, adminCanSet, ORDER_STATUSES } from '@/lib/order-status'
import { amountMatches } from '@/lib/midtrans-signature'
import { isPaidEvent, isExpiredOrFailedEvent } from '@/lib/mayar'
import { isPaidNotify, isExpiredNotify } from '@/lib/ipaymu'
import { buildTimeline, orderSignature, latestMessage } from '@/lib/order-timeline'
import { orderStatusFor, courierProblem, canBookCourier } from '@/lib/biteship'
import { customerCanCancel } from '@/lib/order-access'
import { releaseStock } from '@/lib/stock'
import { releaseSlot } from '@/lib/delivery'
import { releaseVoucher } from '@/lib/vouchers'
import { applyReferralStatus } from '@/lib/referrals'

async function col() {
  const db = getDb()
  if (!db) throw new Error('Database belum tersambung (MONGO_URL).')
  await ensureSchema()
  return db.collection('orders')
}

// extra: { weightKg, pricing, delivery, location, slotReservation, voucherCode, customerId, gateway } (lihat app/api/checkout)
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
    customerId: extra.customerId ?? null,
    ...(extra.referral ? { referral: extra.referral } : {}),
    payGateway: extra.gateway ?? 'midtrans',
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
  if (order.referral) await applyReferralStatus(orderId, to).catch((e) => console.error('[orders] gagal memperbarui komisi referral:', e?.message || e))
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
    courier: d.courier ? { biteshipId: d.courier.biteshipId || '', status: d.courier.status || '', trackingId: d.courier.trackingId || '', waybillId: d.courier.waybillId || '', link: d.courier.link || '', price: d.courier.price ?? null, driverName: d.courier.driverName || '', driverPhone: d.courier.driverPhone || '', bookedAt: d.courier.bookedAt || null } : null,
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
    c.find({ status: { $in: ['dibayar', 'dikemas', 'dikirim'] }, 'delivery.date': today, 'delivery.mode': { $ne: 'biteship' } }).toArray(),
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
    .find({ status: { $in: ['dibayar', 'dikemas', 'dikirim', 'diterima'] }, 'delivery.date': date, 'delivery.mode': { $ne: 'biteship' } })
    .sort({ createdAt: 1 })
    .toArray()
  return docs.map(publicOrder)
}

// --- Untuk pembeli (tanpa login) -------------------------------------------------

// Hanya yang boleh dilihat pembeli; tidak membawa catatan internal.
export function buyerView(d) {
  const status = normalizeStatus(d.status)
  return {
    orderId: d.orderId,
    status,
    items: (d.items || []).map((i) => ({ kind: i.kind, id: i.id, name: i.name, image: i.image, price: i.price, qty: i.qty })),
    customer: { name: d.customer?.name || '', phone: d.customer?.phone || '', address: d.customer?.address || '', note: d.customer?.note || '' },
    pricing: d.pricing ?? null,
    grossAmount: d.grossAmount || 0,
    delivery: d.delivery ?? null,
    shipping: d.shipping ? { method: d.shipping.method, courier: d.shipping.courier ? { name: d.shipping.courier.name, serviceName: d.shipping.courier.serviceName } : null } : null,
    courierTrack: d.courier?.biteshipId ? { status: d.courier.status || '', link: d.courier.link || '', driverName: d.courier.driverName || '', driverPhone: d.courier.driverPhone || '', waybillId: d.courier.waybillId || '' } : null,
    zoneName: d.location?.zoneName || null,
    history: (d.statusHistory || []).map((h) => ({ status: normalizeStatus(h.status), at: h.at })),
    timeline: buildTimeline({ history: (d.statusHistory || []).map((h) => ({ status: normalizeStatus(h.status), at: h.at })), courierEvents: d.courier?.events || [] }),
    signature: orderSignature(status, d.courier?.status),
    snapToken: status === 'menunggu_bayar' ? d.snapToken || null : null,
    gateway: d.payGateway || 'midtrans',
    payUrl: status === 'menunggu_bayar' && ['mayar', 'ipaymu'].includes(d.payGateway) ? d.payment?.payUrl || null : null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export async function getBuyerOrder(orderId) {
  const order = await getOrder(orderId)
  return order ? buyerView(order) : null
}

// Pembeli membatalkan pesanan yang belum dibayar. Transaksi Midtrans dibatalkan
// dulu (upaya terbaik); bila pembeli ternyata sudah membayar, status berubah lewat
// notifikasi dan pembatalan ditolak.
export async function buyerCancelOrder(orderId, cancelRemote) {
  const order = await getOrder(orderId)
  if (!order) return { ok: false, status: 404, error: 'Pesanan tidak ditemukan.' }
  if (!customerCanCancel(normalizeStatus(order.status))) {
    return { ok: false, status: 409, error: 'Pesanan ini sudah tidak bisa dibatalkan. Hubungi kami via WhatsApp bila perlu.' }
  }
  if ((order.snapToken || order.payGateway === 'mayar') && cancelRemote) {
    try {
      await cancelRemote(orderId)
    } catch (e) {
      console.error('[orders] Midtrans tidak membatalkan transaksi (diabaikan):', e?.message || e)
    }
  }
  const r = await transitionOrder(orderId, 'batal', 'pembeli')
  if (!r.ok) return { ok: false, status: 409, error: 'Status pesanan baru saja berubah. Muat ulang halaman.' }
  return { ok: true }
}

// Riwayat belanja pembeli yang login (terbaru dulu).
export async function listCustomerOrders(customerId, limit = 50) {
  const c = await col()
  const docs = await c.find({ customerId }).sort({ createdAt: -1 }).limit(limit).toArray()
  return docs.map((d) => ({
    orderId: d.orderId,
    status: normalizeStatus(d.status),
    grossAmount: d.grossAmount || 0,
    createdAt: d.createdAt,
    itemsText: (d.items || []).map((i) => `${i.qty}x ${i.name}`).join(', '),
  }))
}

// --- Mayar ---------------------------------------------------------------------

export async function attachMayarInvoice(orderId, inv) {
  const c = await col()
  await c.updateOne(
    { orderId },
    { $set: { 'payment.gateway': 'mayar', 'payment.invoiceId': inv.id, 'payment.transactionId': inv.transactionId, 'payment.payUrl': inv.link } }
  )
}

export async function getMayarInvoiceId(orderId) {
  const o = await getOrder(orderId)
  return o?.payment?.invoiceId || ''
}

async function findMayarOrder(parsed) {
  const c = await col()
  if (parsed.ids.length) {
    const byId = await c.findOne({ $or: [{ 'payment.invoiceId': { $in: parsed.ids } }, { 'payment.transactionId': { $in: parsed.ids } }] })
    if (byId) return byId
  }
  return parsed.orderId ? c.findOne({ orderId: parsed.orderId, payGateway: 'mayar' }) : null
}

// Pemberitahuan Mayar (token sudah diperiksa pemanggil). { ok, reason? }
export async function applyMayarEvent(parsed) {
  const c = await col()
  const order = await findMayarOrder(parsed)
  if (!order) return { ok: false, reason: 'not_found' }
  const now = new Date().toISOString()

  if (isPaidEvent(parsed)) {
    if (parsed.amount !== null && !amountMatches(parsed.amount, order.grossAmount)) {
      await c.updateOne({ orderId: order.orderId }, { $set: { needsReview: true, updatedAt: now } })
      return { ok: false, reason: 'amount_mismatch' }
    }
    await c.updateOne({ orderId: order.orderId }, { $set: { 'payment.status': 'paid', 'payment.type': 'mayar', 'payment.updatedAt': now, updatedAt: now } })
    const r = await transitionOrder(order.orderId, 'dibayar', 'mayar')
    if (!r.ok && r.reason === 'invalid_transition') {
      // Uang masuk tetapi pesanan sudah batal/kedaluwarsa: jangan mundurkan status, minta dicek.
      if (['batal', 'gagal', 'kedaluwarsa'].includes(normalizeStatus(order.status))) {
        await c.updateOne({ orderId: order.orderId }, { $set: { needsReview: true } })
      }
    }
    return { ok: true, changed: !!r.ok && !r.unchanged }
  }
  if (isExpiredOrFailedEvent(parsed)) {
    await transitionOrder(order.orderId, 'kedaluwarsa', 'mayar')
    return { ok: true, changed: true }
  }
  return { ok: true, changed: false }
}

// --- iPaymu ----------------------------------------------------------------------

export async function attachIpaymuPayment(orderId, pay) {
  const c = await col()
  await c.updateOne(
    { orderId },
    { $set: { 'payment.gateway': 'ipaymu', 'payment.sessionId': pay.sessionId, 'payment.payUrl': pay.url } }
  )
}

// Pemberitahuan iPaymu (token sudah diperiksa pemanggil). Pesanan dicocokkan lewat reference_id (= nomor pesanan).
export async function applyIpaymuEvent(parsed) {
  const c = await col()
  let order = parsed.referenceId ? await c.findOne({ orderId: parsed.referenceId, payGateway: 'ipaymu' }) : null
  if (!order && parsed.sid) order = await c.findOne({ 'payment.sessionId': parsed.sid, payGateway: 'ipaymu' })
  if (!order) return { ok: false, reason: 'not_found' }
  const now = new Date().toISOString()

  if (isPaidNotify(parsed)) {
    if (parsed.amount !== null && !amountMatches(parsed.amount, order.grossAmount)) {
      await c.updateOne({ orderId: order.orderId }, { $set: { needsReview: true, updatedAt: now } })
      return { ok: false, reason: 'amount_mismatch' }
    }
    await c.updateOne(
      { orderId: order.orderId },
      { $set: { 'payment.status': 'paid', 'payment.type': 'ipaymu', 'payment.transactionId': parsed.trxId || null, 'payment.updatedAt': now, updatedAt: now } }
    )
    const r = await transitionOrder(order.orderId, 'dibayar', 'ipaymu')
    if (!r.ok && r.reason === 'invalid_transition') {
      if (['batal', 'gagal', 'kedaluwarsa'].includes(normalizeStatus(order.status))) {
        await c.updateOne({ orderId: order.orderId }, { $set: { needsReview: true } })
      }
    }
    return { ok: true, changed: !!r.ok && !r.unchanged }
  }
  if (isExpiredNotify(parsed)) {
    await transitionOrder(order.orderId, 'kedaluwarsa', 'ipaymu')
    return { ok: true, changed: true }
  }
  return { ok: true, changed: false }
}

// Mayar/iPaymu tidak mengirim kabar kedaluwarsa yang bisa kita andalkan, jadi pesanan Mayar yang
// belum dibayar lewat 65 menit dikedaluwarsakan sendiri (stok, slot, voucher kembali).
export async function expireStaleMayarOrders(minutes = 65) {
  const c = await col()
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString()
  const stale = await c.find({ status: 'menunggu_bayar', payGateway: { $in: ['mayar', 'ipaymu'] }, createdAt: { $lt: cutoff } }).limit(50).toArray()
  for (const o of stale) {
    try {
      await transitionOrder(o.orderId, 'kedaluwarsa', 'sistem')
    } catch (e) {
      console.error('[orders] gagal mengedaluwarsakan pesanan:', o.orderId, e?.message || e)
    }
  }
  return stale.length
}

// Catatan mentah pemberitahuan pembayaran (disimpan terbatas, untuk pemeriksaan Owner).
export async function logPaymentEvent(gateway, payload, outcome) {
  try {
    const db = getDb()
    const col2 = db.collection('payment_events')
    await col2.insertOne({ gateway, at: new Date().toISOString(), outcome, payload: JSON.stringify(payload).slice(0, 4000) })
    const old = await col2.find({}).sort({ at: -1 }).limit(100).toArray()
    if (old.length >= 100) await col2.deleteMany({ at: { $lt: old[old.length - 1].at } })
  } catch (e) {
    console.error('[orders] gagal mencatat pemberitahuan:', e?.message || e)
  }
}

export async function listPaymentEvents(limit = 10) {
  const db = getDb()
  if (!db) return []
  return db.collection('payment_events').find({}).sort({ at: -1 }).limit(limit).toArray()
}

// --- Kurir Biteship ---------------------------------------------------------------

// Mengunci pemesanan kurir supaya klik ganda tidak memesan dua kali. Mengembalikan pesanan atau { error }.
export async function claimCourierBooking(orderId) {
  const c = await col()
  const order = await c.findOne({ orderId })
  if (!order) return { error: 'Pesanan tidak ditemukan.', status: 404 }
  if (order.shipping?.method !== 'biteship') return { error: 'Pesanan ini tidak memakai kurir instan Biteship.', status: 409 }
  if (normalizeStatus(order.status) !== 'dikemas') return { error: 'Panggil kurir hanya bisa setelah pesanan berstatus Dikemas.', status: 409 }
  if (!canBookCourier(order.courier)) return { error: 'Kurir sudah dipanggil untuk pesanan ini.', status: 409 }
  const fresh = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const res = await c.updateOne(
    { orderId, $or: [{ 'courier.bookingLock': { $exists: false } }, { 'courier.bookingLock': { $lt: fresh } }] },
    { $set: { 'courier.bookingLock': new Date().toISOString() } }
  )
  if (!res.modifiedCount) return { error: 'Pemanggilan kurir sedang diproses. Tunggu sebentar.', status: 409 }
  return { order }
}

export async function releaseCourierLock(orderId) {
  const c = await col()
  await c.updateOne({ orderId }, { $unset: { 'courier.bookingLock': '' } })
}

export async function saveCourierBooking(orderId, b) {
  const c = await col()
  const now = new Date().toISOString()
  await c.updateOne(
    { orderId },
    {
      $set: {
        courier: { biteshipId: b.id, status: b.status || 'confirmed', trackingId: b.trackingId, waybillId: b.waybillId, link: b.link, price: b.price, driverName: b.driverName, driverPhone: b.driverPhone, bookedAt: now },
        updatedAt: now,
      },
    }
  )
}

async function advanceStatus(orderId, target, by) {
  const chain = ['dikemas', 'dikirim', 'diterima']
  for (let i = 0; i < 4; i++) {
    const cur = normalizeStatus((await getOrder(orderId))?.status)
    const idx = chain.indexOf(cur)
    const tIdx = chain.indexOf(target)
    if (idx < 0 || idx >= tIdx) return
    const r = await transitionOrder(orderId, chain[idx + 1], by)
    if (!r.ok) return
  }
}

// Kabar status dari Biteship (token sudah diperiksa pemanggil). { ok, reason? }
export async function applyBiteshipEvent(p) {
  const c = await col()
  const order =
    (p.biteshipId && (await c.findOne({ 'courier.biteshipId': p.biteshipId }))) ||
    (p.trackingId && (await c.findOne({ 'courier.trackingId': p.trackingId }))) ||
    (p.referenceId && (await c.findOne({ orderId: p.referenceId, 'shipping.method': 'biteship' }))) ||
    null
  if (!order) return { ok: false, reason: 'not_found' }
  const now = new Date().toISOString()
  const set = { updatedAt: now }
  if (p.status) set['courier.status'] = p.status
  for (const [k, v] of [['trackingId', p.trackingId], ['waybillId', p.waybillId], ['link', p.link], ['driverName', p.driverName], ['driverPhone', p.driverPhone]]) if (v) set[`courier.${k}`] = v
  if (courierProblem(p.status)) set.needsReview = true
  const update = { $set: set }
  // Catat kejadian kurir untuk riwayat pembeli (sekali per status, maks. 30 terakhir).
  const st = String(p.status || '').toLowerCase()
  if (st && st !== String(order.courier?.status || '').toLowerCase()) {
    update.$push = { 'courier.events': { $each: [{ status: st, at: now }], $slice: -30 } }
  }
  await c.updateOne({ orderId: order.orderId }, update)
  const target = orderStatusFor(p.status)
  if (target) await advanceStatus(order.orderId, target, 'biteship')
  return { ok: true, changed: !!target }
}

// Ringkasan beberapa pesanan sekaligus untuk lonceng pemberitahuan pembeli.
// items: [{ orderId, key }] yang kuncinya sudah diperiksa pemanggil.
export async function summarizeOrders(orderIds) {
  const c = await col()
  const docs = await c.find({ orderId: { $in: orderIds } }).toArray()
  return docs.map((d) => {
    const status = normalizeStatus(d.status)
    return {
      orderId: d.orderId,
      status,
      sig: orderSignature(status, d.courier?.status),
      message: latestMessage(status, d.courier?.status),
      updatedAt: d.updatedAt || d.createdAt,
    }
  })
}
