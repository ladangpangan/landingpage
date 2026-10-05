// Verifikasi notifikasi Midtrans. Murni logika.
import crypto from 'crypto'

export function expectedSignature({ order_id, status_code, gross_amount }, serverKey) {
  return crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
    .digest('hex')
}

export function isValidSignature(notification, serverKey) {
  const given = String(notification?.signature_key || '')
  const expected = expectedSignature(notification || {}, serverKey)
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Midtrans mengirim gross_amount sebagai teks, mis. "64000.00".
export function amountMatches(grossAmountFromMidtrans, orderGrossAmount) {
  const amount = Number(grossAmountFromMidtrans)
  return Number.isFinite(amount) && Math.round(amount) === Number(orderGrossAmount) && amount >= 0
}
