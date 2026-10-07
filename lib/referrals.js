// Referral (koleksi referrals, _id = kode; pengaturan di referral_settings; catatan bayar komisi di referral_payouts).
// Hitungan murni ada di lib/referral-math.js. Komisi tiap pesanan tersimpan di order.referral.
import { getDb } from '@/lib/mongo'
import { normalizeCode } from '@/lib/vouchers-math'
import { DEFAULT_REFERRAL_CONFIG, sanitizeReferralConfig, sanitizeReferralInput, summarizeReferralOrders } from '@/lib/referral-math'
import { toLocalPhone } from '@/lib/profile-input'

function db() {
  const d = getDb()
  if (!d) throw new Error('Database belum tersambung (MONGO_URL).')
  return d
}

export async function getReferralConfig() {
  const doc = await db().collection('referral_settings').findOne({ _id: 'default' })
  return { ...DEFAULT_REFERRAL_CONFIG, ...(doc ? { enabled: doc.enabled !== false, discountPct: doc.discountPct, discountMax: doc.discountMax, commissionPct: doc.commissionPct } : {}) }
}

export async function saveReferralConfig(input) {
  const r = sanitizeReferralConfig(input)
  if (r.error) return { ok: false, error: r.error }
  await db().collection('referral_settings').updateOne({ _id: 'default' }, { $set: { ...r.value, updatedAt: new Date().toISOString() } }, { upsert: true })
  return { ok: true, config: r.value }
}

const toReferral = (d) => ({ code: String(d._id), name: d.name, phone: d.phone, active: d.active !== false, createdAt: d.createdAt })

export async function getReferral(code) {
  const c = normalizeCode(code)
  if (!c) return null
  const doc = await db().collection('referrals').findOne({ _id: c })
  return doc ? toReferral(doc) : null
}

// Simpan perujuk baru atau ubah (kode tidak bisa diubah). Kode tidak boleh sama dengan voucher.
export async function saveReferral(input, existingCode) {
  const r = sanitizeReferralInput(input)
  if (r.error) return { ok: false, status: 400, error: r.error }
  const { code, ...rest } = r.value
  const c = db().collection('referrals')
  const now = new Date().toISOString()
  if (existingCode) {
    if (code !== existingCode) return { ok: false, status: 400, error: 'Kode referral tidak bisa diubah. Buat perujuk baru bila perlu kode lain.' }
    const res = await c.updateOne({ _id: existingCode }, { $set: { ...rest, updatedAt: now } })
    if (!res.matchedCount) return { ok: false, status: 404, error: 'Perujuk tidak ditemukan.' }
    return { ok: true }
  }
  if (await c.findOne({ _id: code })) return { ok: false, status: 400, error: 'Kode referral itu sudah dipakai.' }
  if (await db().collection('vouchers').findOne({ _id: code })) return { ok: false, status: 400, error: 'Kode itu sudah dipakai sebagai voucher. Pilih kode lain.' }
  await c.insertOne({ _id: code, ...rest, createdAt: now, updatedAt: now })
  return { ok: true }
}

// Daftar perujuk + ringkasan komisi.
export async function listReferralsWithStats() {
  const d = db()
  const [refs, orders] = await Promise.all([
    d.collection('referrals').find({}).sort({ createdAt: -1 }).toArray(),
    d.collection('orders').find({ 'referral.code': { $exists: true } }, { projection: { referral: 1 } }).limit(20000).toArray(),
  ])
  const stats = summarizeReferralOrders(orders)
  const zero = { orders: 0, pending: 0, earned: 0, paid: 0, pendingAmount: 0, earnedAmount: 0, paidAmount: 0 }
  return refs.map((r) => ({ ...toReferral(r), phoneLocal: toLocalPhone(r.phone), stats: { ...zero, ...(stats.get(String(r._id)) || {}) } }))
}

export async function listReferralOrders(code, limit = 30) {
  const docs = await db().collection('orders').find({ 'referral.code': normalizeCode(code) }).sort({ createdAt: -1 }).limit(limit).toArray()
  return docs.map((o) => ({ orderId: o.orderId, status: o.status, createdAt: o.createdAt, grossAmount: o.grossAmount || 0, commission: o.referral?.commission || 0, commissionStatus: o.referral?.status || 'pending' }))
}

// Komisi pesanan: Diterima -> siap dibayar; batal/gagal/kedaluwarsa -> hangus. Dipanggil setelah status pesanan berubah.
export async function applyReferralStatus(orderId, toStatus) {
  const c = db().collection('orders')
  if (toStatus === 'diterima') {
    await c.updateOne({ orderId, 'referral.status': 'pending' }, { $set: { 'referral.status': 'earned', 'referral.earnedAt': new Date().toISOString() } })
  } else if (['batal', 'gagal', 'kedaluwarsa'].includes(toStatus)) {
    await c.updateOne({ orderId, 'referral.status': { $in: ['pending', 'earned'] } }, { $set: { 'referral.status': 'void' } })
  }
}

// Tandai komisi siap-bayar milik satu kode sebagai sudah dibayar (Owner mentransfer sendiri). Mengembalikan jumlahnya.
export async function payoutReferral(code, by = 'owner') {
  const d = db()
  const c = normalizeCode(code)
  const orders = d.collection('orders')
  const due = await orders.find({ 'referral.code': c, 'referral.status': 'earned' }, { projection: { orderId: 1, referral: 1 } }).limit(5000).toArray()
  if (!due.length) return { ok: false, status: 409, error: 'Tidak ada komisi yang siap dibayar.' }
  const now = new Date().toISOString()
  const payoutId = `po_${Date.now().toString(36)}`
  let amount = 0
  const paidIds = []
  for (const o of due) {
    // Penjaga: hanya yang masih 'earned' yang ditandai (klik ganda tidak menghitung dua kali).
    const res = await orders.updateOne({ orderId: o.orderId, 'referral.status': 'earned' }, { $set: { 'referral.status': 'paid', 'referral.paidAt': now, 'referral.payoutId': payoutId } })
    if (res.modifiedCount) {
      amount += Number(o.referral?.commission) || 0
      paidIds.push(o.orderId)
    }
  }
  if (!paidIds.length) return { ok: false, status: 409, error: 'Tidak ada komisi yang siap dibayar.' }
  await d.collection('referral_payouts').insertOne({ _id: payoutId, code: c, amount, orderIds: paidIds, at: now, by })
  return { ok: true, amount, count: paidIds.length, payoutId }
}

export async function listPayouts(code, limit = 20) {
  return db().collection('referral_payouts').find(code ? { code: normalizeCode(code) } : {}).sort({ at: -1 }).limit(limit).toArray()
}
