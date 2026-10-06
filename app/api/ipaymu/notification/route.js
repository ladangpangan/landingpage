import { NextResponse } from 'next/server'
import { getIpaymuConfig } from '@/lib/ipaymu-api'
import { parseNotify, verifyNotifyToken } from '@/lib/ipaymu'
import { applyIpaymuEvent, logPaymentEvent } from '@/lib/orders'

// Alamat ini dikirim otomatis ke iPaymu saat pembeli membuat pesanan (notifyUrl, berisi ?token=).
// iPaymu bisa mengirim JSON atau form biasa; keduanya diterima.
async function readBody(request) {
  const text = await request.text()
  try {
    return JSON.parse(text)
  } catch {
    return Object.fromEntries(new URLSearchParams(text))
  }
}

export async function POST(request) {
  const cfg = await getIpaymuConfig().catch(() => null)
  if (!cfg?.notifyToken) return NextResponse.json({ error: 'Server belum dikonfigurasi.' }, { status: 500 })
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!verifyNotifyToken(token, cfg.notifyToken)) {
    console.warn('[iPaymu] token notifikasi tidak cocok')
    return NextResponse.json({ error: 'Token tidak valid.' }, { status: 401 })
  }
  const body = await readBody(request)
  const parsed = parseNotify(body)
  let result
  try {
    result = await applyIpaymuEvent(parsed)
  } catch (error) {
    console.error('[iPaymu] gagal memproses notifikasi:', error?.message || error)
    await logPaymentEvent('ipaymu', body, 'error')
    return NextResponse.json({ error: 'Gagal memproses notifikasi.' }, { status: 500 })
  }
  await logPaymentEvent('ipaymu', body, result.ok ? (result.changed ? 'diterapkan' : 'tanpa-perubahan') : result.reason)
  console.log(`[iPaymu] status=${parsed.status || parsed.statusCode || '-'} hasil=${result.ok ? 'ok' : result.reason}`)
  return NextResponse.json({ received: true })
}
