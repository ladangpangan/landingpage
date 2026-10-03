import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { updateAdmin } from '@/lib/admins'

export async function PATCH(request, { params }) {
  const { admin, error } = await requireAdmin('owner')
  if (error) return error
  const { id } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  try {
    const user = await updateAdmin(
      id,
      { name: body?.name, role: body?.role, active: body?.active, password: body?.password },
      { actingAdminId: admin.id }
    )
    return NextResponse.json({ user })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Gagal mengubah akun.' }, { status: 400 })
  }
}
