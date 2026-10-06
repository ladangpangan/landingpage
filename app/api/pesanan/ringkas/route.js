import { NextResponse } from 'next/server'
import { summarizeOrders } from '@/lib/orders'
import { hasAccess } from '@/lib/order-guard'

export const dynamic = 'force-dynamic'

// Ringkasan status untuk lonceng pemberitahuan. Hanya pesanan dengan kunci akses sah yang dijawab.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 })
  }
  const list = Array.isArray(body?.orders) ? body.orders.slice(0, 20) : []
  const ids = list.filter((o) => typeof o?.id === 'string' && o.id.length < 80 && hasAccess(o.id, o.k)).map((o) => o.id)
  if (!ids.length) return NextResponse.json({ orders: [] }, { headers: { 'Cache-Control': 'no-store' } })
  try {
    return NextResponse.json({ orders: await summarizeOrders(ids) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[pesanan] gagal meringkas:', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat.' }, { status: 500 })
  }
}
