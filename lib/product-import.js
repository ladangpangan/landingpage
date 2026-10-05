// Impor produk dari berkas CSV (Excel: Simpan Sebagai > CSV). Murni logika.
//
// Kolom (nama kolom bebas huruf besar/kecil, spasi/garis bawah diabaikan):
//   nama*, kategori, satuan, harga*, berat (kg), stok, deskripsi, promo (ya/tidak),
//   kode_erp, id, gambar
// Produk yang sudah ada dikenali dari kode_erp, lalu id, lalu nama yang sama persis.

export const MAX_ROWS = 500

// Pemisah kolom otomatis: Excel versi Indonesia memakai titik koma.
export function detectDelimiter(headerLine) {
  const counts = [',', ';', '\t'].map((d) => [d, headerLine.split(d).length - 1])
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][1] > 0 ? counts[0][0] : ','
}

// Mengurai CSV (mendukung tanda kutip, kutip ganda, dan baris baru dalam kutip).
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] || ''
  const delim = detectDelimiter(firstLine)
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === delim) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''))
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const ALIAS = {
  nama: 'name', namaproduk: 'name', name: 'name', produk: 'name',
  kategori: 'category', category: 'category',
  satuan: 'unit', unit: 'unit',
  harga: 'price', hargarp: 'price', price: 'price',
  berat: 'weightKg', beratkg: 'weightKg', weight: 'weightKg', weightkg: 'weightKg',
  stok: 'stock', stock: 'stock',
  deskripsi: 'description', description: 'description',
  promo: 'isPromo', ispromo: 'isPromo',
  kodeerp: 'erpCode', erp: 'erpCode', erpcode: 'erpCode', kode: 'erpCode',
  id: 'id',
  gambar: 'image', foto: 'image', image: 'image',
}

const parseInteger = (v) => {
  const digits = String(v ?? '').replace(/[^0-9]/g, '')
  return digits === '' ? null : Number(digits)
}
const parseDecimal = (v) => {
  const s = String(v ?? '').trim().toLowerCase().replace(/\s*kg$/, '').replace(',', '.')
  if (s === '') return null
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}
const parseBool = (v) => ['ya', 'y', 'yes', 'true', '1', 'x', 'promo'].includes(String(v ?? '').trim().toLowerCase())

// Mengubah baris CSV menjadi daftar isian. Mengembalikan { items, errors, headerError }.
export function rowsToItems(rows) {
  if (!rows.length) return { items: [], errors: [], headerError: 'Berkas kosong.' }
  const map = rows[0].map((h) => ALIAS[norm(h)] || null)
  if (!map.includes('name')) return { items: [], errors: [], headerError: 'Kolom "nama" tidak ditemukan di baris pertama.' }
  if (!map.includes('price')) return { items: [], errors: [], headerError: 'Kolom "harga" tidak ditemukan di baris pertama.' }
  const body = rows.slice(1)
  if (body.length > MAX_ROWS) return { items: [], errors: [], headerError: `Terlalu banyak baris (maksimal ${MAX_ROWS}).` }
  const items = []
  const errors = []
  body.forEach((cells, i) => {
    const line = i + 2
    const raw = {}
    map.forEach((key, c) => {
      if (key) raw[key] = cells[c] ?? ''
    })
    const name = String(raw.name || '').trim().slice(0, 100)
    if (!name) return errors.push({ line, error: 'Nama produk kosong.' })
    const price = parseInteger(raw.price)
    const weight = 'weightKg' in raw ? parseDecimal(raw.weightKg) : null
    const stockRaw = 'stock' in raw ? String(raw.stock).trim() : ''
    const stock = stockRaw === '' ? undefined : parseInteger(stockRaw)
    if (Number.isNaN(weight) || (weight !== null && weight <= 0)) return errors.push({ line, name, error: 'Berat tidak valid.' })
    if (stockRaw !== '' && stock === null) return errors.push({ line, name, error: 'Stok tidak valid.' })
    items.push({
      line,
      name,
      price, // null = kosong
      category: 'category' in raw ? String(raw.category).trim().slice(0, 60) : undefined,
      unit: 'unit' in raw ? String(raw.unit).trim().slice(0, 60) : undefined,
      description: 'description' in raw ? String(raw.description).trim().slice(0, 500) : undefined,
      isPromo: 'isPromo' in raw && String(raw.isPromo).trim() !== '' ? parseBool(raw.isPromo) : undefined,
      erpCode: 'erpCode' in raw ? String(raw.erpCode).trim().slice(0, 60) : undefined,
      id: 'id' in raw ? String(raw.id).trim().slice(0, 60) : undefined,
      image: 'image' in raw ? String(raw.image).trim().slice(0, 300) : undefined,
      weightKg: weight === null ? undefined : weight,
      stock,
    })
  })
  return { items, errors }
}

