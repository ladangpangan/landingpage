import Link from 'next/link'
import SafeImage from './safe-image'
import { ChefHat, Clock, Users } from 'lucide-react'

// Kartu inspirasi menu (resep). Bisa dipakai di server maupun client.
export default function RecipeCard({ recipe }) {
  return (
    <Link href={`/inspirasi/${recipe.id}`} className="block overflow-hidden rounded-2xl border border-lpi-line bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-lpi-light">
        {recipe.image ? (
          <SafeImage src={recipe.image} alt={recipe.title} fill sizes="(min-width: 640px) 33vw, 80vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center"><ChefHat className="h-10 w-10 text-lpi/50" /></div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 font-extrabold text-lpi-ink">{recipe.title}</h3>
        {recipe.description && <p className="mt-1 line-clamp-2 text-sm text-lpi-muted">{recipe.description}</p>}
        <p className="mt-2 flex items-center gap-3 text-xs font-semibold text-lpi">
          {recipe.minutes > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{recipe.minutes} menit</span>}
          {recipe.servings > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{recipe.servings} porsi</span>}
        </p>
      </div>
    </Link>
  )
}
