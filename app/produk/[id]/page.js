import SafeImage from '../../_components/safe-image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { getPublicLandingSettings } from '@/lib/db'
import { formatIDR } from '@/lib/format'
import ShopShell from '../../_components/shop-shell'
import { makeWaLink } from '@/lib/wa'
import AddPanel from '../../_components/add-panel'
import { ProductCard, StockBadge } from '../../_components/cards'

export const dynamic = 'force-dynamic'

async function load(id) {
  const settings = await getPublicLandingSettings()
  const product = settings.products.find((p) => p.id === id)
  return { settings, product }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const { product } = await load(id)
  if (!product) return { title: 'Produk tidak ditemukan' }
  return {
    title: `${product.name} — ladangpangan.id`,
    description: product.description || `${product.name} ${product.unit}, harga ${formatIDR(product.price)}.`,
    openGraph: { images: [{ url: product.image }] },
  }
}

export default async function ProductPage({ params }) {
  const { id } = await params
  const { settings, product } = await load(id)
  if (!product) notFound()

  const related = settings.products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)
  const waLink = makeWaLink(settings, `Halo, saya mau tanya soal ${product.name}.`)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: product.image,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IDR',
      price: product.price,
      availability: product.soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
  }

  return (
    <ShopShell settings={settings} hideFloatingCart>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-8">
        <Link href="/" className="inline-flex h-11 items-center gap-2 text-sm font-semibold text-lpi">
          <ArrowLeft className="h-4 w-4" />
          Kembali belanja
        </Link>

        <div className="mt-2 grid gap-6 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-lpi-light">
            <SafeImage
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 480px"
              className={`object-cover ${product.soldOut ? 'opacity-50 grayscale' : ''}`}
            />
            <div className="absolute left-3 top-3">
              <StockBadge soldOut={product.soldOut} stockLeft={product.stockLeft} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-lpi-muted">{product.category}</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-lpi-ink">{product.name}</h1>
            <p className="mt-1 text-sm text-lpi-muted">{product.unit}</p>
            <p className="mt-3 text-3xl font-extrabold text-lpi">{formatIDR(product.price)}</p>
            {product.description && <p className="mt-4 text-base leading-relaxed text-lpi-ink">{product.description}</p>}
            <AddPanel
              item={product}
              kind="produk"
              soldOut={product.soldOut}
              stockLeft={product.stockLeft}
              label="Tambah ke keranjang"
              waLink={waLink}
            />
            {!product.soldOut && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-11 items-center gap-2 text-sm font-semibold text-lpi underline underline-offset-4"
              >
                <MessageCircle className="h-4 w-4" />
                Tanya produk ini via WhatsApp
              </a>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-extrabold text-lpi-ink">Produk lain yang mirip</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </ShopShell>
  )
}
