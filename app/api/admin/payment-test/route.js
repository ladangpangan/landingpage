import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getLandingSettings } from '@/lib/db'
import { testMayarConnection } from '@/lib/mayar-api'
import { testIpaymuConnection } from '@/lib/ipaymu-api'

export const dynamic = 'force-dynamic'

// Tes koneksi ke penyedia pembayaran memakai kunci yang SUDAH TERSIMPAN (khusus Owner).
// Tidak membuat tagihan/transaksi dan tidak pernah mengembalikan kunci.
export async function POST(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const body = await request.json().catch(() => ({}))
  const s = await getLandingSettings()
  try {
    if (body?.gateway === 'mayar') {
      return NextResponse.json(await testMayarConnection({ apiKey: s.mayarApiKey || '', isProduction: !!s.mayarIsProduction }))
    }
    if (body?.gateway === 'ipaymu') {
      return NextResponse.json(await testIpaymuConnection({ va: s.ipaymuVa || '', apiKey: s.ipaymuApiKey || '', isProduction: !!s.ipaymuIsProduction }))
    }
    return NextResponse.json({ ok: false, message: 'Tes koneksi tersedia untuk Mayar dan iPaymu.' }, { status: 400 })
  } catch (e) {
    console.error('[payment-test] gagal:', e?.message || e)
    return NextResponse.json({ ok: false, message: 'Tes gagal dijalankan. Coba lagi.' }, { status: 500 })
  }
}
