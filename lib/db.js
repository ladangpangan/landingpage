// Self-contained Mongo-backed settings store for the landing page.
// Uses a short serverSelectionTimeoutMS so the public page never hangs if the
// database is unreachable/unconfigured — it just falls back to DEFAULTS.
import { MongoClient } from 'mongodb'

const MONGO_URL = process.env.MONGO_URL || ''
const DB_NAME = process.env.MONGO_DB_NAME || 'ladang_landing'
const COLLECTION = 'settings'
const DOC_ID = 'landing'

export const DEFAULT_PRODUCTS = [
  {
    id: 'karkas-frozen',
    name: 'Karkas Ayam Frozen',
    category: 'Ayam Segar',
    unit: 'per ekor (± 0.9–1 kg)',
    price: 32000,
    image: '/landing/produk-1.jpeg',
    isPromo: true,
    description:
      'Ayam utuh yang dibekukan langsung setelah pemotongan di rumah potong ber-NKV, menjaga tekstur dan kesegaran daging hingga sampai di dapur Anda.',
  },
  {
    id: 'ceker-frozen',
    name: 'Ceker Ayam Frozen',
    category: 'Ayam Segar',
    unit: 'per kg',
    price: 25000,
    image: '/landing/produk-3.jpeg',
    description:
      'Ceker pilihan yang bersih dan higienis — favorit untuk kaldu, seblak, mie ayam, hingga camilan pedas.',
  },
]

export const DEFAULT_HERO_SLIDES = [
  {
    id: 'slide-1',
    badge: 'Produsen Ayam Langsung dari Peternak',
    title: 'Beli, Bayar, Terima — Ayam Frozen Tanpa Ribet',
    subtitle:
      'Ayam frozen higienis dari peternakan mitra kami, dibekukan sempurna untuk menjaga kesegaran. Pilih produk, checkout, dan bayar online dalam hitungan menit.',
    image: '/landing/produk-5.jpeg',
  },
  {
    id: 'slide-2',
    badge: 'Stok Segar Setiap Hari',
    title: 'Perut Kenyang, Hati Senang',
    subtitle: 'Dikirim langsung dari cold storage ke dapur Anda, kualitas terjaga sampai tujuan.',
    image: '/landing/produk-2.jpeg',
  },
]

const DEFAULTS = {
  _id: DOC_ID,
  logoUrl: '',
  whatsappNumber: '6282229348883',
  waMessage: 'Halo ladangpangan.id, saya ingin tanya-tanya soal ayam frozen.',
  heroSlides: DEFAULT_HERO_SLIDES,
  bannerTitle: 'Perut Kenyang, Hati Senang',
  bannerSubtitle: 'Stok segar setiap hari, siap kirim ke dapur Anda',
  products: DEFAULT_PRODUCTS,
  midtransServerKey: '',
  midtransClientKey: '',
  midtransIsProduction: false,
  updatedAt: null,
}

let _client
export function getDb() {
  if (!MONGO_URL) return null
  if (!_client) {
    _client = new MongoClient(MONGO_URL, {
      maxPoolSize: 3,
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    })
  }
  return _client.db(DB_NAME)
}

function col() {
  return getDb()?.collection(COLLECTION) || null
}

function sanitizeHeroSlides(slides) {
  if (!Array.isArray(slides)) return DEFAULT_HERO_SLIDES
  const cleaned = slides
    .filter((s) => s && (s.title || s.subtitle))
    .map((s, i) => ({
      id: String(s.id || `slide-${i}`).trim().slice(0, 60),
      badge: String(s.badge || '').trim().slice(0, 100),
      title: String(s.title || '').trim().slice(0, 200),
      subtitle: String(s.subtitle || '').trim().slice(0, 400),
      image: String(s.image || '').trim().slice(0, 300) || '/landing/produk-1.jpeg',
    }))
  return cleaned.length ? cleaned : DEFAULT_HERO_SLIDES
}

