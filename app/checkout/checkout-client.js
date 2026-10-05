'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bike, Loader2, MoreHorizontal, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-context'
import { formatIDR } from '@/lib/format'

const SHIPPING_METHODS = [
  { value: 'internal', label: 'Kurir Internal', desc: 'Diantar oleh tim kami', icon: Truck },
  { value: 'gosend', label: 'GoSend', desc: 'Anda pesan sendiri saat barang siap', icon: Bike },
  { value: 'grabexpress', label: 'GrabExpress', desc: 'Anda pesan sendiri saat barang siap', icon: Bike },
  { value: 'lainnya', label: 'Lainnya', desc: 'Tulis catatan pengiriman', icon: MoreHorizontal },
]

export default function CheckoutClient({
  whatsappNumber,
  waMessage,
  midtransClientKey,
  midtransIsProduction,
}) {
  const router = useRouter()
  const { items, total, hydrated, clearCart } = useCart()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [shippingMethod, setShippingMethod] = useState('internal')
  const [shippingNote, setShippingNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [snapReady, setSnapReady] = useState(false)

  const snapSrc = midtransIsProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'

  useEffect(() => {
    if (!midtransClientKey || typeof window === 'undefined') return
    if (window.snap) {
      setSnapReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = snapSrc
    script.setAttribute('data-client-key', midtransClientKey)
    script.async = true
    script.onload = () => setSnapReady(true)
    document.head.appendChild(script)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midtransClientKey])

  async function handlePay(e) {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error('Nama Lengkap, Nomor WhatsApp, dan Lokasi Pengiriman wajib diisi.')
      return
    }
    if (shippingMethod === 'lainnya' && !shippingNote.trim()) {
      toast.error('Tulis catatan pengiriman untuk metode "Lainnya".')
      return
    }
    if (!midtransClientKey) {
      toast.error('Payment gateway belum dikonfigurasi oleh admin. Silakan pesan via WhatsApp.')
      return
    }
    if (!snapReady || !window.snap) {
      toast.error('Payment gateway masih dimuat, coba lagi sebentar lagi.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((it) => ({ kind: it.kind || 'produk', productId: it.productId, qty: it.qty })),
          customer: { name, phone, address },
          shipping: {
            method: shippingMethod,
            note: shippingMethod === 'lainnya' ? shippingNote.trim() : '',
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat transaksi.')

      window.snap.pay(data.token, {
        onSuccess: () => {
          toast.success('Pembayaran berhasil! Terima kasih sudah memesan.')
          clearCart()
          router.push('/')
        },
        onPending: () => toast.info('Pembayaran tertunda. Selesaikan pembayaran Anda.'),
        onError: () => toast.error('Pembayaran gagal. Silakan coba lagi.'),
        onClose: () => toast.message('Kamu menutup jendela pembayaran sebelum selesai.'),
      })
    } catch (error) {
      toast.error(error.message || 'Terjadi kesalahan, silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const waLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`

  if (hydrated && items.length === 0) {
    return (
      <div className="lpi-landing flex min-h-screen flex-col items-center justify-center bg-[#FFFFFF] px-6 text-center">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Inter:wght@300;400;500;600&display=swap');
          .lpi-landing { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
          .lpi-landing .font-serif { font-family: 'Playfair Display', ui-serif, Georgia, serif; }
        `}</style>
        <ShoppingBag className="h-12 w-12 text-[#7E9488]" />
        <h1 className="mt-4 font-serif text-2xl font-medium text-[#142A1C]">Keranjang Anda kosong</h1>
        <p className="mt-2 text-sm text-[#4C6356]">Pilih produk dulu sebelum checkout.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2FA966] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#22824E]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali Belanja
        </Link>
      </div>
    )
  }

  return (
    <div className="lpi-landing min-h-screen bg-[#FFFFFF] text-[#142A1C]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Inter:wght@300;400;500;600&display=swap');
        .lpi-landing { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .lpi-landing .font-serif { font-family: 'Playfair Display', ui-serif, Georgia, serif; }
      `}</style>

      <header className="sticky top-0 z-10 border-b border-[#D6EBDC]/70 bg-[#FFFFFF]/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/" className="rounded-full p-1.5 hover:bg-[#E1F4E7]" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5 text-[#1F3A28]" />
          </Link>
          <h1 className="font-serif text-lg font-medium text-[#142A1C]">Checkout</h1>
        </div>
      </header>

      <form onSubmit={handlePay} className="mx-auto max-w-2xl px-4 py-6 sm:px-8">
        <section className="rounded-2xl border border-[#D6EBDC] bg-white p-4 sm:p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[#7E9488]">Ringkasan Pesanan</h2>
          <div className="mt-3 space-y-3">
            {items.map((it) => (
              <div key={`${it.kind || 'produk'}:${it.productId}`} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#EEF8F1]">
                  <Image src={it.image} alt={it.name} fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#142A1C]">{it.name}</p>
                  <p className="text-xs text-[#7E9488]">
                    {it.qty} x {formatIDR(it.price)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-[#142A1C]">{formatIDR(it.qty * it.price)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#D6EBDC] pt-3">
            <span className="text-sm font-medium text-[#1F3A28]">Total Pembayaran</span>
            <span className="font-serif text-2xl text-[#2FA966]">{formatIDR(total)}</span>
          </div>
        </section>

        <section className="mt-5 space-y-4 rounded-2xl border border-[#D6EBDC] bg-white p-4 sm:p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[#7E9488]">Data Pengiriman</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#1F3A28]">Nama Lengkap</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Anda"
              className="w-full rounded-xl border border-[#D6EBDC] bg-[#FFFFFF] px-4 py-3 text-[#1F3A28] outline-none placeholder:text-[#7E9488] focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#1F3A28]">Nomor WhatsApp</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full rounded-xl border border-[#D6EBDC] bg-[#FFFFFF] px-4 py-3 text-[#1F3A28] outline-none placeholder:text-[#7E9488] focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#1F3A28]">Lokasi Pengiriman</span>
            <textarea
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="Alamat lengkap untuk pengiriman"
              className="w-full resize-none rounded-xl border border-[#D6EBDC] bg-[#FFFFFF] px-4 py-3 text-[#1F3A28] outline-none placeholder:text-[#7E9488] focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20"
            />
          </label>
        </section>

        <section className="mt-5 space-y-3 rounded-2xl border border-[#D6EBDC] bg-white p-4 sm:p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[#7E9488]">Metode Pengiriman</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {SHIPPING_METHODS.map((m) => {
              const Icon = m.icon
              const active = shippingMethod === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setShippingMethod(m.value)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-[#2FA966] bg-[#E1F4E7] ring-1 ring-[#2FA966]'
                      : 'border-[#D6EBDC] bg-white hover:border-[#2FA966]/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-[#22824E]' : 'text-[#7E9488]'}`} />
                  <span className="text-sm font-medium text-[#142A1C]">{m.label}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-[#7E9488]">
            {SHIPPING_METHODS.find((m) => m.value === shippingMethod)?.desc}
            {shippingMethod !== 'internal' && (
              <> — kami akan pesankan/konfirmasi kurirnya melalui WhatsApp setelah pesanan dikonfirmasi.</>
            )}
          </p>
          {shippingMethod === 'lainnya' && (
            <input
              type="text"
              required
              value={shippingNote}
              onChange={(e) => setShippingNote(e.target.value)}
              placeholder="Contoh: JNE, Anteraja, ambil sendiri, dll."
              className="w-full rounded-xl border border-[#D6EBDC] bg-[#FFFFFF] px-4 py-3 text-[#1F3A28] outline-none placeholder:text-[#7E9488] focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20"
            />
          )}
        </section>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#2FA966] px-8 py-4 text-base font-medium text-white shadow-lg shadow-[#2FA966]/25 transition hover:bg-[#22824E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          Bayar Sekarang
        </button>
        <p className="mt-3 text-center text-xs text-[#7E9488]">
          Pembayaran diproses aman melalui Midtrans — mendukung QRIS, transfer bank, dan e-wallet. Ada
          pertanyaan?{' '}
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="font-medium text-[#2FA966] underline">
            Chat WhatsApp
          </a>
          .
        </p>
      </form>
    </div>
  )
}
