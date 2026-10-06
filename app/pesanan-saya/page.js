import { getCurrentCustomer } from '@/lib/customer-session'
import { listCustomerOrders } from '@/lib/orders'
import { accessKey } from '@/lib/order-access'
import { googleConfigured } from '@/lib/google-auth'
import PesananSayaClient from './pesanan-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pesanan Saya — ladangpangan.id', robots: { index: false, follow: false } }

export default async function PesananSayaPage() {
  const enabled = googleConfigured()
  const customer = enabled ? await getCurrentCustomer() : null
  let orders = []
  if (customer) {
    try {
      const secret = process.env.ADMIN_SESSION_SECRET || ''
      orders = (await listCustomerOrders(customer.id)).map((o) => ({ ...o, key: accessKey(o.orderId, secret) }))
    } catch (e) {
      console.error('[pesanan-saya] gagal memuat riwayat:', e?.message || e)
    }
  }
  return <PesananSayaClient loggedIn={!!customer} googleEnabled={enabled} accountOrders={orders} />
}
