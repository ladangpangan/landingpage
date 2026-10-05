import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeBundleInput } from '../lib/bundle-input.js'

const base = { type: 'hemat', name: ' Paket Hemat Keluarga ', price: '80000', items: [{ variantId: 'a', qty: 2 }, { variantId: 'b', qty: 1 }] }

test('isian sah dirapikan', () => {
  const r = sanitizeBundleInput({ ...base, description: ' enak ', active: false })
  assert.equal(r.error, undefined)
  assert.equal(r.value.name, 'Paket Hemat Keluarga')
  assert.equal(r.value.price, 80000)
  assert.equal(r.value.active, false)
  assert.deepEqual(r.value.items, [{ variantId: 'a', qty: 2 }, { variantId: 'b', qty: 1 }])
})

test('baris produk yang sama digabung', () => {
  const r = sanitizeBundleInput({ ...base, items: [{ variantId: 'a', qty: 1 }, { variantId: 'a', qty: 2 }] })
  assert.deepEqual(r.value.items, [{ variantId: 'a', qty: 3 }])
  assert.ok(sanitizeBundleInput({ ...base, items: [{ variantId: 'a', qty: 60 }, { variantId: 'a', qty: 60 }] }).error)
})

test('isian tidak sah ditolak dengan pesan', () => {
  assert.match(sanitizeBundleInput({ ...base, type: 'lain' }).error, /Jenis paket/)
  assert.match(sanitizeBundleInput({ ...base, name: '  ' }).error, /Nama paket/)
  assert.match(sanitizeBundleInput({ ...base, price: 0 }).error, /Harga/)
  assert.match(sanitizeBundleInput({ ...base, price: 'abc' }).error, /Harga/)
  assert.match(sanitizeBundleInput({ ...base, items: [] }).error, /minimal berisi/)
  assert.match(sanitizeBundleInput({ ...base, items: [{ variantId: '', qty: 1 }] }).error, /belum memilih/)
  assert.match(sanitizeBundleInput({ ...base, items: [{ variantId: 'a', qty: 0 }] }).error, /Jumlah/)
  assert.match(sanitizeBundleInput({ ...base, items: [{ variantId: 'a', qty: 1.5 }] }).error, /Jumlah/)
  assert.ok(sanitizeBundleInput(null).error)
})

test('resep: baris kosong dibuang dan dibatasi', () => {
  const r = sanitizeBundleInput({ ...base, type: 'masak', recipe: { ingredients: [' 1 ekor ayam ', '', '  '], steps: ['Rebus', 'x'.repeat(500)] } })
  assert.deepEqual(r.value.recipe.ingredients, ['1 ekor ayam'])
  assert.equal(r.value.recipe.steps.length, 2)
  assert.equal(r.value.recipe.steps[1].length, 300)
})
