import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { getLandingSettings, getPublicLandingSettings } from '@/lib/db'
import { getActiveBundles, toPublicBundle } from '@/lib/bundles'
import { formatIDR } from '@/lib/format'
import ShopShell from '../../_components/shop-shell'
import { makeWaLink } from '@/lib/wa'
import AddPanel from '../../_components/add-panel'
import { StockBadge } from '../../_components/cards'

export const dynamic = 'force-dynamic'

async function load(id) {
  const [settings, raw, bundles] = await Promise.all([getPublicLandingSettings(), getLandingSettings(), getActiveBundles()])
  const found = bundles.find((b) => b.id === id)
  const productsById = new Map(raw.products.map((p) => [p.id, p]))
  return { settings, bundle: found ? toPublicBundle(found, productsById) : null }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const { bundle } = await load(id)
  if (!bundle) return { title: 'Paket tidak ditemukan' }
  return {
    title: `${bundle.name} — ladangpangan.id`,
    description: bundle.description || `${bundle.name}, harga ${formatIDR(bundle.price)}.`,
    openGraph: { images: [{ url: bundle.image }] },
  }
}

export default async function BundlePage({ params }) {
  const { id } = await params
  const { settings, bundle } = await load(id)
  if (!bundle) notFound()

  const isMasak = bundle.type === 'masak'
  const waLink = makeWaLink(settings, `Halo, saya mau tanya soal ${bundle.name}.`)

  return (
    <ShopShell settings={settings} hideFloatingCart>
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-8">
        <Link href={isMasak ? '/#paket-masak' : '/#paket-hemat'} className="inline-flex h-11 items-center gap-2 text-sm font-semibold text-lpi">
          <ArrowLeft className="h-4 w-4" />
          Kembali belanja
        </Link>

        <div className="mt-2 grid gap-6 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-lpi-light">
            <Image
              src={bundle.image}
              alt={bundle.name}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 480px"
              className={`object-cover ${bundle.soldOut ? 'opacity-50 grayscale' : ''}`}
            />
            <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
              <StockBadge soldOut={bundle.soldOut} stockLeft={bundle.stockLeft} />
              {!isMasak && bundle.savings > 0 && !bundle.soldOut && (
                <span className="rounded-full bg-lpi px-3 py-1 text-xs font-bold text-white">Hemat {formatIDR(bundle.savings)}</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-lpi-muted">{isMasak ? 'Paket Masak' : 'Paket Hemat'}</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-lpi-ink">{bundle.name}</h1>
            <div className="mt-3 flex items-baseline gap-3">
              <p className="text-3xl font-extrabold text-lpi">{formatIDR(bundle.price)}</p>
              {bundle.savings > 0 && <p className="text-sm text-lpi-muted line-through">{formatIDR(bundle.normalPrice)}</p>}
            </div>
            {bundle.savings > 0 && <p className="mt-1 text-sm font-semibold text-lpi">Anda hemat {formatIDR(bundle.savings)} dari harga satuan</p>}
            {bundle.description && <p className="mt-4 text-base leading-relaxed text-lpi-ink">{bundle.description}</p>}
            {bundle.isSample && (
              <p className="mt-3 rounded-xl bg-lpi-light px-4 py-3 text-sm text-lpi">
                Ini paket contoh untuk melihat tampilan. Isi dan harga asli akan diatur toko.
              </p>
            )}
            <AddPanel
              item={{ id: bundle.id, name: bundle.name, unit: 'paket', price: bundle.price, image: bundle.image }}
              kind="paket"
              soldOut={bundle.soldOut}
              stockLeft={bundle.stockLeft}
              label={isMasak ? 'Tambah semua bahan' : 'Tambah paket'}
              waLink={waLink}
            />
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-lpi-line bg-white p-5">
          <h2 className="text-lg font-extrabold text-lpi-ink">Isi paket</h2>
          <ul className="mt-3 divide-y divide-lpi-line">
            {bundle.items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 py-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-lpi-light">
                  {it.image && <Image src={it.image} alt={it.name} fill sizes="56px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/produk/${it.id}`} className="line-clamp-2 text-sm font-semibold text-lpi-ink">
                    {it.name}
                  </Link>
                  <p className="text-xs text-lpi-muted">{it.unit}</p>
                </div>
                <p className="shrink-0 text-sm font-bold text-lpi-ink">{it.qty}×</p>
              </li>
            ))}
          </ul>
        </section>

        {isMasak && (bundle.recipe.ingredients.length > 0 || bundle.recipe.steps.length > 0) && (
          <section className="mt-4 grid gap-4 sm:grid-cols-2">
            {bundle.recipe.ingredients.length > 0 && (
              <div className="rounded-2xl border border-lpi-line bg-white p-5">
                <h2 className="text-lg font-extrabold text-lpi-ink">Bahan-bahan</h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-lpi-ink">
                  {bundle.recipe.ingredients.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {bundle.recipe.steps.length > 0 && (
              <div className="rounded-2xl border border-lpi-line bg-white p-5">
                <h2 className="text-lg font-extrabold text-lpi-ink">Cara memasak</h2>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-lpi-ink">
                  {bundle.recipe.steps.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-11 items-center gap-2 text-sm font-semibold text-lpi underline underline-offset-4"
        >
          <MessageCircle className="h-4 w-4" />
          Tanya paket ini via WhatsApp
        </a>
      </div>
    </ShopShell>
  )
}
