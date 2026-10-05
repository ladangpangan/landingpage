// Sesi pembeli yang login Google: cookie bertanda tangan berisi id pembeli.
import { cookies } from 'next/headers'
import { CUSTOMER_COOKIE, CUSTOMER_MAX_AGE_SECONDS, parseCustomerToken } from '@/lib/google-auth'
import { getCustomerById } from '@/lib/customers'

export const customerCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: CUSTOMER_MAX_AGE_SECONDS,
}

// Pembeli yang sedang login (atau null).
export async function getCurrentCustomer() {
  const store = await cookies()
  const parsed = parseCustomerToken(store.get(CUSTOMER_COOKIE)?.value, { secret: process.env.ADMIN_SESSION_SECRET || '' })
  if (!parsed) return null
  try {
    return await getCustomerById(parsed.customerId)
  } catch {
    return null
  }
}
