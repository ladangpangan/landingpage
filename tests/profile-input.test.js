import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanPhone, toLocalPhone, cleanLocalAddress } from '../lib/profile-input.js'

test('cleanPhone: berbagai bentuk nomor', () => {
  assert.equal(cleanPhone('0812-3456-7890').phone, '6281234567890')
  assert.equal(cleanPhone('+62 812 3456 7890').phone, '6281234567890')
  assert.equal(cleanPhone('').phone, '')
  assert.ok(cleanPhone('123').error)
  assert.ok(cleanPhone('abc').error)
  assert.ok(cleanPhone('0812345678901234567890').error)
})

test('toLocalPhone', () => {
  assert.equal(toLocalPhone('6281234567890'), '081234567890')
  assert.equal(toLocalPhone('081234'), '081234')
  assert.equal(toLocalPhone(null), '')
})

test('cleanLocalAddress: wajib lengkap dan titik lokasi', () => {
  const ok = cleanLocalAddress({ label: ' Rumah ', name: 'Sari', phone: '0812-3456-7890', address: 'Jl. Mawar 5', lat: -7.4, lng: 112.7 })
  assert.deepEqual(ok.address, { label: 'Rumah', name: 'Sari', phone: '081234567890', address: 'Jl. Mawar 5', lat: -7.4, lng: 112.7 })
  assert.ok(cleanLocalAddress({ name: 'Sari', phone: '0812', address: 'x', lat: 1, lng: 1 }).error)
  assert.ok(cleanLocalAddress({ name: 'Sari', phone: '081234567890', address: 'x' }).error)
  assert.ok(cleanLocalAddress({ name: '', phone: '081234567890', address: 'x', lat: 1, lng: 1 }).error)
  assert.equal(cleanLocalAddress({ name: 'S', phone: '081234567890', address: 'x', lat: 99, lng: 1 }).error, 'Titik lokasi alamat belum ada.')
  assert.equal(cleanLocalAddress({ name: 'S', phone: '081234567890', address: 'x' }).address, undefined)
})

test('cleanLocalAddress: lokasi null atau kosong ditolak (bukan dianggap 0,0)', () => {
  const base = { name: 'S', phone: '081234567890', address: 'x' }
  assert.equal(cleanLocalAddress({ ...base, lat: null, lng: null }).error, 'Titik lokasi alamat belum ada.')
  assert.equal(cleanLocalAddress({ ...base, lat: '', lng: '' }).error, 'Titik lokasi alamat belum ada.')
})
