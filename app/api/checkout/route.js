import { NextResponse } from 'next/server'
import { getSnapClient } from '@/lib/midtrans'
import { getLandingSettings } from '@/lib/db'
import { evaluateCheckout } from '@/lib/checkout-service'
import { buildMidtransItems } from '@/lib/checkout-math'
import { reserveStock, releaseStock } from '@/lib/stock'
import { reserveSlot, releaseSlot } from '@/lib/delivery'
import { reserveVoucher, releaseVoucher } from '@/lib/vouchers'
import { createOrder, attachSnapToken, failOrderBeforePayment } from '@/lib/orders'
import { syncOrderToErp } from '@/lib/erp-sync'
import { accessKey } from '@/lib/order-access'

// Kunci akses untuk halaman pesanan; jangan sampai gagal membuat pembayaran hanya karena ini.
function safeAccessKey(orderId) {
  try {
    return accessKey(orderId, process.env.ADMIN_SESSION_SECRET || '')
  } catch {
    return null
  }
}

const BUSY = 'Pesanan belum bisa diproses. Silakan coba lagi sebentar lagi.'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }

  const { items, customer } = body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Keranjang belanja kosong.' }, { status: 400 })
  }
  if (!customer?.name?.trim() || !customer?.phone?.trim() || !customer?.address?.trim()) {
    return NextResponse.json(
      { error: 'Nama, nomor WhatsApp, dan alamat lengkap wajib diisi.' },
      { status: 400 }
    )
  }

  // Harga, isi paket, stok, ongkir, voucher, dan jadwal SELALU dihitung server;
  // angka dari browser diabaikan.
  let ctx
  try {
    ctx = await evaluateCheckout({ items, location: body.location, voucherCode: body.voucherCode, delivery: body.delivery })
  } catch (error) {
    console.error('[checkout] gagal menghitung:', error?.message || error)
    return NextResponse.json({ error: BUSY }, { status: 503 })
  }
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: 400 })
  if (!ctx.zoneResult.ok) return NextResponse.json({ error: ctx.zoneResult.error, code: ctx.zoneResult.code }, { status: 400 })
  if (ctx.voucherError) return NextResponse.json({ error: ctx.voucherError }, { status: 400 })
  if (!ctx.deliveryResolved?.ok) return NextResponse.json({ error: ctx.deliveryResolved?.error || 'Pilih cara pengiriman.' }, { status: 409 })
  if (!(ctx.pricing.total > 0)) return NextResponse.json({ error: 'Total pembayaran tidak valid.' }, { status: 400 })

  const orderItems = ctx.cart.lines
  const grossAmount = ctx.pricing.total
  const itemDetails = buildMidtransItems(orderItems, ctx.pricing)
  const orderId = `LPI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  const orderCustomer = {
    name: customer.name.trim().slice(0, 50),
    phone: customer.phone.trim().slice(0, 30),
    address: customer.address.trim().slice(0, 200),
    note: String(customer.note || '').trim().slice(0, 200),
  }
  const z = ctx.zoneResult
  const d = ctx.deliveryResolved
  const location = {
    lat: Number(body.location.lat),
    lng: Number(body.location.lng),
    distanceKm: z.distanceKm,
    zoneId: z.zone.id,
    zoneName: z.zone.name,
  }
  const deliveryInfo = { mode: d.mode, date: d.date, slotId: d.slotId, slotLabel: d.slotLabel, start: d.start, end: d.end }
  const shippingInfo = { method: 'internal', note: `${z.zone.name} (${z.distanceKm} km), ${d.date} ${d.slotLabel}` }

  // 1) Tahan stok, kapasitas slot kirim, dan kuota voucher (masing-masing atomik).
  //    Bila salah satu gagal, yang sudah ditahan dikembalikan. Pembeli belum ditagih apa pun.
  let stock
  try {
    stock = await reserveStock(ctx.cart.requirements)
  } catch (error) {
    console.error('[checkout] gagal menahan stok:', error?.message || error)
    return NextResponse.json({ error: BUSY }, { status: 503 })
  }
  if (!stock.ok) {
    const products = (await getLandingSettings()).products
    const short = products.find((p) => p.id === stock.variantId)
    return NextResponse.json(
      { error: `Maaf, stok ${short ? `"${short.name}"` : 'salah satu produk'} tidak cukup. Kurangi jumlahnya atau hapus dari keranjang.` },
      { status: 409 }
    )
  }
  const undo = async (slotRes, voucherCode) => {
    await releaseStock(stock.reserved).catch(() => {})
    if (slotRes) await releaseSlot(slotRes).catch(() => {})
    if (voucherCode) await releaseVoucher(voucherCode).catch(() => {})
  }

  let slotRes
  try {
    const r = await reserveSlot({ date: d.date, slotId: d.slotId, kg: ctx.weightKg, capacityKg: ctx.capacityKg })
    if (!r.ok) {
      await undo(null, null)
      return NextResponse.json({ error: 'Maaf, jam pengiriman itu baru saja penuh. Silakan pilih jam lain.' }, { status: 409 })
    }
    slotRes = r
  } catch (error) {
    console.error('[checkout] gagal menahan slot kirim:', error?.message || error)
    await undo(null, null)
    return NextResponse.json({ error: BUSY }, { status: 503 })
  }

  let voucherCode = null
  if (ctx.pricing.voucherCode) {
    try {
      if (!(await reserveVoucher(ctx.pricing.voucherCode))) {
        await undo(slotRes, null)
        return NextResponse.json({ error: 'Maaf, kuota voucher baru saja habis.' }, { status: 409 })
      }
      voucherCode = ctx.pricing.voucherCode
    } catch (error) {
      console.error('[checkout] gagal memakai voucher:', error?.message || error)
      await undo(slotRes, null)
      return NextResponse.json({ error: BUSY }, { status: 503 })
    }
  }

  // 2) Simpan pesanan dulu, baru buat transaksi pembayaran.
  try {
    await createOrder({
      orderId,
      items: orderItems,
      customer: orderCustomer,
      shipping: shippingInfo,
      grossAmount,
      stockReservation: stock.reserved,
      extra: { weightKg: ctx.weightKg, pricing: ctx.pricing, delivery: deliveryInfo, location, slotReservation: slotRes, voucherCode },
    })
  } catch (error) {
    console.error('[checkout] gagal menyimpan pesanan:', error?.message || error)
    await undo(slotRes, voucherCode)
    return NextResponse.json({ error: 'Pesanan belum bisa disimpan. Silakan coba lagi sebentar lagi.' }, { status: 503 })
  }

  // 3) Transaksi pembayaran. Bila gagal, pesanan ditandai gagal dan semua yang
  //    ditahan (stok, slot, voucher) dikembalikan lewat transisi status.
  try {
    const snap = await getSnapClient()
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: itemDetails,
      // Pesanan yang tidak dibayar kedaluwarsa dalam 1 jam; stok, slot, dan voucher dikembalikan.
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
    syncOrderToErp({
      orderId,
      items: orderItems,
      customer: orderCustomer,
      shipping: shippingInfo,
      grossAmount,
      extra: { delivery: deliveryInfo, location, pricing: ctx.pricing, weightKg: ctx.weightKg },
    })

    return NextResponse.json({
      orderId,
      accessKey: safeAccessKey(orderId),
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
