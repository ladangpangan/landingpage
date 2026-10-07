import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getLandingSettings } from '@/lib/db'
import { listAllRecipes, saveRecipe } from '@/lib/recipes'

export const dynamic = 'force-dynamic'

// Kelola inspirasi menu (resep): Owner dan Staf.
async function snapshot() {
  const [recipes, settings] = await Promise.all([listAllRecipes(), getLandingSettings()])
  return {
    recipes,
    // Pilihan produk untuk bahan dari toko.
    products: settings.products.map((p) => ({ id: p.id, name: p.name, unit: p.unit, price: p.price })),
  }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  try {
    return NextResponse.json(await snapshot())
  } catch (e) {
    console.error('[recipes] gagal memuat:', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat resep.' }, { status: 500 })
  }
}

export async function POST(request) {
  const { error } = await requireAdmin()
  if (error) return error
  const body = await request.json().catch(() => null)
  try {
    const r = await saveRecipe(body)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 400 })
    return NextResponse.json(await snapshot())
  } catch (e) {
    console.error('[recipes] gagal menyimpan:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menyimpan resep.' }, { status: 500 })
  }
}
