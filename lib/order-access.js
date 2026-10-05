// Akses pembeli ke halaman pesanannya TANPA login.
// Dua cara: (1) kunci akses (HMAC nomor pesanan) yang dibawa tautan dari checkout,
// (2) nomor pesanan + nomor WhatsApp yang dipakai saat memesan (halaman Lacak).
// Murni logika supaya mudah diuji.
import crypto from 'crypto'

// "0812-3456 7890", "+62 812...", "62812..." -> "62812..."
export function normalizePhone(input) {
  let d = String(input ?? '').replace(/\D/g, '')
  if (d.startsWith('62')) return d
  if (d.startsWith('0')) return `62${d.slice(1)}`
  if (d.startsWith('8')) return `62${d}`
  return d
}

export function phonesMatch(a, b) {
  const x = normalizePhone(a)
  const y = normalizePhone(b)
  return x.length >= 9 && x === y
}

export function accessKey(orderId, secret) {
  if (!secret) throw new Error('ADMIN_SESSION_SECRET belum diatur di environment variables.')
  return crypto.createHmac('sha256', secret).update(`pesanan:${orderId}`).digest('hex').slice(0, 24)
}

export function verifyAccessKey(orderId, key, secret) {
  if (!secret || typeof key !== 'string' || key.length !== 24) return false
  const expected = Buffer.from(accessKey(orderId, secret))
  const given = Buffer.from(key)
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}

// Pembeli hanya boleh membatalkan pesanan yang belum dibayar.
export const customerCanCancel = (status) => status === 'menunggu_bayar'
