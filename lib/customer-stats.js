// Ringkasan pelanggan untuk admin (khusus Owner). Murni logika (tanpa database) supaya mudah diuji.
// Pembeli dengan login Google = "anggota"; pembeli tanpa login dikelompokkan dari nomor WhatsApp di pesanan.
import { normalizePhone } from './order-access.js'

const PAID = ['dibayar', 'dikemas', 'dikirim', 'diterima']
const CANCELLED = ['batal', 'gagal', 'kedaluwarsa']

const emptyStats = () => ({ orders: 0, paidOrders: 0, cancelledOrders: 0, totalSpent: 0, lastOrderAt: null, lastOrderId: null })

function addOrder(stats, o) {
  stats.orders += 1
  if (PAID.includes(o.status)) {
    stats.paidOrders += 1
    stats.totalSpent += Number(o.grossAmount) || 0
  } else if (CANCELLED.includes(o.status)) {
    stats.cancelledOrders += 1
  }
  if (!stats.lastOrderAt || o.createdAt > stats.lastOrderAt) {
    stats.lastOrderAt = o.createdAt
    stats.lastOrderId = o.orderId
  }
}

// customers: dokumen pembeli login; orders: pesanan (status sudah dinormalkan). Hasil: { members, guests }, terbaru dulu.
export function summarizeCustomers({ customers = [], orders = [] }) {
  const byCustomer = new Map()
  const byPhone = new Map()
  for (const o of orders) {
    if (o.customerId) {
      if (!byCustomer.has(o.customerId)) byCustomer.set(o.customerId, emptyStats())
      addOrder(byCustomer.get(o.customerId), o)
    } else {
      const phone = normalizePhone(o.customer?.phone)
      if (!phone) continue
      let g = byPhone.get(phone)
      if (!g) {
        g = { phone, name: o.customer?.name || '', addresses: new Set(), stats: emptyStats() }
        byPhone.set(phone, g)
      }
      if (o.customer?.address) g.addresses.add(o.customer.address)
      // nama terbaru dipakai
      if (!g.stats.lastOrderAt || o.createdAt > g.stats.lastOrderAt) g.name = o.customer?.name || g.name
      addOrder(g.stats, o)
    }
  }
  const members = customers
    .map((c) => ({
      id: c.id,
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      addressCount: (c.addresses || []).length,
      addresses: (c.addresses || []).map((a) => ({ label: a.label, address: a.address })),
      createdAt: c.createdAt || null,
      lastLoginAt: c.lastLoginAt || null,
      ...(byCustomer.get(c.id) || emptyStats()),
    }))
    .sort((a, b) => String(b.lastOrderAt || b.lastLoginAt || b.createdAt || '').localeCompare(String(a.lastOrderAt || a.lastLoginAt || a.createdAt || '')))
  const guests = [...byPhone.values()]
    .map((g) => ({ phone: g.phone, name: g.name, addresses: [...g.addresses].slice(0, 3), ...g.stats }))
    .sort((a, b) => String(b.lastOrderAt || '').localeCompare(String(a.lastOrderAt || '')))
  return { members, guests }
}

export function filterCustomers(list, q) {
  const t = String(q || '').trim().toLowerCase()
  if (!t) return list
  const digits = t.replace(/\D/g, '')
  return list.filter((c) => {
    const text = `${c.name || ''} ${c.email || ''}`.toLowerCase()
    if (text.includes(t)) return true
    return digits.length >= 4 && normalizePhone(c.phone).includes(normalizePhone(digits))
  })
}

// Sel CSV aman: kutip bila perlu dan netralkan awalan rumus Excel (=,+,-,@).
export function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function customersToCsv({ members, guests }) {
  const head = ['Jenis', 'Nama', 'Email', 'Nomor WhatsApp', 'Jumlah pesanan', 'Pesanan dibayar', 'Total belanja', 'Pesanan terakhir', 'Alamat']
  const rows = [
    ...members.map((m) => ['Login Google', m.name, m.email, m.phone, m.orders, m.paidOrders, m.totalSpent, m.lastOrderAt || '', m.addresses.map((a) => a.address).join(' | ')]),
    ...guests.map((g) => ['Tanpa login', g.name, '', g.phone, g.orders, g.paidOrders, g.totalSpent, g.lastOrderAt || '', g.addresses.join(' | ')]),
  ]
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}
