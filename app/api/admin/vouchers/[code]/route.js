import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { deliverySnapshot } from '@/lib/delivery-admin'
import { deleteVoucher } from '@/lib/vouchers'

export async function DELETE(_request, { params }) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const { code } = await params
  try {
    await deleteVoucher(String(code))
    return NextResponse.json(await deliverySnapshot())
  } catch (e) {
    console.error('[vouchers] gagal menghapus:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menghapus voucher.' }, { status: 500 })
  }
}
