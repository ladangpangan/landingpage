import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCode, voucherEligibility, voucherAmount, sanitizeVoucherInput } from '../lib/vouchers-math.js'
import { priceOrder, buildMidtransItems } from '../lib/checkout-math.js'

const z1 = { id: 'z1', fee: 8000, freeShippingMin: 100000 }
const shopV = { code: 'HEMAT10', type: 'diskon_belanja', valueType: 'persen', value: 10, maxDiscount: 15000, minPurchase: 50000, quota: 5, used: 2, active: true }
const shipV = { code: 'ONGKIR5', type: 'diskon_ongkir', valueType: 'nominal', value: 5000, active: true }
const now = new Date('2026-10-05T03:00:00Z')

test('kode voucher dirapikan', () => assert.equal(normalizeCode(' hemat 10 '), 'HEMAT10'))

test('syarat voucher: aktif, tanggal, kuota, belanja minimal', () => {
  assert.ok(voucherEligibility(shopV, { subtotal: 60000, now }).ok)
  assert.match(voucherEligibility(null, { subtotal: 1, now }).error, /tidak ditemukan/)
  assert.match(voucherEligibility({ ...shopV, active: false }, { subtotal: 60000, now }).error, /tidak ditemukan/)
  assert.match(voucherEligibility(shopV, { subtotal: 40000, now }).error, /minimal Rp 50\.000/)
  assert.match(voucherEligibility({ ...shopV, used: 5 }, { subtotal: 60000, now }).error, /Kuota/)
  assert.match(voucherEligibility({ ...shopV, startsAt: '2026-11-01T00:00:00Z' }, { subtotal: 60000, now }).error, /belum berlaku/)
  assert.match(voucherEligibility({ ...shopV, endsAt: '2026-09-01T00:00:00Z' }, { subtotal: 60000, now }).error, /berakhir/)
  assert.ok(voucherEligibility({ ...shopV, quota: null, used: 999 }, { subtotal: 60000, now }).ok)
})

test('besar potongan: persen dibatasi maksimal, tidak melebihi dasar', () => {
  assert.equal(voucherAmount(shopV, 100000), 10000)
  assert.equal(voucherAmount(shopV, 500000), 15000) // dibatasi maksimal
  assert.equal(voucherAmount(shipV, 8000), 5000)
  assert.equal(voucherAmount(shipV, 3000), 3000) // tak melebihi ongkir
  assert.equal(voucherAmount(shipV, 0), 0)
})

test('hitung total: ongkir zona, gratis ongkir, dan batas tepat', () => {
  const a = priceOrder({ subtotal: 60000, zone: z1, now })
  assert.deepEqual([a.shippingFee, a.freeShipping, a.total], [8000, false, 68000])
  assert.equal(priceOrder({ subtotal: 100000, zone: z1, now }).freeShipping, true) // tepat di batas
  assert.equal(priceOrder({ subtotal: 100000, zone: z1, now }).total, 100000)
  assert.equal(priceOrder({ subtotal: 99999, zone: z1, now }).shippingFee, 8000)
})

test('diskon belanja dihitung sebelum gratis ongkir', () => {
  // 105.000 - 10% (10.500) = 94.500 < 100.000 => tidak gratis ongkir
  const p = priceOrder({ subtotal: 105000, zone: z1, voucher: shopV, now })
  assert.deepEqual([p.discountShop, p.subtotalAfter, p.freeShipping, p.shippingFee, p.total], [10500, 94500, false, 8000, 102500])
  assert.equal(p.voucherCode, 'HEMAT10')
})

test('diskon ongkir mengurangi ongkir saja; gratis ongkir tidak dobel', () => {
  const p = priceOrder({ subtotal: 60000, zone: z1, voucher: shipV, now })
  assert.deepEqual([p.shippingFee, p.shippingDiscount, p.shippingPaid, p.total], [8000, 5000, 3000, 63000])
  const free = priceOrder({ subtotal: 120000, zone: z1, voucher: shipV, now })
  assert.deepEqual([free.shippingFee, free.shippingDiscount, free.total], [0, 0, 120000])
})

