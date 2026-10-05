import { NextResponse } from 'next/server'
import { getSnapClient } from '@/lib/midtrans'
import { getLandingSettings } from '@/lib/db'
import { getActiveBundles } from '@/lib/bundles'
import { resolveCartLines } from '@/lib/cart-math'
import { reserveStock, releaseStock } from '@/lib/stock'
import { createOrder, attachSnapToken, failOrderBeforePayment } from '@/lib/orders'
import { syncOrderToErp } from '@/lib/erp-sync'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }

  const { items, customer, shipping } = body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Keranjang belanja kosong.' }, { status: 400 })
  }
  if (!customer?.name?.trim() || !customer?.phone?.trim() || !customer?.address?.trim()) {
    return NextResponse.json(
      { error: 'Nama, nomor WhatsApp, dan lokasi pengiriman wajib diisi.' },
      { status: 400 }
    )
  }

  const SHIPPING_METHODS = ['internal', 'gosend', 'grabexpress', 'lainnya']
  const shippingMethod = SHIPPING_METHODS.includes(shipping?.method) ? shipping.method : 'internal'
  const shippingNote = String(shipping?.note || '').trim().slice(0, 200)
  if (shippingMethod === 'lainnya' && !shippingNote) {
    return NextResponse.json({ error: 'Catatan pengiriman wajib diisi untuk metode "Lainnya".' }, { status: 400 })
  }

  // Harga, isi paket, dan stok SELALU dari server; angka dari browser diabaikan.
  const settings = await getLandingSettings()
  const bundles = await getActiveBundles()
  const productsById = new Map(settings.products.map((p) => [p.id, p]))
  const bundlesById = new Map(bundles.map((b) => [b.id, b]))
  const cart = resolveCartLines(
    items.map((it) => ({ kind: it?.kind, id: it?.productId, qty: it?.qty })),
    productsById,
    bundlesById
  )
  if (!cart.ok) {
    return NextResponse.json({ error: cart.error }, { status: 400 })
  }

  const itemDetails = cart.lines.map((l) => ({
    id: l.id,
    name: l.name.slice(0, 50),
    price: l.price,
    quantity: l.qty,
  }))
  const orderItems = cart.lines

  const grossAmount = itemDetails.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const orderId = `LPI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  const orderCustomer = {
    name: customer.name.trim().slice(0, 50),
    phone: customer.phone.trim().slice(0, 30),
    address: customer.address.trim().slice(0, 200),
  }
  const shippingInfo = { method: shippingMethod, note: shippingNote }

  // 1) Tahan stok (atomik), lalu simpan pesanan. Bila gagal, pembeli belum ditagih apa pun.
  let reservation
  try {
    reservation = await reserveStock(cart.requirements)
  } catch (error) {
    console.error('[checkout] gagal menahan stok:', error?.message || error)
    return NextResponse.json(
      { error: 'Pesanan belum bisa diproses. Silakan coba lagi sebentar lagi.' },
      { status: 503 }
    )
  }
  if (!reservation.ok) {
    const short = productsById.get(reservation.variantId)
    return NextResponse.json(
      { error: `Maaf, stok ${short ? `"${short.name}"` : 'salah satu produk'} tidak cukup. Kurangi jumlahnya atau hapus dari keranjang.` },
      { status: 409 }
    )
  }

  try {
    await createOrder({
      orderId,
      items: orderItems,
      customer: orderCustomer,
      shipping: shippingInfo,
      grossAmount,
      stockReservation: reservation.reserved,
    })
  } catch (error) {
    console.error('[checkout] gagal menyimpan pesanan:', error?.message || error)
    await releaseStock(reservation.reserved).catch(() => {})
    return NextResponse.json(
      { error: 'Pesanan belum bisa disimpan. Silakan coba lagi sebentar lagi.' },
      { status: 503 }
    )
  }

  // 2) Baru buat transaksi pembayaran.
  try {
    const snap = await getSnapClient()
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: itemDetails,
      // Pesanan yang tidak dibayar kedaluwarsa dalam 1 jam, stoknya dikembalikan.
      expiry: { unit: 'minutes', duration: 60 },
      customer_details: {
        first_name: orderCustomer.name,
        phone: orderCustomer.phone,
        billing_address: { address: orderCustomer.address },
      },
    })

    await attachSnapToken(orderId, transaction.token).catch((e) =>
      console.error('[checkout] gagal menyimpan token pembayaran:', e?.message || e)
    )

    // Fire-and-forget: never let a slow/failing ERP sync delay or break
    // checkout. No-ops silently until ERP_INTEGRATION_URL/KEY are set.
    syncOrderToErp({ orderId, items: orderItems, customer: orderCustomer, shipping: shippingInfo, grossAmount })

    return NextResponse.json({
      orderId,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    })
  } catch (error) {
    console.error('Gagal membuat transaksi Midtrans:', error?.message || error)
    await failOrderBeforePayment(orderId)
    return NextResponse.json(
      { error: 'Gagal membuat transaksi pembayaran. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
