// Paket Hemat & Paket Masak (koleksi bundles).
//   { _id, type: 'hemat'|'masak', name, description, image, price,
//     items: [{ variantId, qty }], recipe: { ingredients: [], steps: [] },
//     active, isSample, sort, erpCode }
// Harga paket selalu dari sini (server). Pengelolaan lewat admin hadir di Tahap 4;
// sampai itu paket contoh diisi otomatis satu kali.
import { getDb } from '@/lib/mongo'
import { bundleSummary, roundTo500 } from '@/lib/cart-math'
import { sanitizeBundleInput } from '@/lib/bundle-input'

export const BUNDLE_TYPES = ['hemat', 'masak']

function toBundle(d) {
  return {
    id: String(d._id),
    type: d.type,
    name: d.name,
    description: d.description || '',
    image: d.image || '',
    price: d.price,
    items: d.items || [],
    recipe: { ingredients: d.recipe?.ingredients || [], steps: d.recipe?.steps || [] },
    erpCode: d.erpCode || '',
    isSample: !!d.isSample,
    active: d.active !== false,
  }
}

// Semua paket aktif (mentah, dipakai checkout).
export async function getActiveBundles() {
  const db = getDb()
  if (!db) return []
  try {
    const { ensureSchema } = await import('@/lib/schema')
    await ensureSchema()
    const docs = await db.collection('bundles').find({ active: { $ne: false } }).sort({ sort: 1 }).toArray()
    return docs.map(toBundle)
  } catch (e) {
    console.error('[bundles] gagal membaca paket:', e?.message || e)
    return []
  }
}

// Bentuk untuk tampilan pembeli: sudah ada isi paket, hemat berapa, dan status stok.
export function toPublicBundle(bundle, productsById) {
  const s = bundleSummary(bundle, productsById)
  return {
    id: bundle.id,
    type: bundle.type,
    name: bundle.name,
    description: bundle.description,
    image: bundle.image,
    price: bundle.price,
    normalPrice: s.normalPrice,
    savings: s.savings,
    items: s.items,
    recipe: bundle.recipe,
    soldOut: s.soldOut,
    stockLeft: s.stockLeft,
    isSample: bundle.isSample,
  }
}

// Dipanggil dari ensureSchema(): mengisi paket contoh SATU kali saja, memakai
// produk yang ada. Bila pemilik menghapusnya, tidak dibuat lagi.
export async function seedSampleBundles() {
  const db = getDb()
  if (!db) return
  const flag = await db
    .collection('settings')
    .updateOne({ _id: 'seed-flags' }, { $setOnInsert: { sampleBundlesAt: new Date().toISOString() } }, { upsert: true })
  if (!flag.upsertedCount) return // sudah pernah

  const products = await db.collection('products').find({}).sort({ sort: 1 }).toArray()
  const variants = await db.collection('variants').find({}).toArray()
  const byProduct = new Map(variants.map((v) => [v.productId, v]))
  const pool = products.map((p) => ({ p, v: byProduct.get(p._id) })).filter((x) => x.v && x.v.price > 0)
  if (!pool.length) return
  const a = pool[0]
  const b = pool[1] || pool[0]
  const now = new Date().toISOString()

  const make = (id, type, name, description, lines, extra = {}) => {
    const normal = lines.reduce((sum, l) => sum + l.v.price * l.qty, 0)
    return {
      _id: id,
      type,
      name,
      description,
      image: lines[0].p.image || '',
      price: type === 'hemat' ? roundTo500(normal * 0.9) : roundTo500(normal),
      items: lines.map((l) => ({ variantId: l.v._id, qty: l.qty })),
      recipe: { ingredients: [], steps: [] },
      erpCode: '',
      active: true,
      isSample: true,
      createdAt: now,
      updatedAt: now,
      ...extra,
    }
  }

  await db.collection('bundles').insertMany([
    make('paket-hemat-keluarga', 'hemat', 'Paket Hemat Keluarga (contoh)', 'Paket contoh. Isi dan harga asli diatur pemilik toko.', [
      { ...a, qty: 2 },
      { ...b, qty: 1 },
    ], { sort: 1 }),
    make('paket-hemat-stok', 'hemat', 'Paket Hemat Stok Dapur (contoh)', 'Paket contoh. Cocok untuk stok seminggu.', [
      { ...a, qty: 3 },
      { ...b, qty: 2 },
    ], { sort: 2 }),
    make('paket-masak-sop', 'masak', 'Paket Masak Sop Ayam (contoh)', 'Paket contoh: bahan utama sudah ada di paket, bumbu dapur siapkan sendiri.', [
      { ...a, qty: 1 },
      { ...b, qty: 1 },
    ], {
      sort: 3,
      recipe: {
        ingredients: [
          'Bahan dari paket ini (ayam dan ceker)',
          '2 batang wortel, potong-potong',
          '2 buah kentang, potong dadu',
          '4 siung bawang putih, haluskan',
          '1 sdt merica bubuk, garam secukupnya',
          'Daun bawang dan seledri untuk taburan',
        ],
        steps: [
          'Cuci bersih ayam dan ceker, lalu rebus sebentar dan buang air rebusan pertama.',
          'Tumis bawang putih sampai harum, masukkan ke dalam panci berisi air bersih.',
          'Masukkan ayam dan ceker, masak dengan api kecil selama 40 menit.',
          'Tambahkan wortel dan kentang, masak sampai empuk.',
          'Bumbui dengan merica dan garam, koreksi rasa.',
          'Sajikan hangat dengan taburan daun bawang dan seledri.',
        ],
      },
    }),
  ])
}

