'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Copy, Loader2, MessageCircle, Package, PackageCheck, Truck, Wallet, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'
import { useCart } from '@/lib/cart-context'

const STEPS = [
  ['dibayar', 'Dibayar', Wallet],
  ['dikemas', 'Dikemas', Package],
  ['dikirim', 'Dikirim', Truck],
  ['diterima', 'Diterima', PackageCheck],
]
const prettyDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const FINAL = ['diterima', 'batal', 'gagal', 'kedaluwarsa']

const HEADLINE = {
  menunggu_bayar: ['Menunggu pembayaran', 'Selesaikan pembayaran supaya pesanan Anda kami proses. Pesanan otomatis batal bila belum dibayar dalam 1 jam.'],
  dibayar: ['Pembayaran diterima. Terima kasih!', 'Pesanan Anda sudah kami terima dan segera dikemas.'],
  dikemas: ['Pesanan sedang dikemas', 'Kami sedang menyiapkan pesanan Anda.'],
  dikirim: ['Pesanan sedang diantar', 'Kurir kami sedang menuju alamat Anda.'],
  diterima: ['Pesanan sudah diterima', 'Selamat menikmati! Terima kasih sudah berbelanja.'],
  batal: ['Pesanan dibatalkan', 'Pesanan ini dibatalkan. Anda bisa memesan lagi kapan saja.'],
  gagal: ['Pembayaran gagal', 'Pesanan tidak bisa diproses. Silakan pesan ulang.'],
  kedaluwarsa: ['Waktu pembayaran habis', 'Pesanan dibatalkan otomatis karena belum dibayar. Silakan pesan ulang.'],
}

