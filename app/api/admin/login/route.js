import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkPassword, createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/admin-auth'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }

  let valid
  try {
    valid = checkPassword(body?.password)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  if (!valid) {
    return NextResponse.json({ error: 'Password salah.' }, { status: 401 })
  }

  const token = createSessionToken()
  const store = await cookies()
  store.set(SESSION_COOKIE, token, sessionCookieOptions)
  return NextResponse.json({ ok: true })
}
