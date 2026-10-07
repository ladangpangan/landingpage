// Notifikasi ke admin: WhatsApp Cloud API (resmi, Meta) dan/atau bot Telegram. Konfigurasi di koleksi notify_settings
// (_id 'default'); token TIDAK pernah dikembalikan ke browser. Hitungan murni ada di lib/wa-notify.js dan lib/telegram-notify.js.
import { getDb } from '@/lib/mongo'
import {
  DEFAULT_WA_CONFIG, sanitizeWaConfig, buildNotification, buildTemplateRequest, interpretSendResponse, GRAPH_BASE,
} from '@/lib/wa-notify'
import {
  sanitizeTelegramConfig, cleanBotToken, telegramText, buildTelegramRequest, interpretTelegramResponse, TELEGRAM_BASE,
} from '@/lib/telegram-notify'
import { sanitizeBaileysConfig, baileysText, gatewayUrl, interpretGatewaySend, describeGatewayStatus } from '@/lib/baileys-notify'
import { logPaymentEvent } from '@/lib/orders'

function db() {
  const d = getDb()
  if (!d) throw new Error('Database belum tersambung (MONGO_URL).')
  return d
}

const preview = (t) => (t ? `••••${String(t).slice(-4)}` : null)

// Konfigurasi lengkap (termasuk token) untuk dipakai server.
export async function getNotifyConfig() {
  const doc = (await db().collection('notify_settings').findOne({ _id: 'default' })) || {}
  return {
    wa: { ...DEFAULT_WA_CONFIG, ...(doc.wa || {}), token: doc.wa?.token || '' },
    telegram: { enabled: false, chatIds: [], ...(doc.telegram || {}), token: doc.telegram?.token || '' },
    baileys: { enabled: false, adminNumbers: [], ...(doc.baileys || {}) },
  }
}

// Bentuk aman untuk admin: tanpa token mentah.
export async function getNotifyAdminView() {
  const c = await getNotifyConfig()
  return {
    wa: { enabled: !!c.wa.enabled, phoneNumberId: c.wa.phoneNumberId, adminNumbers: c.wa.adminNumbers, templatePaid: c.wa.templatePaid, templateReview: c.wa.templateReview, language: c.wa.language, hasToken: !!c.wa.token, tokenPreview: preview(c.wa.token) },
    telegram: { enabled: !!c.telegram.enabled, chatIds: c.telegram.chatIds, hasToken: !!c.telegram.token, tokenPreview: preview(c.telegram.token) },
    baileys: { enabled: !!c.baileys.enabled, adminNumbers: c.baileys.adminNumbers, gatewayConfigured: !!process.env.WA_GATEWAY_TOKEN },
  }
}

// Simpan: token kosong = pertahankan yang lama. { ok } atau { ok:false, error }.
export async function saveNotifyConfig(input) {
  const cur = await getNotifyConfig()
  const wa = sanitizeWaConfig(input?.wa || {})
  if (wa.error) return { ok: false, error: wa.error }
  const tg = sanitizeTelegramConfig(input?.telegram || {})
  if (tg.error) return { ok: false, error: tg.error }
  let waToken = cur.wa.token
  const newWaToken = String(input?.wa?.token ?? '').trim()
  if (newWaToken) {
    if (!/^[A-Za-z0-9_-]{30,600}$/.test(newWaToken)) return { ok: false, error: 'Token WhatsApp tidak tampak valid. Salin ulang token tetap dari pengguna sistem Meta.' }
    waToken = newWaToken
  }
  let tgToken = cur.telegram.token
  const newTgToken = String(input?.telegram?.token ?? '').trim()
  if (newTgToken) {
    const t = cleanBotToken(newTgToken)
    if (!t) return { ok: false, error: 'Token bot Telegram tidak tampak valid. Salin ulang dari BotFather.' }
    tgToken = t
  }
  const bl = sanitizeBaileysConfig(input?.baileys || {})
  if (bl.error) return { ok: false, error: bl.error }
  if (bl.value.enabled && !process.env.WA_GATEWAY_TOKEN) return { ok: false, error: 'Gateway WhatsApp (Baileys) belum dipasang di server (WA_GATEWAY_TOKEN kosong).' }
  if (bl.value.enabled && bl.value.adminNumbers.length === 0) return { ok: false, error: 'Untuk mengaktifkan WhatsApp (Baileys) isi minimal satu nomor admin.' }
  if (wa.value.enabled && (!waToken || !wa.value.phoneNumberId || wa.value.adminNumbers.length === 0)) return { ok: false, error: 'Untuk mengaktifkan WhatsApp isi Phone number ID, token, dan minimal satu nomor admin.' }
  if (tg.value.enabled && (!tgToken || tg.value.chatIds.length === 0)) return { ok: false, error: 'Untuk mengaktifkan Telegram isi token bot dan minimal satu Chat ID.' }
  await db().collection('notify_settings').updateOne(
    { _id: 'default' },
    { $set: { wa: { ...wa.value, token: waToken }, telegram: { ...tg.value, token: tgToken }, baileys: bl.value, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )
  return { ok: true }
}

async function post(url, headers, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctrl.signal })
    return { status: res.status, json: await res.json().catch(() => ({})) }
  } catch (e) {
    return { status: 0, json: {}, netError: e?.name === 'AbortError' ? 'timeout' : 'jaringan' }
  } finally {
    clearTimeout(timer)
  }
}

