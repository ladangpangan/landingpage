import { NextResponse } from 'next/server'
import { getOrder } from '@/lib/orders'
import { accessKey, phonesMatch } from '@/lib/order-access'
import { clientIp, isLimited, recordAttempt } from '@/lib/rate-limit'

// Lacak tanpa login: nomor pesanan + nomor WhatsApp saat memesan. Hasilnya kunci akses.
// Pesan salah dibuat sama untuk "tidak ada" dan "nomor beda" supaya nomor pesanan tidak bisa ditebak.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  const orderId = String(body?.orderId || '').trim().toUpperCase().slice(0, 60)
  const phone = String(body?.phone || '')
  if (!orderId || !phone.trim()) return NextResponse.json({ error: 'Isi nomor pesanan dan nomor WhatsApp.' }, { status: 400 })
  const ip = clientIp(request)
  try {
    if (await isLimited('lacak', ip, 10)) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' }, { status: 429 })
    }
    const order = await getOrder(orderId)
    if (!order || !phonesMatch(order.customer?.phone, phone)) {
      await recordAttempt('lacak', ip)
      return NextResponse.json({ error: 'Pesanan tidak ditemukan. Periksa nomor pesanan dan nomor WhatsApp yang dipakai saat memesan.' }, { status: 404 })
    }
    return NextResponse.json({ orderId, key: accessKey(orderId, process.env.ADMIN_SESSION_SECRET || '') })
  } catch (e) {
    console.error('[lacak] gagal:', e?.message || e)
    return NextResponse.json({ error: 'Gagal memeriksa pesanan. Coba lagi.' }, { status: 500 })
  }
}
