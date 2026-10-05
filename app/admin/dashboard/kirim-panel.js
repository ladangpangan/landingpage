'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { addDays } from '@/lib/shipping'
import { OrderCard } from './order-ui'

export default function KirimPanel({ today }) {
  const [date, setDate] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/kirim?date=${date}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal memuat daftar kirim.')
      setData(d)
    } catch (e) {
      toast.error(e.message || 'Gagal memuat daftar kirim.')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const total = data ? data.slots.reduce((a, s) => a + s.orders.length, 0) : 0
  const pretty = new Date(`${date}T00:00:00Z`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <button type="button" onClick={() => setDate(addDays(date, -1))} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-lpi-line bg-white" aria-label="Hari sebelumnya"><ChevronLeft className="h-5 w-5" /></button>
        <div className="text-center">
          <p className="text-sm font-bold text-lpi-ink">{pretty}</p>
          {date !== today && <button type="button" onClick={() => setDate(today)} className="text-xs font-semibold text-lpi underline">Kembali ke hari ini</button>}
        </div>
        <button type="button" onClick={() => setDate(addDays(date, 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-lpi-line bg-white" aria-label="Hari berikutnya"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="flex gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-lpi px-4 text-sm font-semibold text-white"><Printer className="h-4 w-4" /> Cetak Daftar Kirim</button>
        {total > 0 && (
          <a href={`/admin/label?date=${date}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-lpi-line bg-white px-4 text-sm font-semibold text-lpi-ink"><Printer className="h-4 w-4" /> Cetak Semua Label</a>
        )}
      </div>
      <h2 className="hidden text-lg font-bold print:block">Daftar Kirim — {pretty}</h2>

      {loading && !data ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-lpi" /></div>
      ) : (
        data?.slots.map((s) => {
          const pct = s.capacityKg ? Math.min(100, Math.round((s.kg / s.capacityKg) * 100)) : 0
          return (
            <section key={s.id} className="space-y-2 break-inside-avoid">
              <div className="rounded-2xl border border-lpi-line bg-lpi-light p-3">
                <div className="flex items-center justify-between text-sm font-bold text-lpi-ink">
                  <span>{s.label} · {s.start}–{s.end}</span>
                  <span>{s.orders.length} pesanan · {s.kg} / {s.capacityKg} kg</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white print:hidden"><div className="h-full bg-lpi" style={{ width: `${pct}%` }} /></div>
              </div>
              {s.orders.length === 0 ? (
                <p className="px-2 text-sm text-lpi-muted">Tidak ada pesanan di jam ini.</p>
              ) : (
                s.orders.map((o, i) => (
                  <div key={o.orderId} className="print:break-inside-avoid">
                    <p className="hidden text-xs font-bold print:block">Antar #{i + 1}</p>
                    <OrderCard order={o} onChanged={load} compact />
                  </div>
                ))
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
