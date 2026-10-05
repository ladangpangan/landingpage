import { NextResponse } from 'next/server'
import { googleConfigured } from '@/lib/google-auth'
import { getCurrentCustomer } from '@/lib/customer-session'

export const dynamic = 'force-dynamic'

// Dipakai header dan checkout: apakah login Google tersedia, dan siapa yang sedang login.
export async function GET() {
  const enabled = googleConfigured()
  const customer = enabled ? await getCurrentCustomer() : null
  return NextResponse.json({ enabled, customer }, { headers: { 'Cache-Control': 'no-store' } })
}
