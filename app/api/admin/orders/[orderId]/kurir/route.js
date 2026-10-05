import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { claimCourierBooking, releaseCourierLock, saveCourierBooking } from '@/lib/orders'
import { getBiteshipConfig, createBiteshipOrder } from '@/lib/biteship-api'
import { buildOrderBody, originReady } from '@/lib/biteship'

// Admin menekan "Panggil Kurir": memesan kurir instan Biteship untuk pesanan berstatus Dikemas.
export async function POST(request, { params }) {
  const { error } = await requireAdmin()
  if (error) return error
  const { orderId } = await params
  const claim = await claimCourierBooking(orderId)
  if (claim.error) return NextResponse.json({ error: claim.error }, { status: claim.status })
  try {
    const cfg = await getBiteshipConfig()
    if (!cfg.apiKey || !cfg.warehouse || !originReady(cfg.origin)) {
      await releaseCourierLock(orderId)
      return NextResponse.json({ error: 'Pengaturan Biteship belum lengkap (API Key, titik gudang, data penjemputan).' }, { status: 409 })
    }
    const booking = await createBiteshipOrder(cfg, buildOrderBody({ order: claim.order, origin: cfg.origin, warehouse: cfg.warehouse }))
    await saveCourierBooking(orderId, booking)
    return NextResponse.json({ ok: true, courier: { id: booking.id, status: booking.status, link: booking.link, waybillId: booking.waybillId, price: booking.price } })
  } catch (e) {
    await releaseCourierLock(orderId).catch(() => {})
    return NextResponse.json({ error: e?.message || 'Gagal memanggil kurir.' }, { status: 502 })
  }
}
