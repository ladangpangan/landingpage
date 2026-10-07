// Ongkir, zona, dan jadwal kirim. Murni logika (tanpa database) supaya mudah
// diuji. Semua angka di sini dipakai SERVER sebagai sumber kebenaran.
//
// Waktu memakai WIB (UTC+7, tanpa jam musim panas).

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000
const EARTH_RADIUS_KM = 6371

export function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// { date: 'YYYY-MM-DD', minutes: menit sejak 00:00 } di WIB.
export function wibNow(now = new Date()) {
  const w = new Date(now.getTime() + WIB_OFFSET_MS)
  return { date: w.toISOString().slice(0, 10), minutes: w.getUTCHours() * 60 + w.getUTCMinutes() }
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}

// --- Jarak dan zona ---------------------------------------------------------

export function validLatLng(loc) {
  const lat = Number(loc?.lat)
  const lng = Number(loc?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export function haversineKm(a, b) {
  const rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Perkiraan jarak jalan = garis lurus x faktor jalan (diatur di admin).
export function roadDistanceKm(warehouse, loc, roadFactor = 1) {
  const factor = Number.isFinite(Number(roadFactor)) && Number(roadFactor) >= 1 ? Number(roadFactor) : 1
  return Math.round(haversineKm(warehouse, loc) * factor * 10) / 10
}

// Zona aktif pertama (urut jarak) yang jangkauannya cukup. null = di luar jangkauan.
export function zoneForDistance(km, zones) {
  const sorted = (zones || []).filter((z) => z.active !== false).sort((a, b) => a.maxKm - b.maxKm)
  return sorted.find((z) => km <= z.maxKm) || null
}

// Menentukan zona dari lokasi pembeli. Mengembalikan { ok, distanceKm, zone } atau { ok:false, error, code }.
export function locateZone(loc, config, zones) {
  const point = validLatLng(loc)
  if (!point) return { ok: false, code: 'lokasi', error: 'Lokasi belum diketahui. Tekan "Pakai lokasi saya".' }
  const wh = validLatLng(config?.warehouse)
  if (!wh) return { ok: false, code: 'gudang', error: 'Lokasi gudang belum diatur oleh toko. Silakan tanya lewat WhatsApp.' }
  const distanceKm = roadDistanceKm(wh, point, config?.roadFactor)
  const zone = zoneForDistance(distanceKm, zones)
  if (!zone) return { ok: false, code: 'jauh', distanceKm, error: 'Alamat Anda di luar jangkauan pengiriman kami saat ini. Silakan tanya lewat WhatsApp.' }
  return { ok: true, distanceKm, zone }
}

// --- Kapasitas dan slot ------------------------------------------------------

export function slotCapacityKg(config) {
  const couriers = Math.max(1, Math.floor(Number(config?.couriers) || 1))
  const trips = Math.max(1, Math.floor(Number(config?.tripsPerSlot) || 1))
  const perTrip = Math.max(1, Number(config?.maxKgPerTrip) || 40)
  return couriers * trips * perTrip
}

export const slotKey = (date, slotId) => `${date}|${slotId}`

// Tanggal yang boleh dipilih untuk "Terjadwal": besok sampai N hari ke depan.
export function scheduledDates(now, config) {
  const days = Math.min(7, Math.max(1, Math.floor(Number(config?.scheduleDaysAhead) || 3)))
  const today = wibNow(now).date
  return Array.from({ length: days }, (_, i) => addDays(today, i + 1))
}

// Daftar slot untuk satu tanggal, lengkap dengan sisa kapasitas.
// usedKg: objek { 'YYYY-MM-DD|slotId': kgTerpakai }
export function slotOptions({ date, config, usedKg = {}, orderKg, now }) {
  const cap = slotCapacityKg(config)
  const { date: today, minutes } = wibNow(now)
  return (config?.slots || []).map((slot) => {
    const used = Number(usedKg[slotKey(date, slot.id)]) || 0
    const remainingKg = Math.max(0, cap - used)
    let reason = null
    if (date < today || (date === today && toMinutes(slot.end) <= minutes)) reason = 'lewat'
    else if (orderKg > cap) reason = 'terlalu_berat'
    else if (remainingKg < orderKg) reason = 'penuh'
    return { id: slot.id, label: slot.label, start: slot.start, end: slot.end, remainingKg, available: reason === null, reason }
  })
}

// Kurir toko beroperasi sampai jam batas (cutoffHour, 17.00 WIB). Sesudahnya hanya kurir instan (Biteship).
// Berlaku untuk semua mode kurir toko, termasuk Terjadwal. Murni agar mudah diuji.
export function storeCourierOpen({ config, now }) {
  const cutoff = (Number(config?.cutoffHour) || 17) * 60
  return wibNow(now).minutes < cutoff
}

// "Kirim Sekarang": bayar sebelum jam batas (17.00) dikirim hari itu, memakai
// slot hari ini yang belum lewat dan masih muat. Mengembalikan { ok, date, slot } atau { ok:false, error }.
export function immediateSlot({ config, usedKg, orderKg, now }) {
  const { date, minutes } = wibNow(now)
  const cutoff = (Number(config?.cutoffHour) || 17) * 60
  if (minutes >= cutoff) {
    return { ok: false, error: `Kirim Sekarang hanya untuk pembayaran sebelum jam ${String(Math.floor(cutoff / 60)).padStart(2, '0')}.00. Silakan pilih Terjadwal.` }
  }
  const slots = slotOptions({ date, config, usedKg, orderKg, now })
  const pick = slots.find((s) => s.available)
  if (pick) return { ok: true, date, slot: pick }
  if (slots.some((s) => s.reason === 'terlalu_berat')) {
    return { ok: false, error: 'Pesanan ini terlalu berat untuk satu pengiriman. Silakan tanya lewat WhatsApp.' }
  }
  return { ok: false, error: 'Pengiriman hari ini sudah penuh. Silakan pilih Terjadwal.' }
}

// Memeriksa pilihan jadwal dari pembeli. delivery: { mode: 'sekarang'|'terjadwal', date?, slotId? }
export function resolveDelivery({ delivery, config, usedKg, orderKg, now }) {
  if (delivery?.mode === 'sekarang') {
    const r = immediateSlot({ config, usedKg, orderKg, now })
    if (!r.ok) return r
    return { ok: true, mode: 'sekarang', date: r.date, slotId: r.slot.id, slotLabel: r.slot.label, start: r.slot.start, end: r.slot.end }
  }
  if (delivery?.mode === 'terjadwal') {
    const allowed = scheduledDates(now, config)
    if (!allowed.includes(String(delivery.date))) return { ok: false, error: 'Tanggal pengiriman tidak tersedia. Silakan pilih tanggal lain.' }
    const slot = slotOptions({ date: delivery.date, config, usedKg, orderKg, now }).find((s) => s.id === delivery.slotId)
    if (!slot) return { ok: false, error: 'Pilih jam pengiriman.' }
    if (!slot.available) {
      return {
        ok: false,
        error: slot.reason === 'terlalu_berat' ? 'Pesanan ini terlalu berat untuk satu pengiriman. Silakan tanya lewat WhatsApp.' : 'Jam pengiriman itu sudah penuh. Silakan pilih jam lain.',
      }
    }
    return { ok: true, mode: 'terjadwal', date: delivery.date, slotId: slot.id, slotLabel: slot.label, start: slot.start, end: slot.end }
  }
  return { ok: false, error: 'Pilih cara pengiriman: Kirim Sekarang atau Terjadwal.' }
}