test('voucher tidak sah tidak mengubah total dan memberi pesan', () => {
  const p = priceOrder({ subtotal: 40000, zone: z1, voucher: shopV, now })
  assert.equal(p.discountShop, 0); assert.equal(p.total, 48000); assert.match(p.voucherError, /minimal/)
  assert.equal(p.voucherCode, null)
})

test('total tidak pernah negatif dan tanpa zona ongkir = 0', () => {
  const p = priceOrder({ subtotal: 10000, zone: null, voucher: { ...shopV, valueType: 'nominal', value: 999999, maxDiscount: null, minPurchase: 0 }, now })
  assert.equal(p.total, 0); assert.equal(p.shippingFee, 0)
})

test('item Midtrans: jumlahnya sama dengan total', () => {
  const lines = [{ id: 'a', name: 'Karkas', price: 32000, qty: 2 }, { id: 'b', name: 'Paket', price: 50000, qty: 1 }]
  for (const [voucher, subtotal] of [[null, 114000], [shopV, 114000], [shipV, 114000]]) {
    const p = priceOrder({ subtotal, zone: z1, voucher, now })
    const sum = buildMidtransItems(lines, p).reduce((s, it) => s + it.price * it.quantity, 0)
    assert.equal(sum, p.total)
  }
})

test('isian voucher dari admin divalidasi', () => {
  const ok = sanitizeVoucherInput({ code: 'hemat 10', type: 'diskon_belanja', valueType: 'persen', value: '10', maxDiscount: '15000', minPurchase: '', quota: '', startsAt: '', endsAt: '' })
  assert.equal(ok.error, undefined); assert.equal(ok.value.code, 'HEMAT10'); assert.equal(ok.value.quota, null); assert.equal(ok.value.minPurchase, 0)
  assert.match(sanitizeVoucherInput({ code: 'a', type: 'diskon_belanja', valueType: 'nominal', value: 1 }).error, /Kode/)
  assert.match(sanitizeVoucherInput({ code: 'ABC', type: 'x', valueType: 'nominal', value: 1 }).error, /Jenis voucher/)
  assert.match(sanitizeVoucherInput({ code: 'ABC', type: 'diskon_belanja', valueType: 'persen', value: 150 }).error, /100/)
  assert.match(sanitizeVoucherInput({ code: 'ABC', type: 'diskon_belanja', valueType: 'nominal', value: 0 }).error, /lebih dari 0/)
  assert.match(sanitizeVoucherInput({ code: 'ABC', type: 'diskon_belanja', valueType: 'nominal', value: 1, quota: 0 }).error, /Kuota/)
  assert.match(sanitizeVoucherInput({ code: 'ABC', type: 'diskon_belanja', valueType: 'nominal', value: 1, startsAt: '2026-10-10', endsAt: '2026-10-01' }).error, /setelah/)
})

test('tanggal voucher tanpa jam: mulai 00.00 WIB, berakhir 23.59 WIB', () => {
  const v = sanitizeVoucherInput({ code: 'ABC', type: 'diskon_belanja', valueType: 'nominal', value: 1000, startsAt: '2026-10-10', endsAt: '2026-10-12' }).value
  assert.equal(v.startsAt, '2026-10-09T17:00:00.000Z')
  assert.equal(v.endsAt, '2026-10-12T16:59:59.000Z')
  // voucher masih berlaku sepanjang hari terakhir (12 Okt 23.00 WIB = 16.00 UTC)
  assert.ok(voucherEligibility({ ...v, quota: null }, { subtotal: 1, now: new Date('2026-10-12T16:00:00Z') }).ok)
  assert.ok(!voucherEligibility({ ...v, quota: null }, { subtotal: 1, now: new Date('2026-10-12T17:30:00Z') }).ok)
})
