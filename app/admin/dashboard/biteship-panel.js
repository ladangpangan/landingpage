'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'

const input = 'h-11 w-full rounded-xl border border-lpi-line bg-white px-3 text-sm outline-none focus:border-lpi'
// Tidak memakai <form>: panel ini berada di dalam form besar pengaturan (lihat CLAUDE.md).

export default function BiteshipPanel() {
  const [data, setData] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [allowed, setAllowed] = useState([])
  const [origin, setOrigin] = useState({ contactName: '', contactPhone: '', contactEmail: '', address: '', note: '' })
  const [probe, setProbe] = useState(null)
  const [busy, setBusy] = useState(false)

  function apply(d) {
    setData(d)
    setEnabled(d.enabled)
    setAllowed(d.allowed || [])
    setOrigin(d.origin)
    setApiKey('')
  }

  useEffect(() => {
    fetch('/api/admin/biteship').then((r) => r.json()).then((d) => (d.error ? toast.error(d.error) : apply(d))).catch(() => toast.error('Gagal memuat.'))
  }, [])

  async function save() {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/biteship', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, enabled, allowed, origin }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal menyimpan.')
      apply(d)
      toast.success('Pengaturan Biteship tersimpan.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function checkCouriers() {
    setBusy(true)
    setProbe(null)
    try {
      const res = await fetch('/api/admin/biteship/couriers', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal memeriksa.')
      setProbe(d.options)
      if (!d.options.length) toast.info('Biteship tidak mengembalikan kurir untuk rute uji.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = (key) => setAllowed((a) => (a.includes(key) ? a.filter((k) => k !== key) : [...a, key]))
  if (!data) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-lpi" /></div>
  const set = (k) => (e) => setOrigin((o) => ({ ...o, [k]: e.target.value }))
  // Kurir yang sudah dipilih Owner tetap tampil walau belum diperiksa.
  const rows = [...(probe || []), ...allowed.filter((k) => !(probe || []).some((o) => o.key === k)).map((k) => ({ key: k, name: k, serviceName: '', price: null, duration: '' }))]

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="rounded-2xl border border-lpi-line bg-white p-5">
        <h2 className="text-base font-bold text-lpi-ink">Pengiriman Biteship (kurir instan)</h2>
        <p className="mt-1 text-sm text-lpi-muted">Pembeli bisa memilih kurir instan seperti Gojek atau Grab lewat Biteship, selain kurir toko. Tarifnya dibayar pembeli.</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {data.ready ? <CheckCircle2 className="h-4 w-4 text-lpi" /> : <XCircle className="h-4 w-4 text-red-500" />}
          <span className={data.ready ? 'text-lpi' : 'text-red-600'}>
            {data.ready ? 'Siap: pembeli melihat pilihan kurir instan.' : 'Belum siap. Lengkapi: nyalakan, API Key, titik gudang, data penjemputan, dan minimal satu kurir.'}
          </span>
        </div>
        {!data.hasWarehouse && <p className="mt-2 text-sm text-red-600">Titik gudang belum diisi di menu Ongkir &amp; Voucher.</p>}
      </div>

      <div className="space-y-3 rounded-2xl border border-lpi-line bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Nyalakan kurir instan Biteship</p>
          <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((v) => !v)} className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-lpi' : 'bg-lpi-line'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <label className="block text-sm font-semibold">API Key Biteship
          <input type="password" autoComplete="off" className={`${input} mt-1`} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={data.hasApiKey ? `Tersimpan (${data.apiKeyPreview}) — kosongkan untuk mempertahankan` : 'Tempel API Key (mulai dari kunci uji coba)'} />
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-lpi-line bg-white p-5">
        <h3 className="text-sm font-bold">Data penjemputan (gudang)</h3>
        <p className="text-xs text-lpi-muted">Dilihat kurir saat menjemput. Titik koordinatnya memakai titik gudang di menu Ongkir &amp; Voucher.</p>
        <input className={input} value={origin.contactName} onChange={set('contactName')} placeholder="Nama kontak gudang" />
        <input className={input} value={origin.contactPhone} onChange={set('contactPhone')} placeholder="Nomor telepon gudang" inputMode="tel" />
        <input className={input} value={origin.contactEmail} onChange={set('contactEmail')} placeholder="Email (boleh kosong)" />
        <textarea className={`${input} h-24 py-2`} value={origin.address} onChange={set('address')} placeholder="Alamat lengkap gudang" />
        <input className={input} value={origin.note} onChange={set('note')} placeholder="Catatan untuk kurir (mis. pintu samping)" />
      </div>

      <div className="space-y-3 rounded-2xl border border-lpi-line bg-white p-5">
        <h3 className="text-sm font-bold">Kurir yang boleh dipilih pembeli</h3>
        <p className="text-xs text-lpi-muted">Tekan &ldquo;Cek kurir tersedia&rdquo; (butuh API Key tersimpan dan titik gudang), lalu centang yang diizinkan. Untuk produk beku, pilih hanya kurir instan.</p>
        <button type="button" onClick={checkCouriers} disabled={busy} className="min-h-11 rounded-xl border border-lpi-line px-4 text-sm font-bold text-lpi disabled:opacity-60">Cek kurir tersedia</button>
        {rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((o) => (
              <li key={o.key}>
                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-lpi-line p-3 text-sm">
                  <input type="checkbox" checked={allowed.includes(o.key)} onChange={() => toggle(o.key)} className="h-5 w-5 accent-[#1E5A3A]" />
                  <span className="flex-1"><b>{o.name}</b> {o.serviceName} <span className="font-mono text-xs text-lpi-muted">({o.key})</span></span>
                  {o.price != null && <span className="shrink-0 font-semibold">{formatIDR(o.price)}</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" onClick={save} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-lpi text-base font-bold text-white disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Pengaturan Biteship
      </button>
    </div>
  )
}
