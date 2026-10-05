// Menyatukan semua hitungan checkout di server: isi keranjang, berat, zona dari
// lokasi, voucher, ongkir, total, dan pilihan jadwal. Dipakai oleh
// /api/checkout/quote (hanya menghitung) dan /api/checkout (membuat pesanan).
import { getLandingSettings } from '@/lib/db'
import { getActiveBundles } from '@/lib/bundles'
import { resolveCartLines, orderWeightKg } from '@/lib/cart-math'
import { getDeliveryConfig, listZones, getSlotUsage } from '@/lib/delivery'
import { getVoucher } from '@/lib/vouchers'
import { locateZone, resolveDelivery, scheduledDates, slotOptions, immediateSlot, wibNow, slotCapacityKg } from '@/lib/shipping'
import { priceOrder } from '@/lib/checkout-math'
import { normalizeCode } from '@/lib/vouchers-math'

// input: { items: [{kind, productId, qty}], location: {lat,lng}, voucherCode, delivery: {mode,date,slotId} }
export async function evaluateCheckout(input, now = new Date()) {
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

  const code = normalizeCode(input.voucherCode)
  const voucher = code ? await getVoucher(code) : null
  const pricing = priceOrder({ subtotal, zone: zoneResult.ok ? zoneResult.zone : null, voucher, now })
  const voucherError = pricing.voucherError || (code && !voucher ? 'Kode voucher tidak ditemukan.' : null)

  // Muatan slot hari ini sampai N hari ke depan.
  const dates = scheduledDates(now, config)
  const today = wibNow(now).date
  const usedKg = await getSlotUsage([today, ...dates], config.slots)
  const schedule = dates.map((date) => ({ date, slots: slotOptions({ date, config, usedKg, orderKg: weightKg, now }) }))
  const immediate = immediateSlot({ config, usedKg, orderKg: weightKg, now })
  const deliveryResolved = input.delivery ? resolveDelivery({ delivery: input.delivery, config, usedKg, orderKg: weightKg, now }) : null

  return {
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