// Menyusun rencana impor terhadap produk yang sudah ada.
// existing: daftar datar produk (id, name, erpCode, ...). Mengembalikan
// { creates, updates, errors, merged } dengan merged = daftar produk akhir (untuk disimpan).
export function planImport(items, existing, makeId = (i) => `produk-${Date.now().toString(36)}-${i}`) {
  const errors = []
  const byErp = new Map(existing.filter((p) => p.erpCode).map((p) => [p.erpCode.toLowerCase(), p]))
  const byId = new Map(existing.map((p) => [p.id, p]))
  const byName = new Map(existing.map((p) => [p.name.trim().toLowerCase(), p]))
  const merged = existing.map((p) => ({ ...p }))
  const indexOf = new Map(merged.map((p, i) => [p.id, i]))
  const seenErp = new Set()
  const seenTarget = new Set()
  const creates = []
  const updates = []
  let n = 0

  for (const it of items) {
    const erpKey = it.erpCode ? it.erpCode.toLowerCase() : null
    if (erpKey) {
      if (seenErp.has(erpKey)) {
        errors.push({ line: it.line, name: it.name, error: `Kode ERP "${it.erpCode}" muncul dua kali di berkas.` })
        continue
      }
      seenErp.add(erpKey)
    }
    const target = (erpKey && byErp.get(erpKey)) || (it.id && byId.get(it.id)) || byName.get(it.name.trim().toLowerCase())
    if (target) {
      if (seenTarget.has(target.id)) {
        errors.push({ line: it.line, name: it.name, error: 'Produk yang sama muncul dua kali di berkas.' })
        continue
      }
      seenTarget.add(target.id)
      if (it.price !== null && it.price <= 0) {
        errors.push({ line: it.line, name: it.name, error: 'Harga harus lebih dari 0.' })
        continue
      }
      const next = merged[indexOf.get(target.id)]
      const changes = {}
      for (const key of ['name', 'category', 'unit', 'description', 'isPromo', 'erpCode', 'image', 'weightKg', 'stock']) {
        if (it[key] !== undefined && it[key] !== '' && it[key] !== next[key]) changes[key] = it[key]
      }
      if (it.price !== null && it.price !== next.price) changes.price = it.price
      Object.assign(next, changes)
      updates.push({ line: it.line, id: target.id, name: target.name, changes: Object.keys(changes) })
    } else {
      if (it.price === null || it.price <= 0) {
        errors.push({ line: it.line, name: it.name, error: 'Harga wajib diisi (lebih dari 0) untuk produk baru.' })
        continue
      }
      const product = {
        id: makeId(n++),
        name: it.name,
        category: it.category || 'Lainnya',
        unit: it.unit || '',
        price: it.price,
        image: it.image || '',
        description: it.description || '',
        isPromo: it.isPromo === true,
        erpCode: it.erpCode || '',
        weightKg: it.weightKg ?? 1,
        stock: it.stock === undefined ? null : it.stock,
      }
      merged.push(product)
      indexOf.set(product.id, merged.length - 1)
      creates.push({ line: it.line, id: product.id, name: product.name })
    }
  }
  return { creates, updates, errors, merged }
}

// Isi berkas contoh yang bisa diunduh pemilik.
export const CSV_TEMPLATE = [
  'nama,kategori,satuan,harga,berat_kg,stok,promo,kode_erp,deskripsi',
  'Dada Ayam Fillet,Potongan Ayam,per kg,48000,1,50,tidak,ERP-DADA,Dada ayam fillet segar',
  'Paha Ayam,Potongan Ayam,per kg,38000,1,,ya,ERP-PAHA,Paha ayam frozen',
].join('\n')
