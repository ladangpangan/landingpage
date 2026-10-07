import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listOrdersForCustomer } from '@/lib/customers'

export const dynamic = 'force-dynamic'

// Pesanan satu pelanggan (?customerId= untuk yang login, ?phone= untuk tanpa login). Khusus Owner.
export async function GET(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const sp = new URL(request.url).searchParams
  const customerId = sp.get('customerId') || ''
  const phone = sp.get('phone') || ''
  if (!customerId && !phone) return NextResponse.json({ error: 'Pelanggan tidak jelas.' }, { status: 400 })
  try {
    return NextResponse.json({ orders: await listOrdersForCustomer({ customerId, phone }) })
  } catch (e) {
    console.error('[admin/customers/orders]', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat pesanan.' }, { status: 500 })
  }
}
