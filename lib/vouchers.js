// Voucher (koleksi vouchers, _id = kode). Perhitungan potongan ada di lib/vouchers-math.js.
import { getDb } from '@/lib/mongo'
import { normalizeCode, sanitizeVoucherInput } from '@/lib/vouchers-math'

async function col() {
  const d = getDb()
  if (!d) throw new Error('Database belum tersambung (MONGO_URL).')
  const { ensureSchema } = await import('@/lib/schema')
  await ensureSchema()
  return d.collection('vouchers')
}

function toVoucher(v) {
  return {
    code: String(v._id),
    type: v.type,
    valueType: v.valueType,
    value: v.value,
    maxDiscount: v.maxDiscount ?? null,
    minPurchase: v.minPurchase ?? 0,
    quota: v.quota ?? null,
    used: v.used ?? 0,
    startsAt: v.startsAt ?? null,
    endsAt: v.endsAt ?? null,
    active: v.active !== false,
  }
}

export async function getVoucher(code) {
  const c = normalizeCode(code)
  if (!c) return null
  const doc = await (await col()).findOne({ _id: c })
  return doc ? toVoucher(doc) : null
}

export async function listVouchers() {
  const docs = await (await col()).find({}).sort({ createdAt: -1 }).toArray()
  return docs.map(toVoucher)
}

// Simpan voucher baru atau ubah (id = kode lama). { ok } atau { error, status }.
export async function saveVoucher(input, existingCode) {
  const parsed = sanitizeVoucherInput(input)
  if (parsed.error) return { error: parsed.error, status: 400 }
  const { code, ...rest } = parsed.value
  const c = await col()
  const now = new Date().toISOString()
  if (existingCode) {
    const old = await c.findOne({ _id: existingCode })
    if (!old) return { error: 'Voucher tidak ditemukan.', status: 404 }
    if (code !== existingCode) return { error: 'Kode voucher tidak bisa diubah. Buat voucher baru bila perlu kode lain.', status: 400 }
    await c.updateOne({ _id: existingCode }, { $set: { ...rest, updatedAt: now } })
    return { ok: true }
  }
  if (await c.findOne({ _id: code })) return { error: 'Kode voucher itu sudah ada.', status: 400 }
  await c.insertOne({ _id: code, code, ...rest, used: 0, createdAt: now, updatedAt: now })
  return { ok: true }
}

export async function deleteVoucher(code) {
  await (await col()).deleteMany({ _id: normalizeCode(code) })
}

// Pakai satu kuota voucher secara atomik. Mengembalikan true bila berhasil.
export async function reserveVoucher(code) {
  const c = await col()
  const v = await c.findOne({ _id: code })
  if (!v || v.active === false) return false
  const filter = v.quota == null ? { _id: code } : { _id: code, used: { $lt: v.quota } }
  const res = await c.updateOne(filter, { $inc: { used: 1 } })
  return !!res.modifiedCount
}

export async function releaseVoucher(code) {
  if (!code) return
  await (await col()).updateOne({ _id: code, used: { $gt: 0 } }, { $inc: { used: -1 } })
}
