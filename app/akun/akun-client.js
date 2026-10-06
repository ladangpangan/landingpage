'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/app/_components/page-header'
import { getLocalProfile, setLocalPhone } from '@/lib/saved-profile'
import { getSavedOrders, saveOrder } from '@/lib/saved-orders'
import { FINAL_STATUSES } from '@/lib/order-timeline'

const ERRORS = {
  'belum-aktif': 'Login Google belum diaktifkan oleh toko. Anda tetap bisa belanja tanpa login.',
  dibatalkan: 'Login dibatalkan.',
  kedaluwarsa: 'Waktu login habis. Silakan coba lagi.',
  gagal: 'Login Google gagal. Silakan coba lagi.',
}

// Pengaturan pembeli: nomor WhatsApp (akun bila login, HP ini bila tidak) dan masuk/keluar Google.
export default function AkunClient({ enabled, customer, orders, error }) {
  const router = useRouter()
  const [phone, setPhone] = useState(customer?.phone || '')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!customer) setPhone(getLocalProfile().phone)
  }, [customer])

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

  async function savePhone(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (customer) {
        const res = await fetch('/api/akun/profil', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Gagal menyimpan nomor.')
        setPhone(data.phone)
      } else {
        const r = setLocalPhone(phone)
        if (!r.ok) throw new Error(r.error)
        setPhone(r.phone)
      }
      toast.success('Nomor WhatsApp tersimpan.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-lpi-bg text-lpi-ink">
      <PageHeader title="Pengaturan" />
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{ERRORS[error] || 'Terjadi kendala. Silakan coba lagi.'}</p>}

        <form onSubmit={savePhone} className="space-y-3 rounded-2xl border border-lpi-line bg-white p-4">
          <h2 className="font-extrabold">Nomor WhatsApp</h2>
          <p className="text-sm text-lpi-muted">Terisi otomatis saat checkout dan dipakai untuk kabar pesanan. {customer ? 'Tersimpan di akun Anda.' : 'Tersimpan di HP ini saja.'}</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contoh: 0812 3456 7890" inputMode="tel" autoComplete="tel" maxLength={30} className="h-12 w-full rounded-xl border border-lpi-line px-4 text-base outline-none focus:border-lpi" />
          <button type="submit" disabled={saving} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lpi text-base font-bold text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Nomor</button>
        </form>

        {customer ? (
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
        ) : (
          <section className="rounded-2xl border border-lpi-line bg-white p-4">
            <h2 className="font-extrabold">Masuk (boleh dilewati)</h2>
            <p className="mt-2 text-sm text-lpi-muted">Dengan masuk, riwayat belanja dan alamat tersimpan ikut ke HP mana pun. Belanja tanpa masuk tetap bisa.</p>
            {enabled ? (
              <a href="/api/auth/google?returnTo=/akun" className="mt-3 flex h-14 items-center justify-center rounded-xl bg-lpi text-base font-bold text-white hover:bg-lpi-dark">Masuk dengan Google</a>
            ) : (
              <p className="mt-3 rounded-xl bg-lpi-light p-3 text-sm text-lpi-ink">Login Google belum aktif. Anda tetap bisa belanja tanpa login.</p>
            )}
            <p className="mt-3 text-xs text-lpi-muted">Kami hanya menerima nama, email, dan foto profil Anda. <Link href="/kebijakan-privasi" className="underline">Kebijakan Privasi</Link></p>
          </section>
        )}
      </main>
    </div>
  )
}
