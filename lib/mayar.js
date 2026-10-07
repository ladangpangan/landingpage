// Mayar.id (alternatif Midtrans). Bagian murni: bentuk permintaan, membaca
// balasan/webhook, dan pemeriksaan token. Panggilan jaringan ada di lib/mayar-api.js.
//
// Sumber: repositori resmi mayarid/mayar-cli (POST /hl/v2/invoices, Authorization: Bearer,
// sandbox = *.mayar.club) dan SDK Node (header webhook x-callback-token, balasan invoice
// memuat `link`). Bentuk isi webhook BELUM terverifikasi; karena itu pembacaannya sengaja
// longgar dan setiap pemberitahuan dicatat apa adanya untuk dicek pemilik (lihat payment_events).
import crypto from 'crypto'

export const MAYAR_BASE = { production: 'https://api.mayar.id', sandbox: 'https://api.mayar.club' }

export const mayarBase = (isProduction) => (isProduction ? MAYAR_BASE.production : MAYAR_BASE.sandbox)

// Mayar mewajibkan email; pembeli kami tidak mengisi email, jadi dipakai alamat sementara per pesanan.
export const placeholderEmail = (orderId) => `${String(orderId).toLowerCase().replace(/[^a-z0-9-]/g, '')}@pesanan.ladangpangan.id`

export function buildInvoiceBody({ orderId, customer, email, amount, redirectUrl, expiredAt, itemsText }) {
  return {
    name: customer.name,
    email: email || placeholderEmail(orderId),
    mobile: String(customer.phone || '').replace(/[^0-9+]/g, ''),
    redirectUrl,
    description: `Pesanan ${orderId}${itemsText ? ` — ${itemsText}` : ''}`.slice(0, 250),
    expiredAt,
    // Satu baris dengan total akhir: jumlah selalu sama dengan yang dihitung server
    // (ongkir dan diskon sudah termasuk), tanpa baris bernilai negatif.
    items: [{ quantity: 1, rate: amount, description: `Pesanan ${orderId}` }],
  }
}

const pickString = (...vals) => vals.find((v) => typeof v === 'string' && v.trim()) || ''

// Balasan pembuatan invoice -> { id, transactionId, link }
export function extractInvoice(resp) {
  const d = resp?.data && typeof resp.data === 'object' ? resp.data : resp || {}
  return {
    id: pickString(d.id, d.invoiceId),
    transactionId: pickString(d.transactionId, d.transaction_id),
    link: pickString(d.link, d.paymentUrl, d.url),
  }
}

// Isi webhook -> { event, status, amount, ids[] } (semua kandidat id untuk mencocokkan pesanan).
export function parseMayarWebhook(body) {
  const b = body && typeof body === 'object' ? body : {}
  const d = b.data && typeof b.data === 'object' ? b.data : b
  const ids = [d.id, d.transactionId, d.transaction_id, d.invoiceId, d.paymentLinkId, d.paymentLinkTransactionId, b.id]
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => v.trim())
  const rawAmount = d.amount ?? d.total ?? d.grossAmount ?? d.nominal
  const amount = rawAmount === undefined || rawAmount === null || rawAmount === '' ? null : Number(rawAmount)
  return {
    event: pickString(b.event, b.type, b.eventType),
    status: pickString(d.status, d.transactionStatus, b.status),
    amount: Number.isFinite(amount) ? amount : null,
    ids: [...new Set(ids)],
    orderId: pickString(d.orderId, d.order_id, d.extraData?.orderId),
  }
}

const BAD = /fail|gagal|expire|kedaluwarsa|cancel|batal|refund|reject|unpaid|pending|created|open|remind|testing|test/i
// Nama kejadian yang berarti uang MASUK. "payment.reminder" (pengingat tagihan) dan "testing" TIDAK termasuk,
// walaupun status di dalamnya "SUCCESS" (itu status pengiriman kabarnya, bukan status bayar).
const PAID_EVENT = /^payment\.(received|success|paid|completed|settled)$|^(paid|settled|settlement|lunas)$/i
const PAID_STATUS = /^(paid|settled|settlement|lunas|completed|berhasil)$/i

// Apakah pemberitahuan ini berarti SUDAH DIBAYAR? Bila ragu, jawabannya tidak.
// Bila nama kejadian ada, hanya nama kejadian yang menentukan; status "SUCCESS" saja tidak cukup.
export function isPaidEvent({ event, status }) {
  const ev = String(event || '').trim()
  const st = String(status || '').trim()
  if (BAD.test(st) || BAD.test(ev)) return false
  if (ev) return PAID_EVENT.test(ev)
  return PAID_STATUS.test(st)
}

export function isExpiredOrFailedEvent({ event, status }) {
  return /expire|kedaluwarsa|fail|gagal|cancel|batal/i.test(`${event || ''} ${status || ''}`)
}

export function verifyCallbackToken(given, expected) {
  if (typeof given !== 'string' || !expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(String(expected))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Menafsirkan hasil tes koneksi: `here` = jawaban di mode yang dipilih, `other` = jawaban di mode satunya
// (hanya dicoba bila `here` ditolak). Masing-masing { status } atau { error }. Murni agar mudah diuji.
export function interpretKeyTest({ production, here, other }) {
  const mode = (p) => (p ? 'Production (web.mayar.id)' : 'Sandbox (web.mayar.club)')
  if (here?.error) return { ok: false, message: 'Tidak bisa menghubungi penyedia pembayaran dari server. Coba lagi sebentar lagi.' }
  if (here.status >= 200 && here.status < 300) {
    return { ok: true, message: `Kunci diterima di mode ${mode(production)}. Catatan: tes ini membaca saja; pastikan kunci dibuat dengan izin "Read & Write" agar bisa membuat tagihan.` }
  }
  if (here.status === 401 || here.status === 403) {
    if (other && other.status >= 200 && other.status < 300) {
      return { ok: false, message: `Kunci ini milik mode ${mode(!production)}, tetapi saklar Production saat ini ${production ? 'menyala' : 'mati'}. ${production ? 'Matikan' : 'Nyalakan'} saklar Production lalu simpan.` }
    }
    return { ok: false, message: 'Kunci ditolak di kedua mode (Sandbox dan Production). Kunci salah, sudah dibuat ulang/dihapus, atau yang tertempel bukan API Key. Buat kunci baru dengan izin "Read & Write" lalu tempel lagi.' }
  }
  return { ok: false, message: `Penyedia pembayaran menjawab kode ${here.status}; belum bisa dipastikan kunci benar atau salah.` }
}
