// Login Google (OAuth "authorization code"). Bagian murni (URL, state, sesi pembeli)
// diuji; panggilan ke Google dilakukan lewat fetch yang bisa ditukar saat uji.
// Data yang diambil dari Google hanya: id, email, nama, foto.
import crypto from 'crypto'

export const CUSTOMER_COOKIE = 'lpi_customer'
export const OAUTH_COOKIE = 'lpi_oauth'
export const CUSTOMER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 hari
const STATE_MAX_AGE_MS = 10 * 60 * 1000

const hmac = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('hex')

function safeEqual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

export function googleConfigured(env = process.env) {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.ADMIN_SESSION_SECRET)
}

// Hanya alamat dalam situs sendiri yang boleh dijadikan tujuan setelah login.
export function safeReturnTo(value) {
  const v = String(value || '')
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /[\r\n]/.test(v)) return '/'
  return v.slice(0, 200)
}

// state = "<nonce>.<kedaluwarsa>.<returnTo base64url>.<tanda tangan>"; nonce juga disimpan di cookie.
export function createState({ returnTo, secret, now = Date.now(), nonce = crypto.randomBytes(16).toString('hex') }) {
  const to = Buffer.from(safeReturnTo(returnTo)).toString('base64url')
  const payload = `${nonce}.${now + STATE_MAX_AGE_MS}.${to}`
  return { nonce, state: `${payload}.${hmac(payload, secret)}` }
}

// Mengembalikan { returnTo } bila state sah, nonce cocok dengan cookie, dan belum kedaluwarsa.
export function checkState({ state, cookieNonce, secret, now = Date.now() }) {
  if (!secret || typeof state !== 'string' || !cookieNonce) return null
  const parts = state.split('.')
  if (parts.length !== 4) return null
  const [nonce, expires, to, sig] = parts
  if (!safeEqual(sig, hmac(`${nonce}.${expires}.${to}`, secret))) return null
  if (!safeEqual(nonce, cookieNonce)) return null
  if (!(now <= Number(expires))) return null
  return { returnTo: safeReturnTo(Buffer.from(to, 'base64url').toString()) }
}

export function buildAuthUrl({ clientId, redirectUri, state }) {
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

// Menukar kode dengan data profil. Dua panggilan langsung ke Google lewat HTTPS.
export async function fetchGoogleProfile({ code, clientId, clientSecret, redirectUri, fetchImpl = fetch }) {
  const tokenRes = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })
  const token = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !token.access_token) throw new Error('Google menolak kode masuk.')
  const infoRes = await fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } })
  const info = await infoRes.json().catch(() => ({}))
  if (!infoRes.ok || !info.sub) throw new Error('Gagal membaca profil Google.')
  if (!info.email || info.email_verified === false) throw new Error('Email Google belum terverifikasi.')
  return { sub: String(info.sub), email: String(info.email).toLowerCase(), name: String(info.name || '').slice(0, 80), picture: String(info.picture || '').slice(0, 300) }
}

// --- Sesi pembeli: "<customerId>.<kedaluwarsa>.<tanda tangan>" -----------------------

export function createCustomerToken({ customerId, secret, now = Date.now() }) {
  if (!secret) throw new Error('ADMIN_SESSION_SECRET belum diatur di environment variables.')
  const payload = `${customerId}.${now + CUSTOMER_MAX_AGE_SECONDS * 1000}`
  return `${payload}.${hmac(`cust:${payload}`, secret)}`
}

export function parseCustomerToken(token, { secret, now = Date.now() }) {
  if (!secret || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [customerId, expires, sig] = parts
  if (!safeEqual(sig, hmac(`cust:${customerId}.${expires}`, secret))) return null
  if (!(now <= Number(expires))) return null
  return { customerId }
}
