import { NextResponse } from 'next/server'
import { getMayarConfig } from '@/lib/mayar-api'
import { parseMayarWebhook, verifyCallbackToken } from '@/lib/mayar'
import { applyMayarEvent, logPaymentEvent } from '@/lib/orders'

// Daftarkan alamat ini di Mayar (https://<domain>/api/mayar/notification) dan isi "Webhook token"
// yang sama di admin. Mayar mengirim token itu pada header x-callback-token.
export async function POST(request) {
  const cfg = await getMayarConfig().catch(() => null)
  if (!cfg?.webhookToken) return NextResponse.json({ error: 'Server belum dikonfigurasi.' }, { status: 500 })
  if (!verifyCallbackToken(request.headers.get('x-callback-token') || '', cfg.webhookToken)) {
    console.warn('[Mayar] token webhook tidak cocok')
    return NextResponse.json({ error: 'Token tidak valid.' }, { status: 401 })
  }
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }

  const parsed = parseMayarWebhook(body)
  let result
  try {
    result = await applyMayarEvent(parsed)
  } catch (error) {
    console.error('[Mayar] gagal memproses notifikasi:', error?.message || error)
    await logPaymentEvent('mayar', body, 'error')
    return NextResponse.json({ error: 'Gagal memproses notifikasi.' }, { status: 500 }) // Mayar mengirim ulang
  }
  await logPaymentEvent('mayar', body, result.ok ? (result.changed ? 'diterapkan' : 'tanpa-perubahan') : result.reason)
  console.log(`[Mayar] event=${parsed.event || '-'} status=${parsed.status || '-'} hasil=${result.ok ? 'ok' : result.reason}`)
  // Pemberitahuan yang tidak cocok dengan pesanan tetap dijawab 200 supaya tidak diulang terus; sudah tercatat.
  return NextResponse.json({ received: true })
}
