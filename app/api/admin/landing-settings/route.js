import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminLandingSettings, updateLandingSettings } from '@/lib/db'

export async function GET() {
  const { admin, error } = await requireAdmin()
  if (error) return error
  const settings = await getAdminLandingSettings({ role: admin.role })
  return NextResponse.json(settings)
}

export async function PUT(request) {
  const { admin, error } = await requireAdmin()
  if (error) return error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }

  try {
    const settings = await updateLandingSettings(body || {}, { role: admin.role })
    return NextResponse.json(settings)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Gagal menyimpan pengaturan.' }, { status: 400 })
  }
}
