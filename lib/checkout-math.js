// Menghitung total pesanan: belanja, diskon, ongkir. Murni logika; dipakai server.
import { voucherAmount, voucherEligibility } from './vouchers-math.js'

// Urutan hitung:
//  1) subtotal belanja
//  2) diskon belanja (voucher "diskon_belanja")
//  3) gratis ongkir bila belanja SETELAH diskon mencapai batas zona
//  4) ongkir zona (atau 0 bila gratis), lalu diskon ongkir (voucher "diskon_ongkir")
// Hanya satu voucher per pesanan.
export function priceOrder({ subtotal, zone, voucher, now = new Date() }) {
  let voucherError = null
  let applied = null
  if (voucher) {
    const eligible = voucherEligibility(voucher, { subtotal, now })
    if (eligible.ok) applied = voucher
    else voucherError = eligible.error
  }

  const discountShop = applied?.type === 'diskon_belanja' ? voucherAmount(applied, subtotal) : 0
  const subtotalAfter = subtotal - discountShop
  const freeShipping = !!zone && subtotalAfter >= (Number(zone.freeShippingMin) || Infinity)
  const shippingFee = zone ? (freeShipping ? 0 : Number(zone.fee) || 0) : 0
  const shippingDiscount = applied?.type === 'diskon_ongkir' ? voucherAmount(applied, shippingFee) : 0
  const total = subtotalAfter + shippingFee - shippingDiscount

  return {
    subtotal,
    discountShop,
    subtotalAfter,
    freeShipping,
    shippingFee,
    shippingDiscount,
    shippingPaid: shippingFee - shippingDiscount,
    total,
    voucherCode: applied ? applied.code : null,
    voucherError,
  }
}

// item_details untuk Midtrans. Jumlah harga x qty semua baris harus sama dengan
// gross_amount (total). Diskon dikirim sebagai baris bernilai negatif.
export function buildMidtransItems(lines, pricing) {
  const items = lines.map((l) => ({ id: l.id, name: l.name.slice(0, 50), price: l.price, quantity: l.qty }))
  if (pricing.shippingFee > 0) items.push({ id: 'ONGKIR', name: 'Ongkos kirim', price: pricing.shippingFee, quantity: 1 })
  if (pricing.discountShop > 0) items.push({ id: 'DISKON', name: `Diskon ${pricing.voucherCode || ''}`.trim().slice(0, 50), price: -pricing.discountShop, quantity: 1 })
  if (pricing.shippingDiscount > 0) items.push({ id: 'DISKON-ONGKIR', name: `Diskon ongkir ${pricing.voucherCode || ''}`.trim().slice(0, 50), price: -pricing.shippingDiscount, quantity: 1 })
  return items
}
