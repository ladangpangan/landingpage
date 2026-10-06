// Panggilan jaringan ke iPaymu. Kunci diambil dari pengaturan toko (Owner), bukan dari kode.
import { getLandingSettings } from '@/lib/db'
import { ipaymuBase, ipaymuTimestamp, signRequest, extractPayment, interpretIpaymuTest } from '@/lib/ipaymu'

export async function getIpaymuConfig() {
  const s = await getLandingSettings()
  return {
    va: s.ipaymuVa || '',
    apiKey: s.ipaymuApiKey || '',
    notifyToken: s.ipaymuNotifyToken || '',
    isProduction: !!s.ipaymuIsProduction,
  }
}

// Membuat transaksi (halaman bayar iPaymu). Mengembalikan { sessionId, url }.
export async function createIpaymuPayment(cfg, body) {
  if (!cfg.va || !cfg.apiKey) throw new Error('VA dan API Key iPaymu belum diisi.')
  const bodyJson = JSON.stringify(body)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(`${ipaymuBase(cfg.isProduction)}/api/v2/payment`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        va: cfg.va,
        signature: signRequest({ method: 'POST', va: cfg.va, apiKey: cfg.apiKey, bodyJson }),
        timestamp: ipaymuTimestamp(),
      },
      body: bodyJson,
      signal: ctrl.signal,
    })
    const json = await res.json().catch(() => ({}))
    const pay = extractPayment(json)
    if (!res.ok || !pay.url) {
      console.error('[ipaymu] gagal membuat pembayaran:', res.status, JSON.stringify(json).slice(0, 300))
      throw new Error(`iPaymu menolak pembuatan pembayaran (${res.status}).`)
    }
    return pay
  } finally {
    clearTimeout(timer)
  }
}

// Tes koneksi: cek saldo bertanda tangan (tanpa membuat transaksi). Bila ditolak, mencoba mode satunya.
async function probeIpaymu(cfg, isProduction) {
  const bodyJson = JSON.stringify({ account: cfg.va })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(`${ipaymuBase(isProduction)}/api/v2/balance`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        va: cfg.va,
        signature: signRequest({ method: 'POST', va: cfg.va, apiKey: cfg.apiKey, bodyJson }),
        timestamp: ipaymuTimestamp(),
      },
      body: bodyJson,
      signal: ctrl.signal,
    })
    return { status: res.status }
  } catch (e) {
    return { error: e?.name === 'AbortError' ? 'timeout' : 'network' }
  } finally {
    clearTimeout(timer)
  }
}

export async function testIpaymuConnection(cfg) {
  if (!cfg.va || !cfg.apiKey) return { ok: false, message: 'Nomor VA dan API Key iPaymu belum diisi.' }
  const here = await probeIpaymu(cfg, !!cfg.isProduction)
  const denied = here.status === 401 || here.status === 403
  const other = denied ? await probeIpaymu(cfg, !cfg.isProduction) : undefined
  return interpretIpaymuTest({ production: !!cfg.isProduction, here, other })
}
