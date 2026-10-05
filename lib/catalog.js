// Katalog produk (koleksi products + variants).
//
// Untuk saat ini tampilan toko & admin masih memakai bentuk "datar": satu
// produk = satu varian bawaan dengan id yang sama. Bentuk datar inilah yang
// dibaca halaman toko, keranjang, dan checkout. Kelola varian/paket yang
// sebenarnya hadir di Tahap 2 dan 4.
import { getDb } from '@/lib/mongo'
import { DEFAULT_PRODUCTS } from '@/lib/default-products'
import { normalizeStock } from '@/lib/cart-math'

const DEFAULT_WEIGHT_KG = 1

export function sanitizeFlatProducts(products) {
  if (!Array.isArray(products)) return []
  const seen = new Set()
  const out = []
  for (const p of products) {
    if (!p || !p.id || !p.name) continue
    const id = String(p.id).trim().slice(0, 60)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: String(p.name).trim().slice(0, 100),
      category: String(p.category || '').trim().slice(0, 60) || 'Lainnya',
      unit: String(p.unit || '').trim().slice(0, 60),
      price: Math.max(0, Math.round(Number(p.price) || 0)),
      image: String(p.image || '').trim().slice(0, 300),
      description: String(p.description || '').trim().slice(0, 500),
      isPromo: !!p.isPromo,
      erpCode: String(p.erpCode || '').trim().slice(0, 60),
      // undefined = jangan ubah stok yang sudah ada; null = tak terbatas.
      stock: p.stock === undefined ? undefined : normalizeStock(p.stock),
    })
  }
  return out
}

export async function getFlatProducts() {
  const db = getDb()
  if (!db) return DEFAULT_PRODUCTS.map((p) => ({ ...p, erpCode: '', stock: null, weightKg: DEFAULT_WEIGHT_KG }))
  try {
    const { ensureSchema } = await import('@/lib/schema')
    await ensureSchema()
    const [products, variants] = await Promise.all([
      db.collection('products').find({ active: { $ne: false } }).toArray(),
      db.collection('variants').find({ active: { $ne: false } }).toArray(),
    ])
    const byProduct = new Map()
    for (const v of variants) {
      if (!byProduct.has(v.productId)) byProduct.set(v.productId, [])
      byProduct.get(v.productId).push(v)
    }
    const flat = []
    for (const p of products) {
      for (const v of byProduct.get(p._id) || []) {
        flat.push({
          id: v._id,
          name: v.label ? `${p.name} (${v.label})` : p.name,
          category: p.category || 'Lainnya',
          unit: v.unit || '',
          price: v.price,
          image: p.image || '',
          description: p.description || '',
          isPromo: !!p.isPromo,
          erpCode: v.erpCode || p.erpCode || '',
          stock: normalizeStock(v.stock),
          weightKg: v.weightKg ?? DEFAULT_WEIGHT_KG,
        })
      }
    }
    // Urutan stabil: sesuai urutan input (field sort), lalu nama.
    const order = new Map(products.map((p) => [p._id, p.sort ?? 0]))
    flat.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    return flat.length ? flat : []
  } catch (e) {
    console.error('[catalog] gagal membaca katalog:', e?.message || e)
    return DEFAULT_PRODUCTS.map((p) => ({ ...p, erpCode: '', stock: null, weightKg: DEFAULT_WEIGHT_KG }))
  }
}

export async function saveFlatProducts(input) {
  const db = getDb()
  if (!db) throw new Error('MONGO_URL belum diatur di environment variables.')
  const { ensureSchema } = await import('@/lib/schema')
  await ensureSchema()
  const list = sanitizeFlatProducts(input)
  if (!list.length) throw new Error('Minimal harus ada satu produk.')
  const now = new Date().toISOString()

  const products = db.collection('products')
  const variants = db.collection('variants')
  await Promise.all(
    list.map(async (p, i) => {
      await products.updateOne(
        { _id: p.id },
        {
          $set: {
            name: p.name,
            category: p.category,
            description: p.description,
            image: p.image,
            isPromo: p.isPromo,
            erpCode: p.erpCode,
            active: true,
            sort: i,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      )
      const variantSet = { productId: p.id, label: '', unit: p.unit, price: p.price, erpCode: p.erpCode, active: true, updatedAt: now }
      const variantInsert = { weightKg: DEFAULT_WEIGHT_KG, createdAt: now }
      if (p.stock === undefined) variantInsert.stock = null
      else variantSet.stock = p.stock
      await variants.updateOne({ _id: p.id }, { $set: variantSet, $setOnInsert: variantInsert }, { upsert: true })
    })
  )
  const ids = list.map((p) => p.id)
  await Promise.all([
    products.deleteMany({ _id: { $nin: ids } }),
    variants.deleteMany({ productId: { $nin: ids } }),
  ])
}

// Dipanggil dari ensureSchema(): bila koleksi products masih kosong, isi dari
// produk lama di dokumen settings (atau produk contoh bawaan).
export async function migrateLegacyCatalog() {
  const db = getDb()
  if (!db) return
  if ((await db.collection('products').countDocuments({}, { limit: 1 })) > 0) return
  const legacy = await db.collection('settings').findOne({ _id: 'landing' })
  const source = legacy?.products?.length ? legacy.products : DEFAULT_PRODUCTS
  const list = sanitizeFlatProducts(source)
  const now = new Date().toISOString()
  await db.collection('products').insertMany(
    list.map((p, i) => ({
      _id: p.id, name: p.name, category: p.category, description: p.description, image: p.image,
      isPromo: p.isPromo, erpCode: p.erpCode, active: true, sort: i, createdAt: now, updatedAt: now,
    }))
  )
  await db.collection('variants').insertMany(
    list.map((p) => ({
      _id: p.id, productId: p.id, label: '', unit: p.unit, price: p.price, weightKg: DEFAULT_WEIGHT_KG,
      stock: null, erpCode: p.erpCode, active: true, createdAt: now, updatedAt: now,
    }))
  )
}
