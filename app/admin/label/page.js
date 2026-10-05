import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getOrdersByIds, deliveryList } from '@/lib/orders'
import { formatIDR } from '@/lib/format'
import PrintButton from './print-button'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Label Pengiriman' }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Label pengiriman untuk ditempel di kantong: satu pesanan (?id=) atau semua pesanan satu hari (?date=).
export default async function LabelPage({ searchParams }) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin')
  const sp = await searchParams
  let orders = []
  if (sp?.id) orders = await getOrdersByIds([String(sp.id)])
  else if (DATE_RE.test(sp?.date || '')) {
    orders = (await deliveryList(sp.date)).filter((o) => ['dibayar', 'dikemas', 'dikirim'].includes(o.status))
    orders.sort((a, b) => (a.delivery?.start || '').localeCompare(b.delivery?.start || ''))
  }

  return (
    <div className="min-h-screen bg-lpi-bg p-4 print:bg-white print:p-0">
      <style>{`@page { size: 100mm 150mm; margin: 4mm } @media print { body { background: #fff } }`}</style>
      <div className="mx-auto mb-4 flex max-w-sm items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-lpi-muted">{orders.length} label</p>
        <PrintButton />
      </div>
      {orders.length === 0 && <p className="text-center text-sm text-lpi-muted print:hidden">Tidak ada pesanan untuk dicetak.</p>}
      <div className="mx-auto max-w-sm space-y-4 print:max-w-none print:space-y-0">
        {orders.map((o) => (
          <div key={o.orderId} className="space-y-2 rounded-xl border-2 border-black bg-white p-3 text-sm text-black print:break-after-page print:rounded-none print:border-0">
            <div className="flex items-start justify-between gap-2 border-b border-black pb-2">
              <div>
                <p className="text-xs font-bold">LADANG PANGAN INDONESIA</p>
                <p className="font-mono text-xs">{o.orderId}</p>
              </div>
              <p className="text-right text-xs font-bold">
                {o.delivery?.date}<br />{o.delivery?.slotLabel} {o.delivery?.start}–{o.delivery?.end}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase">Kepada</p>
              <p className="text-lg font-extrabold leading-tight">{o.customer.name}</p>
              <p className="font-bold">{o.customer.phone}</p>
              <p className="mt-1">{o.customer.address}</p>
              {o.customer.note && <p className="mt-1 italic">Catatan: {o.customer.note}</p>}
              {o.location && <p className="mt-1 text-xs">{o.location.zoneName}{o.location.distanceKm != null ? ` · ±${o.location.distanceKm} km` : ""}</p>}
            </div>
            <div className="border-t border-dashed border-black pt-2">
              <ul className="space-y-0.5">
                {o.items.map((it, i) => <li key={i}>{it.qty}x {it.name}</li>)}
              </ul>
              <p className="mt-1 text-xs">Berat ±{o.weightKg ?? '-'} kg · Total {formatIDR(o.grossAmount)} (sudah dibayar)</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
