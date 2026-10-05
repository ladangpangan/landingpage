import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getLandingSettings } from '@/lib/db'
import { listAllBundles, saveBundle, toPublicBundle } from '@/lib/bundles'

// Kelola Paket Hemat / Paket Masak: Owner dan Staf.
async function snapshot() {
  const [bundles, settings] = await Promise.all([listAllBundles(), getLandingSettings()])
  const productsById = new Map(settings.products.map((p) => [p.id, p]))
  return {
    bundles: bundles.map((b) => ({ ...toPublicBundle(b, productsById), active: b.active, rawItems: b.items, erpCode: b.erpCode })),
    // Pilihan produk untuk isi paket.
    products: settings.products.map((p) => ({ id: p.id, name: p.name, unit: p.unit, price: p.price, stock: p.stock ?? null })),
  }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    return NextResponse.json(await snapshot())
  } catch (e) {
    console.error('[bundles] gagal memuat:', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat paket.' }, { status: 500 })
  }
}

// Buat paket baru, atau ubah bila body.id diisi.
export async function POST(request) {
  const { error } = await requireAdmin()
  if (error) return error
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  try {
    const result = await saveBundle(body?.bundle, body?.id ? String(body.id) : undefined)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status || 400 })
    return NextResponse.json(await snapshot())
  } catch (e) {
    console.error('[bundles] gagal menyimpan:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menyimpan paket. Coba lagi.' }, { status: 500 })
  }
}
