'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react'

export default function LacakClient({ waLink }) {
  const router = useRouter()
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/lacak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, phone }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Gagal melacak pesanan.')
      router.push(`/pesanan/${encodeURIComponent(data.orderId)}?k=${data.key}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const input = 'h-12 w-full rounded-xl border border-lpi-line bg-white px-4 text-base outline-none focus:border-lpi'
  return (
    <div className="min-h-screen bg-lpi-bg text-lpi-ink">
      <header className="border-b border-lpi-line bg-white">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light" aria-label="Ke beranda"><ArrowLeft className="h-5 w-5 text-lpi" /></Link>
          <h1 className="text-lg font-extrabold">Lacak Pesanan</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pt-6">
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-lpi-line bg-white p-5">
          <p className="text-sm text-lpi-muted">Tanpa perlu login. Masukkan nomor pesanan (dari halaman setelah bayar) dan nomor WhatsApp yang Anda pakai saat memesan.</p>
          <label className="block text-sm font-semibold">Nomor pesanan
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="LPI-1234567890-ABCDE" autoCapitalize="characters" className={`${input} mt-1`} />
          </label>
          <label className="block text-sm font-semibold">Nomor WhatsApp
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder="0812xxxxxxx" className={`${input} mt-1`} />
          </label>
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-lpi text-base font-bold text-white hover:bg-lpi-dark disabled:opacity-60">
            {busy && <Loader2 className="h-5 w-5 animate-spin" />} Lacak Pesanan
          </button>
        </form>
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl border border-lpi-line bg-white text-sm font-bold">
          <MessageCircle className="h-4 w-4" /> Tanya via WhatsApp
        </a>
      </main>
    </div>
  )
}
