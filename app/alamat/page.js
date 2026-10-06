import { getCurrentCustomer } from '@/lib/customer-session'
import { googleConfigured } from '@/lib/google-auth'
import AlamatClient from './alamat-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Alamat Tersimpan — ladangpangan.id', robots: { index: false, follow: false } }

export default async function AlamatPage() {
  const enabled = googleConfigured()
  const customer = enabled ? await getCurrentCustomer() : null
  return <AlamatClient loggedIn={!!customer} initial={customer?.addresses || []} />
}
