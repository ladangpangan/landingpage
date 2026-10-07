import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { saveReferralConfig } from '@/lib/referrals'

export async function PUT(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const body = await request.json().catch(() => null)
  const r = await saveReferralConfig(body)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ config: r.config })
}
