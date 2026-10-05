import { getPublicLandingSettings } from '@/lib/db'
import { makeWaLink } from '@/lib/wa'
import LacakClient from './lacak-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lacak Pesanan — ladangpangan.id', robots: { index: false } }

export default async function LacakPage() {
  const settings = await getPublicLandingSettings()
  return <LacakClient waLink={makeWaLink(settings, 'Halo, saya mau tanya soal pesanan saya.')} />
}
