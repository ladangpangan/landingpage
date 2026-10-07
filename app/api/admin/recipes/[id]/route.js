import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getLandingSettings } from '@/lib/db'
import { listAllRecipes, saveRecipe, deleteRecipe } from '@/lib/recipes'

async function snapshot() {
  const [recipes, settings] = await Promise.all([listAllRecipes(), getLandingSettings()])
  return { recipes, products: settings.products.map((p) => ({ id: p.id, name: p.name, unit: p.unit, price: p.price })) }
}

export async function PUT(request, { params }) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  const body = await request.json().catch(() => null)
  try {
    const r = await saveRecipe(body, id)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 400 })
    return NextResponse.json(await snapshot())
  } catch (e) {
    console.error('[recipes] gagal menyimpan:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menyimpan resep.' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  try {
    if (!(await deleteRecipe(id))) return NextResponse.json({ error: 'Resep tidak ditemukan.' }, { status: 404 })
    return NextResponse.json(await snapshot())
  } catch (e) {
    console.error('[recipes] gagal menghapus:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menghapus resep.' }, { status: 500 })
  }
}
