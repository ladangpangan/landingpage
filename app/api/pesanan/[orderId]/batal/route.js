import { NextResponse } from 'next/server'
import { buyerCancelOrder, getOrder } from '@/lib/orders'
import { cancelMidtransTransaction } from '@/lib/midtrans'
import { getMayarConfig, closeMayarInvoice } from '@/lib/mayar-api'
import { hasAccess } from '@/lib/order-guard'

export async function POST(request, { params }) {
  const { orderId } = await params
  const key = new URL(request.url).searchParams.get('k')
  if (!hasAccess(orderId, key)) return NextResponse.json({ error: 'Tautan pesanan tidak sah.' }, { status: 403 })
  try {
    // Batalkan juga di penyedia pembayaran (upaya terbaik, kegagalan diabaikan).
    const order = await getOrder(orderId)
    const cancelRemote =
      order?.payGateway === 'mayar'
        ? async () => closeMayarInvoice(await getMayarConfig(), order.payment?.invoiceId)
        : cancelMidtransTransaction
    const r = await buyerCancelOrder(orderId, cancelRemote)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[pesanan] gagal membatalkan:', e?.message || e)
    return NextResponse.json({ error: 'Gagal membatalkan. Coba lagi.' }, { status: 500 })
  }
}
