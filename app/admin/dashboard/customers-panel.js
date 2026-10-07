'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'
import { toLocalPhone } from '@/lib/profile-input'

// Data pelanggan (khusus Owner). Tampil di dalam <form> besar halaman admin:
// TIDAK memakai <form>/type=submit; Enter di kolom cari dicegah.

const cardClass = 'rounded-2xl border border-[#D6EBDC] bg-white p-4 sm:p-6'
const STATUS = { menunggu_bayar: 'Menunggu Bayar', dibayar: 'Dibayar', dikemas: 'Dikemas', dikirim: 'Dikirim', diterima: 'Diterima', batal: 'Batal', gagal: 'Gagal', kedaluwarsa: 'Kedaluwarsa' }
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-')

function Row({ c, kind }) {
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState(null)

  async function toggle() {
    setOpen((v) => !v)
    if (orders) return
    try {
      const qs = kind === 'member' ? `customerId=${encodeURIComponent(c.id)}` : `phone=${encodeURIComponent(c.phone)}`
      const res = await fetch(`/api/admin/customers/orders?${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat pesanan.')
      setOrders(data.orders)
    } catch (e) {
      toast.error(e.message)
      setOrders([])
    }
  }

  const phone = toLocalPhone(c.phone)
  const wa = c.phone ? `https://wa.me/${String(c.phone).replace(/\D/g, '').replace(/^0/, '62')}` : null
  return (
    <li className="py-3 text-sm">
      <button type="button" onClick={toggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#142A1C]">{c.name || '(tanpa nama)'}</p>
          <p className="truncate text-xs text-[#7E9488]">{[c.email, phone].filter(Boolean).join(' · ') || '-'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-[#1E5A3A]">{formatIDR(c.totalSpent)}</p>
          <p className="text-xs text-[#7E9488]">{c.orders} pesanan · {fmtDate(c.lastOrderAt)}</p>
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-2 rounded-xl bg-[#F7FBF8] p-3">
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg border border-[#D6EBDC] bg-white px-3 py-1.5 text-xs font-medium text-[#1E5A3A]">Chat WhatsApp</a>}
          <p className="text-xs text-[#4C6356]">Dibayar: {c.paidOrders} · Batal/gagal: {c.cancelledOrders}{kind === 'member' && c.lastLoginAt ? ` · Login terakhir: ${fmtDate(c.lastLoginAt)}` : ''}</p>
          {(kind === 'member' ? c.addresses : c.addresses.map((a) => ({ address: a }))).length > 0 && (
            <ul className="space-y-1 text-xs text-[#4C6356]">
              {(kind === 'member' ? c.addresses : c.addresses.map((a) => ({ address: a }))).map((a, i) => (
                <li key={i}>• {a.label ? `${a.label}: ` : ''}{a.address}</li>
              ))}
            </ul>
          )}
          <div>
            <p className="text-xs font-semibold text-[#142A1C]">Pesanan terakhir</p>
            {orders === null ? (
              <Loader2 className="mt-1 h-4 w-4 animate-spin text-[#2FA966]" />
            ) : orders.length === 0 ? (
              <p className="text-xs text-[#7E9488]">Belum ada.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {orders.map((o) => (
                  <li key={o.orderId} className="text-xs text-[#1F3A28]">
                    <span className="font-mono">{o.orderId}</span> · {STATUS[o.status] || o.status} · {formatIDR(o.grossAmount)} · {fmtDate(o.createdAt)}
                    <span className="block text-[#7E9488]">{o.itemsText}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

export default function CustomersPanel() {
  const [q, setQ] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('member')

  const load = useCallback(async (query) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(query)}`, { cache: 'no-store' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal memuat.')
      setData(d)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(q), 300)
    return () => clearTimeout(t)
  }, [q, load])

  const list = data ? (tab === 'member' ? data.members : data.guests) : []
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#142A1C]">Data Pelanggan</h2>
            <p className="text-xs text-[#7E9488]">Data pribadi. Hanya Owner yang bisa melihat dan mengunduhnya.</p>
          </div>
          <a href="/api/admin/customers/export" className="inline-flex items-center gap-2 rounded-xl border border-[#D6EBDC] px-3 py-2 text-sm font-medium text-[#1E5A3A] hover:border-[#2FA966]">
            <Download className="h-4 w-4" /> Unduh CSV
          </a>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E9488]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
            placeholder="Cari nama, email, atau nomor WhatsApp"
            className="w-full rounded-xl border border-[#D6EBDC] bg-[#FBFEFC] py-2.5 pl-9 pr-4 text-[#1F3A28] outline-none focus:border-[#2FA966]"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[['member', `Login Google (${data?.totals?.members ?? 0})`], ['guest', `Tanpa login (${data?.totals?.guests ?? 0})`]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${tab === id ? 'border-[#1E5A3A] bg-[#1E5A3A] text-white' : 'border-[#D6EBDC] bg-white text-[#1F3A28]'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className={cardClass}>
        {loading && !data ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#2FA966]" /></div>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#7E9488]">{q ? 'Tidak ada yang cocok.' : tab === 'member' ? 'Belum ada pembeli yang login Google.' : 'Belum ada pesanan dari pembeli tanpa login.'}</p>
        ) : (
          <ul className="divide-y divide-[#E3F0E7]">
            {list.map((c) => <Row key={c.id || c.phone} c={c} kind={tab} />)}
          </ul>
        )}
      </div>
    </div>
  )
}
