import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { adminSetStatus } from '@/lib/orders'
import { ADMIN_SETTABLE } from '@/lib/order-status'

// Ubah status pesanan: hanya maju satu langkah (Dikemas, Dikirim, Diterima) atau Batal untuk pesanan belum bayar.
export async function PATCH(request, { params }) {
  const { admin, error } = await requireAdmin()
  if (error) return error
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  const to = String(body?.status || '')
  if (!ADMIN_SETTABLE.includes(to)) return NextResponse.json({ error: 'Status tidak dikenal.' }, { status: 400 })
  const { orderId } = await params
  try {
    const r = await adminSetStatus(orderId, to, `admin:${admin.email}`)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    return NextResponse.json({ ok: true, status: r.status })
  } catch (e) {
    console.error('[orders] gagal mengubah status:', e?.message || e)
    return NextResponse.json({ error: 'Gagal mengubah status. Coba lagi.' }, { status: 500 })
  }
}
