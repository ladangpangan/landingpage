import Storefront from './storefront'
import { getLandingSettings, getPublicLandingSettings } from '@/lib/db'
import { getActiveBundles, toPublicBundle } from '@/lib/bundles'
import { listActiveRecipes } from '@/lib/recipes'
import { toPublicRecipe } from '@/lib/recipe-input'

export const dynamic = 'force-dynamic'

export default async function LandingPage({ searchParams }) {
  const { q } = await searchParams
  const [settings, raw, bundles, recipes] = await Promise.all([getPublicLandingSettings(), getLandingSettings(), getActiveBundles(), listActiveRecipes()])
  const productsById = new Map(raw.products.map((p) => [p.id, p]))
  return (
    <Storefront
      settings={settings}
      bundles={bundles.map((b) => toPublicBundle(b, productsById))}
      recipes={recipes.map((r) => toPublicRecipe(r, new Map(settings.products.map((p) => [p.id, p]))))}
      initialQuery={typeof q === 'string' ? q.slice(0, 80) : ''}
    />
  )
}
