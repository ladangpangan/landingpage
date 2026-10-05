import test from 'node:test'
import assert from 'node:assert/strict'
import {
  haversineKm, roadDistanceKm, zoneForDistance, locateZone, slotCapacityKg, slotOptions,
  immediateSlot, resolveDelivery, scheduledDates, wibNow, addDays, validLatLng,
} from '../lib/shipping.js'

const zones = [
  { id: 'z1', name: 'Zona 1', maxKm: 5, fee: 8000, freeShippingMin: 100000, active: true },
  { id: 'z2', name: 'Zona 2', maxKm: 10, fee: 12000, freeShippingMin: 150000, active: true },
  { id: 'z3', name: 'Zona 3', maxKm: 15, fee: 18000, freeShippingMin: 200000, active: true },
]
const config = {
  warehouse: { lat: -7.4478, lng: 112.7183 },
  roadFactor: 1,
  cutoffHour: 17,
  maxKgPerTrip: 40,
  couriers: 1,
  tripsPerSlot: 1,
  scheduleDaysAhead: 3,
  slots: [
    { id: 'pagi', label: 'Pagi', start: '08:00', end: '11:00' },
    { id: 'siang', label: 'Siang', start: '11:00', end: '14:00' },
    { id: 'sore', label: 'Sore', start: '14:00', end: '17:00' },
  ],
}
// 2026-10-05 08:30 WIB = 01:30 UTC
const pagi = new Date('2026-10-05T01:30:00Z')
// 2026-10-05 17:30 WIB = 10:30 UTC
const malam = new Date('2026-10-05T10:30:00Z')

test('waktu WIB dan tanggal', () => {
  assert.deepEqual(wibNow(pagi), { date: '2026-10-05', minutes: 8 * 60 + 30 })
  assert.equal(wibNow(new Date('2026-10-05T18:00:00Z')).date, '2026-10-06') // lewat tengah malam WIB
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})

test('jarak garis lurus masuk akal (1 derajat lintang = sekitar 111 km)', () => {
  const km = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
  assert.ok(Math.abs(km - 111.2) < 0.5)
  assert.equal(haversineKm(config.warehouse, config.warehouse), 0)
  assert.equal(roadDistanceKm({ lat: 0, lng: 0 }, { lat: 0.09, lng: 0 }, 1.3), Math.round(haversineKm({ lat: 0, lng: 0 }, { lat: 0.09, lng: 0 }) * 13) / 10)
})

test('zona ditentukan dari jarak; di luar 15 km tidak dilayani', () => {
  assert.equal(zoneForDistance(0, zones).id, 'z1')
  assert.equal(zoneForDistance(5, zones).id, 'z1')
  assert.equal(zoneForDistance(5.1, zones).id, 'z2')
  assert.equal(zoneForDistance(15, zones).id, 'z3')
  assert.equal(zoneForDistance(15.1, zones), null)
  assert.equal(zoneForDistance(3, zones.map((z) => ({ ...z, active: z.id !== 'z1' }))).id, 'z2')
})

test('lokasi pembeli -> zona, dengan pesan bila gagal', () => {
  const near = { lat: config.warehouse.lat + 0.02, lng: config.warehouse.lng } // sekitar 2,2 km
  const r = locateZone(near, config, zones)
  assert.ok(r.ok); assert.equal(r.zone.id, 'z1'); assert.ok(r.distanceKm > 2 && r.distanceKm < 2.5)
  const far = { lat: config.warehouse.lat + 0.3, lng: config.warehouse.lng } // sekitar 33 km
  assert.equal(locateZone(far, config, zones).code, 'jauh')
  assert.equal(locateZone(null, config, zones).code, 'lokasi')
  assert.equal(locateZone({ lat: 'x', lng: 1 }, config, zones).code, 'lokasi')
  assert.equal(locateZone(near, { ...config, warehouse: null }, zones).code, 'gudang')
  // faktor jalan memperbesar jarak sehingga pindah zona
  const edge = { lat: config.warehouse.lat + 0.04, lng: config.warehouse.lng } // sekitar 4,4 km
  assert.equal(locateZone(edge, config, zones).zone.id, 'z1')
  assert.equal(locateZone(edge, { ...config, roadFactor: 1.3 }, zones).zone.id, 'z2')
  assert.equal(validLatLng({ lat: 91, lng: 0 }), null)
})

