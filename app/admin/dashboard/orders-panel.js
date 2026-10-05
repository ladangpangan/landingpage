'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { OrderCard, STATUS_LABEL } from './order-ui'

const FILTERS = [
  ['', 'Semua'],
  ['dibayar', 'Perlu dikemas'],
  ['dikemas', 'Dikemas'],
  ['dikirim', 'Dikirim'],
  ['diterima', 'Selesai'],
  ['menunggu_bayar', 'Menunggu bayar'],
  ['batal', 'Batal'],
]

export default function OrdersPanel({ initialFilter = '' }) {
  const [status, setStatus] = useState(initialFilter)
  const [q, setQ] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams()
      if (status) sp.set('status', status)
      if (q.trim()) sp.set('q', q.trim())
      const res = await fetch(`/api/admin/orders?${sp}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat pesanan.')
      setOrders(data.orders || [])
    } catch (e) {
      toast.error(e.message || 'Gagal memuat pesanan.')
    } finally {
      setLoading(false)
    }
  }, [status, q])

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lpi-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            placeholder="Cari nomor pesanan, nama, atau nomor WA"
            className="h-11 w-full rounded-xl border border-lpi-line bg-white pl-9 pr-3 text-sm outline-none focus:border-lpi"
          />
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-lpi-line bg-white" aria-label="Muat ulang">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              status === value ? 'border-lpi bg-lpi text-white' : 'border-lpi-line bg-white text-lpi-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-lpi" /></div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-lpi-line bg-white p-6 text-center text-sm text-lpi-muted">
          Tidak ada pesanan{status ? ` berstatus ${STATUS_LABEL[status]}` : ''}.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => <OrderCard key={o.orderId} order={o} onChanged={load} />)}
        </div>
      )}
    </div>
  )
}
