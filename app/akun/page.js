import { getCurrentCustomer } from '@/lib/customer-session'
import { listCustomerOrders } from '@/lib/orders'
import { accessKey } from '@/lib/order-access'
import { googleConfigured } from '@/lib/google-auth'
import AkunClient from './akun-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Akun Saya — ladangpangan.id', robots: { index: false, follow: false } }

export default async function AkunPage({ searchParams }) {
  const sp = await searchParams
  const enabled = googleConfigured()
  const customer = enabled ? await getCurrentCustomer() : null
  let orders = []
  if (customer) {
    try {
      const secret = process.env.ADMIN_SESSION_SECRET || ''
      orders = (await listCustomerOrders(customer.id)).map((o) => ({ ...o, key: accessKey(o.orderId, secret) }))
    } catch (e) {
      console.error('[akun] gagal memuat riwayat:', e?.message || e)
    }
  }
  return <AkunClient enabled={enabled} customer={customer} orders={orders} error={typeof sp?.galat === 'string' ? sp.galat : ''} />
}
