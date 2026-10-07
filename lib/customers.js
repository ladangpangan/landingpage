// Pembeli yang login dengan Google (opsional). Beli tanpa login tetap bisa.
import crypto from 'crypto'
import { getDb } from '@/lib/mongo'
import { ensureSchema } from '@/lib/schema'
import { validLatLng } from '@/lib/shipping'
import { cleanPhone, toLocalPhone } from '@/lib/profile-input'
import { normalizeStatus } from '@/lib/order-status'
import { normalizePhone } from '@/lib/order-access'

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

// --- Untuk admin (Owner) ---------------------------------------------------------

// Seluruh pembeli login + ringkasan pesanan. Pesanan dibaca terbatas (10.000 terbaru) dan hanya kolom yang perlu.
export async function loadCustomerOverview() {
  const c = await col()
  const db = getDb()
  const [customers, orders] = await Promise.all([
    c.find({}).sort({ lastLoginAt: -1 }).limit(5000).toArray(),
    db.collection('orders')
      .find({}, { projection: { orderId: 1, customerId: 1, status: 1, grossAmount: 1, createdAt: 1, customer: 1 } })
      .sort({ createdAt: -1 })
      .limit(10000)
      .toArray(),
  ])
  return {
    customers: customers.map((d) => ({ id: String(d._id), name: d.name || '', email: d.email || '', phone: toLocalPhone(d.phone), addresses: d.addresses || [], createdAt: d.createdAt, lastLoginAt: d.lastLoginAt })),
    orders: orders.map((o) => ({ ...o, status: normalizeStatus(o.status) })),
  }
}

// Pesanan satu pelanggan (login: customerId; tanpa login: nomor yang dinormalkan), terbaru dulu.
export async function listOrdersForCustomer({ customerId, phone }, limit = 20) {
  const db = getDb()
  const oc = db.collection('orders')
  let docs
  if (customerId) {
    docs = await oc.find({ customerId: String(customerId) }).sort({ createdAt: -1 }).limit(limit).toArray()
  } else {
    const want = normalizePhone(phone)
    if (!want) return []
    const recent = await oc.find({ customerId: null }).sort({ createdAt: -1 }).limit(5000).toArray()
    docs = recent.filter((o) => normalizePhone(o.customer?.phone) === want).slice(0, limit)
  }
  return docs.map((o) => ({
    orderId: o.orderId,
    status: normalizeStatus(o.status),
    grossAmount: o.grossAmount || 0,
    createdAt: o.createdAt,
    itemsText: (o.items || []).map((i) => `${i.qty}x ${i.name}`).join(', '),
  }))
}
