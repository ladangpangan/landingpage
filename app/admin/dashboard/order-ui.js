'use client'

import { useState } from 'react'
import { Loader2, MapPin, MessageCircle, Phone, Printer, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'
import { adminNextActions } from '@/lib/order-status'

export const STATUS_LABEL = {
  menunggu_bayar: 'Menunggu Bayar',
  dibayar: 'Dibayar',
  dikemas: 'Dikemas',
  dikirim: 'Dikirim',
  diterima: 'Diterima',
  batal: 'Batal',
  gagal: 'Gagal',
  kedaluwarsa: 'Kedaluwarsa',
}

export const STATUS_CLASS = {
  menunggu_bayar: 'bg-gray-100 text-gray-700 border-gray-300',
  dibayar: 'bg-lpi-light text-lpi border-lpi/30',
  dikemas: 'bg-lpi-light text-lpi border-lpi/30',
  dikirim: 'bg-blue-50 text-blue-700 border-blue-200',
  diterima: 'bg-lpi text-white border-lpi',
  batal: 'bg-gray-100 text-gray-500 border-gray-200',
  gagal: 'bg-red-50 text-red-700 border-red-200',
  kedaluwarsa: 'bg-gray-100 text-gray-500 border-gray-200',
}

const ACTION_LABEL = {
  dikemas: 'Tandai Dikemas',
  dikirim: 'Tandai Dikirim',
  diterima: 'Tandai Diterima',
  batal: 'Batalkan Pesanan',
}

export function StatusBadge({ status }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_CLASS[status] || STATUS_CLASS.menunggu_bayar}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export function OrderCard({ order: o, onChanged, compact = false }) {
  const [busy, setBusy] = useState(false)
  const waDigits = (o.customer?.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '62')
  const actions = adminNextActions(o.status)

  const viaBiteship = o.shipping?.method === 'biteship'
  const canCall = viaBiteship && o.status === 'dikemas' && (!o.courier?.biteshipId || ['rejected', 'courier_not_found', 'cancelled'].includes(o.courier.status))

  async function callCourier() {
    if (!window.confirm('Panggil kurir instan sekarang? Pastikan barang sudah siap dijemput.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(o.orderId)}/kurir`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Gagal memanggil kurir.')
      toast.success('Kurir dipanggil. Pantau statusnya di kartu pesanan.')
    } catch (e) {
      toast.error(e.message || 'Gagal memanggil kurir.')
    } finally {
      setBusy(false)
      onChanged?.()
    }
  }

  async function setStatus(to) {
    if (to === 'batal' && !window.confirm('Batalkan pesanan ini? Stok yang ditahan akan dikembalikan.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(o.orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status.')
      toast.success(`Status menjadi ${STATUS_LABEL[to]}.`)
      onChanged?.()
    } catch (e) {
      toast.error(e.message || 'Gagal mengubah status.')
      onChanged?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-lpi-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-lpi-muted">{o.orderId}</p>
          <p className="text-sm text-lpi-muted">{o.createdAt ? new Date(o.createdAt).toLocaleString('id-ID') : '-'}</p>
        </div>
        <div className="flex items-center gap-2">
          {o.needsReview && <span className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Perlu dicek</span>}
          <StatusBadge status={o.status} />
        </div>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 text-sm text-lpi-muted">
          <p className="font-semibold text-lpi-ink">{o.customer?.name}</p>
          <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" /> {o.customer?.phone}</p>
          <p className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {o.customer?.address}</p>
          {o.delivery && (
            <div className="mt-1.5 space-y-0.5 rounded-xl border border-lpi-line bg-lpi-bg px-3 py-2 text-xs text-lpi-ink">
              <p className="font-semibold">
                {o.delivery.mode === 'biteship'
                  ? `Kurir instan Biteship: ${o.delivery.slotLabel}`
                  : `Kirim ${o.delivery.mode === 'sekarang' ? 'hari ini' : 'terjadwal'}: ${o.delivery.date} · ${o.delivery.slotLabel} (${o.delivery.start}–${o.delivery.end})`}
              </p>
              {o.location && (
                <p>
                  {o.location.zoneName}{o.location.distanceKm != null ? ` · ±${o.location.distanceKm} km` : ''} ·{' '}
                  <a href={`https://www.google.com/maps?q=${o.location.lat},${o.location.lng}`} target="_blank" rel="noopener noreferrer" className="font-medium text-lpi underline">
                    Lihat di peta
                  </a>
                </p>
              )}
              {o.weightKg != null && <p>Berat ±{o.weightKg} kg</p>}
              {o.customer?.note && <p>Catatan: {o.customer.note}</p>}
            </div>
          )}
          {waDigits && (
            <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-lpi-light px-3 py-1.5 text-xs font-semibold text-lpi">
              <MessageCircle className="h-3.5 w-3.5" /> Hubungi via WhatsApp
            </a>
          )}
        </div>
        <div>
          <ul className="space-y-1">
            {(o.items || []).map((it, i) => (
              <li key={i} className="flex justify-between gap-2 text-sm text-lpi-ink">
                <span className="truncate">{it.qty}x {it.name}</span>
                <span className="shrink-0">{formatIDR(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
          {!compact && o.pricing && (
            <div className="mt-2 space-y-0.5 border-t border-dashed border-lpi-line pt-2 text-xs text-lpi-muted">
              {o.pricing.discountShop > 0 && (
                <p className="flex justify-between"><span>Diskon {o.pricing.voucherCode}</span><span>− {formatIDR(o.pricing.discountShop)}</span></p>
              )}
              <p className="flex justify-between"><span>Ongkir</span><span>{o.pricing.shippingFee === 0 ? 'Gratis' : formatIDR(o.pricing.shippingFee)}</span></p>
              {o.pricing.shippingDiscount > 0 && (
                <p className="flex justify-between"><span>Diskon ongkir {o.pricing.voucherCode}</span><span>− {formatIDR(o.pricing.shippingDiscount)}</span></p>
              )}
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-dashed border-lpi-line pt-2 text-sm font-semibold text-lpi-ink">
            <span>Total</span>
            <span className="text-lpi">{formatIDR(o.grossAmount)}</span>
          </div>
        </div>
      </div>

      {viaBiteship && o.courier?.biteshipId && (
        <div className="mt-3 space-y-0.5 rounded-xl border border-lpi-line bg-lpi-light px-3 py-2 text-xs text-lpi-ink">
          <p className="flex items-center gap-1.5 font-semibold"><Truck className="h-3.5 w-3.5" /> Kurir: {o.shipping?.courier?.name} {o.shipping?.courier?.serviceName} · status {o.courier.status || '-'}</p>
          {o.courier.waybillId && <p>Resi: {o.courier.waybillId}</p>}
          {o.courier.driverName && <p>Pengemudi: {o.courier.driverName} {o.courier.driverPhone}</p>}
          {o.courier.price != null && <p>Biaya kurir: {formatIDR(o.courier.price)} (ongkir dibayar pembeli {formatIDR(o.pricing?.shippingFee || 0)})</p>}
          {o.courier.link && <a href={o.courier.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-lpi underline">Lacak kurir</a>}
        </div>
      )}

      {(actions.length > 0 || canCall || ['dibayar', 'dikemas', 'dikirim'].includes(o.status)) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-lpi-line pt-3 print:hidden">
          {canCall && (
            <button type="button" disabled={busy} onClick={callCourier} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lpi px-4 text-sm font-semibold text-white hover:bg-lpi-dark disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />} Panggil Kurir
            </button>
          )}
          {actions.map((to) => (
            <button
              key={to}
              type="button"
              disabled={busy}
              onClick={() => setStatus(to)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60 ${
                to === 'batal' ? 'border border-red-300 bg-white text-red-700' : 'bg-lpi text-white hover:bg-lpi-dark'
              }`}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {ACTION_LABEL[to]}
            </button>
          ))}
          {['dibayar', 'dikemas', 'dikirim'].includes(o.status) && (
            <a
              href={`/admin/label?id=${encodeURIComponent(o.orderId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-lpi-line bg-white px-4 text-sm font-semibold text-lpi-ink"
            >
              <Printer className="h-4 w-4" /> Cetak Label
            </a>
          )}
        </div>
      )}
    </div>
  )
}
