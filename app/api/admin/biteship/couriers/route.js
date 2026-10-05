import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getBiteshipConfig, probeCouriers } from '@/lib/biteship-api'

// Memeriksa kurir yang tersedia (gudang -> titik uji ±3 km) supaya Owner bisa memilih mana yang dinyalakan.
export async function POST() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  try {
    const cfg = await getBiteshipConfig()
    const options = await probeCouriers(cfg)
    return NextResponse.json({
      options: options.map((o) => ({ key: o.key, name: o.name, serviceName: o.serviceName, price: o.price, duration: o.duration })),
    })
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Gagal memeriksa kurir.' }, { status: 400 })
  }
}
