'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Award,
  ChevronLeft,
  ChevronRight,
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

function ProductCard({ product, large = false }) {
  const { items, addItem, setQty } = useCart()
  const inCart = items.find((it) => it.productId === product.id)

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#D6EBDC] bg-white shadow-sm transition hover:shadow-md ${
        large ? 'sm:flex sm:items-stretch' : ''
      }`}
    >
      <div
        className={`relative overflow-hidden bg-[#EEF8F1] ${
          large ? 'aspect-[4/3] sm:aspect-auto sm:w-2/5' : 'aspect-square'
        }`}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes={large ? '(max-width: 640px) 100vw, 320px' : '(max-width: 640px) 50vw, 220px'}
          className="object-cover"
        />
      </div>
      <div className={large ? 'flex flex-1 flex-col p-4 sm:p-5' : 'p-3'}>
        <p
          className={`font-medium text-[#142A1C] ${
            large ? 'text-lg' : 'line-clamp-2 min-h-[2.5rem] text-sm'
          }`}
        >
          {product.name}
        </p>
        <p className={large ? 'mt-1 text-sm text-[#7E9488]' : 'mt-0.5 text-xs text-[#7E9488]'}>{product.unit}</p>
        {large && product.description && (
          <p className="mt-2 line-clamp-2 text-sm text-[#4C6356]">{product.description}</p>
        )}
        <p className={`font-serif text-[#2FA966] ${large ? 'mt-2 text-2xl' : 'mt-1.5 text-lg'}`}>
          {formatIDR(product.price)}
        </p>

        {!inCart ? (
          <button
            type="button"
            onClick={() => addItem(product, 1)}
            className={`flex items-center justify-center gap-1.5 rounded-full bg-[#2FA966] font-medium text-white transition hover:bg-[#22824E] ${
              large ? 'mt-3 w-full py-2.5 text-sm sm:mt-auto sm:w-auto sm:self-start sm:px-6' : 'mt-2.5 w-full py-2 text-sm'
            }`}
          >
            <Plus className="h-4 w-4" />
            {large ? 'Tambah ke Keranjang' : 'Tambah'}
          </button>
        ) : (
          <div
            className={`flex items-center justify-between rounded-full border border-[#D6EBDC] bg-[#FFFFFF] ${
              large ? 'mt-3 w-full sm:mt-auto sm:w-40' : 'mt-2.5'
            }`}
          >
            <button
              type="button"
              onClick={() => setQty(product.id, inCart.qty - 1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center text-[#2FA966]"
              aria-label="Kurangi"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-[#142A1C]">{inCart.qty}</span>
            <button
              type="button"
              onClick={() => setQty(product.id, inCart.qty + 1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center text-[#2FA966]"
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

function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef(null)
  const count = slides.length

  useEffect(() => {
    if (count <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 6000)
    return () => clearInterval(timer)
  }, [count])

  function go(i) {
    setIndex(((i % count) + count) % count)
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 40) go(index - 1)
    else if (delta < -40) go(index + 1)
    touchStartX.current = null
  }

  return (
    <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl sm:mx-8">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="relative grid w-full shrink-0 items-center gap-6 bg-gradient-to-br from-[#CFEAD8] to-[#CDEFD7] px-6 py-10 sm:grid-cols-2 sm:px-10 sm:py-14"
          >
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#2FA966]">
                {slide.badge}
              </span>
              <h1 className="mt-4 font-serif text-2xl font-medium leading-tight text-[#142A1C] sm:text-3xl lg:text-4xl">
                {slide.title}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#1F3A28]/80 sm:text-base">
                {slide.subtitle}
              </p>
              <a
                href="#produk"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2FA966] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-[#2FA966]/25 transition hover:bg-[#22824E]"
              >
                <ShieldCheck className="h-4 w-4" />
                Belanja Sekarang
              </a>
            </div>
            <div className="relative mx-auto hidden aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-2xl border border-white/60 shadow-xl sm:block">
              <Image src={slide.image} alt={slide.title} fill sizes="220px" className="object-cover" />
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Sebelumnya"
            className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[#142A1C] shadow-md transition hover:bg-white sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Berikutnya"
            className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[#142A1C] shadow-md transition hover:bg-white sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-[#142A1C]' : 'w-1.5 bg-[#142A1C]/30'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
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
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-[#FFFFFF] shadow-2xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#D6EBDC] px-5 py-4">
          <h2 className="font-serif text-lg font-medium text-[#142A1C]">Keranjang Belanja</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-full p-1.5 hover:bg-[#E1F4E7]">
            <X className="h-5 w-5 text-[#1F3A28]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-[#7E9488]">
              <ShoppingCart className="h-10 w-10" />
              <p className="mt-3 text-sm">Keranjang Anda masih kosong.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((it) => (
                <div key={it.productId} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#EEF8F1]">
                    <Image src={it.image} alt={it.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#142A1C]">{it.name}</p>
                    <p className="text-xs text-[#7E9488]">{formatIDR(it.price)}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex items-center overflow-hidden rounded-full border border-[#D6EBDC]">
                        <button
                          type="button"
                          onClick={() => setQty(it.productId, it.qty - 1)}
                          className="flex h-7 w-7 items-center justify-center text-[#2FA966]"
                          aria-label="Kurangi"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-medium">{it.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(it.productId, it.qty + 1)}
                          className="flex h-7 w-7 items-center justify-center text-[#2FA966]"
                          aria-label="Tambah"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.productId)}
                        className="text-xs text-[#7E9488] underline underline-offset-2 hover:text-[#2FA966]"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-[#142A1C]">{formatIDR(it.price * it.qty)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#D6EBDC] px-5 py-4">
            <div className="flex items-center justify-between text-sm text-[#4C6356]">
              <span>Total</span>
              <span className="font-serif text-xl text-[#2FA966]">{formatIDR(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#2FA966] py-3.5 text-sm font-medium text-white transition hover:bg-[#22824E]"
            >
              <ShieldCheck className="h-4 w-4" />
              Lanjut ke Checkout
            </Link>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-[#D6EBDC] bg-white py-3 text-sm font-medium text-[#1F3A28] transition hover:border-[#2FA966]"
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

  const promoProducts = useMemo(
    () => settings.products.filter((p) => p.isPromo),
    [settings.products]
  )

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#142A1C]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Inter:wght@300;400;500;600&display=swap');
        .lpi-landing { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .lpi-landing .font-serif { font-family: 'Playfair Display', ui-serif, Georgia, serif; }
      `}</style>

      <div className="lpi-landing pb-20">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-[#D6EBDC]/70 bg-[#FFFFFF]/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
            <span className="hidden font-serif text-lg font-medium tracking-tight text-[#142A1C] sm:block">
              Ladang <span className="text-[#2FA966]">pangan.id</span>
            </span>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E9488]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk disini"
                className="w-full rounded-full border border-[#D6EBDC] bg-white py-2.5 pl-10 pr-4 text-sm text-[#1F3A28] outline-none placeholder:text-[#7E9488] focus:border-[#2FA966]"
              />
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2FA966] text-white shadow-md shadow-[#2FA966]/20 transition hover:bg-[#22824E]"
              aria-label="Buka keranjang"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#142A1C] px-1 text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero carousel */}
        <HeroCarousel slides={settings.heroSlides} />

        {/* Promo banner strip */}
        <section className="mx-4 mt-4 rounded-2xl bg-[#142A1C] px-6 py-4 text-white sm:mx-8">
          <p className="font-serif text-lg font-medium">{settings.bannerTitle}</p>
          <p className="text-sm text-white/70">{settings.bannerSubtitle}</p>
        </section>

        {/* Trust strip */}
        <section className="mx-4 mt-6 grid grid-cols-2 gap-3 sm:mx-8 sm:grid-cols-4">
          {CERTIFICATIONS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl border border-[#D6EBDC] bg-white px-3 py-2.5">
              <Icon className="h-4 w-4 shrink-0 text-[#2FA966]" />
              <span className="text-xs font-medium text-[#1F3A28]">{label}</span>
            </div>
          ))}
        </section>

        {/* Promo */}
        {promoProducts.length > 0 && (
          <section className="mx-4 mt-8 sm:mx-8">
            <h2 className="font-serif text-xl font-medium text-[#142A1C] sm:text-2xl">Promo</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {promoProducts.map((p) => (
                <ProductCard key={p.id} product={p} large />
              ))}
            </div>
          </section>
        )}

        {/* Category chips */}
        <section id="produk" className="mx-4 mt-8 sm:mx-8">
          <h2 className="font-serif text-xl font-medium text-[#142A1C] sm:text-2xl">Semua Produk</h2>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  category === c
                    ? 'border-[#2FA966] bg-[#2FA966] text-white'
                    : 'border-[#D6EBDC] bg-white text-[#1F3A28] hover:border-[#2FA966]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <p className="mt-10 text-center text-sm text-[#7E9488]">
              Produk tidak ditemukan. Coba kata kunci lain.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-sm text-[#4C6356]">
            Cari potongan lain untuk kebutuhan usaha Anda?{' '}
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="font-medium text-[#2FA966] underline underline-offset-4">
              Tanyakan ke tim kami
            </a>
            .
          </p>
        </section>

        {/* Footer */}
        <footer className="mx-4 mt-14 rounded-3xl bg-[#142A1C] px-6 py-10 text-[#D6EBDC] sm:mx-8 sm:px-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
            <div>
              <span className="font-serif text-lg font-medium text-white">
                Ladang <span className="text-[#8FE0A8]">pangan.id</span>
              </span>
              <p className="mt-2 max-w-xs text-sm text-[#AFD9BE]">
                Produsen ayam frozen langsung dari peternak. Bersaing, mudah, dan fleksibel.
              </p>
            </div>
            <div className="flex items-start gap-2 text-sm text-[#AFD9BE]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Kabupaten Sidoarjo, Jawa Timur, Indonesia</span>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-[#7E9488]">
            © {new Date().getFullYear()} PT Ladang Pangan Indonesia. Seluruh hak cipta dilindungi.
          </div>
        </footer>
      </div>

      {/* Floating cart button (mobile) */}
      {count > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2FA966] px-6 py-3.5 text-sm font-medium text-white shadow-xl shadow-[#2FA966]/30 sm:hidden"
        >
          <ShoppingCart className="h-4 w-4" />
          {count} item — Lihat Keranjang
        </button>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} waLink={waLink} />
    </div>
  )
}
