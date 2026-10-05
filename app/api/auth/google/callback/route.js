import { NextResponse } from 'next/server'
import { checkState, createCustomerToken, CUSTOMER_COOKIE, fetchGoogleProfile, googleConfigured, OAUTH_COOKIE } from '@/lib/google-auth'
import { upsertGoogleCustomer } from '@/lib/customers'
import { customerCookieOptions } from '@/lib/customer-session'
import { siteOrigin } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

// Google mengembalikan pembeli ke sini dengan ?code dan ?state.
export async function GET(request) {
  const origin = siteOrigin(request)
  const fail = (why) => {
    const res = NextResponse.redirect(`${origin}/akun?galat=${why}`)
    res.cookies.delete(OAUTH_COOKIE)
    return res
  }
  if (!googleConfigured()) return fail('belum-aktif')
  const sp = new URL(request.url).searchParams
  if (sp.get('error')) return fail('dibatalkan')
  const secret = process.env.ADMIN_SESSION_SECRET
  const checked = checkState({ state: sp.get('state'), cookieNonce: request.cookies.get(OAUTH_COOKIE)?.value, secret })
  if (!checked || !sp.get('code')) return fail('kedaluwarsa')
  try {
    const profile = await fetchGoogleProfile({
      code: sp.get('code'),
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${origin}/api/auth/google/callback`,
    })
    const customer = await upsertGoogleCustomer(profile)
    const res = NextResponse.redirect(`${origin}${checked.returnTo}`)
    res.cookies.set(CUSTOMER_COOKIE, createCustomerToken({ customerId: customer.id, secret }), customerCookieOptions)
    res.cookies.delete(OAUTH_COOKIE)
    return res
  } catch (e) {
    console.error('[google] login gagal:', e?.message || e)
    return fail('gagal')
  }
}
