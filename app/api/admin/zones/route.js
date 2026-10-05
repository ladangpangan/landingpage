import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { deliverySnapshot } from '@/lib/delivery-admin'
import { saveZone } from '@/lib/delivery'

// Tambah zona baru, atau ubah bila body.id diisi.
export async function POST(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  try {
    const r = await saveZone(body?.zone, body?.id ? String(body.id) : undefined)
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 400 })
    return NextResponse.json(await deliverySnapshot())
  } catch (e) {
    console.error('[zones] gagal menyimpan:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menyimpan zona. Coba lagi.' }, { status: 500 })
  }
}
