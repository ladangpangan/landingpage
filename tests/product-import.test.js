import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, rowsToItems, planImport, detectDelimiter, CSV_TEMPLATE } from '../lib/product-import.js'

test('CSV: kutip, koma dalam kutip, baris baru dalam kutip, BOM, titik koma', () => {
  const rows = parseCsv('﻿nama,deskripsi\n"Ayam, utuh","Baris 1\nBaris ""dua"""\nCeker,enak')
  assert.deepEqual(rows, [['nama', 'deskripsi'], ['Ayam, utuh', 'Baris 1\nBaris "dua"'], ['Ceker', 'enak']])
  assert.equal(detectDelimiter('nama;harga;stok'), ';')
  assert.deepEqual(parseCsv('nama;harga\r\nDada;48.000\r\n'), [['nama', 'harga'], ['Dada', '48.000']])
})

test('baris dibaca ke isian; harga/berat/stok gaya Indonesia', () => {
  const { items, errors, headerError } = rowsToItems(parseCsv('Nama Produk;Harga (Rp);Berat_kg;Stok;Promo;Kode ERP\nDada Ayam;Rp 48.000;0,9;25;ya;ERP-1\nPaha;38000;;;;'))
  assert.equal(headerError, undefined); assert.deepEqual(errors, [])
  assert.deepEqual([items[0].name, items[0].price, items[0].weightKg, items[0].stock, items[0].isPromo, items[0].erpCode], ['Dada Ayam', 48000, 0.9, 25, true, 'ERP-1'])
  assert.deepEqual([items[1].price, items[1].weightKg, items[1].stock], [38000, undefined, undefined])
})

test('berkas tanpa kolom wajib atau baris rusak dilaporkan', () => {
  assert.match(rowsToItems(parseCsv('foo,bar\n1,2')).headerError, /nama/)
  assert.match(rowsToItems(parseCsv('nama,foo\nA,1')).headerError, /harga/)
  assert.match(rowsToItems([]).headerError, /kosong/)
  const r = rowsToItems(parseCsv('nama,harga,berat,stok\n,1000,,\nA,1000,abc,\nB,1000,1,xyz\nC,1000,1,5'))
  assert.equal(r.items.length, 1); assert.equal(r.errors.length, 3)
  assert.match(r.errors[0].error, /Nama/); assert.match(r.errors[1].error, /Berat/); assert.match(r.errors[2].error, /Stok/)
})

const existing = [
  { id: 'a', name: 'Karkas Ayam', category: 'Ayam', unit: 'ekor', price: 32000, erpCode: 'ERP-K', stock: null, weightKg: 0.9, description: '', image: '/x.jpg', isPromo: false },
  { id: 'b', name: 'Ceker', category: 'Ayam', unit: 'kg', price: 25000, erpCode: '', stock: 5, weightKg: 1, description: '', image: '', isPromo: false },
]
const mk = (csv) => planImport(rowsToItems(parseCsv(csv)).items, existing, (i) => `baru-${i}`)

test('impor: produk baru ditambah, yang lama diubah lewat kode ERP / id / nama', () => {
  const p = mk('nama,harga,stok,kode_erp,id\nKarkas Besar,35000,10,ERP-K,\nCeker,27000,,,\nDada,48000,3,ERP-D,')
  assert.deepEqual(p.creates.map((c) => c.name), ['Dada'])
  assert.deepEqual(p.updates.map((u) => u.id), ['a', 'b'])
  const a = p.merged.find((x) => x.id === 'a'); assert.equal(a.name, 'Karkas Besar'); assert.equal(a.price, 35000); assert.equal(a.stock, 10)
  assert.equal(p.merged.find((x) => x.id === 'b').price, 27000)
  assert.equal(p.merged.find((x) => x.id === 'baru-0').stock, 3)
  assert.equal(p.merged.length, 3)
})

test('impor: sel kosong tidak menghapus data yang ada; produk baru wajib berharga', () => {
  const p = mk('nama,harga,stok,kategori\nCeker,,,\nBaru Tanpa Harga,,,\nBaru Murah,1000,,')
  const b = p.merged.find((x) => x.id === 'b'); assert.deepEqual([b.price, b.stock, b.category], [25000, 5, 'Ayam'])
  assert.equal(p.errors.length, 1); assert.match(p.errors[0].error, /Harga wajib/)
  const baru = p.merged.find((x) => x.id === 'baru-0'); assert.deepEqual([baru.name, baru.category, baru.stock, baru.weightKg, baru.image], ['Baru Murah', 'Lainnya', null, 1, ''])
})

test('impor: duplikat di berkas dan harga 0 ditolak', () => {
  const p = mk('nama,harga,kode_erp\nA1,1000,ERP-Z\nA2,1000,ERP-Z\nCeker,0,\nCeker,2000,')
  assert.ok(p.errors.some((e) => /dua kali/.test(e.error)))
  assert.ok(p.errors.some((e) => /lebih dari 0/.test(e.error)))
})

test('contoh CSV yang diunduh bisa diimpor tanpa galat', () => {
  const r = rowsToItems(parseCsv(CSV_TEMPLATE)); assert.equal(r.errors.length, 0); assert.equal(r.items.length, 2)
  assert.equal(planImport(r.items, [], (i) => `n${i}`).creates.length, 2)
})
