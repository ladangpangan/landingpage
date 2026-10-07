import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mayarBase, placeholderEmail, buildInvoiceBody, extractInvoice, parseMayarWebhook, isPaidEvent, isExpiredOrFailedEvent, verifyCallbackToken,
} from '../lib/mayar.js'

test('alamat dasar: sandbox memakai mayar.club', () => {
  assert.equal(mayarBase(true), 'https://api.mayar.id')
  assert.equal(mayarBase(false), 'https://api.mayar.club')
})

test('invoice: satu baris bertotal sama dengan jumlah server, tanpa baris negatif', () => {
  const body = buildInvoiceBody({ orderId: 'LPI-1-AB', customer: { name: 'Ibu Sari', phone: '0812-3456' }, amount: 46000, redirectUrl: 'https://x/p', expiredAt: '2026-01-01T00:00:00.000Z', itemsText: '2x Karkas' })
  assert.equal(body.items.length, 1)
  assert.equal(body.items[0].rate, 46000)
  assert.equal(body.items[0].quantity, 1)
  assert.equal(body.mobile, '08123456')
  assert.equal(body.email, 'lpi-1-ab@pesanan.ladangpangan.id')
  assert.match(body.description, /LPI-1-AB/)
  assert.equal(buildInvoiceBody({ orderId: 'A', customer: { name: 'x', phone: '1' }, email: 'a@b.id', amount: 1 }).email, 'a@b.id')
})

test('balasan invoice dibaca dari data atau tingkat atas', () => {
  assert.deepEqual(extractInvoice({ statusCode: 200, data: { id: 'inv1', transactionId: 'tx1', link: 'https://m/pay' } }), { id: 'inv1', transactionId: 'tx1', link: 'https://m/pay' })
  assert.deepEqual(extractInvoice({ id: 'i2', link: 'l' }), { id: 'i2', transactionId: '', link: 'l' })
  assert.deepEqual(extractInvoice(null), { id: '', transactionId: '', link: '' })
})

test('webhook: id kandidat, jumlah, dan status dibaca longgar', () => {
  const p = parseMayarWebhook({ event: 'payment.received', data: { id: 'tx9', status: 'SUCCESS', amount: 46000, customerName: 'x' } })
  assert.deepEqual([p.event, p.status, p.amount, p.ids], ['payment.received', 'SUCCESS', 46000, ['tx9']])
  assert.equal(parseMayarWebhook({}).amount, null)
  assert.equal(parseMayarWebhook(null).ids.length, 0)
  assert.equal(parseMayarWebhook({ data: { amount: 'abc' } }).amount, null)
})

test('dibayar hanya bila jelas; ragu = tidak dibayar', () => {
  assert.ok(isPaidEvent({ event: 'payment.received', status: 'SUCCESS' }))
  assert.ok(isPaidEvent({ event: '', status: 'paid' }))
  assert.ok(isPaidEvent({ event: 'payment.received', status: '' }))
  for (const bad of [{ event: 'payment.failed', status: '' }, { event: '', status: 'EXPIRED' }, { event: 'payment.received', status: 'pending' }, { event: '', status: '' }, { event: 'invoice.created', status: 'created' }]) assert.ok(!isPaidEvent(bad), JSON.stringify(bad))
  assert.ok(isExpiredOrFailedEvent({ event: 'payment.expired', status: '' }))
  assert.ok(!isExpiredOrFailedEvent({ event: 'payment.received', status: 'SUCCESS' }))
})

test('token webhook dibandingkan aman', () => {
  assert.ok(verifyCallbackToken('rahasia', 'rahasia'))
  assert.ok(!verifyCallbackToken('salah', 'rahasia'))
  assert.ok(!verifyCallbackToken('', 'rahasia'))
  assert.ok(!verifyCallbackToken('x', ''))
  assert.ok(!verifyCallbackToken(undefined, 'rahasia'))
})

test('pengingat dan uji coba TIDAK dianggap dibayar walau status SUCCESS (bug nyata 6 Okt 2026)', () => {
  for (const bad of [
    { event: 'payment.reminder', status: 'SUCCESS' },
    { event: 'testing', status: 'SUCCESS' },
    { event: 'invoice.created', status: 'SUCCESS' },
    { event: '', status: 'SUCCESS' },
    { event: 'payment.received', status: 'FAILED' },
    { event: 'membership.memberExpired', status: 'SUCCESS' },
  ]) assert.ok(!isPaidEvent(bad), JSON.stringify(bad))
  for (const good of [
    { event: 'payment.received', status: 'SUCCESS' },
    { event: 'payment.received', status: '' },
    { event: '', status: 'PAID' },
    { event: 'payment.success', status: 'SUCCESS' },
  ]) assert.ok(isPaidEvent(good), JSON.stringify(good))
})
