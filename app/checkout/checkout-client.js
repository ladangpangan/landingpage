'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ShieldCheck, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-context'
import { formatIDR } from '@/lib/format'

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
          items: items.map((it) => ({ productId: it.productId, qty: it.qty })),
          customer: { name, phone, address },
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
      <div className="lpi-landing flex min-h-screen flex-col items-center justify-center bg-[#FBF6EE] px-6 text-center">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,500&family=Jost:wght@300;400;500;600&display=swap');
          .lpi-landing { font-family: 'Jost', ui-sans-serif, system-ui, sans-serif; }
          .lpi-landing .font-serif { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        `}</style>
        <ShoppingBag className="h-12 w-12 text-[#9C8A76]" />
        <h1 className="mt-4 font-serif text-2xl font-medium text-[#241C15]">Keranjang Anda kosong</h1>
        <p className="mt-2 text-sm text-[#6B5D4F]">Pilih produk dulu sebelum checkout.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#B3402A] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#96311D]"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali Belanja
        </Link>
      </div>
    )
  }

  return (
    <div className="lpi-landing min-h-screen bg-[#FBF6EE] text-[#241C15]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,500&family=Jost:wght@300;400;500;600&display=swap');
        .lpi-landing { font-family: 'Jost', ui-sans-serif, system-ui, sans-serif; }
        .lpi-landing .font-serif { font-family: 'Fraunces', ui-serif, Georgia, serif; }
      `}</style>

      <header className="sticky top-0 z-10 border-b border-[#E7D9C4]/70 bg-[#FBF6EE]/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/" className="rounded-full p-1.5 hover:bg-[#F1E4D3]" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5 text-[#3B2C21]" />
          </Link>
          <h1 className="font-serif text-lg font-medium text-[#241C15]">Checkout</h1>
        </div>
      </header>

      <form onSubmit={handlePay} className="mx-auto max-w-2xl px-4 py-6 sm:px-8">
        <section className="rounded-2xl border border-[#E7D9C4] bg-white p-4 sm:p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[#9C8A76]">Ringkasan Pesanan</h2>
          <div className="mt-3 space-y-3">
            {items.map((it) => (
              <div key={it.productId} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F4EADB]">
                  <Image src={it.image} alt={it.name} fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#241C15]">{it.name}</p>
                  <p className="text-xs text-[#9C8A76]">
                    {it.qty} x {formatIDR(it.price)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-[#241C15]">{formatIDR(it.qty * it.price)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#E7D9C4] pt-3">
            <span className="text-sm font-medium text-[#3B2C21]">Total Pembayaran</span>
            <span className="font-serif text-2xl text-[#B3402A]">{formatIDR(total)}</span>
          </div>
        </section>

        <section className="mt-5 space-y-4 rounded-2xl border border-[#E7D9C4] bg-white p-4 sm:p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[#9C8A76]">Data Pengiriman</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#3B2C21]">Nama Lengkap</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Anda"
              className="w-full rounded-xl border border-[#E7D9C4] bg-[#FBF6EE] px-4 py-3 text-[#3B2C21] outline-none placeholder:text-[#9C8A76] focus:border-[#B3402A] focus:ring-2 focus:ring-[#B3402A]/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#3B2C21]">Nomor WhatsApp</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full rounded-xl border border-[#E7D9C4] bg-[#FBF6EE] px-4 py-3 text-[#3B2C21] outline-none placeholder:text-[#9C8A76] focus:border-[#B3402A] focus:ring-2 focus:ring-[#B3402A]/20"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#3B2C21]">Lokasi Pengiriman</span>
            <textarea
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="Alamat lengkap untuk pengiriman"
              className="w-full resize-none rounded-xl border border-[#E7D9C4] bg-[#FBF6EE] px-4 py-3 text-[#3B2C21] outline-none placeholder:text-[#9C8A76] focus:border-[#B3402A] focus:ring-2 focus:ring-[#B3402A]/20"
            />
          </label>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#B3402A] px-8 py-4 text-base font-medium text-white shadow-lg shadow-[#B3402A]/25 transition hover:bg-[#96311D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          Bayar Sekarang
        </button>
        <p className="mt-3 text-center text-xs text-[#9C8A76]">
          Pembayaran diproses aman melalui Midtrans — mendukung QRIS, transfer bank, dan e-wallet. Ada
          pertanyaan?{' '}
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="font-medium text-[#B3402A] underline">
            Chat WhatsApp
          </a>
          .
        </p>
      </form>
    </div>
  )
}
