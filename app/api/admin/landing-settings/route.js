import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth'
import { getAdminLandingSettings, updateLandingSettings } from '@/lib/db'

async function requireAdmin() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }
  return {}
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  const settings = await getAdminLandingSettings()
  return NextResponse.json(settings)
}

export async function PUT(request) {
  const { error } = await requireAdmin()
  if (error) return error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }

  try {
    const settings = await updateLandingSettings(body || {})
    return NextResponse.json(settings)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Gagal menyimpan pengaturan.' }, { status: 400 })
  }
}
