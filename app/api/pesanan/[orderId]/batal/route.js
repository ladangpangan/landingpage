import { NextResponse } from 'next/server'
import { buyerCancelOrder } from '@/lib/orders'
import { cancelMidtransTransaction } from '@/lib/midtrans'
import { hasAccess } from '@/lib/order-guard'

export async function POST(request, { params }) {
  const { orderId } = await params
  const key = new URL(request.url).searchParams.get('k')
  if (!hasAccess(orderId, key)) return NextResponse.json({ error: 'Tautan pesanan tidak sah.' }, { status: 403 })
  try {
    const r = await buyerCancelOrder(orderId, cancelMidtransTransaction)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[pesanan] gagal membatalkan:', e?.message || e)
    return NextResponse.json({ error: 'Gagal membatalkan. Coba lagi.' }, { status: 500 })
  }
}
