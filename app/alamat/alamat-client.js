'use client'

import { useEffect, useState } from 'react'
import { Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/app/_components/page-header'
import { getLocalProfile, saveLocalAddress, removeLocalAddress } from '@/lib/saved-profile'
import { MAX_SAVED_ADDRESSES } from '@/lib/profile-input'

const inputClass = 'h-12 w-full rounded-xl border border-lpi-line bg-white px-4 text-base outline-none focus:border-lpi'
const EMPTY = { id: '', label: 'Rumah', name: '', phone: '', address: '', lat: null, lng: null }

// Alamat tersimpan: di akun Google bila login, bila tidak di HP ini saja.
export default function AlamatClient({ loggedIn, initial }) {
  const [list, setList] = useState(loggedIn ? initial : null)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!loggedIn) setList(getLocalProfile().addresses)
  }, [loggedIn])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function pickLocation() {
    if (!navigator.geolocation) return toast.error('HP ini tidak mendukung lokasi.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })); setLocating(false) },
      () => { setLocating(false); toast.error('Lokasi belum diizinkan. Izinkan lokasi di browser lalu coba lagi.') },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function save() {
    setBusy(true)
    try {
      if (loggedIn) {
        const res = await fetch(form.id ? `/api/akun/alamat/${form.id}` : '/api/akun/alamat', {
          method: form.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Gagal menyimpan alamat.')
        setList(data.addresses)
      } else {
        const r = saveLocalAddress(form, form.id || undefined)
        if (!r.ok) throw new Error(r.error)
        setList(r.addresses)
      }
      setForm(null)
      toast.success('Alamat tersimpan.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    if (!window.confirm('Hapus alamat ini?')) return
    if (loggedIn) {
      const res = await fetch(`/api/akun/alamat/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(data.error || 'Gagal menghapus alamat.')
      setList(data.addresses)
    } else {
      setList(removeLocalAddress(id))
    }
  }

  return (
    <div className="min-h-screen bg-lpi-bg text-lpi-ink">
      <PageHeader title="Alamat Tersimpan" />
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        <p className="text-sm text-lpi-muted">{loggedIn ? 'Alamat ini tersimpan di akun Google Anda dan ikut ke HP mana pun.' : 'Alamat ini tersimpan di HP ini saja. Masuk dengan Google di menu Pengaturan agar ikut ke HP lain.'} Saat checkout tinggal pilih alamatnya.</p>

        {form ? (
          <section className="space-y-3 rounded-2xl border border-lpi-line bg-white p-4">
            <h2 className="font-extrabold">{form.id ? 'Ubah alamat' : 'Alamat baru'}</h2>
            <input className={inputClass} value={form.label} onChange={set('label')} placeholder="Nama alamat, mis. Rumah / Kantor" maxLength={30} />
            <input className={inputClass} value={form.name} onChange={set('name')} placeholder="Nama penerima" autoComplete="name" maxLength={50} />
            <input className={inputClass} value={form.phone} onChange={set('phone')} placeholder="Nomor WhatsApp penerima" inputMode="tel" autoComplete="tel" maxLength={30} />
            <textarea className={`${inputClass} h-auto py-3`} rows={3} value={form.address} onChange={set('address')} placeholder="Alamat lengkap (jalan, nomor, RT/RW, patokan)" maxLength={200} />
            <button type="button" onClick={pickLocation} disabled={locating} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-lpi bg-white text-sm font-bold text-lpi">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {form.lat != null ? 'Titik lokasi tersimpan. Ambil ulang' : form.id ? 'Ambil ulang lokasi (boleh dilewati)' : 'Pakai lokasi saya sekarang'}
            </button>
            <p className="text-xs text-lpi-muted">Berdirilah di alamat pengantaran saat menekan tombol lokasi, supaya ongkir dihitung tepat.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm(null)} className="h-12 rounded-xl border border-lpi-line bg-white text-sm font-bold">Batal</button>
              <button type="button" onClick={save} disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-lpi text-sm font-bold text-white disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan</button>
            </div>
          </section>
        ) : (
          <>
            {list === null ? null : list.length === 0 ? (
              <section className="rounded-2xl border border-lpi-line bg-white p-5 text-center text-sm text-lpi-muted">Belum ada alamat tersimpan.</section>
            ) : (
              <ul className="space-y-2">
                {list.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-2xl border border-lpi-line bg-white p-4 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lpi" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{a.label} · {a.name}</p>
                      <p className="text-lpi-muted">{a.phone}</p>
                      <p>{a.address}</p>
                    </div>
                    <button type="button" onClick={() => setForm({ ...EMPTY, ...a })} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lpi-line text-lpi" aria-label="Ubah alamat"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(a.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lpi-line text-red-700" aria-label="Hapus alamat"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            {(list?.length || 0) < MAX_SAVED_ADDRESSES && (
              <button type="button" onClick={() => setForm({ ...EMPTY })} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-lpi text-base font-bold text-white hover:bg-lpi-dark"><Plus className="h-5 w-5" /> Tambah Alamat</button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