// --- Pengelolaan dari admin (Owner dan Staf) -------------------------------

async function bundlesCol() {
  const db = getDb()
  if (!db) throw new Error('Database belum tersambung (MONGO_URL).')
  const { ensureSchema } = await import('@/lib/schema')
  await ensureSchema()
  return db.collection('bundles')
}

// Semua paket, termasuk yang disembunyikan.
export async function listAllBundles() {
  const col = await bundlesCol()
  const docs = await col.find({}).sort({ sort: 1 }).toArray()
  return docs.map(toBundle)
}

// Simpan paket baru (tanpa id) atau ubah paket yang ada (dengan id).
// Mengembalikan { bundle } atau { error, status }.
export async function saveBundle(input, id) {
  const parsed = sanitizeBundleInput(input)
  if (parsed.error) return { error: parsed.error, status: 400 }
  const value = parsed.value

  const col = await bundlesCol()
  const db = getDb()

  // Produk isi paket harus ada dan aktif.
  const ids = value.items.map((it) => it.variantId)
  const found = await db.collection('variants').find({ _id: { $in: ids }, active: { $ne: false } }).toArray()
  const foundIds = new Set(found.map((v) => String(v._id)))
  const missing = ids.filter((x) => !foundIds.has(x))
  if (missing.length) return { error: 'Ada produk isi paket yang sudah tidak tersedia. Pilih ulang produknya.', status: 400 }

  const now = new Date().toISOString()
  if (id) {
    const existing = await col.findOne({ _id: id })
    if (!existing) return { error: 'Paket tidak ditemukan.', status: 404 }
    await col.updateOne({ _id: id }, { $set: { ...value, updatedAt: now, isSample: false } })
    return { bundle: toBundle({ ...existing, ...value, _id: id }) }
  }

  const last = await col.find({}).sort({ sort: -1 }).limit(1).toArray()
  const newId = `paket-${value.type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
  const doc = { _id: newId, ...value, isSample: false, sort: (last[0]?.sort ?? 0) + 1, createdAt: now, updatedAt: now }
  await col.insertOne(doc)
  return { bundle: toBundle(doc) }
}

export async function deleteBundle(id) {
  const col = await bundlesCol()
  await col.deleteMany({ _id: id })
}
