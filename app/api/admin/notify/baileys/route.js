import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getBaileysStatus, logoutBaileys } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// Status sambungan WhatsApp (Baileys) + gambar QR untuk ditautkan: khusus Owner.
export async function GET() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  return NextResponse.json(await getBaileysStatus(), { headers: { 'Cache-Control': 'no-store' } })
}

// { action: 'logout' }: putuskan perangkat tertaut dan siapkan QR baru.
export async function POST(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const body = await request.json().catch(() => ({}))
  if (body?.action !== 'logout') return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 })
  const ok = await logoutBaileys()
  if (!ok) return NextResponse.json({ error: 'Gateway tidak menjawab. Pastikan wadah wa-gateway berjalan.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
