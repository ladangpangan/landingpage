import CheckoutClient from './checkout-client'
import { getPublicLandingSettings } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const settings = await getPublicLandingSettings()
  return (
    <CheckoutClient
      whatsappNumber={settings.whatsappNumber}
      waMessage={settings.waMessage}
      midtransClientKey={settings.midtransClientKey}
      midtransIsProduction={settings.midtransIsProduction}
    />
  )
}
