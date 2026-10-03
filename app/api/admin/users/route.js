import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdmin, listAdmins } from '@/lib/admins'

// Kelola akun admin: khusus Owner.
export async function GET() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  return NextResponse.json({ users: await listAdmins() })
}

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
    const user = await createAdmin({
      email: body?.email,
      name: body?.name,
      role: body?.role,
      password: body?.password,
    })
    return NextResponse.json({ user })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Gagal membuat akun.' }, { status: 400 })
  }
}
