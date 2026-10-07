import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeCustomers, filterCustomers, customersToCsv, csvCell } from '../lib/customer-stats.js'

const customers = [
  { id: 'c1', name: 'Sari', email: 'sari@x.id', phone: '081234567890', addresses: [{ label: 'Rumah', address: 'Jl. Mawar 5' }], createdAt: '2026-10-01T00:00:00Z', lastLoginAt: '2026-10-05T00:00:00Z' },
  { id: 'c2', name: 'Budi', email: 'budi@x.id', phone: '', addresses: [], createdAt: '2026-10-02T00:00:00Z' },
]
const orders = [
  { orderId: 'A', customerId: 'c1', status: 'diterima', grossAmount: 50000, createdAt: '2026-10-03T00:00:00Z', customer: { name: 'Sari', phone: '0812-3456-7890' } },
  { orderId: 'B', customerId: 'c1', status: 'batal', grossAmount: 30000, createdAt: '2026-10-04T00:00:00Z', customer: {} },
  { orderId: 'C', customerId: null, status: 'dibayar', grossAmount: 70000, createdAt: '2026-10-05T00:00:00Z', customer: { name: 'Ani', phone: '+62 811 1111 2222', address: 'Jl. A 1' } },
  { orderId: 'D', customerId: null, status: 'menunggu_bayar', grossAmount: 20000, createdAt: '2026-10-06T00:00:00Z', customer: { name: 'Ani Baru', phone: '0811-1111-2222', address: 'Jl. B 2' } },
  { orderId: 'E', customerId: null, status: 'diterima', grossAmount: 10000, createdAt: '2026-10-01T00:00:00Z', customer: { name: 'Tanpa', phone: '', address: 'x' } },
]

test('anggota: hitungan pesanan, total hanya yang dibayar, terbaru dulu', () => {
  const { members } = summarizeCustomers({ customers, orders })
  assert.equal(members[0].id, 'c1') // punya pesanan terbaru
  assert.equal(members[0].orders, 2)
  assert.equal(members[0].paidOrders, 1)
  assert.equal(members[0].cancelledOrders, 1)
  assert.equal(members[0].totalSpent, 50000)
  assert.equal(members[0].lastOrderId, 'B')
  assert.equal(members[1].orders, 0)
})

test('tanpa login: dikelompokkan dari nomor yang sama walau beda tulisan; tanpa nomor dilewati', () => {
  const { guests } = summarizeCustomers({ customers, orders })
  assert.equal(guests.length, 1)
  assert.equal(guests[0].phone, '6281111112222')
  assert.equal(guests[0].orders, 2)
  assert.equal(guests[0].totalSpent, 70000)
  assert.equal(guests[0].name, 'Ani Baru') // nama terbaru
  assert.deepEqual(guests[0].addresses.sort(), ['Jl. A 1', 'Jl. B 2'])
})

test('cari: nama, email, nomor', () => {
  const { members } = summarizeCustomers({ customers, orders })
  assert.equal(filterCustomers(members, 'sari').length, 1)
  assert.equal(filterCustomers(members, 'BUDI@x').length, 1)
  assert.equal(filterCustomers(members, '0812-3456').length, 1)
  assert.equal(filterCustomers(members, '').length, 2)
  assert.equal(filterCustomers(members, 'zzz').length, 0)
})

test('CSV: kutip, koma, dan awalan rumus dinetralkan', () => {
  assert.equal(csvCell('a,b'), '"a,b"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"')
  assert.equal(csvCell('+62812'), "'+62812")
  assert.equal(csvCell(null), '')
  const csv = customersToCsv(summarizeCustomers({ customers, orders }))
  assert.equal(csv.split('\r\n').length, 1 + 2 + 1)
  assert.ok(csv.startsWith('Jenis,Nama'))
})
