'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'lpi_cart_v1'

// Satu baris keranjang = produk atau paket. Data lama (tanpa kind) dianggap produk.
const kindOf = (it) => (it.kind === 'paket' ? 'paket' : 'produk')
const isLine = (it, id, kind) => it.productId === id && kindOf(it) === (kind === 'paket' ? 'paket' : 'produk')

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

  const addItem = useCallback((product, qty = 1, kind = 'produk') => {
    setItems((prev) => {
      const existing = prev.find((it) => isLine(it, product.id, kind))
      if (existing) {
        return prev.map((it) => (isLine(it, product.id, kind) ? { ...it, qty: it.qty + qty } : it))
      }
      return [
        ...prev,
        {
          kind,
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

  const setQty = useCallback((productId, qty, kind = 'produk') => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((it) => !isLine(it, productId, kind))
      return prev.map((it) => (isLine(it, productId, kind) ? { ...it, qty } : it))
    })
  }, [])

  const removeItem = useCallback((productId, kind = 'produk') => {
    setItems((prev) => prev.filter((it) => !isLine(it, productId, kind)))
  }, [])

  const getQty = useCallback(
    (productId, kind = 'produk') => items.find((it) => isLine(it, productId, kind))?.qty || 0,
    [items]
  )

  const clearCart = useCallback(() => setItems([]), [])

  const count = useMemo(() => items.reduce((sum, it) => sum + it.qty, 0), [items])
  const total = useMemo(() => items.reduce((sum, it) => sum + it.qty * it.price, 0), [items])

  const value = useMemo(
    () => ({ items, count, total, hydrated, addItem, setQty, removeItem, getQty, clearCart }),
    [items, count, total, hydrated, addItem, setQty, removeItem, getQty, clearCart]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
