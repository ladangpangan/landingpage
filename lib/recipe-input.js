// Inspirasi menu (resep). Murni logika (tanpa database) supaya mudah diuji.
//   recipe: { id, title, description, image, minutes, servings,
//             ingredients: [{ productId, qty }]  (bahan yang dijual di toko, bisa dimasukkan ke keranjang)
//             extras: [string]                   (bahan lain: bumbu, sayur, dll.)
//             steps: [string], active, isSample }

const cleanLines = (arr, max, maxLen) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => String(x ?? '').trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, max)

export function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

// Validasi isian admin. { value } atau { error }.
export function sanitizeRecipeInput(input) {
  if (!input || typeof input !== 'object') return { error: 'Data resep tidak valid.' }
  const title = String(input.title || '').trim().slice(0, 80)
  if (title.length < 3) return { error: 'Judul resep minimal 3 huruf.' }
  const steps = cleanLines(input.steps, 20, 400)
  if (steps.length === 0) return { error: 'Isi minimal satu langkah memasak.' }
  const minutes = Math.round(Number(input.minutes) || 0)
  if (minutes < 0 || minutes > 600) return { error: 'Waktu masak 0 sampai 600 menit.' }
  const servings = Math.round(Number(input.servings) || 0)
  if (servings < 0 || servings > 50) return { error: 'Porsi 0 sampai 50.' }
  const seen = new Set()
  const ingredients = []
  for (const it of Array.isArray(input.ingredients) ? input.ingredients : []) {
    const productId = String(it?.productId || '').trim()
    if (!productId || seen.has(productId)) continue
    const qty = Math.round(Number(it?.qty))
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) return { error: 'Jumlah tiap bahan harus 1 sampai 20.' }
    seen.add(productId)
    ingredients.push({ productId, qty })
  }
  if (ingredients.length > 12) return { error: 'Maksimal 12 bahan dari toko.' }
  const image = String(input.image || '').trim().slice(0, 300)
  if (image && !/^(\/api\/uploads\/|https?:\/\/)/.test(image)) return { error: 'Alamat foto tidak valid.' }
  return {
    value: {
      title,
      description: String(input.description || '').trim().slice(0, 300),
      image,
      minutes,
      servings,
      ingredients,
      extras: cleanLines(input.extras, 20, 100),
      steps,
      active: input.active !== false,
      sort: Math.round(Number(input.sort) || 0),
    },
  }
}

// Bentuk untuk pembeli: bahan toko lengkap dengan harga/stok, bahan hilang (produk dihapus) dibuang.
// productsById: Map id -> produk publik { id, name, unit, price, image, soldOut }.
export function toPublicRecipe(recipe, productsById) {
  const ingredients = []
  let missing = 0
  for (const it of recipe.ingredients || []) {
    const p = productsById.get(it.productId)
    if (!p) { missing += 1; continue }
    ingredients.push({ productId: p.id, name: p.name, unit: p.unit || '', price: p.price, image: p.image || '', qty: it.qty, soldOut: !!p.soldOut })
  }
  const available = ingredients.filter((i) => !i.soldOut)
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description || '',
    image: recipe.image || '',
    minutes: recipe.minutes || 0,
    servings: recipe.servings || 0,
    ingredients,
    extras: recipe.extras || [],
    steps: recipe.steps || [],
    isSample: !!recipe.isSample,
    missingIngredients: missing,
    cartTotal: available.reduce((sum, i) => sum + i.price * i.qty, 0),
    cartCount: available.length,
    allAvailable: ingredients.length > 0 && available.length === ingredients.length,
  }
}

