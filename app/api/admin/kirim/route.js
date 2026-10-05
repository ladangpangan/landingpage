import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { deliveryList } from '@/lib/orders'
import { getDeliveryConfig } from '@/lib/delivery'
import { slotCapacityKg, wibNow } from '@/lib/shipping'

// Daftar kirim kurir untuk satu tanggal, dikelompokkan per slot, lengkap dengan muatan (kg) dan kapasitas.
export async function GET(request) {
  const { error } = await requireAdmin()
  if (error) return error
  const q = new URL(request.url).searchParams.get('date')
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q || '') ? q : wibNow().date
  try {
    const [orders, config] = await Promise.all([deliveryList(date), getDeliveryConfig()])
    const capacityKg = slotCapacityKg(config)
    const slots = config.slots.map((s) => {
      const list = orders.filter((o) => o.delivery?.slotId === s.id)
      return {
        id: s.id,
        label: s.label,
        start: s.start,
        end: s.end,
        kg: Math.round(list.reduce((a, o) => a + (o.weightKg || 0), 0) * 100) / 100,
        capacityKg,
        orders: list,
      }
    })
    return NextResponse.json({ date, slots })
  } catch (e) {
    console.error('[kirim] gagal memuat:', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat daftar kirim.' }, { status: 500 })
  }
}
