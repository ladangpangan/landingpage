import { NextResponse } from 'next/server'
import { getBuyerOrder } from '@/lib/orders'
import { hasAccess } from '@/lib/order-guard'

export const dynamic = 'force-dynamic'

// Status pesanan untuk pembeli. Butuh kunci akses (?k=) dari tautan pesanan.
export async function GET(request, { params }) {
  const { orderId } = await params
  const key = new URL(request.url).searchParams.get('k')
  if (!hasAccess(orderId, key)) return NextResponse.json({ error: 'Tautan pesanan tidak sah.' }, { status: 403 })
  try {
    const order = await getBuyerOrder(orderId)
    if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    return NextResponse.json({ order }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[pesanan] gagal memuat:', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat pesanan.' }, { status: 500 })
  }
}
