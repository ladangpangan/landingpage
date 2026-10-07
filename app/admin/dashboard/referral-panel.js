'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'

// Referral (khusus Owner). Tampil di dalam <form> besar halaman admin: TIDAK memakai <form>/type=submit,
// semua tombol bertipe "button", Enter di kolom isian dicegah.

const inputClass = 'w-full rounded-xl border border-[#D6EBDC] bg-[#FBFEFC] px-4 py-2.5 text-[#1F3A28] outline-none focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20'
const cardClass = 'rounded-2xl border border-[#D6EBDC] bg-white p-4 sm:p-6'
const btnPrimary = 'inline-flex items-center gap-2 rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#22824E] disabled:opacity-60'
const btnGhost = 'rounded-xl border border-[#D6EBDC] px-3 py-2 text-sm font-medium text-[#1F3A28] hover:border-[#2FA966]'
const noEnter = (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault() }
const STATUS = { menunggu_bayar: 'Menunggu Bayar', dibayar: 'Dibayar', dikemas: 'Dikemas', dikirim: 'Dikirim', diterima: 'Diterima', batal: 'Batal', gagal: 'Gagal', kedaluwarsa: 'Kedaluwarsa' }
const COMM = { pending: 'menunggu Diterima', earned: 'siap dibayar', paid: 'sudah dibayar', void: 'hangus' }

async function api(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.')
  return data
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-[#142A1C]">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[#7E9488]">{hint}</span>}
    </label>
  )
}

