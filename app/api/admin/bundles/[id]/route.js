import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { deleteBundle } from '@/lib/bundles'

export async function DELETE(_request, { params }) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  try {
    await deleteBundle(String(id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[bundles] gagal menghapus:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menghapus paket.' }, { status: 500 })
  }
}
