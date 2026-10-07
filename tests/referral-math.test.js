import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeReferralConfig, sanitizeReferralInput, referralAsVoucher, commissionFor, isSelfReferral, summarizeReferralOrders, DEFAULT_REFERRAL_CONFIG } from '../lib/referral-math.js'
import { priceOrder } from '../lib/checkout-math.js'

test('pengaturan: batas dan bawaan', () => {
  assert.deepEqual(sanitizeReferralConfig({ discountPct: '5', discountMax: '20000', commissionPct: 5 }).value, { enabled: true, discountPct: 5, discountMax: 20000, commissionPct: 5 })
  assert.equal(sanitizeReferralConfig({ discountPct: 5, discountMax: '', commissionPct: 5 }).value.discountMax, 0)
  assert.equal(sanitizeReferralConfig({ discountPct: 5, discountMax: 0, commissionPct: 5, enabled: false }).value.enabled, false)
  for (const bad of [{ discountPct: 51, commissionPct: 5 }, { discountPct: -1, commissionPct: 5 }, { discountPct: 5, commissionPct: 99 }, { discountPct: 'x', commissionPct: 5 }, null]) assert.ok(sanitizeReferralConfig(bad).error, JSON.stringify(bad))
})

test('perujuk: kode, nama, nomor', () => {
  const r = sanitizeReferralInput({ code: ' sari 10 ', name: ' Sari ', phone: '0812-3456-7890' })
  assert.equal(r.value.code, 'SARI10')
  assert.equal(r.value.phone, '6281234567890')
  assert.equal(r.value.active, true)
  for (const bad of [{ code: 'ab', name: 'x', phone: '081234567890' }, { code: 'SARI-10', name: 'x', phone: '081234567890' }, { code: 'SARI10', name: '', phone: '081234567890' }, { code: 'SARI10', name: 'x', phone: '12' }]) assert.ok(sanitizeReferralInput(bad).error, JSON.stringify(bad))
})

test('diskon lewat mesin voucher: 5% maks 20.000, tidak melebihi belanja', () => {
  const v = referralAsVoucher({ code: 'SARI10', active: true }, DEFAULT_REFERRAL_CONFIG)
  const p = priceOrder({ subtotal: 100000, zone: { fee: 8000, freeShippingMin: 100000 }, voucher: v })
  assert.equal(p.discountShop, 5000)
  assert.equal(p.voucherCode, 'SARI10')
  assert.equal(p.freeShipping, false) // belanja setelah diskon 95.000 < 100.000
  assert.equal(priceOrder({ subtotal: 1000000, zone: null, voucher: v }).discountShop, 20000)
  assert.equal(referralAsVoucher({ code: 'X', active: false }, DEFAULT_REFERRAL_CONFIG).active, false)
  assert.equal(referralAsVoucher({ code: 'X', active: true }, { ...DEFAULT_REFERRAL_CONFIG, enabled: false }).active, false)
  assert.equal(referralAsVoucher({ code: 'X', active: true }, { ...DEFAULT_REFERRAL_CONFIG, discountMax: 0 }).maxDiscount, null)
})

test('komisi dari belanja setelah diskon, dibulatkan ke bawah', () => {
  assert.equal(commissionFor(95000, 5), 4750)
  assert.equal(commissionFor(33333, 5), 1666)
  assert.equal(commissionFor(0, 5), 0)
  assert.equal(commissionFor(100000, 0), 0)
  assert.equal(commissionFor(-5, 5), 0)
})

test('perujuk tidak boleh memakai kode sendiri (nomor ditulis beda-beda)', () => {
  assert.equal(isSelfReferral('6281234567890', ['0812-3456-7890']), true)
  assert.equal(isSelfReferral('6281234567890', ['+62 812 3456 7890', '']), true)
  assert.equal(isSelfReferral('6281234567890', ['0811-0000-0000']), false)
  assert.equal(isSelfReferral('', ['']), false)
})

test('ringkasan komisi: void tidak dihitung, status dipisah', () => {
  const m = summarizeReferralOrders([
    { referral: { code: 'A', commission: 1000, status: 'pending' } },
    { referral: { code: 'A', commission: 2000, status: 'earned' } },
    { referral: { code: 'A', commission: 4000, status: 'paid' } },
    { referral: { code: 'A', commission: 9999, status: 'void' } },
    { referral: { code: 'B', commission: 500, status: 'earned' } },
    { referral: null },
  ])
  assert.deepEqual(m.get('A'), { code: 'A', orders: 3, pending: 1, earned: 1, paid: 1, pendingAmount: 1000, earnedAmount: 2000, paidAmount: 4000 })
  assert.equal(m.get('B').earnedAmount, 500)
  assert.equal(m.size, 2)
})
