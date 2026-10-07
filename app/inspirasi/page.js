import Link from 'next/link'
import { getLandingSettings, getPublicLandingSettings } from '@/lib/db'
import { getActiveBundles, toPublicBundle } from '@/lib/bundles'
import { listActiveRecipes } from '@/lib/recipes'
import { toPublicRecipe } from '@/lib/recipe-input'
import ShopShell from '../_components/shop-shell'
import RecipeCard from '../_components/recipe-card'
import { BundleCard } from '../_components/cards'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Inspirasi Menu — ladangpangan.id',
  description: 'Ide masak dengan ayam frozen: resep mudah, bahan bisa langsung dimasukkan ke keranjang.',
}

export default async function InspirasiPage() {
  const [settings, raw, recipes, bundles] = await Promise.all([getPublicLandingSettings(), getLandingSettings(), listActiveRecipes(), getActiveBundles()])
  const productsById = new Map(settings.products.map((p) => [p.id, p]))
  const rawById = new Map(raw.products.map((p) => [p.id, p]))
  const masak = bundles.filter((b) => b.type === 'masak').map((b) => toPublicBundle(b, rawById))
  return (
    <ShopShell settings={settings}>
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-8">
        <h1 className="text-2xl font-extrabold text-lpi-ink">Inspirasi Menu</h1>
        <p className="mt-1 text-sm text-lpi-muted">Bingung masak apa hari ini? Pilih resep, lalu masukkan bahan dari toko ke keranjang sekali tekan.</p>
        {recipes.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-lpi-line bg-white p-6 text-center text-sm text-lpi-muted">Resep akan segera hadir.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((r) => <RecipeCard key={r.id} recipe={toPublicRecipe(r, productsById)} />)}
          </div>
        )}
        {masak.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-extrabold text-lpi-ink">Paket Masak</h2>
            <p className="mt-1 text-sm text-lpi-muted">Bahan sudah dipilihkan, lengkap dengan resepnya.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {masak.map((b) => <BundleCard key={b.id} bundle={b} />)}
            </div>
          </section>
        )}
        <p className="mt-8 text-center text-sm"><Link href="/" className="font-bold text-lpi underline">Kembali belanja</Link></p>
      </div>
    </ShopShell>
  )
}
