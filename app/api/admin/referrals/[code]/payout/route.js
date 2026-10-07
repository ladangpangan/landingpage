import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { payoutReferral } from '@/lib/referrals'

// "Tandai sudah dibayar": semua komisi siap-bayar milik kode ini dicatat lunas (transfernya dilakukan Owner sendiri).
export async function POST(request, { params }) {
  const { error, admin } = await requireAdmin('owner')
  if (error) return error
  const { code } = await params
  const r = await payoutReferral(code, admin?.email || 'owner')
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 400 })
  return NextResponse.json({ ok: true, amount: r.amount, count: r.count })
}
