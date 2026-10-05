import { NextResponse } from 'next/server'
import { buildAuthUrl, createState, googleConfigured, OAUTH_COOKIE } from '@/lib/google-auth'
import { siteOrigin } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

// Mulai login Google: simpan nonce di cookie, arahkan ke Google.
export async function GET(request) {
  const origin = siteOrigin(request)
  if (!googleConfigured()) return NextResponse.redirect(`${origin}/akun?galat=belum-aktif`)
  const returnTo = new URL(request.url).searchParams.get('returnTo')
  const { nonce, state } = createState({ returnTo, secret: process.env.ADMIN_SESSION_SECRET })
  const res = NextResponse.redirect(
    buildAuthUrl({ clientId: process.env.GOOGLE_CLIENT_ID, redirectUri: `${origin}/api/auth/google/callback`, state })
  )
  res.cookies.set(OAUTH_COOKIE, nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 })
  return res
}
