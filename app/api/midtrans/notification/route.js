import { NextResponse } from 'next/server'
import { getMidtransServerKey } from '@/lib/midtrans'
import { applyPaymentNotification } from '@/lib/orders'
import { isValidSignature } from '@/lib/midtrans-signature'

// Register this URL (https://<domain-anda>/api/midtrans/notification) in the
// Midtrans dashboard under Settings > Configuration > Payment Notification URL.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 })
  }

  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } =
    body || {}

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return NextResponse.json({ error: 'Payload notifikasi tidak lengkap.' }, { status: 400 })
  }

  let serverKey
  try {
    serverKey = await getMidtransServerKey()
  } catch (error) {
    console.error(error.message)
    return NextResponse.json({ error: 'Server belum dikonfigurasi.' }, { status: 500 })
  }

  if (!isValidSignature(body, serverKey)) {
    console.warn('Signature notifikasi Midtrans tidak cocok untuk order:', order_id)
    return NextResponse.json({ error: 'Signature tidak valid.' }, { status: 403 })
  }

  console.log(
    `[Midtrans] order=${order_id} status=${transaction_status} fraud=${fraud_status || '-'} amount=${gross_amount}`
  )

  let result
  try {
    result = await applyPaymentNotification(body)
  } catch (error) {
    console.error('[Midtrans] gagal memproses notifikasi:', error?.message || error)
    // 500 membuat Midtrans mengirim ulang notifikasi nanti.
    return NextResponse.json({ error: 'Gagal memproses notifikasi.' }, { status: 500 })
  }
  if (!result.ok) {
    console.warn(`[Midtrans] notifikasi ditolak order=${order_id} alasan=${result.reason}`)
    const status = result.reason === 'not_found' ? 404 : 400
    return NextResponse.json({ error: 'Notifikasi tidak cocok dengan pesanan.' }, { status })
  }

  return NextResponse.json({ received: true })
}
