import { getPublicLandingSettings } from '@/lib/db'
import { getActiveBundles } from '@/lib/bundles'

const SITE_URL = 'https://marketplace.ladangpangan.id'

export const dynamic = 'force-dynamic'

export default async function sitemap() {
  const now = new Date()
  const [settings, bundles] = await Promise.all([getPublicLandingSettings(), getActiveBundles()])
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    ...settings.products.map((p) => ({
      url: `${SITE_URL}/produk/${p.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    })),
    ...bundles.map((b) => ({
      url: `${SITE_URL}/paket/${b.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    })),
    { url: `${SITE_URL}/syarat-dan-ketentuan`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/kebijakan-pengembalian-dana`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/kebijakan-privasi`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]
}
