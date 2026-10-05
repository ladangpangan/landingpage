// Pengiriman: pengaturan gudang/kurir, zona ongkir, dan penahanan kapasitas slot.
import { getDb } from '@/lib/mongo'
import { DEFAULT_DELIVERY_CONFIG } from '@/lib/schema'
import { slotKey, validLatLng } from '@/lib/shipping'

async function db() {
  const d = getDb()
  if (!d) throw new Error('Database belum tersambung (MONGO_URL).')
  const { ensureSchema } = await import('@/lib/schema')
  await ensureSchema()
  return d
}

// --- Pengaturan -----------------------------------------------------------------

export async function getDeliveryConfig() {
  try {
    const d = await db()
    const doc = await d.collection('delivery_config').findOne({ _id: 'default' })
    return { ...DEFAULT_DELIVERY_CONFIG, ...(doc || {}), slots: doc?.slots?.length ? doc.slots : DEFAULT_DELIVERY_CONFIG.slots }
  } catch (e) {
    console.error('[delivery] gagal membaca pengaturan:', e?.message || e)
    return { ...DEFAULT_DELIVERY_CONFIG }
  }
}

const intIn = (v, min, max) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

// Mengembalikan { config } atau { error }.
export function sanitizeDeliveryConfig(input) {
  if (!input || typeof input !== 'object') return { error: 'Data pengaturan tidak valid.' }
  const out = {}
  const hasLat = input.warehouse && String(input.warehouse.lat ?? '').trim() !== ''
  const hasLng = input.warehouse && String(input.warehouse.lng ?? '').trim() !== ''
  if (hasLat || hasLng) {
    const wh = validLatLng(input.warehouse)
    if (!wh) return { error: 'Titik gudang tidak valid. Isi lintang (mis. -7.4478) dan bujur (mis. 112.7183).' }
    out.warehouse = { lat: Math.round(wh.lat * 1e6) / 1e6, lng: Math.round(wh.lng * 1e6) / 1e6 }
  } else {
    out.warehouse = null
  }
  const factor = Number(input.roadFactor)
  if (!Number.isFinite(factor) || factor < 1 || factor > 3) return { error: 'Faktor jarak jalan harus antara 1 dan 3.' }
  out.roadFactor = Math.round(factor * 100) / 100
  const couriers = intIn(input.couriers, 1, 50)
  if (couriers === null) return { error: 'Jumlah kurir harus 1 sampai 50.' }
  const trips = intIn(input.tripsPerSlot, 1, 10)
  if (trips === null) return { error: 'Jumlah trip per slot harus 1 sampai 10.' }
  const kg = intIn(input.maxKgPerTrip, 1, 1000)
  if (kg === null) return { error: 'Muatan per trip harus 1 sampai 1000 kg.' }
  const cutoff = intIn(input.cutoffHour, 1, 23)
  if (cutoff === null) return { error: 'Jam batas "Kirim Sekarang" harus 1 sampai 23.' }
  const days = intIn(input.scheduleDaysAhead, 1, 7)
  if (days === null) return { error: 'Hari ke depan untuk jadwal harus 1 sampai 7.' }
  Object.assign(out, { couriers, tripsPerSlot: trips, maxKgPerTrip: kg, cutoffHour: cutoff, scheduleDaysAhead: days })
  return { config: out }
}

export async function saveDeliveryConfig(input) {
  const parsed = sanitizeDeliveryConfig(input)
  if (parsed.error) return parsed
  const d = await db()
  await d.collection('delivery_config').updateOne({ _id: 'default' }, { $set: { ...parsed.config, updatedAt: new Date().toISOString() } }, { upsert: true })
  return { config: await getDeliveryConfig() }
}

// --- Zona -----------------------------------------------------------------------

function toZone(z) {
  return { id: String(z._id), name: z.name, maxKm: z.maxKm, fee: z.fee, freeShippingMin: z.freeShippingMin, active: z.active !== false, sort: z.sort ?? 0 }
}

export async function listZones() {
  const d = await db()
  const docs = await d.collection('zones').find({}).sort({ sort: 1 }).toArray()
  return docs.map(toZone)
}

export function sanitizeZoneInput(input) {
  const name = String(input?.name ?? '').trim().slice(0, 60)
  if (!name) return { error: 'Nama zona wajib diisi.' }
  const maxKm = Number(input?.maxKm)
  if (!Number.isFinite(maxKm) || maxKm <= 0 || maxKm > 500) return { error: 'Jarak maksimal zona harus lebih dari 0 km.' }
  const fee = Math.round(Number(input?.fee))
  if (!Number.isFinite(fee) || fee < 0) return { error: 'Ongkir tidak valid.' }
  const freeShippingMin = Math.round(Number(input?.freeShippingMin))
  if (!Number.isFinite(freeShippingMin) || freeShippingMin < 0) return { error: 'Batas gratis ongkir tidak valid.' }
  return { value: { name, maxKm: Math.round(maxKm * 10) / 10, fee, freeShippingMin, active: input?.active !== false } }
}

export async function saveZone(input, id) {
  const parsed = sanitizeZoneInput(input)
  if (parsed.error) return { error: parsed.error, status: 400 }
  const d = await db()
  const col = d.collection('zones')
  const now = new Date().toISOString()
  if (id) {
    if (!(await col.findOne({ _id: id }))) return { error: 'Zona tidak ditemukan.', status: 404 }
    await col.updateOne({ _id: id }, { $set: { ...parsed.value, updatedAt: now } })
    return { ok: true }
  }
  const last = await col.find({}).sort({ sort: -1 }).limit(1).toArray()
  await col.insertOne({ _id: `zona-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`, ...parsed.value, sort: (last[0]?.sort ?? 0) + 1, createdAt: now, updatedAt: now })
  return { ok: true }
}

export async function deleteZone(id) {
  const d = await db()
  await d.collection('zones').deleteMany({ _id: id })
}

// --- Kapasitas slot -------------------------------------------------------------

// { 'YYYY-MM-DD|slotId': kgTerpakai } untuk daftar tanggal.
export async function getSlotUsage(dates, slots) {
  const d = await db()
  const keys = dates.flatMap((date) => slots.map((s) => slotKey(date, s.id)))
  const docs = await d.collection('delivery_usage').find({ _id: { $in: keys } }).toArray()
  return Object.fromEntries(docs.map((x) => [String(x._id), x.usedKg || 0]))
}

const round2 = (n) => Math.round(n * 100) / 100

// Tahan muatan `kg` di slot secara atomik. { ok, key, kg } atau { ok:false }.
export async function reserveSlot({ date, slotId, kg, capacityKg }) {
  const d = await db()
  const col = d.collection('delivery_usage')
  const key = slotKey(date, slotId)
  const amount = round2(kg)
  try {
    await col.updateOne({ _id: key }, { $setOnInsert: { usedKg: 0, date, slotId } }, { upsert: true })
  } catch (e) {
    if (e?.code !== 11000) throw e // dokumen sudah dibuat permintaan lain
  }
  const res = await col.updateOne({ _id: key, usedKg: { $lte: round2(capacityKg - amount) } }, { $inc: { usedKg: amount } })
  return res.modifiedCount ? { ok: true, key, kg: amount } : { ok: false }
}

export async function releaseSlot(reservation) {
  if (!reservation?.key) return
  const d = await db()
  await d.collection('delivery_usage').updateOne({ _id: reservation.key }, { $inc: { usedKg: -round2(reservation.kg) } })
}
