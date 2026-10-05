import { NextResponse } from 'next/server'
import { getBiteshipConfig } from '@/lib/biteship-api'
import { parseBiteshipWebhook, verifyWebhookToken } from '@/lib/biteship'
import { applyBiteshipEvent, logPaymentEvent } from '@/lib/orders'

// Daftarkan di dashboard Biteship: https://<domain>/api/biteship/webhook?token=<Webhook Token dari admin>.
// (Bentuk kiriman Biteship belum terverifikasi; semua kiriman dicatat apa adanya untuk Owner.)
export async function POST(request) {
  const cfg = await getBiteshipConfig().catch(() => null)
  if (!cfg?.webhookToken) return NextResponse.json({ error: 'Server belum dikonfigurasi.' }, { status: 500 })
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!verifyWebhookToken(token, cfg.webhookToken)) return NextResponse.json({ error: 'Token tidak valid.' }, { status: 401 })
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }
  const parsed = parseBiteshipWebhook(body)
  let result
  try {
    result = await applyBiteshipEvent(parsed)
  } catch (e) {
    console.error('[Biteship] gagal memproses kabar:', e?.message || e)
    await logPaymentEvent('biteship', body, 'error')
    return NextResponse.json({ error: 'Gagal memproses.' }, { status: 500 }) // Biteship mengirim ulang
  }
  await logPaymentEvent('biteship', body, result.ok ? (result.changed ? 'diterapkan' : 'tercatat') : result.reason)
  // Kiriman tes atau yang tidak cocok pesanan tetap dijawab 200 (sudah tercatat).
  return NextResponse.json({ received: true })
}
