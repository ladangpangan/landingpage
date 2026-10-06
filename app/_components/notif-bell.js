'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { getSavedOrders, updateSaved, removeSaved } from '@/lib/saved-orders'
import { computeUnread, FINAL_STATUSES } from '@/lib/order-timeline'

// Lonceng pemberitahuan di header: memantau pesanan yang tersimpan di HP ini tiap 60 detik.
export default function NotifBell() {
  const [items, setItems] = useState([]) // gabungan tersimpan + ringkasan terbaru
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  const refresh = useCallback(async () => {
    const saved = getSavedOrders()
    if (!saved.length) return setItems([])
    // Pesanan selesai yang sudah dilihat tidak perlu dipantau lagi.
    const watch = saved.filter((o) => !(FINAL_STATUSES.includes(o.status) && o.seenSig && o.seenSig === o.lastSig))
    let sums = []
    if (watch.length && document.visibilityState !== 'hidden') {
      try {
        const res = await fetch('/api/pesanan/ringkas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: watch.map((o) => ({ id: o.orderId, k: o.k })) }),
        })
        if (res.ok) sums = (await res.json()).orders || []
      } catch {
        /* jaringan putus: coba lagi putaran berikutnya */
      }
    }
    const byId = new Map(sums.map((s) => [s.orderId, s]))
    const unread = new Set(computeUnread(saved, sums))
    // Pesanan yang baru pertama kali terlihat dianggap sudah dibaca.
    for (const o of saved) {
      const s = byId.get(o.orderId)
      if (s && (!o.seenSig || o.message !== s.message || o.status !== s.status || o.lastSig !== s.sig)) {
        updateSaved(o.orderId, { ...(o.seenSig ? {} : { seenSig: s.sig }), message: s.message, status: s.status, lastSig: s.sig })
      }
    }
    setItems(
      getSavedOrders().map((o) => ({ ...o, unread: unread.has(o.orderId) }))
    )
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 60000)
    const on = () => refresh()
    window.addEventListener('lpi-orders', on)
    document.addEventListener('visibilitychange', on)
    return () => {
      clearInterval(t)
      window.removeEventListener('lpi-orders', on)
      document.removeEventListener('visibilitychange', on)
    }
  }, [refresh])

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!items.length) return null
  const unreadCount = items.filter((i) => i.unread).length

  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-lpi-line bg-white text-lpi" aria-label={unreadCount ? `Pemberitahuan, ${unreadCount} baru` : 'Pemberitahuan pesanan'}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="fixed left-4 right-4 top-[4.75rem] z-50 rounded-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-80 border border-lpi-line bg-white p-2 shadow-xl">
          <p className="px-2 py-1 text-sm font-extrabold">Pesanan Anda</p>
          <ul className="max-h-80 divide-y divide-lpi-line overflow-auto">
            {items.map((o) => (
              <li key={o.orderId} className="flex items-start gap-1">
                <Link href={`/pesanan/${encodeURIComponent(o.orderId)}?k=${o.k}`} onClick={() => setOpen(false)} className="block min-w-0 flex-1 rounded-xl px-2 py-2 hover:bg-lpi-light">
                  <p className="flex items-center gap-2 break-all font-mono text-xs text-lpi-muted">
                    {o.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />}{o.orderId}
                  </p>
                  <p className={`mt-0.5 text-sm ${o.unread ? 'font-extrabold' : ''}`}>{o.message || 'Lihat pesanan'}</p>
                </Link>
                <button type="button" onClick={() => removeSaved(o.orderId)} className="h-11 shrink-0 px-2 text-xs text-lpi-muted underline" aria-label={`Hapus ${o.orderId} dari daftar`}>Hapus</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
