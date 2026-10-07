// Notifikasi ke admin lewat bot Telegram (gratis, tanpa verifikasi bisnis). Murni logika (tanpa jaringan/database).
import { shippingSummary, MAX_ADMIN_NUMBERS } from './wa-notify.js'

export const TELEGRAM_BASE = 'https://api.telegram.org'

// "123456, -1001234567890" -> ["123456", "-1001234567890"] (unik, maks 5). Grup memakai angka negatif.
export function parseChatIds(input) {
  const parts = Array.isArray(input) ? input : String(input ?? '').split(/[\n,;\s]+/)
  const out = []
  for (const p of parts) {
    const s = String(p).trim()
    if (/^-?\d{5,20}$/.test(s) && !out.includes(s)) out.push(s)
  }
  return out.slice(0, MAX_ADMIN_NUMBERS)
}

export function sanitizeTelegramConfig(input) {
  if (!input || typeof input !== 'object') return { error: 'Data pengaturan Telegram tidak valid.' }
  const raw = Array.isArray(input.chatIds) ? input.chatIds : String(input.chatIds ?? '').split(/[\n,;\s]+/)
  const given = raw.map((x) => String(x).trim()).filter(Boolean).length
  const chatIds = parseChatIds(raw)
  if (given > chatIds.length && given <= MAX_ADMIN_NUMBERS) return { error: 'Ada Chat ID Telegram yang tidak valid (hanya angka, grup diawali minus).' }
  return { value: { enabled: input.enabled === true, chatIds } }
}

// Token bot dari BotFather: "123456789:AA...". Mengembalikan token rapi atau null.
export function cleanBotToken(v) {
  const t = String(v ?? '').trim()
  return /^\d{6,12}:[A-Za-z0-9_-]{20,60}$/.test(t) ? t : null
}

const rp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`

export function telegramText(kind, order, reason = '') {
  if (kind === 'paid') {
    return [
      '✅ Pesanan baru sudah dibayar',
      `Nomor: ${order.orderId}`,
      `Atas nama: ${order.customer?.name || '-'}`,
      `Total: ${rp(order.grossAmount)}`,
      `Pengiriman: ${shippingSummary(order)}`,
      'Buka admin ladangpangan untuk memproses.',
    ].join('\n')
  }
  if (kind === 'test') return '🔔 Tes notifikasi ladangpangan.id berhasil. Notifikasi pesanan akan datang ke sini.'
  return ['⚠️ Pesanan perlu dicek', `Nomor: ${order.orderId}`, `Keterangan: ${reason || '-'}`, 'Mohon periksa di admin ladangpangan.'].join('\n')
}

export function buildTelegramRequest(chatId, text) {
  return { chat_id: chatId, text: String(text).slice(0, 3500), disable_web_page_preview: true }
}

export function interpretTelegramResponse(status, json) {
  if (status >= 200 && status < 300 && json?.ok) return { ok: true }
  const d = String(json?.description || '').toLowerCase()
  let hint = ''
  if (status === 401) hint = 'Token bot salah. Salin ulang dari BotFather.'
  else if (d.includes('chat not found')) hint = 'Chat ID tidak ditemukan. Kirim pesan apa saja ke bot dulu (atau tambahkan bot ke grup), lalu coba lagi.'
  else if (d.includes('bot was blocked') || d.includes('forbidden')) hint = 'Bot diblokir atau belum boleh mengirim ke chat ini. Buka bot, tekan Start.'
  return { ok: false, error: hint || String(json?.description || '').slice(0, 200) || `Telegram menjawab kode ${status}.` }
}