function sanitizeProducts(products) {
  if (!Array.isArray(products)) return DEFAULT_PRODUCTS
  return products
    .filter((p) => p && p.id && p.name)
    .map((p) => ({
      id: String(p.id).trim().slice(0, 60),
      name: String(p.name).trim().slice(0, 100),
      category: String(p.category || '').trim().slice(0, 60) || 'Lainnya',
      unit: String(p.unit || '').trim().slice(0, 60),
      price: Math.max(0, Math.round(Number(p.price) || 0)),
      image: String(p.image || '').trim().slice(0, 300) || '/landing/produk-1.jpeg',
      description: String(p.description || '').trim().slice(0, 500),
      isPromo: !!p.isPromo,
    }))
}

export async function getLandingSettings() {
  const c = col()
  let doc = null
  if (c) {
    try {
      doc = await c.findOne({ _id: DOC_ID })
    } catch (e) {
      console.error('[db] read failed:', e?.message || e)
    }
  }
  return {
    ...DEFAULTS,
    ...doc,
    heroSlides: doc?.heroSlides?.length ? doc.heroSlides : DEFAULTS.heroSlides,
    products: doc?.products?.length ? doc.products : DEFAULTS.products,
  }
}

export async function getPublicLandingSettings() {
  const s = await getLandingSettings()
  return {
    logoUrl: s.logoUrl,
    whatsappNumber: s.whatsappNumber,
    waMessage: s.waMessage,
    heroSlides: s.heroSlides,
    bannerTitle: s.bannerTitle,
    bannerSubtitle: s.bannerSubtitle,
    products: s.products,
    midtransClientKey: s.midtransClientKey,
    midtransIsProduction: !!s.midtransIsProduction,
  }
}

export async function getAdminLandingSettings() {
  const s = await getLandingSettings()
  return {
    logoUrl: s.logoUrl,
    whatsappNumber: s.whatsappNumber,
    waMessage: s.waMessage,
    heroSlides: s.heroSlides,
    bannerTitle: s.bannerTitle,
    bannerSubtitle: s.bannerSubtitle,
    products: s.products,
    midtransClientKey: s.midtransClientKey,
    midtransIsProduction: !!s.midtransIsProduction,
    hasMidtransServerKey: !!s.midtransServerKey,
    midtransServerKeyPreview: s.midtransServerKey ? `••••${s.midtransServerKey.slice(-4)}` : null,
    updatedAt: s.updatedAt,
  }
}

export async function updateLandingSettings(input) {
  const c = col()
  if (!c) throw new Error('MONGO_URL belum diatur di environment variables.')

  const update = { updatedAt: new Date().toISOString() }

  if (typeof input.logoUrl === 'string') {
    update.logoUrl = input.logoUrl.trim().slice(0, 300)
  }
  if (typeof input.whatsappNumber === 'string') {
    const digits = input.whatsappNumber.replace(/[^0-9]/g, '')
    if (!digits || digits.length < 8) throw new Error('Nomor WhatsApp tidak valid.')
    update.whatsappNumber = digits
  }
  if (typeof input.waMessage === 'string') {
    update.waMessage = input.waMessage.trim().slice(0, 300)
  }
  if (input.heroSlides !== undefined) {
    update.heroSlides = sanitizeHeroSlides(input.heroSlides)
  }
  if (typeof input.bannerTitle === 'string') {
    update.bannerTitle = input.bannerTitle.trim().slice(0, 100)
  }
  if (typeof input.bannerSubtitle === 'string') {
    update.bannerSubtitle = input.bannerSubtitle.trim().slice(0, 200)
  }
  if (input.products !== undefined) {
    update.products = sanitizeProducts(input.products)
    if (!update.products.length) throw new Error('Minimal harus ada satu produk.')
  }
  if (typeof input.midtransClientKey === 'string') {
    update.midtransClientKey = input.midtransClientKey.trim()
  }
  if (typeof input.midtransServerKey === 'string' && input.midtransServerKey.trim()) {
    update.midtransServerKey = input.midtransServerKey.trim()
  }
  if (typeof input.midtransIsProduction === 'boolean') {
    update.midtransIsProduction = input.midtransIsProduction
  }

  try {
    await c.updateOne({ _id: DOC_ID }, { $set: update, $setOnInsert: { _id: DOC_ID } }, { upsert: true })
  } catch (e) {
    if (e.name === 'MongoServerSelectionError' || /timed? ?out/i.test(e.message || '')) {
      throw new Error('Gagal menyimpan: koneksi database timeout. Coba lagi.')
    }
    throw e
  }
  return getAdminLandingSettings()
}
