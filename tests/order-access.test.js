import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhone, phonesMatch, accessKey, verifyAccessKey, customerCanCancel } from '../lib/order-access.js'

test('nomor WA disamakan: 08..., +62..., 62..., spasi dan strip', () => {
  assert.equal(normalizePhone('0812-3456 7890'), '6281234567890')
  assert.equal(normalizePhone('+62 812 3456 7890'), '6281234567890')
  assert.equal(normalizePhone('81234567890'), '6281234567890')
  assert.ok(phonesMatch('081234567890', '+6281234567890'))
  assert.ok(!phonesMatch('081234567890', '081234567891'))
  assert.ok(!phonesMatch('', ''))
})

test('kunci akses: sah hanya untuk nomor pesanan dan rahasia yang sama', () => {
  const k = accessKey('LPI-1', 's1')
  assert.equal(k.length, 24)
  assert.ok(verifyAccessKey('LPI-1', k, 's1'))
  assert.ok(!verifyAccessKey('LPI-2', k, 's1'))
  assert.ok(!verifyAccessKey('LPI-1', k, 's2'))
  assert.ok(!verifyAccessKey('LPI-1', 'pendek', 's1'))
  assert.ok(!verifyAccessKey('LPI-1', undefined, 's1'))
  assert.ok(!verifyAccessKey('LPI-1', k, ''))
})

test('pembeli hanya bisa batalkan pesanan belum bayar', () => {
  assert.ok(customerCanCancel('menunggu_bayar'))
  for (const s of ['dibayar', 'dikemas', 'dikirim', 'diterima', 'batal']) assert.ok(!customerCanCancel(s))
})
