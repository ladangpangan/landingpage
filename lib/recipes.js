// Inspirasi menu (koleksi recipes, _id = slug). Validasi & bentuk tampilan murni ada di lib/recipe-input.js.
import { getDb } from '@/lib/mongo'
import { getLandingSettings } from '@/lib/db'
import { sanitizeRecipeInput, slugify, buildSampleRecipes } from '@/lib/recipe-input'

function db() {
  const d = getDb()
  if (!d) throw new Error('Database belum tersambung (MONGO_URL).')
  return d
}

const toRecipe = (d) => ({
  id: String(d._id),
  title: d.title,
  description: d.description || '',
  image: d.image || '',
  minutes: d.minutes || 0,
  servings: d.servings || 0,
  ingredients: d.ingredients || [],
  extras: d.extras || [],
  steps: d.steps || [],
  active: d.active !== false,
  isSample: !!d.isSample,
  sort: d.sort || 0,
})

// Membuat 6 resep contoh SEKALI (bendera di recipe_flags). Aman dari balapan dua permintaan sekaligus.
export async function ensureSampleRecipes() {
  const d = db()
  const flags = d.collection('recipe_flags')
  if (await flags.findOne({ _id: 'samples-seeded' })) return
  try {
    await flags.insertOne({ _id: 'samples-seeded', at: new Date().toISOString() })
  } catch {
    return // permintaan lain baru saja membuatnya (_id unik menjamin hanya satu yang berhasil)
  }
  try {
    const { products } = await getLandingSettings()
    const now = new Date().toISOString()
    await d.collection('recipes').insertMany(buildSampleRecipes(products).map((r) => ({ _id: r.id, ...r, id: undefined, createdAt: now, updatedAt: now })))
  } catch (e) {
    console.error('[recipes] gagal membuat resep contoh:', e?.message || e)
  }
}

export async function listActiveRecipes() {
  try {
    await ensureSampleRecipes()
    const docs = await db().collection('recipes').find({ active: { $ne: false } }).sort({ sort: 1, createdAt: -1 }).toArray()
    return docs.map(toRecipe)
  } catch (e) {
    console.error('[recipes] gagal membaca resep:', e?.message || e)
    return []
  }
}

export async function getActiveRecipe(id) {
  const doc = await db().collection('recipes').findOne({ _id: String(id) })
  return doc && doc.active !== false ? toRecipe(doc) : null
}

export async function listAllRecipes() {
  await ensureSampleRecipes()
  const docs = await db().collection('recipes').find({}).sort({ sort: 1, createdAt: -1 }).toArray()
  return docs.map(toRecipe)
}

// Simpan resep baru atau ubah (existingId). { ok, id } atau { ok:false, error, status }.
export async function saveRecipe(input, existingId) {
  const r = sanitizeRecipeInput(input)
  if (r.error) return { ok: false, status: 400, error: r.error }
  const c = db().collection('recipes')
  const now = new Date().toISOString()
  if (existingId) {
    const res = await c.updateOne({ _id: existingId }, { $set: { ...r.value, isSample: false, updatedAt: now } })
    if (!res.matchedCount) return { ok: false, status: 404, error: 'Resep tidak ditemukan.' }
    return { ok: true, id: existingId }
  }
  const base = slugify(r.value.title) || 'resep'
  let id = base
  for (let i = 2; await c.findOne({ _id: id }); i += 1) id = `${base}-${i}`
  await c.insertOne({ _id: id, ...r.value, isSample: false, createdAt: now, updatedAt: now })
  return { ok: true, id }
}

export async function deleteRecipe(id) {
  const c = db().collection('recipes')
  if (!(await c.findOne({ _id: String(id) }))) return false
  await c.deleteMany({ _id: String(id) })
  return true
}
