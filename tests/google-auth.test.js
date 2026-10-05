import test from 'node:test'
import assert from 'node:assert/strict'
import {
  googleConfigured, safeReturnTo, createState, checkState, buildAuthUrl, fetchGoogleProfile, createCustomerToken, parseCustomerToken,
} from '../lib/google-auth.js'

test('login Google hanya aktif bila kunci lengkap', () => {
  assert.ok(!googleConfigured({}))
  assert.ok(!googleConfigured({ GOOGLE_CLIENT_ID: 'a', GOOGLE_CLIENT_SECRET: 'b' }))
  assert.ok(googleConfigured({ GOOGLE_CLIENT_ID: 'a', GOOGLE_CLIENT_SECRET: 'b', ADMIN_SESSION_SECRET: 'c' }))
})

test('tujuan setelah login hanya alamat dalam situs sendiri', () => {
  assert.equal(safeReturnTo('/akun'), '/akun')
  assert.equal(safeReturnTo('/pesanan/LPI-1?k=abc'), '/pesanan/LPI-1?k=abc')
  for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '', null, '/a\nb']) assert.equal(safeReturnTo(bad), '/')
})

test('state: sah sekali pakai untuk nonce yang sama, ditolak bila diubah / kedaluwarsa / nonce beda', () => {
  const { nonce, state } = createState({ returnTo: '/akun', secret: 's', now: 1000 })
  assert.deepEqual(checkState({ state, cookieNonce: nonce, secret: 's', now: 2000 }), { returnTo: '/akun' })
  assert.equal(checkState({ state, cookieNonce: 'lain', secret: 's', now: 2000 }), null)
  assert.equal(checkState({ state, cookieNonce: nonce, secret: 'x', now: 2000 }), null)
  assert.equal(checkState({ state, cookieNonce: nonce, secret: 's', now: 1000 + 11 * 60 * 1000 }), null)
  assert.equal(checkState({ state: state.replace(/.$/, '0'), cookieNonce: nonce, secret: 's', now: 2000 }), null)
  assert.equal(checkState({ state: 'a.b', cookieNonce: nonce, secret: 's' }), null)
  const evil = createState({ returnTo: 'https://evil.com', secret: 's', now: 1000 })
  assert.equal(checkState({ state: evil.state, cookieNonce: evil.nonce, secret: 's', now: 1500 }).returnTo, '/')
})

test('alamat masuk Google memuat parameter yang benar', () => {
  const u = new URL(buildAuthUrl({ clientId: 'cid', redirectUri: 'https://x.id/api/auth/google/callback', state: 'st' }))
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth')
  assert.equal(u.searchParams.get('client_id'), 'cid')
  assert.equal(u.searchParams.get('response_type'), 'code')
  assert.equal(u.searchParams.get('scope'), 'openid email profile')
  assert.equal(u.searchParams.get('state'), 'st')
})

test('profil Google: ditolak bila tukar kode gagal atau email belum terverifikasi', async () => {
  const mk = (tokenOk, info) => async (url) => {
    if (url.includes('oauth2.googleapis.com')) return { ok: tokenOk, json: async () => (tokenOk ? { access_token: 't' } : { error: 'x' }) }
    return { ok: true, json: async () => info }
  }
  const args = { code: 'c', clientId: 'a', clientSecret: 'b', redirectUri: 'r' }
  const good = await fetchGoogleProfile({ ...args, fetchImpl: mk(true, { sub: '123', email: 'Ibu@X.id', email_verified: true, name: 'Ibu', picture: 'p' }) })
  assert.deepEqual(good, { sub: '123', email: 'ibu@x.id', name: 'Ibu', picture: 'p' })
  await assert.rejects(fetchGoogleProfile({ ...args, fetchImpl: mk(false, {}) }))
  await assert.rejects(fetchGoogleProfile({ ...args, fetchImpl: mk(true, { sub: '1', email: 'a@b.c', email_verified: false }) }))
  await assert.rejects(fetchGoogleProfile({ ...args, fetchImpl: mk(true, { email: 'a@b.c' }) }))
})

test('sesi pembeli: sah, kedaluwarsa, dan dipalsukan', () => {
  const t = createCustomerToken({ customerId: 'abc', secret: 's', now: 1000 })
  assert.deepEqual(parseCustomerToken(t, { secret: 's', now: 2000 }), { customerId: 'abc' })
  assert.equal(parseCustomerToken(t, { secret: 's2', now: 2000 }), null)
  assert.equal(parseCustomerToken(t, { secret: 's', now: 1000 + 31 * 24 * 3600 * 1000 }), null)
  assert.equal(parseCustomerToken(t.replace('abc', 'xyz'), { secret: 's', now: 2000 }), null)
  assert.equal(parseCustomerToken('x.y', { secret: 's' }), null)
})
