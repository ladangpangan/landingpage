import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { deliverySnapshot } from '@/lib/delivery-admin'
import { saveDeliveryConfig } from '@/lib/delivery'

// Ongkir, zona, kurir, dan voucher memengaruhi uang: khusus Owner.
export async function GET() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  try {
    return NextResponse.json(await deliverySnapshot())
  } catch (e) {
    console.error('[delivery] gagal memuat:', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat pengaturan pengiriman.' }, { status: 500 })
  }
}

export async function PUT(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  try {
    const r = await saveDeliveryConfig(body?.config)
    if (r.error) return NextResponse.json({ error: r.error }, { status: 400 })
    return NextResponse.json(await deliverySnapshot())
  } catch (e) {
    console.error('[delivery] gagal menyimpan:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menyimpan. Coba lagi.' }, { status: 500 })
  }
}
