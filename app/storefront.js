'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Award,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  X,
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatIDR } from '@/lib/format'

const CERTIFICATIONS = [
  { icon: Award, label: 'Halal Indonesia' },
  { icon: ShieldCheck, label: 'NKV Resmi' },
  { icon: Snowflake, label: 'Cold Chain Terjaga' },
  { icon: MapPin, label: 'Sidoarjo, Jawa Timur' },
]

function ProductCard({ product }) {
  const { items, addItem, setQty } = useCart()
  const inCart = items.find((it) => it.productId === product.id)

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E7D9C4] bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square overflow-hidden bg-[#F4EADB]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, 220px"
          className="object-cover"
        />
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-[#241C15]">{product.name}</p>
        <p className="mt-0.5 text-xs text-[#9C8A76]">{product.unit}</p>
        <p className="mt-1.5 font-serif text-lg text-[#B3402A]">{formatIDR(product.price)}</p>

        {!inCart ? (
          <button
            type="button"
            onClick={() => addItem(product, 1)}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#B3402A] py-2 text-sm font-medium text-white transition hover:bg-[#96311D]"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        ) : (
          <div className="mt-2.5 flex items-center justify-between rounded-full border border-[#E7D9C4] bg-[#FBF6EE]">
            <button
              type="button"
              onClick={() => setQty(product.id, inCart.qty - 1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center text-[#B3402A]"
              aria-label="Kurangi"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-[#241C15]">{inCart.qty}</span>
            <button
              type="button"
              onClick={() => setQty(product.id, inCart.qty + 1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center text-[#B3402A]"
              aria-label="Tambah"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CartDrawer({ open, onClose, waLink }) {
  const { items, total, setQty, removeItem } = useCart()

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-[#FBF6EE] shadow-2xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#E7D9C4] px-5 py-4">
          <h2 className="font-serif text-lg font-medium text-[#241C15]">Keranjang Belanja</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-full p-1.5 hover:bg-[#F1E4D3]">
            <X className="h-5 w-5 text-[#3B2C21]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-[#9C8A76]">
              <ShoppingCart className="h-10 w-10" />
              <p className="mt-3 text-sm">Keranjang Anda masih kosong.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((it) => (
                <div key={it.productId} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F4EADB]">
                    <Image src={it.image} alt={it.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#241C15]">{it.name}</p>
                    <p className="text-xs text-[#9C8A76]">{formatIDR(it.price)}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex items-center overflow-hidden rounded-full border border-[#E7D9C4]">
                        <button
                          type="button"
                          onClick={() => setQty(it.productId, it.qty - 1)}
                          className="flex h-7 w-7 items-center justify-center text-[#B3402A]"
                          aria-label="Kurangi"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-medium">{it.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(it.productId, it.qty + 1)}
                          className="flex h-7 w-7 items-center justify-center text-[#B3402A]"
                          aria-label="Tambah"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.productId)}
                        className="text-xs text-[#9C8A76] underline underline-offset-2 hover:text-[#B3402A]"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-[#241C15]">{formatIDR(it.price * it.qty)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#E7D9C4] px-5 py-4">
            <div className="flex items-center justify-between text-sm text-[#6B5D4F]">
              <span>Total</span>
              <span className="font-serif text-xl text-[#B3402A]">{formatIDR(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#B3402A] py-3.5 text-sm font-medium text-white transition hover:bg-[#96311D]"
            >
              <ShieldCheck className="h-4 w-4" />
              Lanjut ke Checkout
            </Link>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-[#E7D9C4] bg-white py-3 text-sm font-medium text-[#3B2C21] transition hover:border-[#B3402A]"
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

export default function Storefront({ settings }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Semua')
  const [cartOpen, setCartOpen] = useState(false)
  const { count } = useCart()

  const waMessage = encodeURIComponent(settings.waMessage)
  const waLink = `https://wa.me/${settings.whatsappNumber}?text=${waMessage}`

  const categories = useMemo(() => {
    const set = new Set(settings.products.map((p) => p.category || 'Lainnya'))
    return ['Semua', ...Array.from(set)]
  }, [settings.products])

  const filtered = useMemo(() => {
    return settings.products.filter((p) => {
      const matchesCategory = category === 'Semua' || (p.category || 'Lainnya') === category
      const matchesSearch = p.name.toLowerCase().includes(search.trim().toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [settings.products, category, search])

  return (
    <div className="min-h-screen bg-[#FBF6EE] text-[#241C15]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,500&family=Jost:wght@300;400;500;600&display=swap');
        .lpi-landing { font-family: 'Jost', ui-sans-serif, system-ui, sans-serif; }
        .lpi-landing .font-serif { font-family: 'Fraunces', ui-serif, Georgia, serif; }
      `}</style>

      <div className="lpi-landing pb-20">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-[#E7D9C4]/70 bg-[#FBF6EE]/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
            <span className="hidden font-serif text-lg font-medium tracking-tight text-[#241C15] sm:block">
              Ladang <span className="text-[#7C9C7B]">pangan.id</span>
            </span>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9C8A76]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk disini"
                className="w-full rounded-full border border-[#E7D9C4] bg-white py-2.5 pl-10 pr-4 text-sm text-[#3B2C21] outline-none placeholder:text-[#9C8A76] focus:border-[#B3402A]"
              />
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#B3402A] text-white shadow-md shadow-[#B3402A]/20 transition hover:bg-[#96311D]"
              aria-label="Buka keranjang"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#241C15] px-1 text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero banner */}
        <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#DCE7D6] to-[#F3D9C4] sm:mx-8">
          <div className="relative grid items-center gap-6 px-6 py-10 sm:grid-cols-2 sm:px-10 sm:py-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#7C9C7B]">
                {settings.heroBadge}
              </span>
              <h1 className="mt-4 font-serif text-2xl font-medium leading-tight text-[#241C15] sm:text-3xl lg:text-4xl">
                {settings.heroTitle}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#3B2C21]/80 sm:text-base">
                {settings.heroSubtitle}
              </p>
              <a
                href="#produk"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#B3402A] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[#B3402A]/25 transition hover:bg-[#96311D]"
              >
                <ShieldCheck className="h-4 w-4" />
                Belanja Sekarang
              </a>
            </div>
            <div className="relative mx-auto hidden aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-2xl border border-white/60 shadow-xl sm:block">
              <Image src={settings.heroImage} alt={settings.heroTitle} fill sizes="220px" className="object-cover" />
            </div>
          </div>
        </section>

        {/* Promo banner strip */}
        <section className="mx-4 mt-4 rounded-2xl bg-[#241C15] px-6 py-4 text-white sm:mx-8">
          <p className="font-serif text-lg font-medium">{settings.bannerTitle}</p>
          <p className="text-sm text-white/70">{settings.bannerSubtitle}</p>
        </section>

        {/* Trust strip */}
        <section className="mx-4 mt-6 grid grid-cols-2 gap-3 sm:mx-8 sm:grid-cols-4">
          {CERTIFICATIONS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl border border-[#E7D9C4] bg-white px-3 py-2.5">
              <Icon className="h-4 w-4 shrink-0 text-[#B3402A]" />
              <span className="text-xs font-medium text-[#3B2C21]">{label}</span>
            </div>
          ))}
        </section>

        {/* Category chips */}
        <section id="produk" className="mx-4 mt-8 sm:mx-8">
          <h2 className="font-serif text-xl font-medium text-[#241C15] sm:text-2xl">Semua Produk</h2>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  category === c
                    ? 'border-[#B3402A] bg-[#B3402A] text-white'
                    : 'border-[#E7D9C4] bg-white text-[#3B2C21] hover:border-[#B3402A]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <p className="mt-10 text-center text-sm text-[#9C8A76]">
              Produk tidak ditemukan. Coba kata kunci lain.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-sm text-[#6B5D4F]">
            Cari potongan lain untuk kebutuhan usaha Anda?{' '}
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="font-medium text-[#B3402A] underline underline-offset-4">
              Tanyakan ke tim kami
            </a>
            .
          </p>
        </section>

        {/* Footer */}
        <footer className="mx-4 mt-14 rounded-3xl bg-[#241C15] px-6 py-10 text-[#E7D9C4] sm:mx-8 sm:px-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
            <div>
              <span className="font-serif text-lg font-medium text-white">
                Ladang <span className="text-[#9CC49A]">pangan.id</span>
              </span>
              <p className="mt-2 max-w-xs text-sm text-[#C8B9A4]">
                Produsen ayam frozen langsung dari peternak. Bersaing, mudah, dan fleksibel.
              </p>
            </div>
            <div className="flex items-start gap-2 text-sm text-[#C8B9A4]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Kabupaten Sidoarjo, Jawa Timur, Indonesia</span>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-[#9C8A76]">
            © {new Date().getFullYear()} PT Ladang Pangan Indonesia. Seluruh hak cipta dilindungi.
          </div>
        </footer>
      </div>

      {/* Floating cart button (mobile) */}
      {count > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#B3402A] px-6 py-3.5 text-sm font-medium text-white shadow-xl shadow-[#B3402A]/30 sm:hidden"
        >
          <ShoppingCart className="h-4 w-4" />
          {count} item — Lihat Keranjang
        </button>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} waLink={waLink} />
    </div>
  )
}
