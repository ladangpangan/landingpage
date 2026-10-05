import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listOrders } from '@/lib/orders'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  const orders = await listOrders({ limit: 100 })
  return NextResponse.json({ orders })
}
