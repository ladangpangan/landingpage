// Daftar pesanan di HP pembeli (localStorage) untuk lonceng pemberitahuan. Hanya dipanggil dari komponen client.
const KEY = 'lpi-orders-v1'
const MAX = 20

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
    window.dispatchEvent(new Event('lpi-orders'))
  } catch {
    /* penyimpanan diblokir: lonceng sekadar tidak aktif */
  }
}

export const getSavedOrders = () => read()

// Simpan pesanan (baru di paling atas). seenSig diisi bila pembeli sedang melihat halaman pesanan itu.
export function saveOrder(orderId, k, seenSig) {
  const list = read()
  const old = list.find((o) => o.orderId === orderId)
  const rest = list.filter((o) => o.orderId !== orderId)
  write([{ orderId, k, seenSig: seenSig ?? old?.seenSig, message: old?.message, status: old?.status }, ...rest])
}

export function updateSaved(orderId, patch) {
  const list = read()
  const i = list.findIndex((o) => o.orderId === orderId)
  if (i < 0) return
  list[i] = { ...list[i], ...patch }
  write(list)
}

export function removeSaved(orderId) {
  write(read().filter((o) => o.orderId !== orderId))
}
