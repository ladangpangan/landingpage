// Notifikasi ke admin lewat gateway WhatsApp Baileys (TIDAK resmi; wadah `wa-gateway`). Murni logika (tanpa jaringan/database).
import { parseAdminNumbers, MAX_ADMIN_NUMBERS } from './wa-notify.js'
import { telegramText } from './telegram-notify.js'

export const DEFAULT_GATEWAY_URL = 'http://wa-gateway:3100'

// Teks pesan sama dengan Telegram (WhatsApp juga menampilkan emoji dengan baik).
export const baileysText = telegramText

export function sanitizeBaileysConfig(input) {
  if (!input || typeof input !== 'object') return { error: 'Data pengaturan WhatsApp (Baileys) tidak valid.' }
  const raw = Array.isArray(input.adminNumbers) ? input.adminNumbers : String(input.adminNumbers ?? '').split(/[\n,;]+/)
  const given = raw.map((x) => String(x).trim()).filter(Boolean).length
  const adminNumbers = parseAdminNumbers(raw)
  if (given > adminNumbers.length && given <= MAX_ADMIN_NUMBERS) return { error: 'Ada nomor admin (Baileys) yang tidak valid atau kembar. Contoh benar: 0812 3456 7890.' }
  return { value: { enabled: input.enabled === true, adminNumbers } }
}

export function gatewayUrl(env = {}) {
  return String(env.WA_GATEWAY_URL || DEFAULT_GATEWAY_URL).replace(/\/+$/, '')
}

// Balasan gateway /send -> { ok, id } atau { ok:false, error } dengan pesan yang bisa ditindaklanjuti.
export function interpretGatewaySend(status, json, netError) {
  if (netError) return { ok: false, error: 'Gateway WhatsApp tidak bisa dihubungi. Pastikan wadah wa-gateway berjalan.' }
  if (status >= 200 && status < 300 && json?.ok) return { ok: true, id: json.id || null }
  if (status === 401) return { ok: false, error: 'Token gateway tidak cocok. Periksa WA_GATEWAY_TOKEN di server.' }
  if (status === 409 || json?.code === 'not_connected') return { ok: false, error: 'WhatsApp belum tersambung. Scan QR di tab Notifikasi Admin dulu.' }
  if (json?.code === 'not_on_whatsapp') return { ok: false, error: 'Nomor itu tidak terdaftar di WhatsApp.' }
  return { ok: false, error: String(json?.error || '').slice(0, 200) || `Gateway menjawab kode ${status}.` }
}

const STATE_LABEL = {
  starting: 'Memulai…',
  connecting: 'Menyambung…',
  qr: 'Menunggu scan QR',
  open: 'Tersambung',
  logged_out: 'Terputus dari HP, menyiapkan QR baru…',
  unreachable: 'Gateway tidak berjalan',
  unauthorized: 'Token gateway tidak cocok',
}

// Status untuk tampilan admin; QR hanya ikut bila memang sedang diminta.
export function describeGatewayStatus(status, json, netError) {
  if (netError) return { state: 'unreachable', label: STATE_LABEL.unreachable, qrImage: null, me: null, lastError: null }
  if (status === 401) return { state: 'unauthorized', label: STATE_LABEL.unauthorized, qrImage: null, me: null, lastError: null }
  if (status !== 200) return { state: 'unreachable', label: STATE_LABEL.unreachable, qrImage: null, me: null, lastError: `kode ${status}` }
  const state = String(json?.state || 'connecting')
  const qrImage = typeof json?.qrImage === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(json.qrImage) ? json.qrImage : null
  return { state, label: STATE_LABEL[state] || state, qrImage, me: json?.me ? String(json.me).split(':')[0].split('@')[0] : null, lastError: json?.lastError || null }
}
