'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SafeImage from './safe-image'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { MapPin, MessageCircle, Search, ShoppingCart, ShieldCheck, User, X } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatIDR } from '@/lib/format'
import { makeWaLink } from '@/lib/wa'
import { QtyStepper } from './cards'


function CartDrawer({ open, onClose, waLink }) {
  const { items, total, setQty, removeItem } = useCart()
  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-lpi-bg shadow-2xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-lpi-line bg-white px-5 py-4">
          <h2 className="text-lg font-extrabold text-lpi-ink">Keranjang Belanja</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light">
            <X className="h-5 w-5 text-lpi-ink" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-lpi-muted">
              <ShoppingCart className="h-12 w-12" />
              <p className="mt-3 text-sm">Keranjang Anda masih kosong.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => {
                const kind = it.kind === 'paket' ? 'paket' : 'produk'
                return (
                  <div key={`${kind}:${it.productId}`} className="flex gap-3 rounded-2xl border border-lpi-line bg-white p-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-lpi-light">
                      <SafeImage src={it.image} alt={it.name} fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-lpi-ink">{it.name}</p>
                      <p className="text-xs text-lpi-muted">
                        {kind === 'paket' ? 'Paket · ' : ''}
                        {formatIDR(it.price)}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <QtyStepper className="w-32" value={it.qty} onChange={(n) => setQty(it.productId, n, kind)} />
                        <button
                          type="button"
                          onClick={() => removeItem(it.productId, kind)}
                          className="h-11 text-xs font-semibold text-lpi-muted underline underline-offset-2"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-lpi-ink">{formatIDR(it.price * it.qty)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-lpi-line bg-white px-5 py-4">
            <div className="flex items-center justify-between text-sm text-lpi-muted">
              <span>Total belanja</span>
              <span className="text-2xl font-extrabold text-lpi">{formatIDR(total)}</span>
            </div>
            <p className="mt-1 text-xs text-lpi-muted">Ongkos kirim dihitung di langkah berikutnya.</p>
            <Link
              href="/checkout"
              onClick={onClose}
              className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-lpi text-base font-bold text-white transition hover:bg-lpi-dark"
            >
              <ShieldCheck className="h-5 w-5" />
              Lanjut ke Pembayaran
            </Link>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-lpi-line bg-white text-sm font-semibold text-lpi-ink"
            >
              <MessageCircle className="h-4 w-4" />
              Tanya dulu via WhatsApp
            </a>
          </div>
        )}
      </div>
    </>
  )
}

// Kerangka semua halaman toko: header (logo, cari, keranjang), keranjang, footer.
// searchValue/onSearchChange diisi di beranda (cari langsung); di halaman lain
// pencarian membuka beranda dengan hasilnya.
export default function ShopShell({ settings, children, searchValue, onSearchChange, hideFloatingCart = false }) {
  const router = useRouter()
  const { count } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState('')
  const [acct, setAcct] = useState(null) // { enabled, customer }

  useEffect(() => {
    fetch('/api/akun/me', { cache: 'no-store' }).then((r) => r.json()).then(setAcct).catch(() => {})
  }, [])
  const waLink = makeWaLink(settings)
  const controlled = typeof onSearchChange === 'function'

  function submitSearch(e) {
    e.preventDefault()
    if (controlled) {
      document.getElementById('produk')?.scrollIntoView({ behavior: 'smooth' })
    } else if (localSearch.trim()) {
      router.push(`/?q=${encodeURIComponent(localSearch.trim())}#produk`)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-lpi-bg pb-24 text-lpi-ink">
      <header className="sticky top-0 z-40 border-b border-lpi-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" aria-label="Beranda ladangpangan.id" className="flex items-center">
              {settings.logoUrl ? (
                <span className="relative block h-10 w-36">
                  <Image src={settings.logoUrl} alt="ladangpangan.id" fill sizes="144px" className="object-contain object-left" />
                </span>
              ) : (
                <span className="text-lg font-extrabold tracking-tight text-lpi">
                  ladang<span className="text-lpi-ink">pangan.id</span>
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2">
            {acct?.enabled && (
              <Link href="/akun" aria-label="Akun saya" className="flex h-12 items-center gap-2 rounded-xl border border-lpi-line bg-white px-3 text-sm font-bold text-lpi">
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">{acct.customer ? acct.customer.name.split(' ')[0] || 'Akun' : 'Masuk'}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lpi text-white"
              aria-label="Buka keranjang"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lpi-ink px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
            </div>
          </div>
          <form onSubmit={submitSearch} className="relative mt-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lpi-muted" />
            <input
              type="search"
              value={controlled ? searchValue : localSearch}
              onChange={(e) => (controlled ? onSearchChange(e.target.value) : setLocalSearch(e.target.value))}
              placeholder="Cari ayam, dada, paket hemat..."
              className="h-12 w-full rounded-xl border border-lpi-line bg-lpi-bg pl-12 pr-4 text-base text-lpi-ink outline-none placeholder:text-lpi-muted focus:border-lpi focus:bg-white"
            />
          </form>
        </div>
      </header>

      {children}

      <footer className="mx-4 mt-12 rounded-3xl bg-lpi px-6 py-9 text-lpi-light sm:mx-8 sm:px-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div>
            <p className="text-lg font-extrabold text-white">ladangpangan.id</p>
            <p className="mt-2 max-w-xs text-sm text-lpi-light/90">
              Ayam frozen segar langsung dari peternak, diantar dari gudang kami di Sidoarjo.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Kabupaten Sidoarjo, Jawa Timur</span>
            </div>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-semibold text-white underline underline-offset-4">
              <MessageCircle className="h-4 w-4" />
              Hubungi kami via WhatsApp
            </a>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/20 pt-5 text-center text-xs text-lpi-light/80">
          <span>© {new Date().getFullYear()} PT Ladang Pangan Indonesia</span>
          <Link href="/lacak" className="underline underline-offset-4 hover:text-white">
            Lacak Pesanan
          </Link>
          <Link href="/syarat-dan-ketentuan" className="underline underline-offset-4 hover:text-white">
            Syarat &amp; Ketentuan
          </Link>
          <Link href="/kebijakan-privasi" className="underline underline-offset-4 hover:text-white">
            Kebijakan Privasi
          </Link>
          <Link href="/kebijakan-pengembalian-dana" className="underline underline-offset-4 hover:text-white">
            Pengembalian Dana
          </Link>
          <Link href="/faq" className="underline underline-offset-4 hover:text-white">
            FAQ
          </Link>
        </div>
      </footer>

      {count > 0 && !hideFloatingCart && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-4 right-4 z-30 flex h-14 items-center justify-center gap-2 rounded-xl bg-lpi text-base font-bold text-white shadow-xl sm:left-1/2 sm:right-auto sm:w-80 sm:-translate-x-1/2"
        >
          <ShoppingCart className="h-5 w-5" />
          {count} item · Lihat Keranjang
        </button>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} waLink={waLink} />
    </div>
  )
}
