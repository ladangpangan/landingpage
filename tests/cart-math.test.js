import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeStock, stockInfo, roundTo500, bundleSummary, resolveCartLines } from '../lib/cart-math.js'

const products = new Map([
  ['a', { id: 'a', name: 'Karkas', unit: 'ekor', price: 32000, stock: null, erpCode: 'K1' }],
  ['b', { id: 'b', name: 'Ceker', unit: 'kg', price: 25000, stock: 6 }],
  ['c', { id: 'c', name: 'Dada', unit: 'kg', price: 40000, stock: 0 }],
])
const bundles = new Map([
  ['hemat', { id: 'hemat', name: 'Hemat', price: 80000, items: [{ variantId: 'a', qty: 2 }, { variantId: 'b', qty: 1 }] }],
  ['rusak', { id: 'rusak', name: 'Rusak', price: 50000, items: [{ variantId: 'zzz', qty: 1 }] }],
])

test('stok: null = tak terbatas, 0 = habis, sisa sedikit ditandai', () => {
  assert.equal(normalizeStock(''), null)
  assert.equal(normalizeStock(null), null)
  assert.equal(normalizeStock('7'), 7)
  assert.equal(normalizeStock(-3), 0)
  assert.deepEqual(stockInfo(null), { soldOut: false, stockLeft: null })
  assert.deepEqual(stockInfo(0), { soldOut: true, stockLeft: null })
  assert.deepEqual(stockInfo(3), { soldOut: false, stockLeft: 3 })
  assert.deepEqual(stockInfo(50), { soldOut: false, stockLeft: null })
})

test('pembulatan harga paket ke Rp 500', () => {
  assert.equal(roundTo500(80999), 81000)
  assert.equal(roundTo500(80200), 80000)
})

test('ringkasan paket: harga normal, hemat, dan ketersediaan', () => {
  const s = bundleSummary(bundles.get('hemat'), products)
  assert.equal(s.normalPrice, 89000)
  assert.equal(s.savings, 9000)
  assert.equal(s.soldOut, false)
  assert.equal(s.stockLeft, null) // ceker 6 paket tersedia: di atas batas "sisa sedikit"
  const tipis = bundleSummary({ price: 1, items: [{ variantId: 'b', qty: 2 }] }, products)
  assert.equal(tipis.stockLeft, 3) // 6 / 2 = 3 paket
  assert.equal(bundleSummary(bundles.get('rusak'), products).soldOut, true)
  const habis = bundleSummary({ price: 1, items: [{ variantId: 'c', qty: 1 }] }, products)
  assert.equal(habis.soldOut, true)
})

test('keranjang: harga diambil dari data server, bukan dari browser', () => {
  const r = resolveCartLines(
    [{ kind: 'produk', id: 'a', qty: 2, price: 1 }, { kind: 'paket', id: 'hemat', qty: 1 }],
    products,
    bundles
  )
  assert.ok(r.ok)
  assert.equal(r.lines[0].price, 32000)
  assert.equal(r.lines[1].price, 80000)
  assert.deepEqual(r.requirements, [{ variantId: 'a', qty: 4 }, { variantId: 'b', qty: 1 }])
})

test('keranjang: input tidak sah ditolak', () => {
  assert.equal(resolveCartLines([], products, bundles).ok, false)
  assert.equal(resolveCartLines([{ kind: 'produk', id: 'x', qty: 1 }], products, bundles).ok, false)
  assert.equal(resolveCartLines([{ kind: 'produk', id: 'a', qty: 0 }], products, bundles).ok, false)
  assert.equal(resolveCartLines([{ kind: 'produk', id: 'a', qty: 1.5 }], products, bundles).ok, false)
  assert.equal(resolveCartLines([{ kind: 'paket', id: 'rusak', qty: 1 }], products, bundles).ok, false)
  assert.equal(resolveCartLines([{ kind: 'paket', id: 'nope', qty: 1 }], products, bundles).ok, false)
})

import { orderWeightKg } from '../lib/cart-math.js'
test('berat pesanan dari berat satuan; kosong dianggap 1 kg', () => {
  const m = new Map([['a', { weightKg: 0.9 }], ['b', { weightKg: 2.5 }], ['c', {}]])
  assert.equal(orderWeightKg([{ variantId: 'a', qty: 2 }, { variantId: 'b', qty: 1 }], m), 4.3)
  assert.equal(orderWeightKg([{ variantId: 'c', qty: 3 }, { variantId: 'x', qty: 1 }], m), 4)
})
