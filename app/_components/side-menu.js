'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChefHat, ClipboardList, HelpCircle, MapPin, MessageCircle, Phone, Search, Store, Undo2, X } from 'lucide-react'

const ITEMS = [
  { href: '/', label: 'Beranda', icon: Store },
  { href: '/inspirasi', label: 'Inspirasi Menu', icon: ChefHat },
  { href: '/pesanan-saya', label: 'Pesanan Saya', icon: ClipboardList },
  { href: '/alamat', label: 'Alamat Tersimpan', icon: MapPin },
  { href: '/lacak', label: 'Lacak Pesanan', icon: Search },
]
const HELP = [
  { href: '/faq', label: 'Pertanyaan Umum (FAQ)', icon: HelpCircle },
  { href: '/kebijakan-pengembalian-dana', label: 'Pengembalian Dana', icon: Undo2 },
  { href: '/kontak', label: 'Kontak', icon: Phone },
]

// Menu samping toko (dibuka tombol ☰ di header).
export default function SideMenu({ open, onClose, waLink }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null
  const link = 'flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-semibold text-lpi-ink hover:bg-lpi-light'
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Tutup menu" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <nav aria-label="Menu" className="absolute left-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col overflow-y-auto bg-white p-3 shadow-xl">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-lg font-extrabold text-lpi">Menu</span>
          <button type="button" onClick={onClose} aria-label="Tutup menu" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light"><X className="h-5 w-5" /></button>
        </div>
        <ul className="space-y-1">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href}><Link href={href} onClick={onClose} className={link}><Icon className="h-5 w-5 text-lpi" />{label}</Link></li>
          ))}
        </ul>
        <p className="mt-4 px-3 text-xs font-bold uppercase tracking-wide text-lpi-muted">Bantuan</p>
        <ul className="mt-1 space-y-1">
          {HELP.map(({ href, label, icon: Icon }) => (
            <li key={href}><Link href={href} onClick={onClose} className={link}><Icon className="h-5 w-5 text-lpi" />{label}</Link></li>
          ))}
          <li><a href={waLink} target="_blank" rel="noopener noreferrer" onClick={onClose} className={link}><MessageCircle className="h-5 w-5 text-lpi" />Chat WhatsApp Toko</a></li>
        </ul>
      </nav>
    </div>
  )
}
