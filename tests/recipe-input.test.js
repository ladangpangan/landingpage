import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeRecipeInput, toPublicRecipe, buildSampleRecipes, slugify } from '../lib/recipe-input.js'

const ok = { title: ' Sop Ayam ', steps: ['Rebus', ' ', 'Sajikan'], minutes: '30', servings: 4, ingredients: [{ productId: 'a', qty: 2 }, { productId: 'a', qty: 5 }, { productId: 'b', qty: 1 }], extras: ['Garam', ''] }

test('sanitize: rapikan dan buang duplikat/kosong', () => {
  const r = sanitizeRecipeInput(ok).value
  assert.equal(r.title, 'Sop Ayam')
  assert.deepEqual(r.steps, ['Rebus', 'Sajikan'])
  assert.deepEqual(r.ingredients, [{ productId: 'a', qty: 2 }, { productId: 'b', qty: 1 }])
  assert.deepEqual(r.extras, ['Garam'])
  assert.equal(r.minutes, 30)
  assert.equal(r.active, true)
})

test('sanitize: tolak isian buruk', () => {
  for (const bad of [null, { ...ok, title: 'ab' }, { ...ok, steps: [' '] }, { ...ok, minutes: 9999 }, { ...ok, servings: 99 }, { ...ok, ingredients: [{ productId: 'a', qty: 0 }] }, { ...ok, ingredients: [{ productId: 'a', qty: 21 }] }, { ...ok, image: 'javascript:alert(1)' }]) {
    assert.ok(sanitizeRecipeInput(bad).error, JSON.stringify(bad))
  }
  assert.ok(sanitizeRecipeInput({ ...ok, ingredients: Array.from({ length: 13 }, (_, i) => ({ productId: `p${i}`, qty: 1 })) }).error)
  assert.equal(sanitizeRecipeInput({ ...ok, image: '/api/uploads/x.jpg' }).value.image, '/api/uploads/x.jpg')
})

test('slug dari judul', () => {
  assert.equal(slugify('Sop Ayam Bening (contoh)!'), 'sop-ayam-bening-contoh')
  assert.equal(slugify('###'), '')
})

test('tampilan pembeli: harga & stok, produk terhapus dibuang, total hanya yang tersedia', () => {
  const products = new Map([
    ['a', { id: 'a', name: 'Dada', unit: 'kg', price: 30000, image: '', soldOut: false }],
    ['b', { id: 'b', name: 'Paha', unit: 'kg', price: 20000, image: '', soldOut: true }],
  ])
  const pub = toPublicRecipe({ id: 'r', title: 'T', ingredients: [{ productId: 'a', qty: 2 }, { productId: 'b', qty: 1 }, { productId: 'zzz', qty: 1 }], extras: [], steps: ['x'] }, products)
  assert.equal(pub.ingredients.length, 2)
  assert.equal(pub.missingIngredients, 1)
  assert.equal(pub.cartTotal, 60000)
  assert.equal(pub.cartCount, 1)
  assert.equal(pub.allAvailable, false)
  assert.equal(toPublicRecipe({ id: 'r', title: 'T', ingredients: [], steps: ['x'] }, products).allAvailable, false)
})

test('resep contoh: cocokkan kata kunci ke produk toko', () => {
  const list = buildSampleRecipes([{ id: 'dada-1', name: 'Dada Ayam Fillet' }, { id: 'sayap-1', name: 'Sayap Ayam' }])
  assert.equal(list.length, 6)
  assert.deepEqual(list.find((r) => r.id === 'ayam-bakar-madu').ingredients, [{ productId: 'dada-1', qty: 1 }])
  assert.deepEqual(list.find((r) => r.id === 'sayap-pedas-manis').ingredients, [{ productId: 'sayap-1', qty: 1 }])
  assert.deepEqual(list.find((r) => r.id === 'sop-ayam-bening').ingredients, []) // tak ada "karkas"
  assert.ok(list.every((r) => r.isSample && sanitizeRecipeInput({ ...r }).value))
})
