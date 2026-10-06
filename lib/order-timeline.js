// Riwayat pesanan & pemberitahuan di aplikasi. Murni logika (tanpa database/browser) supaya mudah diuji.

export const STATUS_EVENT_LABEL = {
  menunggu_bayar: 'Pesanan dibuat, menunggu pembayaran',
  dibayar: 'Pembayaran diterima',
  dikemas: 'Pesanan sedang dikemas',
  dikirim: 'Pesanan sedang diantar',
  diterima: 'Pesanan sudah diterima',
  batal: 'Pesanan dibatalkan',
  gagal: 'Pembayaran gagal',
  kedaluwarsa: 'Waktu pembayaran habis',
}

// Status kurir Biteship -> kalimat untuk pembeli. Status tak dikenal tidak ditampilkan.
export const COURIER_EVENT_LABEL = {
  confirmed: 'Kurir dipesan',
  allocated: 'Kurir sudah ditugaskan',
  picking_up: 'Kurir menuju toko',
  picked: 'Pesanan diambil kurir',
  dropping_off: 'Kurir menuju alamat Anda',
  delivered: 'Pesanan tiba di alamat',
  on_hold: 'Pengiriman tertahan sementara',
  rejected: 'Kurir menolak, kami carikan kurir lain',
  courier_not_found: 'Kurir belum ditemukan, kami carikan lagi',
  cancelled: 'Pengiriman dibatalkan',
  disposed: 'Pengiriman dibatalkan',
  returned: 'Pesanan dikembalikan ke toko',
}

export function courierLabel(status) {
  return COURIER_EVENT_LABEL[String(status || '').toLowerCase()] || ''
}

// Gabungan riwayat status + kejadian kurir, terbaru di atas.
export function buildTimeline({ history = [], courierEvents = [] } = {}) {
  const items = []
  for (const h of history) {
    const label = STATUS_EVENT_LABEL[h.status]
    if (label && h.at) items.push({ kind: 'status', key: `s:${h.status}`, label, at: h.at })
  }
  // Kabar kurir yang datang terlambat setelah pesanan selesai tidak ditampilkan (membingungkan).
  const doneAt = history.find((h) => h.status === 'diterima')?.at
  for (const e of courierEvents) {
    const label = courierLabel(e.status)
    if (doneAt && e.at > doneAt) continue
    if (label && e.at) items.push({ kind: 'kurir', key: `k:${e.status}`, label, at: e.at })
  }
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}

// Tanda singkat keadaan pesanan; berubah bila status atau status kurir berubah.
export function orderSignature(status, courierStatus) {
  return `${status || ''}|${String(courierStatus || '').toLowerCase()}`
}

// Kalimat pemberitahuan terbaru (status kurir lebih rinci bila pesanan sedang dikirim).
export function latestMessage(status, courierStatus) {
  if (status === 'dikirim') return courierLabel(courierStatus) || STATUS_EVENT_LABEL.dikirim
  return STATUS_EVENT_LABEL[status] || ''
}

export const FINAL_STATUSES = ['diterima', 'batal', 'gagal', 'kedaluwarsa']

// saved: [{orderId, k, seenSig}], summaries: [{orderId, sig, status, message}]
// Entri yang baru pertama kali dilihat (seenSig kosong) tidak dihitung sebagai kabar baru.
export function computeUnread(saved, summaries) {
  const byId = new Map(summaries.map((s) => [s.orderId, s]))
  const out = []
  for (const s of saved) {
    const sum = byId.get(s.orderId)
    if (sum && s.seenSig && s.seenSig !== sum.sig) out.push(sum.orderId)
  }
  return out
}
