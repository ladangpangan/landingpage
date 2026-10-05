import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getBiteshipConfig, saveBiteshipConfig } from '@/lib/biteship-api'

// Biteship memengaruhi biaya dan pengiriman: khusus Owner. Kunci tidak pernah dikirim balik.
async function snapshot() {
  const c = await getBiteshipConfig()
  return {
    enabled: c.enabled,
    allowed: c.allowed,
    origin: c.origin || { contactName: '', contactPhone: '', contactEmail: '', address: '', note: '' },
    hasApiKey: !!c.apiKey,
    apiKeyPreview: c.apiKey ? `••••${c.apiKey.slice(-4)}` : null,
    hasWebhookToken: !!c.webhookToken,
    hasWarehouse: !!c.warehouse,
    ready: c.ready,
  }
}

export async function GET() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  try {
    return NextResponse.json(await snapshot())
  } catch (e) {
    console.error('[biteship] gagal memuat:', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat pengaturan Biteship.' }, { status: 500 })
  }
}

export async function PUT(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  try {
    await saveBiteshipConfig(body || {})
    return NextResponse.json(await snapshot())
  } catch (e) {
    console.error('[biteship] gagal menyimpan:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'Gagal menyimpan.' }, { status: 500 })
  }
}
