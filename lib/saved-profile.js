// Nomor WhatsApp dan alamat pembeli tanpa login, disimpan di HP ini (localStorage). Hanya untuk komponen client.
import { cleanPhone, cleanLocalAddress, toLocalPhone, MAX_SAVED_ADDRESSES } from '@/lib/profile-input'

const KEY = 'lpi-profile-v1'

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { phone: typeof v.phone === 'string' ? v.phone : '', addresses: Array.isArray(v.addresses) ? v.addresses : [] }
  } catch {
    return { phone: '', addresses: [] }
  }
}

function write(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    return false
  }
  return true
}

export const getLocalProfile = () => read()

export function setLocalPhone(input) {
  const r = cleanPhone(input)
  if (r.error) return { ok: false, error: r.error }
  write({ ...read(), phone: toLocalPhone(r.phone) })
  return { ok: true, phone: toLocalPhone(r.phone) }
}

// Tambah (id kosong) atau ubah (id diisi). Alamat yang sama persis tidak disimpan dua kali.
export function saveLocalAddress(input, id) {
  const r = cleanLocalAddress(input)
  if (r.error) return { ok: false, error: r.error }
  const p = read()
  if (id) {
    const old = p.addresses.find((a) => a.id === id)
    if (!old) return { ok: false, error: 'Alamat tidak ditemukan.' }
    p.addresses = p.addresses.map((a) => (a.id === id ? { id, ...r.address } : a))
  } else {
    if (p.addresses.some((a) => a.address === r.address.address && a.phone === r.address.phone)) return { ok: true, addresses: p.addresses, duplicate: true }
    if (p.addresses.length >= MAX_SAVED_ADDRESSES) return { ok: false, error: `Maksimal ${MAX_SAVED_ADDRESSES} alamat tersimpan. Hapus satu dulu.` }
    p.addresses = [...p.addresses, { id: `l_${Math.random().toString(36).slice(2, 10)}`, ...r.address }]
  }
  if (!write(p)) return { ok: false, error: 'Penyimpanan di HP ini diblokir oleh browser.' }
  return { ok: true, addresses: p.addresses }
}

export function removeLocalAddress(id) {
  const p = read()
  p.addresses = p.addresses.filter((a) => a.id !== id)
  write(p)
  return p.addresses
}
