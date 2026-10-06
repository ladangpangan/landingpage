// Validasi nomor WhatsApp dan alamat tersimpan. Murni logika (tanpa database/browser) supaya mudah diuji.
import { normalizePhone } from './order-access.js'

// "0812-3456-7890" / "+62 812..." -> { phone: "6281234567890" } atau { error }. Kosong dianggap "hapus nomor".
export function cleanPhone(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return { phone: '' }
  const n = normalizePhone(raw)
  if (!/^62\d{8,13}$/.test(n)) return { error: 'Nomor WhatsApp tidak valid. Contoh: 0812 3456 7890.' }
  return { phone: n }
}

// "6281234567890" -> "081234567890" (bentuk yang dibaca pembeli di kolom isian)
export function toLocalPhone(phone) {
  const d = String(phone ?? '').replace(/\D/g, '')
  return d.startsWith('62') ? `0${d.slice(2)}` : d
}

export const MAX_SAVED_ADDRESSES = 5

// Alamat untuk disimpan di HP (pembeli tanpa login). { address } atau { error }.
export function cleanLocalAddress(input) {
  const label = String(input?.label || '').trim().slice(0, 30) || 'Rumah'
  const name = String(input?.name || '').trim().slice(0, 50)
  const address = String(input?.address || '').trim().slice(0, 200)
  const p = cleanPhone(input?.phone)
  if (!name || !address || !p.phone) return { error: p.error || 'Nama, nomor WhatsApp, dan alamat wajib diisi.' }
  const blank = (v) => v === null || v === undefined || v === ''
  const lat = blank(input?.lat) ? NaN : Number(input.lat)
  const lng = blank(input?.lng) ? NaN : Number(input.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: 'Titik lokasi alamat belum ada.' }
  return { address: { label, name, phone: toLocalPhone(p.phone), address, lat, lng } }
}
