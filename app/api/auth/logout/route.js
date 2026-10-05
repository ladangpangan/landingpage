import { NextResponse } from 'next/server'
import { CUSTOMER_COOKIE } from '@/lib/google-auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(CUSTOMER_COOKIE)
  return res
}