export async function sendWhatsApp(wa, to, template, params) {
  const r = await post(`${GRAPH_BASE}/${wa.phoneNumberId}/messages`, { Authorization: `Bearer ${wa.token}` }, buildTemplateRequest({ to, template, language: wa.language, params }))
  if (r.netError) return { ok: false, error: `Tidak bisa menghubungi Meta (${r.netError}).` }
  return interpretSendResponse(r.status, r.json)
}

export async function sendTelegram(tg, chatId, text) {
  const r = await post(`${TELEGRAM_BASE}/bot${tg.token}/sendMessage`, {}, buildTelegramRequest(chatId, text))
  if (r.netError) return { ok: false, error: `Tidak bisa menghubungi Telegram (${r.netError}).` }
  return interpretTelegramResponse(r.status, r.json)
}

async function gatewayFetch(path, method, body) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)
  try {
    const res = await fetch(`${gatewayUrl(process.env)}${path}`, {
      method,
      headers: { Authorization: `Bearer ${process.env.WA_GATEWAY_TOKEN || ''}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    return { status: res.status, json: await res.json().catch(() => ({})) }
  } catch (e) {
    return { status: 0, json: {}, netError: e?.name === 'AbortError' ? 'timeout' : 'jaringan' }
  } finally {
    clearTimeout(timer)
  }
}

export async function sendBaileys(to, text) {
  const r = await gatewayFetch('/send', 'POST', { to, text })
  return interpretGatewaySend(r.status, r.json, r.netError)
}

// Status gateway untuk admin (termasuk gambar QR bila sedang menunggu scan).
export async function getBaileysStatus() {
  if (!process.env.WA_GATEWAY_TOKEN) return { state: 'not_installed', label: 'Gateway belum dipasang di server', qrImage: null, me: null, lastError: null }
  const r = await gatewayFetch('/status', 'GET')
  return describeGatewayStatus(r.status, r.json, r.netError)
}

export async function logoutBaileys() {
  const r = await gatewayFetch('/logout', 'POST', {})
  return r.status === 200
}

// Kirim satu jenis kabar ke semua saluran yang aktif. Tidak pernah melempar galat; hasil dicatat untuk Owner.
async function deliver(kind, order, reason, cfg) {
  const results = []
  if (cfg.wa.enabled && cfg.wa.token && cfg.wa.phoneNumberId) {
    const n = buildNotification(kind === 'test' ? 'paid' : kind, order, cfg.wa, reason)
    for (const to of cfg.wa.adminNumbers) results.push({ channel: 'whatsapp', to: `…${to.slice(-4)}`, ...(await sendWhatsApp(cfg.wa, to, n.template, n.params)) })
  }
  if (cfg.telegram.enabled && cfg.telegram.token) {
    const text = telegramText(kind, order, reason)
    for (const chat of cfg.telegram.chatIds) results.push({ channel: 'telegram', to: `…${chat.slice(-4)}`, ...(await sendTelegram(cfg.telegram, chat, text)) })
  }
  if (cfg.baileys.enabled && process.env.WA_GATEWAY_TOKEN) {
    const text = baileysText(kind, order, reason)
    for (const to of cfg.baileys.adminNumbers) results.push({ channel: 'baileys', to: `…${to.slice(-4)}`, ...(await sendBaileys(to, text)) })
  }
  return results
}

export async function sendTestNotification() {
  const cfg = await getNotifyConfig()
  const order = { orderId: 'LPI-TES-0001', customer: { name: 'Tes Notifikasi' }, grossAmount: 72000, shipping: { method: 'internal' }, delivery: { mode: 'sekarang', slotLabel: 'Siang' } }
  const results = await deliver('test', order, '', cfg)
  await logPaymentEvent('notifikasi', { kind: 'test', results }, results.length ? (results.every((r) => r.ok) ? 'terkirim' : 'sebagian-gagal') : 'tidak-aktif')
  return results
}

// kind: 'paid' (sekali per pesanan) | 'review' (sekali per pesanan dan alasan). Aman dipanggil tanpa await.
export async function notifyOrder(orderId, kind, reason = '') {
  try {
    const d = db()
    const cfg = await getNotifyConfig()
    if (!(cfg.wa.enabled || cfg.telegram.enabled || cfg.baileys.enabled)) return
    const oc = d.collection('orders')
    const order = await oc.findOne({ orderId })
    if (!order) return
    // Penjaga duplikat: satu kabar per (pesanan, jenis, alasan).
    const key = kind === 'paid' ? 'paid' : `review:${reason}`
    const claimed = await oc.updateOne({ orderId, notified: { $ne: key } }, { $push: { notified: key } })
    if (!claimed.modifiedCount) return
    const results = await deliver(kind, order, reason, cfg)
    await logPaymentEvent('notifikasi', { orderId, kind, reason, results }, results.every((r) => r.ok) ? 'terkirim' : 'sebagian-gagal')
  } catch (e) {
    console.error('[notify] gagal mengirim notifikasi:', e?.message || e)
  }
}
