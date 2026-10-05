// Aturan status pesanan. Murni logika (tanpa database) supaya mudah diuji.
// Status hanya boleh maju satu langkah; tidak boleh mundur.
export const ORDER_STATUSES = [
  'menunggu_bayar',
  'dibayar',
  'dikemas',
  'dikirim',
  'diterima',
  'batal',
  'gagal',
  'kedaluwarsa',
]

const NEXT = {
  menunggu_bayar: ['dibayar', 'batal', 'gagal', 'kedaluwarsa'],
  dibayar: ['dikemas'],
  dikemas: ['dikirim'],
  dikirim: ['diterima'],
  diterima: [],
  batal: [],
  gagal: [],
  kedaluwarsa: [],
}

// Nama status lama (sebelum Tahap 1) -> nama baru.
const LEGACY = {
  pending: 'menunggu_bayar',
  paid: 'dibayar',
  failed: 'gagal',
  cancelled: 'batal',
  expired: 'kedaluwarsa',
  refunded: 'batal',
}

export function normalizeStatus(status) {
  if (ORDER_STATUSES.includes(status)) return status
  return LEGACY[status] || 'menunggu_bayar'
}

export function canTransition(from, to) {
  return (NEXT[from] || []).includes(to)
}

export function nextStatuses(from) {
  return NEXT[from] || []
}

// Status transaksi Midtrans -> status pesanan yang dituju (atau null jika
// tidak mengubah status, misalnya refund).
export function targetStatusFromMidtrans(transactionStatus, fraudStatus) {
  switch (transactionStatus) {
    case 'capture':
      return fraudStatus === 'challenge' ? null : 'dibayar'
    case 'settlement':
      return 'dibayar'
    case 'deny':
      return 'gagal'
    case 'cancel':
      return 'batal'
    case 'expire':
      return 'kedaluwarsa'
    default:
      return null
  }
}

// Status yang boleh diatur admin dari layar admin. "dibayar" hanya dari Midtrans;
// admin hanya boleh MAJU satu langkah (dikemas -> dikirim -> diterima) atau
// membatalkan pesanan yang belum dibayar.
export const ADMIN_SETTABLE = ['dikemas', 'dikirim', 'diterima', 'batal']

export function adminCanSet(from, to) {
  return ADMIN_SETTABLE.includes(to) && canTransition(from, to)
}

// Pilihan tombol yang ditampilkan di admin untuk status saat ini.
export function adminNextActions(from) {
  return (NEXT[from] || []).filter((to) => ADMIN_SETTABLE.includes(to))
}
