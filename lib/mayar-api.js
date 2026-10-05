// Panggilan jaringan ke Mayar. Kunci diambil dari pengaturan toko (Owner), bukan dari kode.
import { getLandingSettings } from '@/lib/db'
import { mayarBase, extractInvoice } from '@/lib/mayar'

export async function getMayarConfig() {
  const s = await getLandingSettings()
  return {
    gateway: s.paymentGateway === 'mayar' ? 'mayar' : 'midtrans',
    apiKey: s.mayarApiKey || '',
    webhookToken: s.mayarWebhookToken || '',
    isProduction: !!s.mayarIsProduction,
  }
}

async function call(cfg, method, path, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(`${mayarBase(cfg.isProduction)}${path}`, {
      method,
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, json }
  } finally {
    clearTimeout(timer)
  }
}

// Membuat tagihan. Mencoba jalur v2 (repo resmi); bila 404 mencoba jalur v1 (dokumentasi lama).
export async function createMayarInvoice(cfg, body) {
  if (!cfg.apiKey) throw new Error('Kunci API Mayar belum diisi.')
  let r = await call(cfg, 'POST', '/hl/v2/invoices', body)
  if (r.status === 404) r = await call(cfg, 'POST', '/hl/v1/invoice/create', body)
  if (!r.ok) {
    console.error('[mayar] gagal membuat invoice:', r.status, JSON.stringify(r.json).slice(0, 300))
    throw new Error(`Mayar menolak pembuatan tagihan (${r.status}).`)
  }
  const inv = extractInvoice(r.json)
  if (!inv.link) {
    console.error('[mayar] balasan tanpa link pembayaran:', JSON.stringify(r.json).slice(0, 300))
    throw new Error('Mayar tidak mengembalikan tautan pembayaran.')
  }
  return inv
}

// Menutup tagihan yang belum dibayar (upaya terbaik; pemanggil mengabaikan kegagalan).
export async function closeMayarInvoice(cfg, invoiceId) {
  if (!cfg.apiKey || !invoiceId) return
  const r = await call(cfg, 'POST', `/hl/v2/invoices/${encodeURIComponent(invoiceId)}/close`)
  if (!r.ok) throw new Error(`Mayar tidak menutup tagihan (${r.status}).`)
}
