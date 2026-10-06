// iPaymu (pilihan ketiga selain Midtrans dan Mayar). Bagian murni: tanda tangan, bentuk permintaan,
// membaca balasan dan kabar pembayaran. Panggilan jaringan ada di lib/ipaymu-api.js.
//
// Sumber: contoh resmi iPaymu v2 (github ipaymu/ipaymu-payment-v2-sample-php): POST /api/v2/payment,
// header va + signature + timestamp (YmdHis), signature = HMAC-SHA256(API Key,
// "METHOD:VA:sha256(body):APIKey"), balasan memuat SessionID dan Url. Bentuk KABAR pembayaran (notify)
// belum terverifikasi dari dokumentasi resmi: dibaca longgar (trx_id, status "berhasil", status_code,
// reference_id) dan dicatat apa adanya untuk Owner.
import crypto from 'crypto'

export const IPAYMU_BASE = { production: 'https://my.ipaymu.com', sandbox: 'https://sandbox.ipaymu.com' }
export const ipaymuBase = (isProduction) => (isProduction ? IPAYMU_BASE.production : IPAYMU_BASE.sandbox)

// Waktu WIB (UTC+7) berformat YYYYMMDDHHmmss.
export function ipaymuTimestamp(now = new Date()) {
  const w = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const p = (n) => String(n).padStart(2, '0')
  return `${w.getUTCFullYear()}${p(w.getUTCMonth() + 1)}${p(w.getUTCDate())}${p(w.getUTCHours())}${p(w.getUTCMinutes())}${p(w.getUTCSeconds())}`
}

// bodyJson = teks JSON yang PERSIS sama dengan yang dikirim.
export function signRequest({ method, va, apiKey, bodyJson }) {
  const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('hex').toLowerCase()
  const stringToSign = `${String(method).toUpperCase()}:${va}:${bodyHash}:${apiKey}`
  return crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex').toLowerCase()
}

export const placeholderEmail = (orderId) => `${String(orderId).toLowerCase().replace(/[^a-z0-9-]/g, '')}@pesanan.ladangpangan.id`

// Satu baris produk bertotal sama dengan jumlah server (ongkir dan diskon sudah termasuk).
export function buildPaymentBody({ orderId, customer, email, amount, returnUrl, cancelUrl, notifyUrl, expiredHours = 1 }) {
  return {
    product: [`Pesanan ${orderId}`],
    qty: [1],
    price: [amount],
    returnUrl,
    cancelUrl,
    notifyUrl,
    referenceId: orderId,
    buyerName: customer.name,
    buyerPhone: String(customer.phone || '').replace(/[^0-9+]/g, ''),
    buyerEmail: email || placeholderEmail(orderId),
    expired: expiredHours,
    expiredType: 'hours',
  }
}

const str = (...v) => v.find((x) => (typeof x === 'string' && x.trim()) || typeof x === 'number') ?? ''

// Balasan pembuatan pembayaran -> { sessionId, url }
export function extractPayment(resp) {
  const d = resp?.Data || resp?.data || resp || {}
  return { sessionId: String(str(d.SessionID, d.SessionId, d.sessionId)), url: String(str(d.Url, d.url, d.URL)) }
}

// Kabar pembayaran (form atau JSON) -> { trxId, sid, status, statusCode, referenceId, amount }
export function parseNotify(body) {
  const b = body && typeof body === 'object' ? body : {}
  const rawAmount = b.amount ?? b.total ?? b.paid_amount ?? b.gross_amount
  const amount = rawAmount === undefined || rawAmount === null || rawAmount === '' ? null : Number(rawAmount)
  return {
    trxId: String(str(b.trx_id, b.trxId, b.transaction_id)),
    sid: String(str(b.sid, b.session_id, b.SessionID)),
    status: String(str(b.status, b.transaction_status)).toLowerCase(),
    statusCode: String(str(b.status_code, b.statusCode)),
    referenceId: String(str(b.reference_id, b.referenceId)),
    amount: Number.isFinite(amount) ? amount : null,
  }
}

// Dibayar hanya bila jelas ("berhasil" atau kode 1). Bila ragu, tidak dibayar.
export function isPaidNotify({ status, statusCode }) {
  if (/gagal|batal|expire|kadaluarsa|kedaluwarsa|pending|menunggu/.test(status || '')) return false
  return status === 'berhasil' || (status === '' && String(statusCode) === '1')
}

export function isExpiredNotify({ status }) {
  return /expire|kadaluarsa|kedaluwarsa|gagal|batal/.test(status || '')
}

export function verifyNotifyToken(given, expected) {
  if (typeof given !== 'string' || !expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(String(expected))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
