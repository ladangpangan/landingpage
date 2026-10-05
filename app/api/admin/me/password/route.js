import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireAdmin, SESSION_COOKIE } from '@/lib/admin-auth'
import { changeOwnPassword } from '@/lib/admins'

export async function POST(request) {
  const { admin, error } = await requireAdmin()
  if (error) return error
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  try {
    await changeOwnPassword(admin.id, body?.currentPassword, body?.newPassword)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Gagal mengganti password.' }, { status: 400 })
  }
  // Semua sesi lama (termasuk yang ini) tidak berlaku lagi; wajib masuk ulang.
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  return NextResponse.json({ ok: true })
}
