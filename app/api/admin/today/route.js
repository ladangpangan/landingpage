import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { todaySummary, expireStaleMayarOrders } from '@/lib/orders'
import { getFlatProducts } from '@/lib/catalog'
import { wibNow } from '@/lib/shipping'

// Angka untuk halaman "Hari ini" dan pemeriksaan pesanan baru (dipanggil berkala oleh admin).
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    await expireStaleMayarOrders().catch(() => {})
    const today = wibNow().date
    const [summary, products] = await Promise.all([todaySummary(today), getFlatProducts()])
    const soldOut = products.filter((p) => p.stock === 0).map((p) => p.name)
    const low = products.filter((p) => typeof p.stock === 'number' && p.stock > 0 && p.stock <= 5).map((p) => ({ name: p.name, stock: p.stock }))
    return NextResponse.json({ today, ...summary, soldOut, lowStock: low })
  } catch (e) {
    console.error('[today] gagal memuat:', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat ringkasan.' }, { status: 500 })
  }
}
