'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, LogOut, MapPin, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'
import { getSavedOrders, saveOrder } from '@/lib/saved-orders'
import { FINAL_STATUSES } from '@/lib/order-timeline'

const ERRORS = {
  'belum-aktif': 'Login Google belum diaktifkan oleh toko. Anda tetap bisa belanja tanpa login.',
  dibatalkan: 'Login dibatalkan.',
  kedaluwarsa: 'Waktu login habis. Silakan coba lagi.',
  gagal: 'Login Google gagal. Silakan coba lagi.',
}
const STATUS = { menunggu_bayar: 'Menunggu Bayar', dibayar: 'Dibayar', dikemas: 'Dikemas', dikirim: 'Dikirim', diterima: 'Diterima', batal: 'Batal', gagal: 'Gagal', kedaluwarsa: 'Kedaluwarsa' }

export default function AkunClient({ enabled, customer, orders, error }) {
  const router = useRouter()
  const [addresses, setAddresses] = useState(customer?.addresses || [])
  const [busy, setBusy] = useState(false)

  // Pesanan aktif akun ini ikut dipantau lonceng di HP ini.
  useEffect(() => {
    const have = new Set(getSavedOrders().map((o) => o.orderId))
    for (const o of (orders || []).filter((x) => !FINAL_STATUSES.includes(x.status)).slice(0, 5)) {
      if (!have.has(o.orderId)) saveOrder(o.orderId, o.key)
    }
  }, [orders])

  async function logout() {
    setBusy(true)
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/')
    router.refresh()
  }

  async function removeAddress(id) {
    if (!window.confirm('Hapus alamat ini?')) return
    const res = await fetch(`/api/akun/alamat/${id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data.error || 'Gagal menghapus alamat.')
    setAddresses(data.addresses)
  }

  return (
    <div className="min-h-screen bg-lpi-bg text-lpi-ink">
      <header className="border-b border-lpi-line bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light" aria-label="Ke beranda"><ArrowLeft className="h-5 w-5 text-lpi" /></Link>
          <h1 className="text-lg font-extrabold">Akun Saya</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{ERRORS[error] || 'Terjadi kendala. Silakan coba lagi.'}</p>}

        {!customer ? (
          <section className="rounded-2xl border border-lpi-line bg-white p-5 text-center">
            <h2 className="text-lg font-extrabold">Masuk untuk belanja lebih cepat</h2>
            <p className="mt-2 text-sm text-lpi-muted">Dengan masuk, Anda bisa melihat riwayat belanja dan menyimpan alamat. Belanja tanpa masuk tetap bisa.</p>
            {enabled ? (
              <a href="/api/auth/google?returnTo=/akun" className="mt-4 flex h-14 items-center justify-center rounded-xl bg-lpi text-base font-bold text-white hover:bg-lpi-dark">Masuk dengan Google</a>
            ) : (
              <p className="mt-4 rounded-xl bg-lpi-light p-3 text-sm text-lpi-ink">Login Google belum aktif. Anda tetap bisa belanja tanpa login.</p>
            )}
            <p className="mt-3 text-xs text-lpi-muted">Kami hanya menerima nama, email, dan foto profil Anda. <Link href="/kebijakan-privasi" className="underline">Kebijakan Privasi</Link></p>
            <Link href="/lacak" className="mt-4 inline-block text-sm font-bold text-lpi underline">Lacak pesanan tanpa login</Link>
          </section>
        ) : (
          <>
            <section className="flex items-center gap-3 rounded-2xl border border-lpi-line bg-white p-4">
              {customer.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customer.picture} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{customer.name || 'Pembeli'}</p>
                <p className="truncate text-sm text-lpi-muted">{customer.email}</p>
              </div>
              <button type="button" onClick={logout} disabled={busy} className="flex h-11 items-center gap-2 rounded-xl border border-lpi-line px-3 text-sm font-bold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Keluar
              </button>
            </section>

            <section className="rounded-2xl border border-lpi-line bg-white p-4">
              <h2 className="font-extrabold">Riwayat belanja</h2>
              {orders.length === 0 ? (
                <p className="mt-2 text-sm text-lpi-muted">Belum ada pesanan. Pesanan yang Anda buat saat masuk akan muncul di sini.</p>
              ) : (
                <ul className="mt-2 divide-y divide-lpi-line">
                  {orders.map((o) => (
                    <li key={o.orderId}>
                      <Link href={`/pesanan/${encodeURIComponent(o.orderId)}?k=${o.key}`} className="block py-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-lpi-muted">{o.orderId}</span>
                          <span className="rounded-full bg-lpi-light px-3 py-0.5 text-xs font-bold text-lpi">{STATUS[o.status] || o.status}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm">{o.itemsText}</p>
                        <p className="mt-1 text-sm font-bold text-lpi">{formatIDR(o.grossAmount)} <span className="font-normal text-lpi-muted">· {new Date(o.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-lpi-line bg-white p-4">
              <h2 className="font-extrabold">Alamat tersimpan</h2>
              {addresses.length === 0 ? (
                <p className="mt-2 text-sm text-lpi-muted">Belum ada. Saat checkout, centang &ldquo;Simpan alamat ini&rdquo;.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {addresses.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 rounded-xl border border-lpi-line p-3 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lpi" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{a.label} · {a.name}</p>
                        <p className="text-lpi-muted">{a.phone}</p>
                        <p>{a.address}</p>
                      </div>
                      <button type="button" onClick={() => removeAddress(a.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lpi-line text-red-700" aria-label="Hapus alamat"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
