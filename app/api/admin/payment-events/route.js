import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listPaymentEvents } from '@/lib/orders'

// Catatan mentah pemberitahuan pembayaran terakhir (khusus Owner) untuk memeriksa integrasi.
export async function GET() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const events = await listPaymentEvents(10)
  return NextResponse.json({ events: events.map((e) => ({ gateway: e.gateway, at: e.at, outcome: e.outcome, payload: e.payload })) })
}
