'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'lpi_cart_v1'

function readStoredCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setItems(readStoredCart())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // ignore quota/private-mode failures — cart just won't persist
    }
  }, [items, hydrated])

  const addItem = useCallback((product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.productId === product.id)
      if (existing) {
        return prev.map((it) =>
          it.productId === product.id ? { ...it, qty: it.qty + qty } : it
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          price: product.price,
          image: product.image,
          qty,
        },
      ]
    })
  }, [])

  const setQty = useCallback((productId, qty) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((it) => it.productId !== productId)
      return prev.map((it) => (it.productId === productId ? { ...it, qty } : it))
    })
  }, [])

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const count = useMemo(() => items.reduce((sum, it) => sum + it.qty, 0), [items])
  const total = useMemo(() => items.reduce((sum, it) => sum + it.qty * it.price, 0), [items])

  const value = useMemo(
    () => ({ items, count, total, hydrated, addItem, setQty, removeItem, clearCart }),
    [items, count, total, hydrated, addItem, setQty, removeItem, clearCart]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
