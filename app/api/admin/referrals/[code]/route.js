import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { saveReferral } from '@/lib/referrals'

export async function PUT(request, { params }) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const { code } = await params
  const body = await request.json().catch(() => null)
  const r = await saveReferral({ ...(body || {}), code }, code)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 400 })
  return NextResponse.json({ ok: true })
}
