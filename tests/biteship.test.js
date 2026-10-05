import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRatesBody, parseRates, filterAllowed, findOption, ratesCacheKey, originReady, sanitizeBiteshipSettings, optionKey } from '../lib/biteship.js'

const O = { lat: -7.4478, lng: 112.7183 }
const D = { lat: -7.43, lng: 112.73 }

test('permintaan tarif: koordinat, gram, nilai, dan daftar kurir tanpa duplikat', () => {
  const b = buildRatesBody({ origin: O, destination: D, allowedKeys: ['gojek:instant', 'gojek:same_day', 'grab:instant'], weightKg: 2.3, subtotal: 96000 })
  assert.equal(b.origin_latitude, -7.4478)
  assert.equal(b.destination_longitude, 112.73)
  assert.equal(b.couriers, 'gojek,grab')
  assert.equal(b.items.length, 1)
  assert.equal(b.items[0].weight, 2300)
  assert.equal(b.items[0].value, 96000)
  assert.equal(buildRatesBody({ origin: O, destination: D, allowedKeys: [], weightKg: 0.01, subtotal: 0 }).items[0].weight, 100)
})

test('balasan tarif dibaca, tarif tak valid dibuang, diurut termurah', () => {
  const r = parseRates({ success: true, pricing: [
    { courier_code: 'grab', courier_name: 'Grab', courier_service_code: 'instant', courier_service_name: 'Instant', price: 25000, duration: '1 - 2 hours' },
    { company: 'gojek', type: 'instant', price: 18000.4, shipment_duration_range: '1 - 3', shipment_duration_unit: 'hours' },
    { company: 'x', type: 'y', price: 0 },
    { type: 'z', price: 5000 },
  ] })
  assert.deepEqual(r.map((o) => [o.key, o.price]), [['gojek:instant', 18000], ['grab:instant', 25000]])
  assert.equal(r[0].duration, '1 - 3 hours')
  assert.deepEqual(parseRates(null), [])
  assert.deepEqual(parseRates({ data: { pricing: [{ company: 'a', type: 'b', price: 10 }] } }).length, 1)
})

test('hanya kurir yang diizinkan Owner yang tampil dan bisa dipilih', () => {
  const opts = parseRates({ pricing: [{ company: 'gojek', type: 'instant', price: 1 }, { company: 'jne', type: 'reg', price: 2 }] })
  assert.deepEqual(filterAllowed(opts, ['GOJEK:instant']).map((o) => o.key), ['gojek:instant'])
  assert.equal(findOption(opts, 'JNE:reg').company, 'jne')
  assert.equal(findOption(opts, 'x:y'), null)
  assert.equal(optionKey('Gojek', 'Instant'), 'gojek:instant')
})

test('kunci cache: lokasi/berat berdekatan sama, jauh beda', () => {
  const a = ratesCacheKey({ origin: O, destination: D, allowedKeys: ['b:1', 'a:1'], weightKg: 2.1, subtotal: 60000 })
  assert.equal(a, ratesCacheKey({ origin: O, destination: { lat: -7.43001, lng: 112.73001 }, allowedKeys: ['a:1', 'b:1'], weightKg: 2.4, subtotal: 70000 }))
  assert.notEqual(a, ratesCacheKey({ origin: O, destination: { lat: -7.5, lng: 112.8 }, allowedKeys: ['a:1', 'b:1'], weightKg: 2.1, subtotal: 60000 }))
  assert.notEqual(a, ratesCacheKey({ origin: O, destination: D, allowedKeys: ['a:1', 'b:1'], weightKg: 6, subtotal: 60000 }))
})

test('data penjemputan wajib lengkap; pengaturan dibersihkan', () => {
  assert.ok(!originReady(null))
  assert.ok(!originReady({ contactName: 'a', contactPhone: '', address: 'x' }))
  assert.ok(originReady({ contactName: 'a', contactPhone: '1', address: 'x' }))
  const s = sanitizeBiteshipSettings({ enabled: true, allowed: ['Gojek:Instant', 'bad key', 'gojek:instant', 5], origin: { contactName: ' Gudang ', contactPhone: '08', address: 'Jl' } })
  assert.deepEqual(s.allowed, ['gojek:instant'])
  assert.equal(s.origin.contactName, 'Gudang')
  assert.equal(sanitizeBiteshipSettings({}).enabled, undefined)
})