function ReferrerCard({ r, onEdit, onChanged }) {
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState(null)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setOpen((v) => !v)
    if (orders) return
    try {
      setOrders((await api(`/api/admin/referrals/${r.code}/orders`, 'GET')).orders)
    } catch (e) {
      toast.error(e.message)
      setOrders([])
    }
  }

  async function payout() {
    if (!window.confirm(`Tandai komisi ${formatIDR(r.stats.earnedAmount)} untuk ${r.name} sebagai SUDAH DIBAYAR? Lakukan setelah Anda mentransfernya.`)) return
    setBusy(true)
    try {
      const d = await api(`/api/admin/referrals/${r.code}/payout`, 'POST')
      toast.success(`Tercatat dibayar: ${formatIDR(d.amount)} (${d.count} pesanan).`)
      setOrders(null)
      setOpen(false)
      onChanged()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const s = r.stats
  return (
    <li className="rounded-2xl border border-[#D6EBDC] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[#142A1C]">{r.name} <span className="ml-1 rounded-md bg-[#E3F0E7] px-2 py-0.5 font-mono text-xs text-[#1E5A3A]">{r.code}</span>{!r.active && <span className="ml-2 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">nonaktif</span>}</p>
          <p className="text-xs text-[#7E9488]">{r.phoneLocal}</p>
        </div>
        <button type="button" onClick={() => onEdit(r)} className={btnGhost} aria-label="Ubah perujuk"><Pencil className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-[#F7FBF8] p-2"><p className="text-[#7E9488]">Menunggu</p><p className="font-bold text-[#142A1C]">{formatIDR(s.pendingAmount)}</p></div>
        <div className="rounded-xl bg-[#E3F0E7] p-2"><p className="text-[#1E5A3A]">Siap dibayar</p><p className="font-bold text-[#1E5A3A]">{formatIDR(s.earnedAmount)}</p></div>
        <div className="rounded-xl bg-[#F7FBF8] p-2"><p className="text-[#7E9488]">Sudah dibayar</p><p className="font-bold text-[#142A1C]">{formatIDR(s.paidAmount)}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={payout} disabled={busy || s.earned === 0} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Tandai sudah dibayar</button>
        <button type="button" onClick={toggle} className={btnGhost}>{open ? 'Tutup pesanan' : `Lihat pesanan (${s.orders})`}</button>
      </div>
      {open && (
        <ul className="mt-3 space-y-1 rounded-xl bg-[#F7FBF8] p-3 text-xs text-[#1F3A28]">
          {orders === null ? <Loader2 className="h-4 w-4 animate-spin text-[#2FA966]" /> : orders.length === 0 ? <li className="text-[#7E9488]">Belum ada pesanan.</li> : orders.map((o) => (
            <li key={o.orderId}><span className="font-mono">{o.orderId}</span> · {STATUS[o.status] || o.status} · {formatIDR(o.grossAmount)} · komisi {formatIDR(o.commission)} ({COMM[o.commissionStatus] || o.commissionStatus})</li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default function ReferralPanel() {
  const [data, setData] = useState(null)
  const [cfg, setCfg] = useState(null)
  const [form, setForm] = useState(null) // null | { code, name, phone, active, isNew }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api('/api/admin/referrals', 'GET')
      setData(d)
      setCfg({ enabled: d.config.enabled, discountPct: String(d.config.discountPct), discountMax: String(d.config.discountMax || ''), commissionPct: String(d.config.commissionPct) })
    } catch (e) {
      toast.error(e.message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function saveCfg() {
    setBusy(true)
    try {
      await api('/api/admin/referrals/config', 'PUT', cfg)
      toast.success('Pengaturan referral tersimpan.')
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveReferrer() {
    setBusy(true)
    try {
      if (form.isNew) await api('/api/admin/referrals', 'POST', form)
      else await api(`/api/admin/referrals/${form.code}`, 'PUT', form)
      toast.success('Perujuk tersimpan.')
      setForm(null)
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!data || !cfg) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#2FA966]" /></div>
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className={cardClass}>
        <h2 className="text-base font-semibold text-[#142A1C]">Referral</h2>
        <p className="mt-1 text-sm text-[#4C6356]">Pembeli yang memakai kode perujuk mendapat diskon; perujuk mendapat komisi setelah pesanan <b>Diterima</b>. Pesanan batal tidak menghasilkan komisi. Transfer komisi Anda lakukan sendiri, lalu tekan &ldquo;Tandai sudah dibayar&rdquo;.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" onKeyDown={noEnter}>
          <Field label="Diskon pembeli (%)"><input className={inputClass} inputMode="numeric" value={cfg.discountPct} onChange={(e) => setCfg({ ...cfg, discountPct: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Diskon maksimal (Rp)" hint="Kosong = tanpa batas"><input className={inputClass} inputMode="numeric" value={cfg.discountMax} onChange={(e) => setCfg({ ...cfg, discountMax: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Komisi perujuk (%)" hint="Dari belanja setelah diskon, tanpa ongkir"><input className={inputClass} inputMode="numeric" value={cfg.commissionPct} onChange={(e) => setCfg({ ...cfg, commissionPct: e.target.value.replace(/\D/g, '') })} /></Field>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-[#D6EBDC] p-3">
          <div>
            <p className="text-sm font-medium text-[#142A1C]">Program referral aktif</p>
            <p className="text-xs text-[#7E9488]">{cfg.enabled ? 'Kode referral bisa dipakai pembeli.' : 'Dimatikan: semua kode referral ditolak di checkout.'}</p>
          </div>
          <button type="button" role="switch" aria-checked={cfg.enabled} onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })} className={`relative h-6 w-11 shrink-0 rounded-full transition ${cfg.enabled ? 'bg-[#2FA966]' : 'bg-[#D6EBDC]'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${cfg.enabled ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <button type="button" onClick={saveCfg} disabled={busy} className={`${btnPrimary} mt-3`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Pengaturan</button>
        <p className="mt-2 text-xs text-[#7E9488]">Perubahan angka berlaku untuk pesanan berikutnya; pesanan yang sudah dibuat memakai angka saat itu.</p>
      </div>

      {form ? (
        <div className={cardClass} onKeyDown={noEnter}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#142A1C]">{form.isNew ? 'Perujuk baru' : 'Ubah perujuk'}</h3>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg p-2 hover:bg-[#F7FBF8]" aria-label="Tutup"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 space-y-3">
            <Field label="Kode referral" hint="3–20 huruf/angka, mis. SARI10. Tidak bisa diubah setelah dibuat."><input className={inputClass} value={form.code} disabled={!form.isNew} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} /></Field>
            <Field label="Nama perujuk"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Nomor WhatsApp perujuk" hint="Dipakai untuk mencegah perujuk memakai kodenya sendiri."><input className={inputClass} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-[#1E5A3A]" /> Aktif</label>
            <button type="button" onClick={saveReferrer} disabled={busy} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Perujuk</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setForm({ code: '', name: '', phone: '', active: true, isNew: true })} className={`${btnPrimary} w-full justify-center`}><Plus className="h-4 w-4" /> Tambah Perujuk</button>
      )}

      {data.referrals.length === 0 ? (
        <p className="rounded-2xl border border-[#D6EBDC] bg-white p-6 text-center text-sm text-[#7E9488]">Belum ada perujuk.</p>
      ) : (
        <ul className="space-y-3">
          {data.referrals.map((r) => <ReferrerCard key={r.code} r={r} onEdit={(x) => setForm({ code: x.code, name: x.name, phone: x.phoneLocal, active: x.active, isNew: false })} onChanged={load} />)}
        </ul>
      )}
    </div>
  )
}