test('kapasitas slot = kurir x trip x kg per trip', () => {
  assert.equal(slotCapacityKg(config), 40)
  assert.equal(slotCapacityKg({ ...config, couriers: 3, tripsPerSlot: 2 }), 240)
  assert.equal(slotCapacityKg({}), 40)
})

test('slot terjadwal: penuh, lewat, dan terlalu berat', () => {
  const used = { '2026-10-06|pagi': 30 }
  const opt = slotOptions({ date: '2026-10-06', config, usedKg: used, orderKg: 15, now: pagi })
  assert.equal(opt.find((s) => s.id === 'pagi').available, false)
  assert.equal(opt.find((s) => s.id === 'pagi').reason, 'penuh')
  assert.equal(opt.find((s) => s.id === 'pagi').remainingKg, 10)
  assert.equal(opt.find((s) => s.id === 'siang').available, true)
  assert.equal(slotOptions({ date: '2026-10-06', config, usedKg: used, orderKg: 10, now: pagi })[0].available, true) // pas 40 kg
  assert.equal(slotOptions({ date: '2026-10-06', config, usedKg: {}, orderKg: 41, now: pagi })[0].reason, 'terlalu_berat')
  // hari ini: slot yang sudah berakhir tidak bisa dipilih
  const today = slotOptions({ date: '2026-10-05', config, usedKg: {}, orderKg: 5, now: new Date('2026-10-05T05:00:00Z') }) // 12:00 WIB
  assert.equal(today.find((s) => s.id === 'pagi').reason, 'lewat')
  assert.equal(today.find((s) => s.id === 'siang').available, true)
})

test('tanggal terjadwal: besok sampai 3 hari ke depan', () => {
  assert.deepEqual(scheduledDates(pagi, config), ['2026-10-06', '2026-10-07', '2026-10-08'])
  assert.equal(scheduledDates(pagi, { ...config, scheduleDaysAhead: 99 }).length, 7)
})

test('Kirim Sekarang: sebelum 17.00 dikirim hari itu, setelahnya ditolak', () => {
  const ok = immediateSlot({ config, usedKg: {}, orderKg: 10, now: pagi })
  assert.ok(ok.ok); assert.equal(ok.date, '2026-10-05'); assert.equal(ok.slot.id, 'pagi')
  const sore = immediateSlot({ config, usedKg: {}, orderKg: 10, now: new Date('2026-10-05T07:30:00Z') }) // 14:30 WIB
  assert.equal(sore.slot.id, 'sore')
  const telat = immediateSlot({ config, usedKg: {}, orderKg: 10, now: malam })
  assert.equal(telat.ok, false); assert.match(telat.error, /sebelum jam 17\.00/)
  const penuh = immediateSlot({ config, usedKg: { '2026-10-05|pagi': 40, '2026-10-05|siang': 40, '2026-10-05|sore': 40 }, orderKg: 5, now: pagi })
  assert.match(penuh.error, /penuh/)
  assert.match(immediateSlot({ config, usedKg: {}, orderKg: 90, now: pagi }).error, /terlalu berat/)
})

test('pilihan jadwal dari pembeli diperiksa', () => {
  const base = { config, usedKg: {}, orderKg: 10, now: pagi }
  assert.ok(resolveDelivery({ ...base, delivery: { mode: 'terjadwal', date: '2026-10-06', slotId: 'siang' } }).ok)
  assert.match(resolveDelivery({ ...base, delivery: { mode: 'terjadwal', date: '2026-10-20', slotId: 'siang' } }).error, /Tanggal/)
  assert.match(resolveDelivery({ ...base, delivery: { mode: 'terjadwal', date: '2026-10-06', slotId: 'malam' } }).error, /jam/)
  assert.match(resolveDelivery({ ...base, usedKg: { '2026-10-06|siang': 35 }, delivery: { mode: 'terjadwal', date: '2026-10-06', slotId: 'siang' } }).error, /penuh/)
  assert.match(resolveDelivery({ ...base, delivery: { mode: 'besok' } }).error, /Pilih cara/)
  assert.equal(resolveDelivery({ ...base, delivery: { mode: 'sekarang' } }).slotId, 'pagi')
})
