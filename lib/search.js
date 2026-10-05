// Pencarian produk: tidak peduli huruf besar/kecil atau tanda baca, dan semua
// kata yang diketik harus ada (urutan bebas). Murni logika.
export function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesQuery(fields, query) {
  const tokens = normalizeText(query).split(' ').filter(Boolean)
  if (!tokens.length) return true
  const haystack = normalizeText(Array.isArray(fields) ? fields.join(' ') : fields)
  return tokens.every((t) => haystack.includes(t))
}