export default function OrderClient({ orderId, accessKey, waLink, midtransClientKey, midtransIsProduction }) {
  const router = useRouter()
  const { addItem } = useCart()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [snapReady, setSnapReady] = useState(false)
  const timer = useRef(null)
  const base = `/api/pesanan/${encodeURIComponent(orderId)}`
  const q = `?k=${encodeURIComponent(accessKey)}`

  const load = useCallback(async () => {
    try {
      const res = await fetch(base + q, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(res.status === 403 ? 'Tautan pesanan tidak sah. Gunakan halaman Lacak Pesanan dengan nomor pesanan dan nomor WhatsApp Anda.' : data.error || 'Gagal memuat pesanan.')
        return
      }
      setError('')
      setOrder(data.order)
    } catch {
      /* jaringan putus sebentar: coba lagi di putaran berikutnya */
    }
  }, [base, q])

  useEffect(() => {
    load()
  }, [load])

  // Status diperbarui otomatis tiap 15 detik sampai pesanan selesai.
  useEffect(() => {
    if (!order || FINAL.includes(order.status)) return undefined
    timer.current = setInterval(load, 15000)
    return () => clearInterval(timer.current)
  }, [order, load])

  // Snap dimuat hanya bila pembeli perlu melanjutkan pembayaran.
  const needsPay = order?.status === 'menunggu_bayar' && order?.snapToken
  useEffect(() => {
    if (!needsPay || snapReady || !midtransClientKey) return
    if (window.snap) return setSnapReady(true)
    const s = document.createElement('script')
    s.src = midtransIsProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js'
    s.setAttribute('data-client-key', midtransClientKey)
    s.async = true
    s.onload = () => setSnapReady(true)
    document.head.appendChild(s)
  }, [needsPay, snapReady, midtransClientKey, midtransIsProduction])

  function payNow() {
    if (!snapReady || !window.snap) return toast.error('Pembayaran masih dimuat, coba lagi sebentar lagi.')
    window.snap.pay(order.snapToken, {
      onSuccess: () => { toast.success('Pembayaran berhasil!'); load() },
      onPending: () => { toast.info('Pembayaran tertunda. Selesaikan pembayaran Anda.'); load() },
      onError: () => toast.error('Pembayaran gagal. Silakan coba lagi.'),
      onClose: () => load(),
    })
  }

  async function cancel() {
    if (!window.confirm('Batalkan pesanan ini?')) return
    setBusy(true)
    try {
      const res = await fetch(base + '/batal' + q, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Gagal membatalkan.')
      toast.success('Pesanan dibatalkan.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
      load()
    }
  }

  function buyAgain() {
    for (const it of order.items) {
      addItem({ id: it.id, name: it.name, unit: it.unit || '', price: it.price, image: it.image || '' }, it.qty, it.kind === 'paket' ? 'paket' : 'produk')
    }
    toast.success('Isi pesanan dimasukkan ke keranjang.')
    router.push('/checkout')
  }

  function copyId() {
    navigator.clipboard?.writeText(orderId).then(() => toast.success('Nomor pesanan disalin.'), () => {})
  }

  const status = order?.status
  const [title, desc] = HEADLINE[status] || ['', '']
  const stepIndex = STEPS.findIndex(([s]) => s === status)
  const failed = ['batal', 'gagal', 'kedaluwarsa'].includes(status)

  return (
    <div className="min-h-screen bg-lpi-bg pb-10 text-lpi-ink">
      <header className="sticky top-0 z-30 border-b border-lpi-line bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light" aria-label="Ke beranda">
            <ArrowLeft className="h-5 w-5 text-lpi" />
          </Link>
          <h1 className="text-lg font-extrabold">Pesanan Anda</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
        {error ? (
          <div className="rounded-2xl border border-lpi-line bg-white p-5 text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-600" />
            <p className="mt-3 text-sm text-lpi-ink">{error}</p>
            <Link href="/lacak" className="mt-4 inline-flex h-12 items-center rounded-xl bg-lpi px-6 text-sm font-bold text-white">Lacak Pesanan</Link>
          </div>
        ) : !order ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-lpi" /></div>
        ) : (
          <>
            <section className={`rounded-2xl border p-5 text-center ${failed ? 'border-gray-300 bg-white' : 'border-lpi bg-lpi text-white'}`}>
              {failed ? <XCircle className="mx-auto h-10 w-10 text-gray-500" /> : <Check className="mx-auto h-10 w-10" />}
              <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
              <p className={`mt-1 text-sm ${failed ? 'text-lpi-muted' : 'text-lpi-light'}`}>{desc}</p>
            </section>

            <section className="rounded-2xl border border-lpi-line bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-lpi-muted">Nomor pesanan (simpan untuk melacak)</p>
                  <p className="break-all font-mono text-sm font-bold">{orderId}</p>
                </div>
                <button type="button" onClick={copyId} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lpi-line" aria-label="Salin nomor pesanan"><Copy className="h-4 w-4" /></button>
              </div>
              {!failed && status !== 'menunggu_bayar' && (
                <ol className="mt-4 grid grid-cols-4 gap-1">
                  {STEPS.map(([s, label, Icon], i) => {
                    const done = i <= stepIndex
                    return (
                      <li key={s} className="flex flex-col items-center gap-1 text-center">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-lpi text-white' : 'bg-lpi-light text-lpi-muted'}`}><Icon className="h-5 w-5" /></span>
                        <span className={`text-xs ${done ? 'font-bold text-lpi-ink' : 'text-lpi-muted'}`}>{label}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>

            {order.delivery && (
              <section className="rounded-2xl border border-lpi-line bg-white p-4 text-sm">
                <h3 className="font-extrabold">Pengiriman</h3>
                <p className="mt-1">{prettyDate(order.delivery.date)} · {order.delivery.slotLabel} ({order.delivery.start}–{order.delivery.end})</p>
                <p className="mt-1 text-lpi-muted">{order.customer.name} · {order.customer.phone}</p>
                <p className="text-lpi-muted">{order.customer.address}</p>
              </section>
            )}

            <section className="rounded-2xl border border-lpi-line bg-white p-4 text-sm">
              <h3 className="font-extrabold">Isi pesanan</h3>
              <ul className="mt-2 space-y-1.5">
                {order.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3"><span>{it.qty}x {it.name}</span><span className="shrink-0">{formatIDR(it.price * it.qty)}</span></li>
                ))}
              </ul>
              {order.pricing && (
                <div className="mt-2 space-y-1 border-t border-dashed border-lpi-line pt-2 text-lpi-muted">
                  {order.pricing.discountShop > 0 && <p className="flex justify-between"><span>Diskon {order.pricing.voucherCode}</span><span>− {formatIDR(order.pricing.discountShop)}</span></p>}
                  <p className="flex justify-between"><span>Ongkir</span><span>{order.pricing.shippingFee === 0 ? 'Gratis' : formatIDR(order.pricing.shippingFee)}</span></p>
                  {order.pricing.shippingDiscount > 0 && <p className="flex justify-between"><span>Diskon ongkir</span><span>− {formatIDR(order.pricing.shippingDiscount)}</span></p>}
                </div>
              )}
              <p className="mt-2 flex justify-between border-t border-dashed border-lpi-line pt-2 text-base font-extrabold"><span>Total</span><span className="text-lpi">{formatIDR(order.grossAmount)}</span></p>
            </section>

            <div className="space-y-2">
              {needsPay && (
                <button type="button" onClick={payNow} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-lpi text-base font-bold text-white hover:bg-lpi-dark">Bayar Sekarang</button>
              )}
              {status === 'menunggu_bayar' && (
                <button type="button" onClick={cancel} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white text-sm font-bold text-red-700 disabled:opacity-60">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Batalkan Pesanan
                </button>
              )}
              <button type="button" onClick={buyAgain} className="flex h-12 w-full items-center justify-center rounded-xl border border-lpi-line bg-white text-sm font-bold text-lpi">Beli Lagi</button>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-lpi-line bg-white text-sm font-bold text-lpi-ink">
                <MessageCircle className="h-4 w-4" /> Tanya via WhatsApp
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
