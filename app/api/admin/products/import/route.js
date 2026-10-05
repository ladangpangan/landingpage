import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getFlatProducts, saveFlatProducts } from '@/lib/catalog'
import { parseCsv, rowsToItems, planImport, MAX_ROWS } from '@/lib/product-import'

// Impor produk dari CSV. { csv, apply }: tanpa apply = hanya periksa (pratinjau).
export async function POST(request) {
  const { error } = await requireAdmin()
  if (error) return error
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  const csv = String(body?.csv || '')
  if (csv.length > 2_000_000) return NextResponse.json({ error: 'Berkas terlalu besar.' }, { status: 413 })
  const rows = parseCsv(csv)
  if (rows.length - 1 > MAX_ROWS) return NextResponse.json({ error: `Maksimal ${MAX_ROWS} baris sekali impor.` }, { status: 400 })
  const parsed = rowsToItems(rows)
  if (parsed.headerError) return NextResponse.json({ error: parsed.headerError }, { status: 400 })
  try {
    const existing = await getFlatProducts()
    const plan = planImport(parsed.items, existing)
    const errors = [...parsed.errors, ...plan.errors].sort((a, b) => a.line - b.line)
    const summary = { creates: plan.creates, updates: plan.updates, errors }
    if (!body?.apply) return NextResponse.json({ ...summary, applied: false })
    if (!plan.creates.length && !plan.updates.length) {
      return NextResponse.json({ error: 'Tidak ada baris yang bisa diimpor.', ...summary }, { status: 400 })
    }
    await saveFlatProducts(plan.merged)
    return NextResponse.json({ ...summary, applied: true })
  } catch (e) {
    console.error('[import] gagal:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Gagal mengimpor.' }, { status: 500 })
  }
}
