import Storefront from './storefront'
import { getLandingSettings, getPublicLandingSettings } from '@/lib/db'
import { getActiveBundles, toPublicBundle } from '@/lib/bundles'

export const dynamic = 'force-dynamic'

export default async function LandingPage({ searchParams }) {
  const { q } = await searchParams
  const [settings, raw, bundles] = await Promise.all([getPublicLandingSettings(), getLandingSettings(), getActiveBundles()])
  const productsById = new Map(raw.products.map((p) => [p.id, p]))
  return (
    <Storefront
      settings={settings}
      bundles={bundles.map((b) => toPublicBundle(b, productsById))}
      initialQuery={typeof q === 'string' ? q.slice(0, 80) : ''}
    />
  )
}