// Resep contoh yang dibuat sekali. Bahan toko dicari dari kata kunci nama produk; tidak ketemu -> jadi bahan lain.
export const SAMPLE_RECIPES = [
  { id: 'sop-ayam-bening', key: 'karkas', title: 'Sop Ayam Bening (contoh)', minutes: 50, servings: 4, description: 'Sop hangat untuk keluarga: kuah bening segar dengan wortel dan kentang.',
    extras: ['2 batang wortel', '2 buah kentang', '4 siung bawang putih', 'Daun bawang dan seledri', 'Merica dan garam'],
    steps: ['Cuci ayam, rebus sebentar lalu buang air rebusan pertama.', 'Tumis bawang putih sampai harum, masukkan ke panci berisi air bersih.', 'Masukkan ayam, masak api kecil 40 menit.', 'Tambahkan wortel dan kentang sampai empuk.', 'Bumbui merica dan garam, taburi daun bawang dan seledri.'] },
  { id: 'ayam-goreng-bumbu-kuning', key: 'paha', title: 'Ayam Goreng Bumbu Kuning (contoh)', minutes: 45, servings: 4, description: 'Paha ayam bumbu kuning gurih, goreng sampai kecokelatan.',
    extras: ['5 siung bawang putih', '4 siung bawang merah', '1 ruas kunyit', '1 sdt ketumbar', 'Garam dan gula secukupnya', 'Minyak untuk menggoreng'],
    steps: ['Haluskan bumbu: bawang, kunyit, dan ketumbar.', 'Lumuri ayam dengan bumbu, diamkan 30 menit.', 'Rebus ayam beserta bumbu dengan sedikit air sampai bumbu meresap.', 'Goreng sampai kecokelatan, tiriskan.', 'Sajikan dengan nasi hangat dan sambal.'] },
  { id: 'ayam-bakar-madu', key: 'dada', title: 'Ayam Bakar Madu (contoh)', minutes: 40, servings: 3, description: 'Dada ayam bakar dengan olesan madu manis gurih.',
    extras: ['3 sdm madu', '2 sdm kecap manis', '3 siung bawang putih', '1 sdm mentega', 'Garam dan merica'],
    steps: ['Campur madu, kecap, bawang putih parut, garam, dan merica.', 'Lumuri ayam dan diamkan 20 menit.', 'Bakar atau panggang sambil sesekali diolesi bumbu.', 'Angkat setelah matang dan berwarna cokelat keemasan.'] },
  { id: 'sayap-pedas-manis', key: 'sayap', title: 'Sayap Ayam Pedas Manis (contoh)', minutes: 35, servings: 3, description: 'Camilan atau lauk: sayap goreng dengan saus pedas manis.',
    extras: ['3 sdm saus sambal', '2 sdm madu', '3 siung bawang putih', 'Tepung bumbu', 'Minyak untuk menggoreng'],
    steps: ['Lumuri sayap dengan tepung bumbu, goreng sampai garing.', 'Tumis bawang putih, tambahkan saus sambal dan madu.', 'Masukkan sayap, aduk sampai terbalut saus.', 'Sajikan selagi hangat.'] },
  { id: 'chicken-katsu', key: 'fillet', title: 'Chicken Katsu Renyah (contoh)', minutes: 30, servings: 3, description: 'Fillet ayam berbalut tepung panko, renyah di luar dan lembut di dalam.',
    extras: ['1 butir telur', 'Tepung terigu dan tepung panko', 'Garam dan merica', 'Saus tonkatsu atau mayones', 'Minyak untuk menggoreng'],
    steps: ['Pipihkan fillet, bumbui garam dan merica.', 'Gulingkan ke tepung terigu, telur, lalu tepung panko.', 'Goreng dengan api sedang sampai keemasan.', 'Tiriskan, iris, sajikan dengan saus.'] },
  { id: 'kuah-ceker-pedas', key: 'ceker', title: 'Ceker Kuah Pedas (contoh)', minutes: 60, servings: 4, description: 'Ceker empuk dalam kuah pedas gurih, cocok untuk hari hujan.',
    extras: ['6 siung bawang putih', '8 buah cabai rawit', '2 batang serai', 'Daun jeruk', 'Garam dan kaldu bubuk'],
    steps: ['Rebus ceker 10 menit, buang air rebusan.', 'Haluskan bawang putih dan cabai, tumis dengan serai dan daun jeruk.', 'Masukkan ceker dan air, masak 40 menit sampai empuk.', 'Bumbui garam dan kaldu, koreksi rasa.'] },
]

// Susun dokumen resep contoh dengan mencocokkan kata kunci ke nama produk toko (huruf kecil).
export function buildSampleRecipes(products) {
  return SAMPLE_RECIPES.map((r, i) => {
    const hit = (products || []).find((p) => String(p.name || '').toLowerCase().includes(r.key))
    return {
      id: r.id, title: r.title, description: r.description, image: '', minutes: r.minutes, servings: r.servings,
      ingredients: hit ? [{ productId: hit.id, qty: 1 }] : [],
      extras: r.extras, steps: r.steps, active: true, isSample: true, sort: i + 1,
    }
  })
}
