// Menyatukan semua hitungan checkout di server: isi keranjang, berat, zona dari
// lokasi, voucher, ongkir, total, dan pilihan jadwal. Dipakai oleh
// /api/checkout/quote (hanya menghitung) dan /api/checkout (membuat pesanan).
import { getLandingSettings } from '@/lib/db'
import { getActiveBundles } from '@/lib/bundles'
import { resolveCartLines, orderWeightKg } from '@/lib/cart-math'
import { getDeliveryConfig, listZones, getSlotUsage } from '@/lib/delivery'
import { getVoucher } from '@/lib/vouchers'
import { locateZone, resolveDelivery, scheduledDates, slotOptions, immediateSlot, wibNow, slotCapacityKg, validLatLng, storeCourierOpen } from '@/lib/shipping'
import { getBiteshipConfig, getAllowedRates } from '@/lib/biteship-api'
import { findOption } from '@/lib/biteship'
import { priceOrder } from '@/lib/checkout-math'
import { normalizeCode } from '@/lib/vouchers-math'

// Batas berat kurir instan (motor) lewat Biteship.
export const BITESHIP_MAX_KG = 20

// input: { items: [{kind, productId, qty}], location: {lat,lng}, voucherCode, delivery: {mode,date,slotId},
//          shipping: {method: 'toko'|'biteship', courier: 'gojek:instant'} }
// opts.withBiteship: ambil juga daftar tarif Biteship (untuk tampilan checkout).
export async function evaluateCheckout(input, now = new Date(), opts = {}) {
  const settings = await getLandingSettings()
  const bundles = await getActiveBundles()
  const productsById = new Map(settings.products.map((p) => [p.id, p]))
  const bundlesById = new Map(bundles.map((b) => [b.id, b]))

  const cart = resolveCartLines(
    (Array.isArray(input.items) ? input.items : []).map((it) => ({ kind: it?.kind, id: it?.productId, qty: it?.qty })),
    productsById,
    bundlesById
  )
  if (!cart.ok) return { error: cart.error }

  const subtotal = cart.lines.reduce((sum, l) => sum + l.price * l.qty, 0)
  const weightKg = orderWeightKg(cart.requirements, productsById)

  const [config, zones] = await Promise.all([getDeliveryConfig(), listZones()])
  const zoneResult = locateZone(input.location, config, zones)

  // Pengiriman lewat Biteship (kurir instan): tarif dari Biteship, tanpa gratis ongkir zona.
  // Lewat jam batas (17.00 WIB) kurir toko tutup: semua pesanan dipaksa lewat kurir instan.
  const storeOpen = storeCourierOpen({ config, now })
  const shippingMethod = !storeOpen || input.shipping?.method === 'biteship' ? 'biteship' : 'toko'
  const bcfg = await getBiteshipConfig().catch(() => null)
  const biteship = { available: !!bcfg?.ready, options: [], error: null, chosen: null }
  if (bcfg?.ready && (opts.withBiteship || shippingMethod === 'biteship')) {
    if (!validLatLng(input.location)) {
      biteship.error = 'Bagikan lokasi Anda dulu untuk melihat kurir instan.'
    } else if (weightKg > BITESHIP_MAX_KG && !storeOpen) {
      biteship.error = `Belanja ini ±${weightKg} kg, melebihi batas kurir instan (${BITESHIP_MAX_KG} kg), dan kurir toko sudah tutup (sampai jam ${String(config.cutoffHour || 17).padStart(2, '0')}.00). Silakan tanya lewat WhatsApp atau pesan besok pagi.`
    } else if (weightKg > BITESHIP_MAX_KG) {
      biteship.error = `Belanja ini ±${weightKg} kg, melebihi batas kurir instan (${BITESHIP_MAX_KG} kg). Pakai kurir toko atau kurangi belanjaan.`
    } else {
      try {
        biteship.options = await getAllowedRates(bcfg, {
          destination: { lat: Number(input.location.lat), lng: Number(input.location.lng) },
          weightKg,
          subtotal,
        })
        if (!biteship.options.length) biteship.error = 'Belum ada kurir instan yang tersedia untuk lokasi ini.'
      } catch (e) {
        console.error('[checkout] tarif Biteship gagal:', e?.message || e)
        biteship.error = 'Tarif kurir instan belum bisa dimuat. Coba lagi atau pakai kurir toko.'
      }
    }
    biteship.chosen = findOption(biteship.options, input.shipping?.courier)
  } else if (shippingMethod === 'biteship') {
    biteship.error = storeOpen
      ? 'Kurir instan belum tersedia.'
      : `Kurir toko sudah tutup (sampai jam ${String(config.cutoffHour || 17).padStart(2, '0')}.00) dan kurir instan belum tersedia. Silakan tanya lewat WhatsApp atau pesan besok pagi.`
  }

  const code = normalizeCode(input.voucherCode)
  const voucher = code ? await getVoucher(code) : null
  const zoneForPrice =
    shippingMethod === 'biteship'
      ? biteship.chosen ? { fee: biteship.chosen.price, freeShippingMin: Infinity } : null
      : zoneResult.ok ? zoneResult.zone : null
  const pricing = priceOrder({ subtotal, zone: zoneForPrice, voucher, now })
  const voucherError = pricing.voucherError || (code && !voucher ? 'Kode voucher tidak ditemukan.' : null)

  // Muatan slot hari ini sampai N hari ke depan.
  const dates = scheduledDates(now, config)
  const today = wibNow(now).date
  const usedKg = await getSlotUsage([today, ...dates], config.slots)
  const schedule = dates.map((date) => ({ date, slots: slotOptions({ date, config, usedKg, orderKg: weightKg, now }) }))
  const immediate = immediateSlot({ config, usedKg, orderKg: weightKg, now })
  const deliveryResolved = input.delivery ? resolveDelivery({ delivery: input.delivery, config, usedKg, orderKg: weightKg, now }) : null

  return {
    storeOpen,
    shippingMethod,
    biteship,
    cart,
    subtotal,
    weightKg,
    config,
    zoneResult,
    voucher,
    voucherError,
    pricing,
    schedule,
    immediate,
    deliveryResolved,
    capacityKg: slotCapacityKg(config),
  }
}
