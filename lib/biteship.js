// Biteship (ongkir & pesan kurir). Bagian murni: bentuk permintaan dan membaca balasan.
// Panggilan jaringan ada di lib/biteship-api.js.
//
// CATATAN: dokumentasi biteship.com tidak bisa dibuka dari lingkungan pengembangan, jadi bentuk
// permintaan/balasan di sini mengikuti API Biteship v1 yang diketahui (rates/couriers, orders)
// dan BELUM diuji dengan Biteship asli. Pembacaannya sengaja longgar.
export const BITESHIP_BASE = 'https://api.biteship.com'

const DEFAULT_BOX = { length: 30, width: 25, height: 20 } // cm; kemasan beku perkiraan

export const optionKey = (company, type) => `${String(company || '').toLowerCase()}:${String(type || '').toLowerCase()}`

// Barang satu pesanan dijadikan satu baris (berat total dalam gram, nilai = belanja).
export function buildRatesBody({ origin, destination, allowedKeys, weightKg, subtotal }) {
  const companies = [...new Set((allowedKeys || []).map((k) => String(k).split(':')[0]).filter(Boolean))]
  return {
    origin_latitude: Number(origin.lat),
    origin_longitude: Number(origin.lng),
    destination_latitude: Number(destination.lat),
    destination_longitude: Number(destination.lng),
    couriers: companies.join(','),
    items: [
      {
        name: 'Ayam frozen',
        description: 'Makanan beku, jaga tetap dingin',
        value: Math.max(0, Math.round(Number(subtotal) || 0)),
        quantity: 1,
        weight: Math.max(100, Math.round((Number(weightKg) || 1) * 1000)),
        ...DEFAULT_BOX,
      },
    ],
  }
}

// Balasan tarif -> [{ key, company, type, name, serviceName, description, price, duration }]
export function parseRates(resp) {
  const list = Array.isArray(resp?.pricing) ? resp.pricing : Array.isArray(resp?.data?.pricing) ? resp.data.pricing : []
  const out = []
  for (const p of list) {
    const price = Number(p?.price)
    const company = String(p?.courier_code || p?.company || '').toLowerCase()
    const type = String(p?.courier_service_code || p?.type || '').toLowerCase()
    if (!company || !type || !Number.isFinite(price) || price <= 0) continue
    out.push({
      key: optionKey(company, type),
      company,
      type,
      name: String(p?.courier_name || p?.company || company).slice(0, 40),
      serviceName: String(p?.courier_service_name || p?.type || type).slice(0, 40),
      description: String(p?.description || '').slice(0, 120),
      price: Math.round(price),
      duration: String(p?.shipment_duration_range ? `${p.shipment_duration_range} ${p.shipment_duration_unit || ''}`.trim() : p?.duration || '').slice(0, 40),
    })
  }
  return out.sort((a, b) => a.price - b.price)
}

// Hanya kurir yang diizinkan Owner.
export const filterAllowed = (options, allowedKeys) => {
  const set = new Set((allowedKeys || []).map((k) => String(k).toLowerCase()))
  return options.filter((o) => set.has(o.key))
}

export const findOption = (options, key) => options.find((o) => o.key === String(key || '').toLowerCase()) || null

// Kunci cache tarif: koordinat dibulatkan ~11 m, berat dibulatkan ke 0,5 kg.
export function ratesCacheKey({ origin, destination, allowedKeys, weightKg, subtotal }) {
  const r = (n) => Number(n).toFixed(4)
  const w = Math.ceil((Number(weightKg) || 1) * 2) / 2
  const v = Math.round((Number(subtotal) || 0) / 50000)
  return [r(origin.lat), r(origin.lng), r(destination.lat), r(destination.lng), [...(allowedKeys || [])].sort().join(','), w, v].join('|')
}

// Data kontak penjemputan harus lengkap sebelum Biteship dipakai.
export function originReady(o) {
  return !!(o && String(o.contactName || '').trim() && String(o.contactPhone || '').trim() && String(o.address || '').trim())
}

export function sanitizeBiteshipSettings(input) {
  const keys = Array.isArray(input?.allowed)
    ? [...new Set(input.allowed.map((k) => String(k).toLowerCase().trim()).filter((k) => /^[a-z0-9_]+:[a-z0-9_]+$/.test(k)))].slice(0, 20)
    : undefined
  const o = input?.origin
  return {
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : undefined,
    allowed: keys,
    origin: o
      ? {
          contactName: String(o.contactName || '').trim().slice(0, 60),
          contactPhone: String(o.contactPhone || '').trim().slice(0, 30),
          contactEmail: String(o.contactEmail || '').trim().slice(0, 80),
          address: String(o.address || '').trim().slice(0, 250),
          note: String(o.note || '').trim().slice(0, 120),
        }
      : undefined,
  }
}
