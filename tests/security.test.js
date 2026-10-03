import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword, validateNewPassword } from '../lib/passwords.js'
import { createToken, parseToken } from '../lib/session-token.js'
import { expectedSignature, isValidSignature, amountMatches } from '../lib/midtrans-signature.js'

test('password di-hash dan diverifikasi', async () => {
  const h = await hashPassword('rahasia-panjang-123')
  assert.ok(h.startsWith('scrypt$'))
  assert.ok(!h.includes('rahasia'))
  assert.equal(await verifyPassword('rahasia-panjang-123', h), true)
  assert.equal(await verifyPassword('salah', h), false)
  assert.equal(await verifyPassword('x', 'bukan-hash'), false)
})

test('password baru minimal 10 karakter', () => {
  assert.ok(validateNewPassword('pendek'))
  assert.equal(validateNewPassword('panjangsekali'), null)
})

test('token sesi sah, kedaluwarsa, dan dipalsukan', () => {
  const secret = 's3cret'
  const token = createToken({ adminId: 'abc', version: 2, secret, now: 1000 })
  assert.deepEqual(parseToken(token, { secret, now: 2000 }), { adminId: 'abc', version: 2 })
  assert.equal(parseToken(token, { secret: 'lain', now: 2000 }), null)
  assert.equal(parseToken(token, { secret, now: 1000 + 8 * 24 * 3600 * 1000 }), null)
  const [id, , exp, sig] = token.split('.')
  assert.equal(parseToken(`${id}.99.${exp}.${sig}`, { secret, now: 2000 }), null)
  assert.equal(parseToken('', { secret }), null)
  assert.equal(parseToken(token, { secret: '' }), null)
})

test('signature Midtrans', () => {
  const n = { order_id: 'LPI-1', status_code: '200', gross_amount: '64000.00' }
  const good = { ...n, signature_key: expectedSignature(n, 'SB-key') }
  assert.equal(isValidSignature(good, 'SB-key'), true)
  assert.equal(isValidSignature(good, 'key-lain'), false)
  assert.equal(isValidSignature({ ...good, gross_amount: '1.00' }, 'SB-key'), false)
  assert.equal(isValidSignature({ ...n }, 'SB-key'), false)
})

test('jumlah dari Midtrans harus sama dengan pesanan', () => {
  assert.equal(amountMatches('64000.00', 64000), true)
  assert.equal(amountMatches('64000', 64000), true)
  assert.equal(amountMatches('1000.00', 64000), false)
  assert.equal(amountMatches('abc', 64000), false)
})
