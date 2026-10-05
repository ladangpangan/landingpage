// Struktur data (koleksi MongoDB) toko LPI. ensureSchema() dipanggil sekali per
// proses sebelum data dibaca/ditulis: membuat index, mengisi data awal
// (zona ongkir & aturan pengiriman sesuai docs/rencana.md), dan memindahkan
// data lama (status pesanan, katalog produk).
//
// Koleksi:
//  settings        1 dokumen "landing": logo, WhatsApp, hero, banner, kunci Midtrans
//  products        { _id, name, category, description, image, isPromo, active, erpCode }
//  variants        { _id, productId, label, unit, price, weightKg, stock(null=tak terbatas), active, erpCode }
//  bundles         Paket Hemat / Paket Masak { _id, type: 'hemat'|'masak', name, description, image,
//                  price, items:[{variantId, qty}], recipe:{ingredients, steps}, active, erpCode }
//  zones           { _id, name, maxKm, fee, freeShippingMin, active, sort }
//  delivery_config 1 dokumen "default": jam batas, kapasitas kg per trip, biaya kurir, slot jadwal, titik gudang, jumlah kurir
//  delivery_usage  { _id: 'YYYY-MM-DD|slotId', usedKg } muatan yang sudah ditahan per slot
//  vouchers        { code, type: 'diskon_belanja'|'diskon_ongkir', valueType: 'nominal'|'persen', value,
//                  maxDiscount, minPurchase, quota, used, startsAt, endsAt, active }
//  admins          { email, name, role: 'owner'|'staf', passwordHash, active, tokenVersion }
//  orders          pesanan (lihat lib/orders.js)
//  login_attempts  pencatat percobaan login gagal (otomatis terhapus setelah 1 jam)
import { getDb } from '@/lib/mongo'
import { ORDER_STATUSES } from '@/lib/order-status'

export const DEFAULT_ZONES = [
  { _id: 'zona-1', name: 'Zona 1 (sampai 5 km)', maxKm: 5, fee: 8000, freeShippingMin: 100000, active: true, sort: 1 },
  { _id: 'zona-2', name: 'Zona 2 (5–10 km)', maxKm: 10, fee: 12000, freeShippingMin: 150000, active: true, sort: 2 },
  { _id: 'zona-3', name: 'Zona 3 (10–15 km)', maxKm: 15, fee: 18000, freeShippingMin: 200000, active: true, sort: 3 },
]

export const DEFAULT_DELIVERY_CONFIG = {
  _id: 'default',
  cutoffHour: 17,
  maxKgPerTrip: 40,
  courierCostPerTrip: 20000,
  scheduleDaysAhead: 3,
  // Diatur pemilik di admin (Ongkir & Voucher). warehouse = { lat, lng } titik gudang.
  warehouse: null,
  roadFactor: 1.3, // jarak jalan ~ garis lurus x faktor ini
  couriers: 1,
  tripsPerSlot: 1,
  slots: [
    { id: 'pagi', label: 'Pagi', start: '08:00', end: '11:00' },
    { id: 'siang', label: 'Siang', start: '11:00', end: '14:00' },
    { id: 'sore', label: 'Sore', start: '14:00', end: '17:00' },
  ],
}

const LEGACY_STATUS = {
  pending: 'menunggu_bayar',
  paid: 'dibayar',
  failed: 'gagal',
  cancelled: 'batal',
  expired: 'kedaluwarsa',
  refunded: 'batal',
}

let _ready = null

export function ensureSchema() {
  if (!getDb()) return Promise.resolve(false)
  if (!_ready) {
    _ready = run().then(
      () => true,
      (e) => {
        _ready = null // coba lagi pada permintaan berikutnya
        console.error('[schema] gagal menyiapkan database:', e?.message || e)
        throw e
      }
    )
  }
  return _ready
}

async function run() {
  const db = getDb()

  await Promise.all([
    db.collection('admins').createIndex({ email: 1 }, { unique: true }),
    db.collection('vouchers').createIndex({ code: 1 }, { unique: true }),
    db.collection('variants').createIndex({ productId: 1 }),
    db.collection('products').createIndex({ active: 1, category: 1 }),
    db.collection('bundles').createIndex({ type: 1, active: 1 }),
    db.collection('zones').createIndex({ sort: 1 }),
    db.collection('orders').createIndex({ orderId: 1 }, { unique: true }),
    db.collection('orders').createIndex({ createdAt: -1 }),
    db.collection('login_attempts').createIndex({ at: 1 }, { expireAfterSeconds: 3600 }),
    db.collection('login_attempts').createIndex({ key: 1 }),
  ])

  // Data awal (hanya bila belum ada).
  if ((await db.collection('zones').countDocuments({}, { limit: 1 })) === 0) {
    await db.collection('zones').insertMany(DEFAULT_ZONES)
  }
  await db
    .collection('delivery_config')
    .updateOne({ _id: 'default' }, { $setOnInsert: DEFAULT_DELIVERY_CONFIG }, { upsert: true })

  // Status pesanan lama -> status baru.
  for (const [oldStatus, newStatus] of Object.entries(LEGACY_STATUS)) {
    if (!ORDER_STATUSES.includes(oldStatus)) {
      await db.collection('orders').updateMany({ status: oldStatus }, { $set: { status: newStatus } })
    }
  }

  // Katalog lama (array di dokumen settings) -> koleksi products + variants.
  const { migrateLegacyCatalog } = await import('@/lib/catalog')
  await migrateLegacyCatalog()

  // Paket contoh (sekali saja) untuk melihat tampilan Paket Hemat/Masak.
  const { seedSampleBundles } = await import('@/lib/bundles')
  await seedSampleBundles()
}
