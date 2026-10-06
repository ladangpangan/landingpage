// Pembeli yang login dengan Google (opsional). Beli tanpa login tetap bisa.
import crypto from 'crypto'
import { getDb } from '@/lib/mongo'
import { ensureSchema } from '@/lib/schema'
import { validLatLng } from '@/lib/shipping'
import { cleanPhone, toLocalPhone } from '@/lib/profile-input'

export const MAX_ADDRESSES = 5

async function col() {
  const db = getDb()
  if (!db) throw new Error('Database belum tersambung (MONGO_URL).')
  await ensureSchema()
  return db.collection('customers')
}

const publicCustomer = (c) => ({ id: String(c._id), email: c.email, name: c.name || '', picture: c.picture || '', addresses: c.addresses || [], phone: toLocalPhone(c.phone) })

// Membuat pembeli baru atau memperbarui yang sudah ada (dikenali dari id Google).
export async function upsertGoogleCustomer(profile) {
  const c = await col()
  const now = new Date().toISOString()
  const existing = await c.findOne({ googleSub: profile.sub })
  if (existing) {
    await c.updateOne({ _id: existing._id }, { $set: { email: profile.email, name: profile.name, picture: profile.picture, lastLoginAt: now } })
    return { ...publicCustomer(existing), email: profile.email, name: profile.name, picture: profile.picture }
  }
  const doc = { _id: `c_${crypto.randomUUID()}`, googleSub: profile.sub, email: profile.email, name: profile.name, picture: profile.picture, addresses: [], createdAt: now, lastLoginAt: now }
  try {
    await c.insertOne(doc)
  } catch (e) {
    if (e?.code !== 11000) throw e
    return publicCustomer(await c.findOne({ googleSub: profile.sub })) // login ganda bersamaan
  }
  return publicCustomer(doc)
}

export async function getCustomerById(id) {
  const c = await col()
  const doc = await c.findOne({ _id: String(id) })
  return doc ? publicCustomer(doc) : null
}

// Validasi alamat tersimpan. Mengembalikan { address } atau { error }.
export function cleanAddress(input) {
  const label = String(input?.label || '').trim().slice(0, 30) || 'Rumah'
  const name = String(input?.name || '').trim().slice(0, 50)
  const phone = String(input?.phone || '').trim().slice(0, 30)
  const address = String(input?.address || '').trim().slice(0, 200)
  if (!name || !phone || !address) return { error: 'Nama, nomor WhatsApp, dan alamat wajib diisi.' }
  if (!validLatLng(input)) return { error: 'Titik lokasi alamat belum ada.' }
  return { address: { label, name, phone, address, lat: Number(input.lat), lng: Number(input.lng) } }
}

export async function addAddress(customerId, input) {
  const r = cleanAddress(input)
  if (r.error) return { ok: false, error: r.error }
  const c = await col()
  const doc = await c.findOne({ _id: String(customerId) })
  if (!doc) return { ok: false, error: 'Akun tidak ditemukan.' }
  const list = doc.addresses || []
  // Alamat yang sama persis tidak disimpan dua kali.
  if (list.some((a) => a.address === r.address.address && a.phone === r.address.phone)) return { ok: true, addresses: list, duplicate: true }
  if (list.length >= MAX_ADDRESSES) return { ok: false, error: `Maksimal ${MAX_ADDRESSES} alamat tersimpan. Hapus satu dulu.` }
  const next = [...list, { id: `a_${crypto.randomBytes(5).toString('hex')}`, ...r.address }]
  await c.updateOne({ _id: doc._id }, { $set: { addresses: next } })
  return { ok: true, addresses: next }
}

export async function deleteAddress(customerId, addressId) {
  const c = await col()
  const doc = await c.findOne({ _id: String(customerId) })
  if (!doc) return { ok: false, error: 'Akun tidak ditemukan.' }
  const next = (doc.addresses || []).filter((a) => a.id !== addressId)
  await c.updateOne({ _id: doc._id }, { $set: { addresses: next } })
  return { ok: true, addresses: next }
}

// Nomor WhatsApp akun (kosong = hapus).
export async function setCustomerPhone(customerId, input) {
  const r = cleanPhone(input)
  if (r.error) return { ok: false, error: r.error }
  const c = await col()
  const res = await c.updateOne({ _id: String(customerId) }, { $set: { phone: r.phone } })
  if (!res.matchedCount) return { ok: false, error: 'Akun tidak ditemukan.' }
  return { ok: true, phone: toLocalPhone(r.phone) }
}

// Ubah alamat tersimpan; titik lokasi lama dipakai bila tidak dikirim ulang.
export async function updateAddress(customerId, addressId, input) {
  const c = await col()
  const doc = await c.findOne({ _id: String(customerId) })
  if (!doc) return { ok: false, error: 'Akun tidak ditemukan.' }
  const list = doc.addresses || []
  const old = list.find((a) => a.id === addressId)
  if (!old) return { ok: false, error: 'Alamat tidak ditemukan.' }
  const hasLoc = validLatLng(input)
  const r = cleanAddress({ ...input, lat: hasLoc ? input.lat : old.lat, lng: hasLoc ? input.lng : old.lng })
  if (r.error) return { ok: false, error: r.error }
  const next = list.map((a) => (a.id === addressId ? { id: a.id, ...r.address } : a))
  await c.updateOne({ _id: doc._id }, { $set: { addresses: next } })
  return { ok: true, addresses: next }
}
