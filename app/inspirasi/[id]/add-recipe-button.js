'use client'

import { useRouter } from 'next/navigation'
import { ShoppingBasket } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-context'
import { formatIDR } from '@/lib/format'

// Memasukkan semua bahan toko yang tersedia ke keranjang (harga tetap dihitung ulang server saat checkout).
export default function AddRecipeButton({ recipe }) {
  const { addItem } = useCart()
  const router = useRouter()
  if (!recipe.ingredients.length || recipe.cartCount === 0) return null

  function addAll() {
    const lines = recipe.ingredients.filter((i) => !i.soldOut)
    for (const i of lines) addItem({ id: i.productId, name: i.name, unit: i.unit, price: i.price, image: i.image }, i.qty, 'produk')
    toast.success(`${lines.length} bahan masuk keranjang`)
    router.push('/checkout')
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={addAll} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-lpi text-base font-bold text-white hover:bg-lpi-dark">
        <ShoppingBasket className="h-5 w-5" /> Masukkan bahan ke keranjang · {formatIDR(recipe.cartTotal)}
      </button>
      {!recipe.allAvailable && <p className="mt-2 text-xs text-lpi-muted">Sebagian bahan sedang habis dan tidak ikut dimasukkan.</p>}
    </div>
  )
}
