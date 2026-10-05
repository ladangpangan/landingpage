// Biteship (ongkir & pesan kurir). Bagian murni: bentuk permintaan dan membaca balasan.
// Panggilan jaringan ada di lib/biteship-api.js.
//
// CATATAN: dokumentasi biteship.com tidak bisa dibuka dari lingkungan pengembangan, jadi bentuk
// permintaan/balasan di sini mengikuti API Biteship v1 yang diketahui (rates/couriers, orders)
// dan BELUM diuji dengan Biteship asli. Pembacaannya sengaja longgar.
import { timingSafeEqual } from 'crypto'

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

// --- Memanggil kurir (pesan pengiriman) -------------------------------------------------

// order = dokumen pesanan; origin = data penjemputan (Owner); warehouse = {lat,lng}.
export function buildOrderBody({ order, origin, warehouse }) {
  const c = order.shipping?.courier || {}
  const loc = order.location || {}
  const lines = order.items || []
  const subtotal = lines.reduce((a, i) => a + (Number(i.price) || 0) * (Number(i.qty) || 0), 0)
  const kg = Number(order.weightKg) || 1
  return {
    shipper_contact_name: origin.contactName,
    shipper_contact_phone: origin.contactPhone,
    shipper_contact_email: origin.contactEmail || undefined,
    shipper_organization: 'PT Ladang Pangan Indonesia',
    origin_contact_name: origin.contactName,
    origin_contact_phone: origin.contactPhone,
    origin_address: origin.address,
    origin_note: origin.note || undefined,
    origin_coordinate: { latitude: Number(warehouse.lat), longitude: Number(warehouse.lng) },
    destination_contact_name: order.customer?.name,
    destination_contact_phone: String(order.customer?.phone || '').replace(/[^0-9+]/g, ''),
    destination_address: order.customer?.address,
    destination_note: order.customer?.note || undefined,
    destination_coordinate: { latitude: Number(loc.lat), longitude: Number(loc.lng) },
    courier_company: c.company,
    courier_type: c.type,
    delivery_type: 'now',
    reference_id: order.orderId,
    order_note: `Pesanan ${order.orderId}. Makanan beku, mohon dijaga tetap dingin dan diantar segera.`.slice(0, 200),
    items: [
      {
        name: 'Ayam frozen',
        description: lines.map((i) => `${i.qty}x ${i.name}`).join(', ').slice(0, 200),
        category: 'food',
        value: Math.max(0, Math.round(subtotal)),
        quantity: 1,
        weight: Math.max(100, Math.round(kg * 1000)),
        ...DEFAULT_BOX,
      },
    ],
  }
}

// Balasan pembuatan order -> { id, trackingId, waybillId, link, status, price, driverName, driverPhone }
export function extractBiteshipOrder(resp) {
  const r = resp?.data && typeof resp.data === 'object' && !resp.id ? resp.data : resp || {}
  const c = r.courier || {}
  const str = (...v) => v.find((x) => typeof x === 'string' && x.trim()) || ''
  const price = Number(r.price)
  return {
    id: str(r.id),
    trackingId: str(c.tracking_id, r.tracking_id),
    waybillId: str(c.waybill_id, r.waybill_id),
    link: str(c.link, r.link),
    status: str(r.status) || 'confirmed',
    price: Number.isFinite(price) ? price : null,
    driverName: str(c.driver_name),
    driverPhone: str(c.driver_phone),
  }
}

// Webhook Biteship (status pengiriman). Dibaca longgar.
export function parseBiteshipWebhook(body) {
  const b = body && typeof body === 'object' ? body : {}
  const str = (...v) => v.find((x) => typeof x === 'string' && x.trim()) || ''
  const c = b.courier && typeof b.courier === 'object' ? b.courier : {}
  return {
    event: str(b.event),
    biteshipId: str(b.order_id, b.id),
    referenceId: str(b.reference_id, b.order_reference_id),
    status: str(b.status).toLowerCase(),
    trackingId: str(b.courier_tracking_id, c.tracking_id),
    waybillId: str(b.courier_waybill_id, c.waybill_id),
    link: str(b.courier_link, c.link),
    driverName: str(b.courier_driver_name, c.driver_name),
    driverPhone: str(b.courier_driver_phone, c.driver_phone),
    driverPlate: str(b.courier_driver_plate_number, c.driver_plate_number),
  }
}

// Status Biteship -> langkah status pesanan toko ('dikirim' | 'diterima' | null).
export function orderStatusFor(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'delivered') return 'diterima'
  if (['picked', 'dropping_off'].includes(s)) return 'dikirim'
  return null
}

// Pengiriman gagal/terhenti: perlu perhatian admin (bisa panggil ulang).
export const COURIER_PROBLEM = ['rejected', 'courier_not_found', 'cancelled', 'on_hold', 'returned', 'disposed']
export const courierProblem = (status) => COURIER_PROBLEM.includes(String(status || '').toLowerCase())
// Boleh memanggil kurir lagi hanya bila belum ada pesanan kurir yang hidup.
export const canBookCourier = (courier) => !courier || !courier.biteshipId || ['rejected', 'courier_not_found', 'cancelled'].includes(String(courier.status || '').toLowerCase())

export function verifyWebhookToken(given, expected) {
  if (typeof given !== 'string' || !expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(String(expected))
  return a.length === b.length && timingSafeEqual(a, b)
}
