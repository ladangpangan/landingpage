// Validasi isian Paket Hemat / Paket Masak dari admin. Murni logika (tanpa
// database) supaya mudah diuji. Pemeriksaan bahwa produk isi paket benar-benar
// ada dilakukan di lib/bundles.js (butuh database).

const MAX_ITEMS = 20
const MAX_QTY = 99

function cleanLines(value, maxLen = 300, maxCount = 40) {
  if (!Array.isArray(value)) return []
  return value
    .map((x) => String(x ?? '').trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxCount)
}

// Mengembalikan { value } bila sah, atau { error } berisi pesan untuk pemilik.
export function sanitizeBundleInput(input) {
  if (!input || typeof input !== 'object') return { error: 'Data paket tidak valid.' }

  const type = input.type === 'masak' ? 'masak' : input.type === 'hemat' ? 'hemat' : null
  if (!type) return { error: 'Jenis paket harus Hemat atau Masak.' }

  const name = String(input.name ?? '').trim().slice(0, 100)
  if (!name) return { error: 'Nama paket wajib diisi.' }

  const price = Math.round(Number(input.price))
  if (!Number.isFinite(price) || price <= 0) return { error: 'Harga paket harus lebih dari 0.' }

  // Gabungkan baris produk yang sama.
  const merged = new Map()
  for (const line of Array.isArray(input.items) ? input.items : []) {
    const variantId = String(line?.variantId ?? '').trim().slice(0, 60)
    if (!variantId) return { error: 'Ada baris isi paket yang belum memilih produk.' }
    const qty = Number(line?.qty)
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return { error: `Jumlah tiap produk dalam paket harus 1 sampai ${MAX_QTY}.` }
    }
    merged.set(variantId, (merged.get(variantId) || 0) + qty)
  }
  if (merged.size === 0) return { error: 'Paket minimal berisi satu produk.' }
  if (merged.size > MAX_ITEMS) return { error: `Isi paket maksimal ${MAX_ITEMS} produk.` }
  for (const qty of merged.values()) {
    if (qty > MAX_QTY) return { error: `Jumlah tiap produk dalam paket harus 1 sampai ${MAX_QTY}.` }
  }

  return {
    value: {
      type,
      name,
      description: String(input.description ?? '').trim().slice(0, 500),
      image: String(input.image ?? '').trim().slice(0, 300),
      price,
      items: Array.from(merged, ([variantId, qty]) => ({ variantId, qty })),
      recipe: {
        ingredients: cleanLines(input.recipe?.ingredients),
        steps: cleanLines(input.recipe?.steps),
      },
      erpCode: String(input.erpCode ?? '').trim().slice(0, 60),
      active: input.active !== false,
    },
  }
}
