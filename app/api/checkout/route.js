import { NextResponse } from 'next/server'
import { getSnapClient } from '@/lib/midtrans'
import { getLandingSettings } from '@/lib/db'
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

  const settings = await getLandingSettings()

  const itemDetails = []
  const orderItems = []
  for (const item of items) {
    const quantity = Number(item?.qty)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
      return NextResponse.json({ error: 'Jumlah pesanan tidak valid.' }, { status: 400 })
    }
    const product = settings.products.find((p) => p.id === item.productId)
    if (!product || !(product.price > 0)) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 400 })
    }
    itemDetails.push({
      id: product.id,
      name: product.name.slice(0, 50),
      price: product.price,
      quantity,
    })
    orderItems.push({
      id: product.id,
      name: product.name,
      unit: product.unit,
      image: product.image,
      price: product.price,
      qty: quantity,
      erpCode: product.erpCode || '',
    })
  }

  const grossAmount = itemDetails.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const orderId = `LPI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  const orderCustomer = {
    name: customer.name.trim().slice(0, 50),
    phone: customer.phone.trim().slice(0, 30),
    address: customer.address.trim().slice(0, 200),
  }
  const shippingInfo = { method: shippingMethod, note: shippingNote }

  // 1) Simpan pesanan dulu. Bila gagal, pembeli belum ditagih apa pun.
  try {
    await createOrder({
      orderId,
      items: orderItems,
      customer: orderCustomer,
      shipping: shippingInfo,
      grossAmount,
    })
  } catch (error) {
    console.error('[checkout] gagal menyimpan pesanan:', error?.message || error)
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
