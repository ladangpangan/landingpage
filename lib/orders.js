// Order records, kept separately from landing-page settings. Every function
// no-ops (returns null/[]) when MONGO_URL isn't configured, so checkout via
// Midtrans still works even without a database — orders just won't be
// listed in the admin panel until one is connected.
import { getDb } from '@/lib/db'

const COLLECTION = 'orders'

function col() {
  return getDb()?.collection(COLLECTION) || null
}

// Midtrans transaction_status -> our own order status vocabulary.
export function mapTransactionStatus(transactionStatus, fraudStatus) {
  switch (transactionStatus) {
    case 'capture':
      return fraudStatus === 'challenge' ? 'pending' : 'paid'
    case 'settlement':
      return 'paid'
    case 'pending':
      return 'pending'
    case 'deny':
      return 'failed'
    case 'cancel':
      return 'cancelled'
    case 'expire':
      return 'expired'
    case 'refund':
    case 'partial_refund':
      return 'refunded'
    default:
      return 'pending'
  }
}

export async function createOrder({ orderId, items, customer, grossAmount }) {
  const c = col()
  if (!c) return
  const now = new Date().toISOString()
  try {
    await c.insertOne({
      orderId,
      items,
      customer,
      grossAmount,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
  } catch (e) {
    console.error('[orders] gagal menyimpan order:', e?.message || e)
  }
}

export async function updateOrderStatus(orderId, status) {
  const c = col()
  if (!c) return
  try {
    await c.updateOne(
      { orderId },
      { $set: { status, updatedAt: new Date().toISOString() } }
    )
  } catch (e) {
    console.error('[orders] gagal update status order:', e?.message || e)
  }
}

export async function listOrders({ limit = 100 } = {}) {
  const c = col()
  if (!c) return []
  try {
    const docs = await c.find({}).sort({ createdAt: -1 }).limit(limit).toArray()
    return docs.map((d) => ({
      orderId: d.orderId,
      items: d.items || [],
      customer: d.customer || {},
      grossAmount: d.grossAmount || 0,
      status: d.status || 'pending',
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))
  } catch (e) {
    console.error('[orders] gagal membaca daftar order:', e?.message || e)
    return []
  }
}
