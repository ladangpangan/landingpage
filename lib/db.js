// Self-contained Mongo-backed settings store for the landing page.
// Uses a short serverSelectionTimeoutMS so the public page never hangs if the
// database is unreachable/unconfigured — it just falls back to DEFAULTS.
import { getDb } from '@/lib/mongo'
import { getFlatProducts, saveFlatProducts } from '@/lib/catalog'

export { getDb }

const COLLECTION = 'settings'
const DOC_ID = 'landing'

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
  midtransServerKey: '',
  midtransClientKey: '',
  midtransIsProduction: false,
  updatedAt: null,
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
    products: await getFlatProducts(),
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

export async function getAdminLandingSettings({ role = 'owner' } = {}) {
  const s = await getLandingSettings()
  const isOwner = role === 'owner'
  return {
    logoUrl: s.logoUrl,
    whatsappNumber: s.whatsappNumber,
    waMessage: s.waMessage,
    heroSlides: s.heroSlides,
    bannerTitle: s.bannerTitle,
    bannerSubtitle: s.bannerSubtitle,
    products: s.products,
    // Pengaturan pembayaran hanya dikirim ke Owner.
    midtransClientKey: isOwner ? s.midtransClientKey : '',
    midtransIsProduction: isOwner ? !!s.midtransIsProduction : false,
    hasMidtransServerKey: isOwner ? !!s.midtransServerKey : false,
    midtransServerKeyPreview: isOwner && s.midtransServerKey ? `••••${s.midtransServerKey.slice(-4)}` : null,
    updatedAt: s.updatedAt,
  }
}

export async function updateLandingSettings(input, { role = 'owner' } = {}) {
  const isOwner = role === 'owner'
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
  // Kunci Midtrans: hanya Owner yang boleh mengubah (Staf diabaikan).
  if (isOwner) {
    if (typeof input.midtransClientKey === 'string') {
      update.midtransClientKey = input.midtransClientKey.trim()
    }
    if (typeof input.midtransServerKey === 'string' && input.midtransServerKey.trim()) {
      update.midtransServerKey = input.midtransServerKey.trim()
    }
    if (typeof input.midtransIsProduction === 'boolean') {
      update.midtransIsProduction = input.midtransIsProduction
    }
  }
  if (input.products !== undefined) {
    await saveFlatProducts(input.products)
  }

  try {
    await c.updateOne({ _id: DOC_ID }, { $set: update, $setOnInsert: { _id: DOC_ID } }, { upsert: true })
  } catch (e) {
    if (e.name === 'MongoServerSelectionError' || /timed? ?out/i.test(e.message || '')) {
      throw new Error('Gagal menyimpan: koneksi database timeout. Coba lagi.')
    }
    throw e
  }
  return getAdminLandingSettings({ role })
}
