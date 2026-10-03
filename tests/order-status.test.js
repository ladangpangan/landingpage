import test from 'node:test'
import assert from 'node:assert/strict'
import { canTransition, normalizeStatus, targetStatusFromMidtrans } from '../lib/order-status.js'

test('status hanya maju satu langkah', () => {
  assert.ok(canTransition('menunggu_bayar', 'dibayar'))
  assert.ok(canTransition('dibayar', 'dikemas'))
  assert.ok(canTransition('dikemas', 'dikirim'))
  assert.ok(canTransition('dikirim', 'diterima'))
  assert.ok(!canTransition('menunggu_bayar', 'dikemas'))
  assert.ok(!canTransition('dibayar', 'dikirim'))
})

test('status tidak boleh mundur', () => {
  assert.ok(!canTransition('dibayar', 'menunggu_bayar'))
  assert.ok(!canTransition('dikirim', 'dikemas'))
  assert.ok(!canTransition('diterima', 'dikirim'))
})

test('batal/gagal/kedaluwarsa hanya dari menunggu_bayar dan tidak bisa pulih', () => {
  for (const s of ['batal', 'gagal', 'kedaluwarsa']) {
    assert.ok(canTransition('menunggu_bayar', s))
    assert.ok(!canTransition('dibayar', s))
    assert.ok(!canTransition(s, 'dibayar'))
  }
})

test('nama status lama dipetakan ke nama baru', () => {
  assert.equal(normalizeStatus('pending'), 'menunggu_bayar')
  assert.equal(normalizeStatus('paid'), 'dibayar')
  assert.equal(normalizeStatus('dikirim'), 'dikirim')
})

test('status Midtrans dipetakan dengan benar', () => {
  assert.equal(targetStatusFromMidtrans('settlement'), 'dibayar')
  assert.equal(targetStatusFromMidtrans('capture', 'accept'), 'dibayar')
  assert.equal(targetStatusFromMidtrans('capture', 'challenge'), null)
  assert.equal(targetStatusFromMidtrans('expire'), 'kedaluwarsa')
  assert.equal(targetStatusFromMidtrans('deny'), 'gagal')
  assert.equal(targetStatusFromMidtrans('cancel'), 'batal')
  assert.equal(targetStatusFromMidtrans('pending'), null)
  assert.equal(targetStatusFromMidtrans('refund'), null)
})
