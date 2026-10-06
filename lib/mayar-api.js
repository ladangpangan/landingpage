// Panggilan jaringan ke Mayar. Kunci diambil dari pengaturan toko (Owner), bukan dari kode.
import { getLandingSettings } from '@/lib/db'
import { mayarBase, extractInvoice, interpretKeyTest } from '@/lib/mayar'

export async function getMayarConfig() {
  const s = await getLandingSettings()
  return {
    gateway: ['mayar', 'ipaymu'].includes(s.paymentGateway) ? s.paymentGateway : 'midtrans',
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

// Tes koneksi: membaca daftar tagihan (tanpa membuat apa pun). Bila ditolak, mencoba mode satunya
// supaya bisa memberi tahu bahwa kunci tertukar mode.
async function probeMayar(apiKey, base) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const get = (path) => fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }, signal: ctrl.signal })
    let res = await get('/hl/v2/invoices?page=1&pageSize=1')
    if (res.status === 404) res = await get('/hl/v1/invoice?page=1&pageSize=1')
    return { status: res.status }
  } catch (e) {
    return { error: e?.name === 'AbortError' ? 'timeout' : 'network' }
  } finally {
    clearTimeout(timer)
  }
}

export async function testMayarConnection(cfg) {
  if (!cfg.apiKey) return { ok: false, message: 'API Key Mayar belum diisi.' }
  const here = await probeMayar(cfg.apiKey, mayarBase(cfg.isProduction))
  const denied = here.status === 401 || here.status === 403
  const other = denied ? await probeMayar(cfg.apiKey, mayarBase(!cfg.isProduction)) : undefined
  return interpretKeyTest({ production: !!cfg.isProduction, here, other })
}
