'use client'

import Link from 'next/link'
import SafeImage from './safe-image'
import { Minus, Plus } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatIDR } from '@/lib/format'

export function QtyStepper({ value, onChange, min = 0, max = 99, className = '' }) {
  return (
    <div className={`flex h-12 items-center justify-between rounded-xl border border-lpi-line bg-white ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-12 w-12 shrink-0 items-center justify-center text-lpi disabled:opacity-30"
        aria-label="Kurangi"
      >
        <Minus className="h-5 w-5" />
      </button>
      <span className="min-w-8 text-center text-base font-bold text-lpi-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-12 w-12 shrink-0 items-center justify-center text-lpi disabled:opacity-30"
        aria-label="Tambah"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  )
}

export function StockBadge({ soldOut, stockLeft }) {
  if (soldOut) {
    return <span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs font-bold text-white">Habis</span>
  }
  if (stockLeft) {
    return <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#9B2C2C] shadow-sm">Sisa {stockLeft}</span>
  }
  return null
}

// Tombol tambah / pengatur jumlah untuk satu produk atau paket.
export function AddControl({ item, kind, soldOut, stockLeft, label = 'Tambah' }) {
  const { addItem, setQty, getQty } = useCart()
  const qty = getQty(item.id, kind)
  const max = stockLeft || 99

  if (soldOut) {
    return (
      <button
        type="button"
        disabled
        className="mt-3 flex h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-gray-200 text-sm font-bold text-gray-500"
      >
        Stok habis
      </button>
    )
  }
  if (!qty) {
    return (
      <button
        type="button"
        onClick={() => addItem(item, 1, kind)}
        className="mt-3 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-lpi text-sm font-bold text-white transition active:scale-[0.98] hover:bg-lpi-dark"
      >
        <Plus className="h-4 w-4" />
        {label}
      </button>
    )
  }
  return <QtyStepper className="mt-3" value={qty} max={max} onChange={(n) => setQty(item.id, n, kind)} />
}

function ImageBox({ src, alt, soldOut, children, href }) {
  const img = (
    <div className="relative aspect-square overflow-hidden bg-lpi-light">
      <SafeImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, 240px"
        className={`object-cover ${soldOut ? 'opacity-50 grayscale' : ''}`}
      />
      <div className="absolute left-2 top-2 flex flex-col items-start gap-1">{children}</div>
    </div>
  )
  return href ? <Link href={href}>{img}</Link> : img
}

export function ProductCard({ product }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-lpi-line bg-white shadow-sm">
      <ImageBox src={product.image} alt={product.name} soldOut={product.soldOut} href={`/produk/${product.id}`}>
        <StockBadge soldOut={product.soldOut} stockLeft={product.stockLeft} />
        {product.isPromo && !product.soldOut && (
          <span className="rounded-full bg-lpi px-2.5 py-1 text-xs font-bold text-white">Promo</span>
        )}
      </ImageBox>
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/produk/${product.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-lpi-ink">
          {product.name}
        </Link>
        <p className="mt-0.5 text-xs text-lpi-muted">{product.unit}</p>
        <p className="mt-1.5 text-lg font-extrabold text-lpi">{formatIDR(product.price)}</p>
        <div className="mt-auto">
          <AddControl item={product} kind="produk" soldOut={product.soldOut} stockLeft={product.stockLeft} />
        </div>
      </div>
    </div>
  )
}

export function BundleCard({ bundle }) {
  const summary = bundle.items.map((it) => `${it.qty}× ${it.name}`).join(', ')
  return (
    <div className="flex h-full w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-lpi-line bg-white shadow-sm sm:w-auto">
      <ImageBox src={bundle.image} alt={bundle.name} soldOut={bundle.soldOut} href={`/paket/${bundle.id}`}>
        <StockBadge soldOut={bundle.soldOut} stockLeft={bundle.stockLeft} />
        {bundle.type === 'hemat' && bundle.savings > 0 && !bundle.soldOut && (
          <span className="rounded-full bg-lpi px-2.5 py-1 text-xs font-bold text-white">
            Hemat {formatIDR(bundle.savings)}
          </span>
        )}
      </ImageBox>
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/paket/${bundle.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-lpi-ink">
          {bundle.name}
        </Link>
        <p className="mt-0.5 line-clamp-2 text-xs text-lpi-muted">{summary}</p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <p className="text-lg font-extrabold text-lpi">{formatIDR(bundle.price)}</p>
          {bundle.savings > 0 && <p className="text-xs text-lpi-muted line-through">{formatIDR(bundle.normalPrice)}</p>}
        </div>
        <div className="mt-auto">
          <AddControl
            item={bundle}
            kind="paket"
            soldOut={bundle.soldOut}
            stockLeft={bundle.stockLeft}
            label={bundle.type === 'masak' ? 'Tambah semua bahan' : 'Tambah paket'}
          />
        </div>
      </div>
    </div>
  )
}
