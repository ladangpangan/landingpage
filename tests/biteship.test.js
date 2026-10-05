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

import { buildOrderBody, extractBiteshipOrder, parseBiteshipWebhook, orderStatusFor, courierProblem, canBookCourier, verifyWebhookToken } from '../lib/biteship.js'

test('pesan kurir: kontak gudang, tujuan, koordinat, kurir terpilih, dan isi', () => {
  const order = {
    orderId: 'LPI-1-AB', weightKg: 2.5,
    customer: { name: 'Ibu Sari', phone: '0812-3456', address: 'Jl. Mawar 5', note: 'Titip satpam' },
    location: { lat: -7.43, lng: 112.73 },
    shipping: { method: 'biteship', courier: { company: 'gojek', type: 'instant' } },
    items: [{ name: 'Karkas', qty: 2, price: 32000 }, { name: 'Ceker', qty: 1, price: 10000 }],
  }
  const b = buildOrderBody({ order, origin: { contactName: 'Gudang', contactPhone: '08', address: 'Jl. Gudang', note: 'Pintu samping' }, warehouse: { lat: -7.4478, lng: 112.7183 } })
  assert.equal(b.courier_company, 'gojek')
  assert.equal(b.courier_type, 'instant')
  assert.equal(b.delivery_type, 'now')
  assert.equal(b.reference_id, 'LPI-1-AB')
  assert.deepEqual(b.destination_coordinate, { latitude: -7.43, longitude: 112.73 })
  assert.deepEqual(b.origin_coordinate, { latitude: -7.4478, longitude: 112.7183 })
  assert.equal(b.destination_contact_phone, '08123456')
  assert.equal(b.items[0].weight, 2500)
  assert.equal(b.items[0].value, 74000)
  assert.match(b.items[0].description, /2x Karkas/)
})

test('balasan order dibaca: id, resi, tautan lacak, harga', () => {
  const r = extractBiteshipOrder({ success: true, id: 'bs1', price: 21000, status: 'confirmed', courier: { tracking_id: 't1', waybill_id: 'w1', link: 'https://l', driver_name: 'Budi' } })
  assert.deepEqual([r.id, r.trackingId, r.waybillId, r.link, r.price, r.driverName], ['bs1', 't1', 'w1', 'https://l', 21000, 'Budi'])
  assert.equal(extractBiteshipOrder(null).id, '')
  assert.equal(extractBiteshipOrder({ data: { id: 'x' } }).id, 'x')
})

test('webhook status dibaca dan dipetakan ke status pesanan', () => {
  const p = parseBiteshipWebhook({ event: 'order.status', order_id: 'bs1', status: 'Picked', courier_tracking_id: 't1', courier_driver_name: 'Budi', courier_link: 'https://l' })
  assert.deepEqual([p.biteshipId, p.status, p.trackingId, p.driverName, p.link], ['bs1', 'picked', 't1', 'Budi', 'https://l'])
  assert.equal(orderStatusFor('picked'), 'dikirim')
  assert.equal(orderStatusFor('dropping_off'), 'dikirim')
  assert.equal(orderStatusFor('delivered'), 'diterima')
  assert.equal(orderStatusFor('allocated'), null)
  assert.equal(parseBiteshipWebhook(null).status, '')
})

test('masalah kurir dan boleh-panggil-lagi', () => {
  assert.ok(courierProblem('courier_not_found'))
  assert.ok(!courierProblem('picked'))
  assert.ok(canBookCourier(null))
  assert.ok(canBookCourier({ biteshipId: 'x', status: 'courier_not_found' }))
  assert.ok(!canBookCourier({ biteshipId: 'x', status: 'allocated' }))
  assert.ok(!canBookCourier({ biteshipId: 'x', status: 'picked' }))
})

test('token webhook dibandingkan aman', () => {
  assert.ok(verifyWebhookToken('abc', 'abc'))
  assert.ok(!verifyWebhookToken('abd', 'abc'))
  assert.ok(!verifyWebhookToken('', 'abc'))
  assert.ok(!verifyWebhookToken('a', ''))
})
