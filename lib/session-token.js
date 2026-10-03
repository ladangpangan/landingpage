// Token sesi admin: "<adminId>.<versi>.<kedaluwarsa>.<tanda-tangan HMAC>".
// Murni logika; pengecekan akun masih aktif dilakukan di lib/admin-auth.js.
import crypto from 'crypto'

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 hari

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

export function createToken({ adminId, version = 0, secret, now = Date.now() }) {
  if (!secret) throw new Error('ADMIN_SESSION_SECRET belum diatur di environment variables.')
  const expires = now + SESSION_MAX_AGE_SECONDS * 1000
  const payload = `${adminId}.${version}.${expires}`
  return `${payload}.${sign(payload, secret)}`
}

// Mengembalikan { adminId, version } bila token sah, selain itu null.
export function parseToken(token, { secret, now = Date.now() }) {
  if (!secret || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [adminId, version, expires, signature] = parts
  const expected = sign(`${adminId}.${version}.${expires}`, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  const exp = Number(expires)
  if (!Number.isFinite(exp) || now > exp) return null
  return { adminId, version: Number(version) }
}
