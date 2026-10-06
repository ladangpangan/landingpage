import test from 'node:test'
import assert from 'node:assert/strict'
import { interpretKeyTest } from '../lib/mayar.js'

test('tes koneksi Mayar: diterima', () => {
  const r = interpretKeyTest({ production: true, here: { status: 200 } })
  assert.equal(r.ok, true)
  assert.match(r.message, /Read & Write/)
})

test('tes koneksi Mayar: kunci milik mode lain', () => {
  const a = interpretKeyTest({ production: true, here: { status: 401 }, other: { status: 200 } })
  assert.equal(a.ok, false)
  assert.match(a.message, /Sandbox/)
  assert.match(a.message, /Matikan/)
  assert.match(interpretKeyTest({ production: false, here: { status: 401 }, other: { status: 200 } }).message, /Nyalakan/)
})

test('tes koneksi Mayar: ditolak di kedua mode, galat jaringan, kode lain', () => {
  assert.match(interpretKeyTest({ production: true, here: { status: 401 }, other: { status: 401 } }).message, /kedua mode/)
  assert.match(interpretKeyTest({ production: true, here: { status: 403 } }).message, /kedua mode/)
  assert.match(interpretKeyTest({ production: true, here: { error: 'timeout' } }).message, /Tidak bisa menghubungi/)
  assert.match(interpretKeyTest({ production: true, here: { status: 429 } }).message, /429/)
})
