import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listOrders } from '@/lib/orders'
import { ORDER_STATUSES } from '@/lib/order-status'

export async function GET(request) {
  const { error } = await requireAdmin()
  if (error) return error
  const sp = new URL(request.url).searchParams
  const status = ORDER_STATUSES.includes(sp.get('status')) ? sp.get('status') : undefined
  const orders = await listOrders({ limit: 100, status, q: sp.get('q') || '' })
  return NextResponse.json({ orders })
}
