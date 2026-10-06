import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { ipaymuBase, ipaymuTimestamp, signRequest, buildPaymentBody, extractPayment, parseNotify, isPaidNotify, isExpiredNotify, verifyNotifyToken } from '../lib/ipaymu.js'

test('alamat dasar: sandbox terpisah dari production', () => {
  assert.equal(ipaymuBase(true), 'https://my.ipaymu.com')
  assert.equal(ipaymuBase(false), 'https://sandbox.ipaymu.com')
})

test('timestamp WIB format YYYYMMDDHHmmss', () => {
  assert.equal(ipaymuTimestamp(new Date('2026-10-06T17:05:09Z')), '20261007000509')
  assert.match(ipaymuTimestamp(), /^\d{14}$/)
})

test('tanda tangan: HMAC-SHA256 dari "METHOD:VA:sha256(body):APIKey" memakai API Key', () => {
  const body = '{"a":1}'
  const hash = crypto.createHash('sha256').update(body).digest('hex')
  const expected = crypto.createHmac('sha256', 'KUNCI').update(`POST:1179000899:${hash}:KUNCI`).digest('hex')
  assert.equal(signRequest({ method: 'post', va: '1179000899', apiKey: 'KUNCI', bodyJson: body }), expected)
  assert.notEqual(signRequest({ method: 'POST', va: '1179000899', apiKey: 'KUNCI', bodyJson: '{"a":2}' }), expected)
})

test('permintaan bayar: satu baris bertotal sama, rujukan = nomor pesanan', () => {
  const b = buildPaymentBody({ orderId: 'LPI-1-AB', customer: { name: 'Ibu', phone: '0812-34' }, amount: 46000, returnUrl: 'r', cancelUrl: 'c', notifyUrl: 'n' })
  assert.deepEqual([b.product.length, b.qty, b.price, b.referenceId], [1, [1], [46000], 'LPI-1-AB'])
  assert.equal(b.buyerPhone, '081234')
  assert.equal(b.buyerEmail, 'lpi-1-ab@pesanan.ladangpangan.id')
  assert.equal(b.expired, 1)
})

test('balasan: SessionID dan Url dibaca', () => {
  assert.deepEqual(extractPayment({ Status: 200, Data: { SessionID: 'abc', Url: 'https://my.ipaymu.com/payment/abc' } }), { sessionId: 'abc', url: 'https://my.ipaymu.com/payment/abc' })
  assert.deepEqual(extractPayment(null), { sessionId: '', url: '' })
})

test('kabar bayar dibaca longgar dan hanya "berhasil" yang dianggap dibayar', () => {
  const p = parseNotify({ trx_id: 123, status: 'berhasil', status_code: '1', reference_id: 'LPI-1-AB', sid: 'abc', total: '46000' })
  assert.deepEqual([p.trxId, p.status, p.statusCode, p.referenceId, p.amount], ['123', 'berhasil', '1', 'LPI-1-AB', 46000])
  assert.ok(isPaidNotify(p))
  assert.ok(!isPaidNotify(parseNotify({ status: 'pending', status_code: '0' })))
  assert.ok(!isPaidNotify(parseNotify({ status: 'gagal' })))
  assert.ok(!isPaidNotify(parseNotify({})))
  assert.ok(isPaidNotify(parseNotify({ status: 'berhasil' })))
  assert.ok(isPaidNotify(parseNotify({ status_code: '1' })))
  assert.ok(!isPaidNotify(parseNotify({ status_code: '0' })))
  assert.ok(isExpiredNotify(parseNotify({ status: 'expired' })))
  assert.ok(!isExpiredNotify(parseNotify({ status: 'berhasil' })))
  assert.equal(parseNotify(null).amount, null)
})

test('token alamat kabar dibandingkan aman', () => {
  assert.ok(verifyNotifyToken('abc', 'abc'))
  assert.ok(!verifyNotifyToken('abd', 'abc'))
  assert.ok(!verifyNotifyToken('', 'abc'))
  assert.ok(!verifyNotifyToken('a', ''))
})

import { interpretIpaymuTest } from '../lib/ipaymu.js'
test('tes koneksi iPaymu: diterima, mode tertukar, ditolak, galat jaringan', () => {
  assert.equal(interpretIpaymuTest({ production: false, here: { status: 200 } }).ok, true)
  const swapped = interpretIpaymuTest({ production: false, here: { status: 401 }, other: { status: 200 } })
  assert.equal(swapped.ok, false)
  assert.match(swapped.message, /Production/)
  assert.match(swapped.message, /Nyalakan/)
  assert.match(interpretIpaymuTest({ production: true, here: { status: 401 }, other: { status: 200 } }).message, /Matikan/)
  assert.match(interpretIpaymuTest({ production: false, here: { status: 401 }, other: { status: 401 } }).message, /kedua mode/)
  assert.match(interpretIpaymuTest({ production: false, here: { error: 'x' } }).message, /Tidak bisa menghubungi/)
  assert.match(interpretIpaymuTest({ production: false, here: { status: 500 } }).message, /500/)
})
