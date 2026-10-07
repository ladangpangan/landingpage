import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getReferralConfig, listReferralsWithStats, saveReferral } from '@/lib/referrals'

export const dynamic = 'force-dynamic'

// Referral: khusus Owner (ada data pribadi dan uang komisi).
export async function GET() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  try {
    return NextResponse.json({ config: await getReferralConfig(), referrals: await listReferralsWithStats() })
  } catch (e) {
    console.error('[admin/referrals]', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat data referral.' }, { status: 500 })
  }
}

export async function POST(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const body = await request.json().catch(() => null)
  const r = await saveReferral(body)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 400 })
  return NextResponse.json({ ok: true })
}
