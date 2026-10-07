import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { sendTestNotification } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// Kirim pesan tes ke semua saluran yang aktif (memakai pengaturan yang SUDAH tersimpan).
export async function POST() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  try {
    const results = await sendTestNotification()
    return NextResponse.json({ results })
  } catch (e) {
    console.error('[admin/notify/test]', e?.message || e)
    return NextResponse.json({ error: 'Tes gagal dijalankan.' }, { status: 500 })
  }
}
