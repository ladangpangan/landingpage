import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/admin-auth'
import { authenticate } from '@/lib/admins'

function clientIp(request) {
  // Nginx di VPS mengisi X-Real-IP / X-Forwarded-For (lihat DEPLOYMENT.md).
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }

  let result
  try {
    result = await authenticate({ email: body?.email, password: body?.password, ip: clientIp(request) })
  } catch (e) {
    console.error('[login]', e?.message || e)
    return NextResponse.json({ error: 'Server belum siap. Hubungi pengelola teknis.' }, { status: 500 })
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  let token
  try {
    token = createSessionToken(result.admin)
  } catch (e) {
    console.error('[login]', e?.message || e)
    return NextResponse.json({ error: 'ADMIN_SESSION_SECRET belum diatur di server.' }, { status: 500 })
  }
  const store = await cookies()
  store.set(SESSION_COOKIE, token, sessionCookieOptions)
  return NextResponse.json({ ok: true })
}
