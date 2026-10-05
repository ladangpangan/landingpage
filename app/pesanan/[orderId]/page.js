import { getPublicLandingSettings } from '@/lib/db'
import { makeWaLink } from '@/lib/wa'
import OrderClient from './order-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pesanan Anda — ladangpangan.id', robots: { index: false, follow: false } }

export default async function OrderPage({ params, searchParams }) {
  const { orderId } = await params
  const sp = await searchParams
  const settings = await getPublicLandingSettings()
  return (
    <OrderClient
      orderId={orderId}
      accessKey={typeof sp?.k === 'string' ? sp.k : ''}
      waLink={makeWaLink(settings, `Halo, saya mau tanya soal pesanan ${orderId}.`)}
      midtransClientKey={settings.midtransClientKey}
      midtransIsProduction={settings.midtransIsProduction}
    />
  )
}
