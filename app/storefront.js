'use client'

import { useMemo, useState } from 'react'
import { Award, MapPin, MessageCircle, ShieldCheck, Snowflake } from 'lucide-react'
import ShopShell from './_components/shop-shell'
import { makeWaLink } from '@/lib/wa'
import HeroCarousel from './_components/hero-carousel'
import RecipeCard from './_components/recipe-card'
import Link from 'next/link'
import { BundleCard, ProductCard } from './_components/cards'
import { matchesQuery } from '@/lib/search'

const CERTIFICATIONS = [
  { icon: Award, label: 'Halal Indonesia' },
  { icon: ShieldCheck, label: 'NKV Resmi' },
  { icon: Snowflake, label: 'Cold Chain Terjaga' },
  { icon: MapPin, label: 'Sidoarjo, Jawa Timur' },
]

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="mx-4 mt-8 scroll-mt-40 sm:mx-8">
      <h2 className="text-xl font-extrabold text-lpi-ink sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-lpi-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

// Paket: bisa digeser ke samping di HP, grid di layar besar.
function BundleRow({ bundles }) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
      {bundles.map((b) => (
        <BundleCard key={b.id} bundle={b} />
      ))}
    </div>
  )
}

export default function Storefront({ settings, bundles, recipes = [], initialQuery = '' }) {
  const [search, setSearch] = useState(initialQuery)
  const [category, setCategory] = useState('Semua')
  const waLink = makeWaLink(settings)
  const searching = search.trim().length > 0

  const categories = useMemo(() => {
    const set = new Set(settings.products.map((p) => p.category || 'Lainnya'))
    return ['Semua', ...Array.from(set)]
  }, [settings.products])

  const foundProducts = useMemo(
    () => settings.products.filter((p) => matchesQuery([p.name, p.category, p.description], search)),
    [settings.products, search]
  )
  const foundBundles = useMemo(
    () => bundles.filter((b) => matchesQuery([b.name, b.description, b.type === 'hemat' ? 'paket hemat' : 'paket masak resep'], search)),
    [bundles, search]
  )
  const gridProducts = useMemo(
    () => settings.products.filter((p) => category === 'Semua' || (p.category || 'Lainnya') === category),
    [settings.products, category]
  )
  const hemat = bundles.filter((b) => b.type === 'hemat')
  const masak = bundles.filter((b) => b.type === 'masak')
  const promo = settings.products.filter((p) => p.isPromo)

  const quickLinks = [
    hemat.length > 0 && { href: '#paket-hemat', label: 'Paket Hemat' },
    masak.length > 0 && { href: '#paket-masak', label: 'Paket Masak' },
    promo.length > 0 && { href: '#promo', label: 'Promo' },
    recipes.length > 0 && { href: '#inspirasi', label: 'Inspirasi Menu' },
    { href: '#produk', label: 'Semua Produk' },
  ].filter(Boolean)

  return (
    <ShopShell settings={settings} searchValue={search} onSearchChange={setSearch}>
      {searching ? (
        <Section id="produk" title={`Hasil pencarian “${search.trim()}”`}>
          {foundProducts.length + foundBundles.length === 0 ? (
            <div className="rounded-2xl border border-lpi-line bg-white p-6 text-center">
              <p className="text-sm text-lpi-muted">Belum ada yang cocok dengan kata itu. Coba kata lain, misalnya “dada” atau “ceker”.</p>
              <a
                href={makeWaLink(settings, `Halo, saya mencari "${search.trim()}". Apakah tersedia?`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-lpi px-5 text-sm font-bold text-white"
              >
                <MessageCircle className="h-4 w-4" />
                Tanyakan via WhatsApp
              </a>
            </div>
          ) : (
            <>
              {foundBundles.length > 0 && (
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {foundBundles.map((b) => (
                    <BundleCard key={b.id} bundle={b} />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {foundProducts.map((p, i) => (
                  <ProductCard key={p.id} product={p} eager={i < 8} />
                ))}
              </div>
            </>
          )}
        </Section>
      ) : (
        <>
          <HeroCarousel slides={settings.heroSlides} />

          <section className="mx-4 mt-4 rounded-2xl bg-lpi-light px-5 py-4 sm:mx-8">
            <p className="text-base font-extrabold text-lpi">{settings.bannerTitle}</p>
            <p className="text-sm text-lpi-muted">{settings.bannerSubtitle}</p>
          </section>

          <nav className="mx-4 mt-4 flex gap-2 overflow-x-auto pb-1 sm:mx-8" aria-label="Menu cepat">
            {quickLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="flex h-11 shrink-0 items-center rounded-full border border-lpi-line bg-white px-5 text-sm font-bold text-lpi"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <section className="mx-4 mt-4 grid grid-cols-2 gap-2 sm:mx-8 sm:grid-cols-4">
            {CERTIFICATIONS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-xl border border-lpi-line bg-white px-3 py-3">
                <Icon className="h-4 w-4 shrink-0 text-lpi" />
                <span className="text-xs font-semibold text-lpi-ink">{label}</span>
              </div>
            ))}
          </section>

          {hemat.length > 0 && (
            <Section id="paket-hemat" title="Paket Hemat" subtitle="Beli bundel, lebih murah dari beli satuan.">
              <BundleRow bundles={hemat} />
            </Section>
          )}

          {masak.length > 0 && (
            <Section id="paket-masak" title="Paket Masak" subtitle="Bahan sudah dipilihkan, lengkap dengan resepnya.">
              <BundleRow bundles={masak} />
            </Section>
          )}

          {recipes.length > 0 && (
            <Section id="inspirasi" title="Inspirasi Menu" subtitle="Bingung masak apa? Pilih resep, bahan langsung masuk keranjang.">
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                {recipes.slice(0, 6).map((r) => (
                  <div key={r.id} className="w-64 shrink-0 sm:w-auto"><RecipeCard recipe={r} /></div>
                ))}
              </div>
              <p className="mt-2"><Link href="/inspirasi" className="text-sm font-bold text-lpi underline">Lihat semua resep</Link></p>
            </Section>
          )}

          {promo.length > 0 && (
            <Section id="promo" title="Promo">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {promo.map((p, i) => (
                  <ProductCard key={p.id} product={p} eager={i < 4} />
                ))}
              </div>
            </Section>
          )}

          <Section id="produk" title="Semua Produk">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`h-11 shrink-0 rounded-full border px-5 text-sm font-bold transition ${
                    category === c ? 'border-lpi bg-lpi text-white' : 'border-lpi-line bg-white text-lpi-ink'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gridProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} eager={i < 8} />
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-lpi-muted">
              Cari potongan lain untuk kebutuhan usaha Anda?{' '}
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="font-bold text-lpi underline underline-offset-4">
                Tanyakan ke tim kami
              </a>
              .
            </p>
          </Section>
        </>
      )}
    </ShopShell>
  )
}
