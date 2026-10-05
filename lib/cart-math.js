// Hitungan keranjang, paket, dan stok. Murni logika (tanpa database) supaya
// mudah diuji. Semua angka di sini dipakai SERVER sebagai sumber kebenaran.

export const LOW_STOCK_THRESHOLD = 5

// stock: null = tidak dilacak (tak terbatas), angka = jumlah tersedia.
export function normalizeStock(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Math.floor(Number(value))
  return Number.isFinite(n) ? Math.max(0, n) : null
}

export function stockInfo(stock) {
  const s = normalizeStock(stock)
  return {
    soldOut: s !== null && s <= 0,
    stockLeft: s !== null && s > 0 && s <= LOW_STOCK_THRESHOLD ? s : null,
  }
}

// Dibulatkan ke Rp 500 terdekat; dipakai untuk harga Paket Hemat contoh.
export function roundTo500(n) {
  return Math.round(n / 500) * 500
}

// Ringkasan satu paket dari daftar produk "datar" (productsById: Map id -> produk
// dengan name, unit, price, stock). Item yang tidak ada/nonaktif => paket tidak tersedia.
export function bundleSummary(bundle, productsById) {
  const items = []
  let normalPrice = 0
  let available = true
  let stockLeft = null
  for (const line of bundle.items || []) {
    const qty = Math.max(1, Math.floor(Number(line.qty) || 1))
    const p = productsById.get(line.variantId)
    if (!p) {
      available = false
      items.push({ id: line.variantId, name: 'Produk tidak tersedia', unit: '', qty, price: 0, image: '' })
      continue
    }
    normalPrice += p.price * qty
    items.push({ id: p.id, name: p.name, unit: p.unit, qty, price: p.price, image: p.image })
    const stock = normalizeStock(p.stock)
    if (stock !== null) {
      const sets = Math.floor(stock / qty)
      if (sets <= 0) available = false
      else if (stockLeft === null || sets < stockLeft) stockLeft = sets
    }
  }
  return {
    items,
    normalPrice,
    savings: Math.max(0, normalPrice - bundle.price),
    soldOut: !available,
    stockLeft: available && stockLeft !== null && stockLeft <= LOW_STOCK_THRESHOLD ? stockLeft : null,
  }
}

// Mengubah baris keranjang menjadi (a) rincian harga dari data server dan
// (b) kebutuhan stok per varian.
// lines: [{ kind: 'produk'|'paket', id, qty }]
// Mengembalikan { ok: true, lines, requirements } atau { ok: false, error }.
export function resolveCartLines(lines, productsById, bundlesById) {
  if (!Array.isArray(lines) || lines.length === 0) return { ok: false, error: 'Keranjang belanja kosong.' }
  const resolved = []
  const need = new Map()
  const addNeed = (variantId, qty) => need.set(variantId, (need.get(variantId) || 0) + qty)

  for (const line of lines) {
    const qty = Number(line?.qty)
    if (!Number.isInteger(qty) || qty < 1 || qty > 500) return { ok: false, error: 'Jumlah pesanan tidak valid.' }
    const kind = line?.kind === 'paket' ? 'paket' : 'produk'

    if (kind === 'produk') {
      const p = productsById.get(line.id)
      if (!p || !(p.price > 0)) return { ok: false, error: 'Produk tidak ditemukan.' }
      resolved.push({ kind, id: p.id, name: p.name, unit: p.unit, image: p.image, price: p.price, qty, erpCode: p.erpCode || '' })
      addNeed(p.id, qty)
    } else {
      const b = bundlesById.get(line.id)
      if (!b || !(b.price > 0)) return { ok: false, error: 'Paket tidak ditemukan.' }
      const summary = bundleSummary(b, productsById)
      if (summary.items.some((it) => it.price === 0)) return { ok: false, error: `Paket "${b.name}" sedang tidak tersedia.` }
      resolved.push({
        kind,
        id: b.id,
        name: b.name,
        unit: 'paket',
        image: b.image,
        price: b.price,
        qty,
        erpCode: b.erpCode || '',
        components: summary.items.map((it) => ({ id: it.id, name: it.name, qty: it.qty, erpCode: productsById.get(it.id)?.erpCode || '' })),
      })
      for (const it of summary.items) addNeed(it.id, it.qty * qty)
    }
  }
  return {
    ok: true,
    lines: resolved,
    requirements: Array.from(need, ([variantId, qty]) => ({ variantId, qty })),
  }
}

// Berat total pesanan (kg) dari kebutuhan per varian. Berat satuan produk yang
// belum diisi dianggap 1 kg.
export function orderWeightKg(requirements, productsById) {
  const total = requirements.reduce((sum, r) => {
    const w = Number(productsById.get(r.variantId)?.weightKg)
    return sum + r.qty * (Number.isFinite(w) && w > 0 ? w : 1)
  }, 0)
  return Math.round(total * 100) / 100
}
