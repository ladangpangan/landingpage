// Panggilan jaringan ke Biteship + pengaturan Biteship (disimpan di dokumen settings, Owner).
import { getDb } from '@/lib/mongo'
import { getLandingSettings } from '@/lib/db'
import { getDeliveryConfig } from '@/lib/delivery'
import { validLatLng } from '@/lib/shipping'
import {
  BITESHIP_BASE, buildRatesBody, parseRates, filterAllowed, ratesCacheKey, originReady, sanitizeBiteshipSettings,
} from '@/lib/biteship'

export async function getBiteshipConfig() {
  const [s, delivery] = await Promise.all([getLandingSettings(), getDeliveryConfig()])
  const origin = s.biteshipOrigin || null
  const warehouse = validLatLng(delivery.warehouse) ? { lat: Number(delivery.warehouse.lat), lng: Number(delivery.warehouse.lng) } : null
  const apiKey = s.biteshipApiKey || ''
  const allowed = Array.isArray(s.biteshipAllowed) ? s.biteshipAllowed : []
  return {
    apiKey,
    enabled: !!s.biteshipEnabled,
    allowed,
    origin,
    warehouse,
    // Siap dipakai pembeli hanya bila semuanya lengkap.
    ready: !!(s.biteshipEnabled && apiKey && allowed.length && warehouse && originReady(origin)),
  }
}

export async function saveBiteshipConfig(input) {
  const db = getDb()
  if (!db) throw new Error('MONGO_URL belum diatur di environment variables.')
  const clean = sanitizeBiteshipSettings(input)
  const set = { updatedAt: new Date().toISOString() }
  if (clean.enabled !== undefined) set.biteshipEnabled = clean.enabled
  if (clean.allowed !== undefined) set.biteshipAllowed = clean.allowed
  if (clean.origin !== undefined) set.biteshipOrigin = clean.origin
  if (typeof input?.apiKey === 'string' && input.apiKey.trim()) set.biteshipApiKey = input.apiKey.trim().slice(0, 300)
  await db.collection('settings').updateOne({ _id: 'landing' }, { $set: set, $setOnInsert: { _id: 'landing' } }, { upsert: true })
}

async function call(cfg, method, path, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(`${BITESHIP_BASE}${path}`, {
      method,
      // Biteship memakai kunci langsung di header Authorization (tanpa "Bearer").
      headers: { Authorization: cfg.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, json }
  } finally {
    clearTimeout(timer)
  }
}

// Ambil tarif semua kurir untuk satu rute. keys = kurir yang diminta (company:type).
export async function fetchRates(cfg, { destination, weightKg, subtotal, keys }) {
  const body = buildRatesBody({ origin: cfg.warehouse, destination, allowedKeys: keys, weightKg, subtotal })
  const r = await call(cfg, 'POST', '/v1/rates/couriers', body)
  if (!r.ok) {
    console.error('[biteship] gagal ambil tarif:', r.status, JSON.stringify(r.json).slice(0, 300))
    throw new Error(`Biteship menolak permintaan tarif (${r.status}).`)
  }
  return parseRates(r.json)
}

// Cache pendek di memori supaya hitungan ulang (ganti voucher dsb.) tidak memanggil Biteship terus.
const cache = new Map()
const TTL_MS = 2 * 60 * 1000

// Mengembalikan opsi kurir yang diizinkan, termurah dulu. Galat jaringan dilempar ke pemanggil.
export async function getAllowedRates(cfg, { destination, weightKg, subtotal }) {
  const key = ratesCacheKey({ origin: cfg.warehouse, destination, allowedKeys: cfg.allowed, weightKg, subtotal })
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.options
  const all = await fetchRates(cfg, { destination, weightKg, subtotal, keys: cfg.allowed })
  const options = filterAllowed(all, cfg.allowed)
  cache.set(key, { at: Date.now(), options })
  if (cache.size > 200) cache.delete(cache.keys().next().value)
  return options
}

// Untuk admin: kurir apa saja yang tersedia dari gudang ke titik uji ±3 km (tanpa filter Owner).
export async function probeCouriers(cfg) {
  if (!cfg.apiKey) throw new Error('API Key Biteship belum diisi.')
  if (!cfg.warehouse) throw new Error('Titik gudang belum diisi di menu Ongkir & Voucher.')
  const dest = { lat: cfg.warehouse.lat + 0.027, lng: cfg.warehouse.lng }
  const all = await fetchRates(cfg, { destination: dest, weightKg: 2, subtotal: 100000, keys: ['gojek:instant', 'grab:instant', 'lalamove:instant', 'borzo:instant', 'paxel:instant'] })
  return all
}
