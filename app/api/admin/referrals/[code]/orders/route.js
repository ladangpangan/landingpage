import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listReferralOrders } from '@/lib/referrals'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const { code } = await params
  return NextResponse.json({ orders: await listReferralOrders(code) })
}
