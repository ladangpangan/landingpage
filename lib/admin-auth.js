// Minimal single-admin auth: one shared password (ADMIN_PASSWORD env var), a
// signed session cookie (HMAC with ADMIN_SESSION_SECRET). No user accounts,
// no database dependency — intentionally simple for a single-operator admin page.
import crypto from 'crypto'

export const SESSION_COOKIE = 'ladang_admin_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error('ADMIN_SESSION_SECRET belum diatur di environment variables.')
  return s
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex')
}

export function createSessionToken() {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  const payload = `${expires}`
  const signature = sign(payload)
  return `${payload}.${signature}`
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  let expectedSig
  try {
    expectedSig = sign(payload)
  } catch {
    return false
  }
  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length) return false
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false
  const expires = Number(payload)
  if (!Number.isFinite(expires) || Date.now() > expires) return false
  return true
}

export function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) throw new Error('ADMIN_PASSWORD belum diatur di environment variables.')
  if (typeof password !== 'string' || password.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected))
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
}
