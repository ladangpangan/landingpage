import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ChefHat, Clock, Users } from 'lucide-react'
import SafeImage from '../../_components/safe-image'
import ShopShell from '../../_components/shop-shell'
import { getPublicLandingSettings } from '@/lib/db'
import { getActiveRecipe } from '@/lib/recipes'
import { toPublicRecipe } from '@/lib/recipe-input'
import { formatIDR } from '@/lib/format'
import AddRecipeButton from './add-recipe-button'

export const dynamic = 'force-dynamic'

async function load(id) {
  const settings = await getPublicLandingSettings()
  const recipe = await getActiveRecipe(id).catch(() => null)
  return { settings, recipe: recipe ? toPublicRecipe(recipe, new Map(settings.products.map((p) => [p.id, p]))) : null }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const { recipe } = await load(id)
  if (!recipe) return { title: 'Resep tidak ditemukan' }
  return { title: `${recipe.title} — ladangpangan.id`, description: recipe.description || `Resep ${recipe.title}.`, openGraph: recipe.image ? { images: [{ url: recipe.image }] } : undefined }
}

export default async function ResepPage({ params }) {
  const { id } = await params
  const { settings, recipe } = await load(id)
  if (!recipe) notFound()
  return (
    <ShopShell settings={settings} hideFloatingCart>
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-4 sm:px-8">
        <Link href="/inspirasi" className="inline-flex h-11 items-center gap-2 text-sm font-semibold text-lpi"><ArrowLeft className="h-4 w-4" />Semua inspirasi</Link>
        <div className="relative mt-2 aspect-[4/3] overflow-hidden rounded-3xl bg-lpi-light sm:aspect-[16/9]">
          {recipe.image ? <SafeImage src={recipe.image} alt={recipe.title} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority /> : <div className="flex h-full items-center justify-center"><ChefHat className="h-14 w-14 text-lpi/50" /></div>}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-lpi-ink">{recipe.title}</h1>
        <p className="mt-2 flex items-center gap-4 text-sm font-semibold text-lpi">
          {recipe.minutes > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{recipe.minutes} menit</span>}
          {recipe.servings > 0 && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{recipe.servings} porsi</span>}
        </p>
        {recipe.description && <p className="mt-3 text-lpi-muted">{recipe.description}</p>}

        <section className="mt-6 rounded-2xl border border-lpi-line bg-white p-4">
          <h2 className="font-extrabold">Bahan dari toko kami</h2>
          {recipe.ingredients.length === 0 ? (
            <p className="mt-2 text-sm text-lpi-muted">Resep ini belum punya bahan yang ditautkan ke produk. Lihat <Link href="/" className="font-bold text-lpi underline">semua produk</Link>.</p>
          ) : (
            <ul className="mt-2 divide-y divide-lpi-line">
              {recipe.ingredients.map((i) => (
                <li key={i.productId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/produk/${i.productId}`} className="min-w-0 font-semibold text-lpi-ink hover:underline">{i.qty}× {i.name}<span className="block text-xs font-normal text-lpi-muted">{i.unit}</span></Link>
                  <span className="shrink-0 text-right">{i.soldOut ? <span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs font-bold text-white">Habis</span> : <b className="text-lpi">{formatIDR(i.price * i.qty)}</b>}</span>
                </li>
              ))}
            </ul>
          )}
          <AddRecipeButton recipe={{ title: recipe.title, ingredients: recipe.ingredients, cartTotal: recipe.cartTotal, cartCount: recipe.cartCount, allAvailable: recipe.allAvailable }} />
        </section>

        {recipe.extras.length > 0 && (
          <section className="mt-3 rounded-2xl border border-lpi-line bg-white p-4">
            <h2 className="font-extrabold">Bahan lain (siapkan sendiri)</h2>
            <ul className="mt-2 space-y-1 text-sm text-lpi-ink">{recipe.extras.map((t, i) => <li key={i}>• {t}</li>)}</ul>
          </section>
        )}

        <section className="mt-3 rounded-2xl border border-lpi-line bg-white p-4">
          <h2 className="font-extrabold">Cara membuat</h2>
          <ol className="mt-2 space-y-3 text-sm text-lpi-ink">
            {recipe.steps.map((t, i) => (
              <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lpi text-xs font-bold text-white">{i + 1}</span><span className="pt-0.5">{t}</span></li>
            ))}
          </ol>
        </section>
      </div>
    </ShopShell>
  )
}
