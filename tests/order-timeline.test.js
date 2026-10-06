import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTimeline, courierLabel, latestMessage, orderSignature, computeUnread } from '../lib/order-timeline.js'

test('timeline: gabungan, terbaru di atas, status tak dikenal dibuang', () => {
  const t = buildTimeline({
    history: [{ status: 'menunggu_bayar', at: '2026-01-01T01:00:00Z' }, { status: 'dibayar', at: '2026-01-01T01:05:00Z' }, { status: 'aneh', at: '2026-01-01T01:06:00Z' }],
    courierEvents: [{ status: 'picked', at: '2026-01-01T02:00:00Z' }, { status: 'xyz', at: '2026-01-01T02:01:00Z' }],
  })
  assert.deepEqual(t.map((x) => x.key), ['k:picked', 's:dibayar', 's:menunggu_bayar'])
})

test('timeline kosong aman', () => {
  assert.deepEqual(buildTimeline(), [])
  assert.deepEqual(buildTimeline({ history: [{ status: 'dibayar' }] }), [])
})

test('label & pesan terbaru', () => {
  assert.equal(courierLabel('PICKED'), 'Pesanan diambil kurir')
  assert.equal(courierLabel('???'), '')
  assert.equal(latestMessage('dikirim', 'dropping_off'), 'Kurir menuju alamat Anda')
  assert.equal(latestMessage('dikirim', ''), 'Pesanan sedang diantar')
  assert.equal(latestMessage('dikemas', 'picked'), 'Pesanan sedang dikemas')
})

test('computeUnread: hanya yang berubah sejak dilihat', () => {
  const saved = [
    { orderId: 'A', seenSig: orderSignature('dibayar', '') },
    { orderId: 'B', seenSig: orderSignature('dikirim', 'picked') },
    { orderId: 'C' },
    { orderId: 'D', seenSig: 'x' },
  ]
  const sums = [
    { orderId: 'A', sig: orderSignature('dikemas', '') },
    { orderId: 'B', sig: orderSignature('dikirim', 'picked') },
    { orderId: 'C', sig: orderSignature('dibayar', '') },
  ]
  assert.deepEqual(computeUnread(saved, sums), ['A'])
})

test('timeline: kabar kurir setelah Diterima dibuang', () => {
  const t = buildTimeline({ history: [{ status: 'diterima', at: '2026-01-01T03:00:00Z' }], courierEvents: [{ status: 'delivered', at: '2026-01-01T02:59:00Z' }, { status: 'picking_up', at: '2026-01-01T03:05:00Z' }] })
  assert.deepEqual(t.map((x) => x.key), ['s:diterima', 'k:delivered'])
})
