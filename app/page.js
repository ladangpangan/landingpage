import Storefront from './storefront'
import { getPublicLandingSettings } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const settings = await getPublicLandingSettings()
  return <Storefront settings={settings} />
}
