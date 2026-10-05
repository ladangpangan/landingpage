'use client'

import { useState } from 'react'
import { MessageCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-context'
import { formatIDR } from '@/lib/format'
import { QtyStepper } from './cards'

// Pilih jumlah + tombol tambah. Di HP tombolnya menempel di bawah layar.
export default function AddPanel({ item, kind, soldOut, stockLeft, label, waLink }) {
  const { addItem, getQty } = useCart()
  const [qty, setQty] = useState(1)
  const inCart = getQty(item.id, kind)
  const max = stockLeft ? Math.max(1, stockLeft - inCart) : 99

  function add() {
    addItem(item, qty, kind)
    toast.success(`${qty} ${item.name} masuk keranjang`)
    setQty(1)
  }

  if (soldOut) {
    return (
      <div className="mt-5 rounded-2xl border border-lpi-line bg-white p-4">
        <p className="text-sm font-semibold text-lpi-ink">Maaf, stok sedang habis.</p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lpi text-sm font-bold text-white"
        >
          <MessageCircle className="h-4 w-4" />
          Tanya kapan tersedia via WhatsApp
        </a>
      </div>
    )
  }

  return (
    <>
      <div className="mt-5 hidden items-center gap-3 sm:flex">
        <QtyStepper className="w-40" value={qty} min={1} max={max} onChange={setQty} />
        <button
          type="button"
          onClick={add}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-lpi px-6 text-base font-bold text-white hover:bg-lpi-dark"
        >
          <Plus className="h-5 w-5" />
          {label} · {formatIDR(item.price * qty)}
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-lpi-line bg-white p-3 sm:hidden">
        <div className="flex items-center gap-3">
          <QtyStepper className="w-32 shrink-0" value={qty} min={1} max={max} onChange={setQty} />
          <button
            type="button"
            onClick={add}
            className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-lpi px-3 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">Tambah · {formatIDR(item.price * qty)}</span>
          </button>
        </div>
      </div>
      {inCart > 0 && <p className="mt-3 text-sm text-lpi-muted">Sudah {inCart} di keranjang Anda.</p>}
    </>
  )
}
