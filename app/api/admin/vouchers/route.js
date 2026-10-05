import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { deliverySnapshot } from '@/lib/delivery-admin'
import { saveVoucher } from '@/lib/vouchers'

// Buat voucher baru, atau ubah bila body.code (kode lama) diisi.
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
    const r = await saveVoucher(body?.voucher, body?.code ? String(body.code) : undefined)
    if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 400 })
    return NextResponse.json(await deliverySnapshot())
  } catch (e) {
    console.error('[vouchers] gagal menyimpan:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menyimpan voucher. Coba lagi.' }, { status: 500 })
  }
}
