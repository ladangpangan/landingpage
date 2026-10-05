import { NextResponse } from 'next/server'
import { evaluateCheckout } from '@/lib/checkout-service'

// Perkiraan biaya untuk tampilan checkout (belum membuat pesanan). Semua angka
// dihitung server; hasil ini hanya untuk ditampilkan. Saat bayar dihitung ulang.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  try {
    const ctx = await evaluateCheckout(body || {})
    if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: 400 })
    const z = ctx.zoneResult
    return NextResponse.json({
      subtotal: ctx.subtotal,
      pricing: ctx.pricing,
      voucherError: ctx.voucherError,
      zone: z.ok ? { name: z.zone.name, fee: z.zone.fee, freeShippingMin: z.zone.freeShippingMin, distanceKm: z.distanceKm } : null,
      zoneError: z.ok ? null : { code: z.code, message: z.error, distanceKm: z.distanceKm ?? null },
      immediate: ctx.immediate.ok
        ? { available: true, slotLabel: ctx.immediate.slot.label, start: ctx.immediate.slot.start, end: ctx.immediate.slot.end }
        : { available: false, error: ctx.immediate.error },
      schedule: ctx.schedule,
      delivery: ctx.deliveryResolved,
    })
  } catch (e) {
    console.error('[quote]', e?.message || e)
    return NextResponse.json({ error: 'Perkiraan biaya belum bisa dihitung. Coba lagi.' }, { status: 503 })
  }
}
