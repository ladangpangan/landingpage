// Notifikasi WhatsApp ke admin lewat WhatsApp Cloud API resmi (Meta). Murni logika (tanpa jaringan/database).
// Pesan ke admin di luar jendela 24 jam WAJIB memakai templat yang sudah disetujui Meta; urutan isian ({{1}}, {{2}}, ...)
// di sini harus sama dengan templat yang dibuat pemilik.
import { normalizePhone } from './order-access.js'

export const DEFAULT_WA_CONFIG = {
  enabled: false,
  phoneNumberId: '',
  adminNumbers: [],
  templatePaid: 'pesanan_dibayar',
  templateReview: 'pesanan_perlu_dicek',
  language: 'id',
}

export const MAX_ADMIN_NUMBERS = 5

// "0812-1111, 0813 2222\n+62 814..." -> ["62812...", ...] (unik, maks 5, hanya yang tampak sah)
export function parseAdminNumbers(input) {
  const parts = Array.isArray(input) ? input : String(input ?? '').split(/[\n,;]+/)
  const out = []
  for (const p of parts) {
    const n = normalizePhone(p)
    if (/^62\d{8,13}$/.test(n) && !out.includes(n)) out.push(n)
  }
  return out.slice(0, MAX_ADMIN_NUMBERS)
}

// Pengaturan dari admin. { value } atau { error }. phoneNumberId hanya angka; nama templat huruf kecil/angka/_.
export function sanitizeWaConfig(input) {
  if (!input || typeof input !== 'object') return { error: 'Data pengaturan tidak valid.' }
  const phoneNumberId = String(input.phoneNumberId ?? '').trim()
  if (phoneNumberId && !/^\d{5,25}$/.test(phoneNumberId)) return { error: 'Phone number ID hanya berisi angka (5–25 digit).' }
  const tpl = (v, fallback) => {
    const t = String(v ?? '').trim() || fallback
    return /^[a-z0-9_]{1,512}$/.test(t) ? t : null
  }
  const templatePaid = tpl(input.templatePaid, DEFAULT_WA_CONFIG.templatePaid)
  const templateReview = tpl(input.templateReview, DEFAULT_WA_CONFIG.templateReview)
  if (!templatePaid || !templateReview) return { error: 'Nama templat hanya huruf kecil, angka, dan garis bawah (_).' }
  const language = String(input.language ?? '').trim() || DEFAULT_WA_CONFIG.language
  if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(language)) return { error: 'Kode bahasa templat tidak valid (contoh: id).' }
  const raw = Array.isArray(input.adminNumbers) ? input.adminNumbers : String(input.adminNumbers ?? '').split(/[\n,;]+/)
  const adminNumbers = parseAdminNumbers(raw)
  const given = raw.map((x) => String(x).trim()).filter(Boolean).length
  if (given > adminNumbers.length && given <= MAX_ADMIN_NUMBERS) return { error: 'Ada nomor admin yang tidak valid atau kembar. Contoh benar: 0812 3456 7890.' }
  return { value: { enabled: input.enabled === true, phoneNumberId, adminNumbers, templatePaid, templateReview, language } }
}

// Meta menolak isian dengan baris baru/tab dan lebih dari 4 spasi beruntun; potong agar tidak terlalu panjang.
export function cleanParam(v, max = 120) {
  const s = String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, max)
  return s || '-'
}

const rp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`

// Ringkas cara kirim pesanan untuk templat.
export function shippingSummary(order) {
  const ship = order?.shipping || {}
  if (ship.method === 'biteship') return `Kurir instan ${ship.courier?.name || ''} ${ship.courier?.serviceName || ''}`.trim()
  const d = order?.delivery
  if (d?.mode === 'sekarang') return `Kurir toko, hari ini ${d.slotLabel || ''}`.trim()
  if (d?.date) return `Kurir toko, ${d.date} ${d.slotLabel || ''}`.trim()
  return 'Kurir toko'
}

// kind: 'paid' | 'review'. Mengembalikan { template, params } sesuai urutan isian templat.
export function buildNotification(kind, order, cfg, reason = '') {
  if (kind === 'paid') {
    return {
      template: cfg.templatePaid,
      params: [order.orderId, order.customer?.name, rp(order.grossAmount), shippingSummary(order)].map((x) => cleanParam(x)),
    }
  }
  return { template: cfg.templateReview, params: [order.orderId, reason].map((x) => cleanParam(x, 160)) }
}

// Isi permintaan ke Graph API untuk satu penerima.
export function buildTemplateRequest({ to, template, language, params }) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: template,
      language: { code: language },
      components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
    },
  }
}

// Balasan Graph API -> { ok, id } atau { ok:false, error } (pesan ramah untuk kesalahan yang umum).
export function interpretSendResponse(status, json) {
  if (status >= 200 && status < 300 && json?.messages?.[0]?.id) return { ok: true, id: String(json.messages[0].id) }
  const code = json?.error?.code
  const raw = String(json?.error?.message || '').slice(0, 200)
  let hint = ''
  if (status === 401 || code === 190) hint = 'Token ditolak atau kedaluwarsa. Buat token tetap (pengguna sistem) lalu simpan ulang.'
  else if (code === 132001) hint = 'Templat tidak ditemukan atau belum disetujui. Periksa nama templat dan bahasanya.'
  else if (code === 132000 || code === 132012) hint = 'Jumlah/isian templat tidak sesuai. Samakan isi templat dengan yang diminta aplikasi.'
  else if (code === 131030) hint = 'Nomor penerima belum terdaftar sebagai penerima uji. Tambahkan di daftar penerima Meta (nomor uji).'
  else if (code === 131042) hint = 'Metode pembayaran Meta belum diisi.'
  else if (code === 100) hint = 'Phone number ID salah, atau token tidak punya akses ke nomor ini.'
  return { ok: false, error: hint || raw || `Meta menjawab kode ${status}.` }
}

export const GRAPH_BASE = 'https://graph.facebook.com/v21.0'
