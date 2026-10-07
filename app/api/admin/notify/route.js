import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getNotifyAdminView, saveNotifyConfig } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// Pengaturan notifikasi admin (WhatsApp/Telegram): khusus Owner. Token tidak pernah dikembalikan.
export async function GET() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  try {
    return NextResponse.json(await getNotifyAdminView())
  } catch (e) {
    console.error('[admin/notify]', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat pengaturan.' }, { status: 500 })
  }
}

export async function PUT(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const body = await request.json().catch(() => null)
  try {
    const r = await saveNotifyConfig(body)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
    return NextResponse.json(await getNotifyAdminView())
  } catch (e) {
    console.error('[admin/notify]', e?.message || e)
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan.' }, { status: 500 })
  }
}
