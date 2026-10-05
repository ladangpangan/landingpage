import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { deliverySnapshot } from '@/lib/delivery-admin'
import { deleteZone } from '@/lib/delivery'

export async function DELETE(_request, { params }) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const { id } = await params
  try {
    await deleteZone(String(id))
    return NextResponse.json(await deliverySnapshot())
  } catch (e) {
    console.error('[zones] gagal menghapus:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menghapus zona.' }, { status: 500 })
  }
}
