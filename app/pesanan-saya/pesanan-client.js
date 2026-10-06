'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatIDR } from '@/lib/format'
import { getSavedOrders } from '@/lib/saved-orders'
import { FINAL_STATUSES } from '@/lib/order-timeline'
import PageHeader from '@/app/_components/page-header'

const STATUS = { menunggu_bayar: 'Menunggu Bayar', dibayar: 'Dibayar', dikemas: 'Dikemas', dikirim: 'Dikirim', diterima: 'Diterima', batal: 'Batal', gagal: 'Gagal', kedaluwarsa: 'Kedaluwarsa' }

// Gabungan pesanan di HP ini (tanpa login) dan riwayat akun Google (bila login).
export default function PesananSayaClient({ loggedIn, googleEnabled, accountOrders }) {
  const [local, setLocal] = useState(null)
  const [live, setLive] = useState({})

  useEffect(() => {
    const saved = getSavedOrders()
    setLocal(saved)
    if (!saved.length) return
    fetch('/api/pesanan/ringkas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: saved.map((o) => ({ id: o.orderId, k: o.k })) }),
    })
      .then((r) => r.json())
      .then((d) => setLive(Object.fromEntries((d.orders || []).map((o) => [o.orderId, o]))))
      .catch(() => {})
  }, [])

  const accountIds = new Set(accountOrders.map((o) => o.orderId))
  const rows = [
    ...accountOrders.map((o) => ({ orderId: o.orderId, k: o.key, status: o.status, text: o.itemsText, total: o.grossAmount, at: o.createdAt })),
    ...(local || []).filter((o) => !accountIds.has(o.orderId)).map((o) => ({ orderId: o.orderId, k: o.k, status: live[o.orderId]?.status || o.status, text: live[o.orderId]?.message || o.message || '', at: live[o.orderId]?.updatedAt || '' })),
  ]
  const unread = (r) => { const s = (local || []).find((o) => o.orderId === r.orderId); return !!(s?.seenSig && live[r.orderId] && s.seenSig !== live[r.orderId].sig) }
  const active = rows.filter((r) => !FINAL_STATUSES.includes(r.status))
  const done = rows.filter((r) => FINAL_STATUSES.includes(r.status))

  function Row({ r }) {
    return (
      <li>
        <Link href={`/pesanan/${encodeURIComponent(r.orderId)}?k=${r.k}`} className="block py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 break-all font-mono text-xs text-lpi-muted">{unread(r) && <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />}{r.orderId}</span>
            {r.status && <span className="shrink-0 rounded-full bg-lpi-light px-3 py-0.5 text-xs font-bold text-lpi">{STATUS[r.status] || r.status}</span>}
          </div>
          {r.text && <p className="mt-1 line-clamp-2 text-sm">{r.text}</p>}
          {r.total ? <p className="mt-1 text-sm font-bold text-lpi">{formatIDR(r.total)}{r.at && <span className="font-normal text-lpi-muted"> · {new Date(r.at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}</p> : null}
        </Link>
      </li>
    )
  }

  const Section = ({ title, list }) => list.length > 0 && (
    <section className="rounded-2xl border border-lpi-line bg-white p-4">
      <h2 className="font-extrabold">{title}</h2>
      <ul className="mt-1 divide-y divide-lpi-line">{list.map((r) => <Row key={r.orderId} r={r} />)}</ul>
    </section>
  )

  return (
    <div className="min-h-screen bg-lpi-bg text-lpi-ink">
      <PageHeader title="Pesanan Saya" />
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {local === null ? null : rows.length === 0 ? (
          <section className="rounded-2xl border border-lpi-line bg-white p-5 text-center">
            <p className="font-extrabold">Belum ada pesanan di HP ini</p>
            <p className="mt-2 text-sm text-lpi-muted">Pesanan yang Anda buat akan muncul di sini. Punya nomor pesanan dari HP lain? Gunakan Lacak Pesanan.</p>
            <Link href="/lacak" className="mt-4 inline-flex h-12 items-center rounded-xl bg-lpi px-6 text-sm font-bold text-white">Lacak Pesanan</Link>
          </section>
        ) : (
          <>
            <Section title="Sedang berjalan" list={active} />
            <Section title="Selesai" list={done} />
          </>
        )}
        {!loggedIn && googleEnabled && (
          <p className="rounded-2xl bg-lpi-light p-4 text-sm">Ingin riwayat ikut ke HP lain? <Link href="/akun" className="font-bold text-lpi underline">Masuk dengan Google</Link>.</p>
        )}
      </main>
    </div>
  )
}
