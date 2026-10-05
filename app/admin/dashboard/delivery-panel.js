'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'

// Ongkir & Voucher (khusus Owner). Tampil di dalam <form> besar halaman admin,
// jadi TIDAK memakai <form>: semua tombol bertipe "button", dan Enter di kolom
// isian dicegah supaya tidak ikut menyimpan pengaturan halaman.

const inputClass =
  'w-full rounded-xl border border-[#D6EBDC] bg-[#FBFEFC] px-4 py-2.5 text-[#1F3A28] outline-none focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20'
const cardClass = 'rounded-2xl border border-[#D6EBDC] bg-white p-6'
const btnPrimary = 'inline-flex items-center gap-2 rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#22824E] disabled:opacity-60'
const btnGhost = 'rounded-xl border border-[#D6EBDC] px-4 py-2.5 text-sm font-medium text-[#1F3A28] hover:border-[#2FA966]'

async function api(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.')
  return data
}

const noEnter = (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault()
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#1F3A28]">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-[#7E9488]">{hint}</p>}
    </label>
  )
}

function Modal({ title, onClose, onSave, saving, saveLabel, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onKeyDown={noEnter}>
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#D6EBDC] px-5 py-4">
          <h3 className="text-base font-semibold text-[#142A1C]">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-[#F7FBF8]" aria-label="Tutup">
            <X className="h-5 w-5 text-[#1F3A28]" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-[#D6EBDC] px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className={btnGhost}>
            Batal
          </button>
          <button type="button" onClick={onSave} disabled={saving} className={btnPrimary}>
            {saving ? 'Menyimpan...' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Tanggal voucher disimpan sebagai waktu ISO; di layar dipakai tanggal WIB (YYYY-MM-DD).
const toWibDate = (iso) => (iso ? new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10) : '')
const TYPE_LABEL = { diskon_belanja: 'Diskon belanja', diskon_ongkir: 'Diskon ongkir' }

export default function DeliveryPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cfg, setCfg] = useState(null)
  const [savingCfg, setSavingCfg] = useState(false)
  const [zoneDraft, setZoneDraft] = useState(null)
  const [voucherDraft, setVoucherDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  const apply = useCallback((d) => {
    setData(d)
    const c = d.config
    setCfg({
      lat: c.warehouse?.lat ?? '',
      lng: c.warehouse?.lng ?? '',
      roadFactor: c.roadFactor,
      couriers: c.couriers,
      tripsPerSlot: c.tripsPerSlot,
      maxKgPerTrip: c.maxKgPerTrip,
      cutoffHour: c.cutoffHour,
      scheduleDaysAhead: c.scheduleDaysAhead,
    })
  }, [])

  useEffect(() => {
    api('/api/admin/delivery', 'GET')
      .then(apply)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [apply])

  async function saveConfig() {
    setSavingCfg(true)
    try {
      apply(
        await api('/api/admin/delivery', 'PUT', {
          config: {
            warehouse: { lat: cfg.lat, lng: cfg.lng },
            roadFactor: cfg.roadFactor,
            couriers: cfg.couriers,
            tripsPerSlot: cfg.tripsPerSlot,
            maxKgPerTrip: cfg.maxKgPerTrip,
            cutoffHour: cfg.cutoffHour,
            scheduleDaysAhead: cfg.scheduleDaysAhead,
          },
        })
      )
      toast.success('Pengaturan pengiriman tersimpan.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSavingCfg(false)
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error('Perangkat ini tidak mendukung lokasi.')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCfg((c) => ({ ...c, lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lng: Math.round(pos.coords.longitude * 1e6) / 1e6 }))
        toast.success('Lokasi terisi. Tekan "Simpan pengaturan" untuk menyimpannya.')
      },
      () => toast.error('Lokasi tidak bisa diambil. Izinkan akses lokasi, atau isi angkanya manual.'),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function saveZone() {
    setSaving(true)
    try {
      apply(await api('/api/admin/zones', 'POST', { id: zoneDraft.id || undefined, zone: zoneDraft }))
      toast.success('Zona tersimpan.')
      setZoneDraft(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }
  async function deleteZone(z) {
    if (!window.confirm(`Hapus ${z.name}?`)) return
    try {
      apply(await api(`/api/admin/zones/${z.id}`, 'DELETE'))
      toast.success('Zona dihapus.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function saveVoucher() {
    setSaving(true)
    try {
      apply(await api('/api/admin/vouchers', 'POST', { code: voucherDraft.editing ? voucherDraft.code : undefined, voucher: voucherDraft }))
      toast.success('Voucher tersimpan.')
      setVoucherDraft(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }
  async function deleteVoucher(v) {
    if (!window.confirm(`Hapus voucher ${v.code}?`)) return
    try {
      apply(await api(`/api/admin/vouchers/${encodeURIComponent(v.code)}`, 'DELETE'))
      toast.success('Voucher dihapus.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading || !cfg) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#2FA966]" />
      </div>
    )
  }

  const setC = (changes) => setCfg((c) => ({ ...c, ...changes }))
  const capacity = Math.max(1, Number(cfg.couriers) || 1) * Math.max(1, Number(cfg.tripsPerSlot) || 1) * Math.max(1, Number(cfg.maxKgPerTrip) || 40)
  const warehouseSet = data.config.warehouse

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4" onKeyDown={noEnter}>
      <div className={cardClass}>
        <h2 className="text-base font-semibold text-[#142A1C]">Gudang &amp; kurir</h2>
        <p className="mt-1 text-sm text-[#4C6356]">
          Ongkir dihitung dari jarak lokasi pembeli (dibagikan dari HP-nya) ke titik gudang ini.
        </p>
        {!warehouseSet && (
          <p className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm text-[#9B2C2C]">
            Titik gudang belum diisi, jadi checkout belum bisa menghitung ongkir. Isi di bawah.
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Lintang gudang (latitude)" hint="Contoh: -7.4478">
            <input className={inputClass} inputMode="decimal" value={cfg.lat} onChange={(e) => setC({ lat: e.target.value })} placeholder="-7.4478" />
          </Field>
          <Field label="Bujur gudang (longitude)" hint="Contoh: 112.7183">
            <input className={inputClass} inputMode="decimal" value={cfg.lng} onChange={(e) => setC({ lng: e.target.value })} placeholder="112.7183" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={useMyLocation} className={btnGhost + ' inline-flex items-center gap-2'}>
            <MapPin className="h-4 w-4" /> Pakai lokasi saya sekarang
          </button>
          <p className="text-xs text-[#7E9488]">
            Cara mudah: berdiri di gudang lalu tekan tombol ini. Atau di Google Maps tekan lama titik gudang, lalu salin dua angka yang muncul.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Faktor jarak jalan" hint="Jarak garis lurus dikali angka ini (1 sampai 3) untuk memperkirakan jarak jalan. Awal: 1,3.">
            <input type="number" step="0.1" min="1" max="3" className={inputClass} value={cfg.roadFactor} onChange={(e) => setC({ roadFactor: e.target.value })} />
          </Field>
          <Field label="Jumlah kurir">
            <input type="number" min="1" className={inputClass} value={cfg.couriers} onChange={(e) => setC({ couriers: e.target.value })} />
          </Field>
          <Field label="Trip per slot waktu" hint="Berapa kali satu kurir bisa jalan dalam satu slot (Pagi/Siang/Sore).">
            <input type="number" min="1" className={inputClass} value={cfg.tripsPerSlot} onChange={(e) => setC({ tripsPerSlot: e.target.value })} />
          </Field>
          <Field label="Muatan per trip (kg)">
            <input type="number" min="1" className={inputClass} value={cfg.maxKgPerTrip} onChange={(e) => setC({ maxKgPerTrip: e.target.value })} />
          </Field>
          <Field label="Jam batas Kirim Sekarang" hint="Bayar sebelum jam ini dikirim hari itu (WIB).">
            <input type="number" min="1" max="23" className={inputClass} value={cfg.cutoffHour} onChange={(e) => setC({ cutoffHour: e.target.value })} />
          </Field>
          <Field label="Jadwal sampai berapa hari ke depan">
            <input type="number" min="1" max="7" className={inputClass} value={cfg.scheduleDaysAhead} onChange={(e) => setC({ scheduleDaysAhead: e.target.value })} />
          </Field>
        </div>
        <p className="mt-4 text-sm font-medium text-[#142A1C]">
          Kapasitas tiap slot waktu: {capacity} kg <span className="font-normal text-[#7E9488]">(kurir × trip × muatan per trip)</span>
        </p>
        <div className="mt-4">
          <button type="button" onClick={saveConfig} disabled={savingCfg} className={btnPrimary}>
            {savingCfg ? 'Menyimpan...' : 'Simpan pengaturan'}
          </button>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#142A1C]">Zona ongkir</h2>
            <p className="mt-1 text-sm text-[#4C6356]">Di luar zona aktif terjauh, pembeli diarahkan bertanya lewat WhatsApp.</p>
          </div>
          <button type="button" onClick={() => setZoneDraft({ id: null, name: '', maxKm: '', fee: '', freeShippingMin: '', active: true })} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Tambah zona
          </button>
        </div>
        <ul className="mt-3 divide-y divide-[#D6EBDC]">
          {data.zones.map((z) => (
            <li key={z.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-[#142A1C]">
                  {z.name} {!z.active && <span className="text-xs font-normal text-[#7E9488]">(nonaktif)</span>}
                </p>
                <p className="text-xs text-[#4C6356]">
                  Sampai {z.maxKm} km · ongkir {formatIDR(z.fee)} · gratis bila belanja ≥ {formatIDR(z.freeShippingMin)}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setZoneDraft({ ...z })} className="rounded-lg p-2 hover:bg-[#F7FBF8]" aria-label="Ubah zona">
                  <Pencil className="h-4 w-4 text-[#1F3A28]" />
                </button>
                <button type="button" onClick={() => deleteZone(z)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Hapus zona">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          {data.zones.length === 0 && <li className="py-4 text-sm text-[#7E9488]">Belum ada zona.</li>}
        </ul>
      </div>

      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#142A1C]">Voucher</h2>
            <p className="mt-1 text-sm text-[#4C6356]">Pembeli mengetik kode saat checkout. Satu voucher per pesanan.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setVoucherDraft({ editing: false, code: '', type: 'diskon_belanja', valueType: 'nominal', value: '', maxDiscount: '', minPurchase: '', quota: '', startsAt: '', endsAt: '', active: true })
            }
            className={btnPrimary}
          >
            <Plus className="h-4 w-4" /> Buat voucher
          </button>
        </div>
        <ul className="mt-3 divide-y divide-[#D6EBDC]">
          {data.vouchers.map((v) => (
            <li key={v.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-[#142A1C]">
                  {v.code} {!v.active && <span className="text-xs font-normal text-[#7E9488]">(nonaktif)</span>}
                </p>
                <p className="text-xs text-[#4C6356]">
                  {TYPE_LABEL[v.type]} {v.valueType === 'persen' ? `${v.value}%` : formatIDR(v.value)}
                  {v.maxDiscount ? ` (maks ${formatIDR(v.maxDiscount)})` : ''}
                  {v.minPurchase ? ` · belanja min ${formatIDR(v.minPurchase)}` : ''} · terpakai {v.used}
                  {v.quota != null ? ` dari ${v.quota}` : ''}
                  {v.endsAt ? ` · sampai ${toWibDate(v.endsAt)}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setVoucherDraft({ ...v, editing: true, maxDiscount: v.maxDiscount ?? '', minPurchase: v.minPurchase || '', quota: v.quota ?? '', startsAt: toWibDate(v.startsAt), endsAt: toWibDate(v.endsAt) })}
                  className="rounded-lg p-2 hover:bg-[#F7FBF8]"
                  aria-label="Ubah voucher"
                >
                  <Pencil className="h-4 w-4 text-[#1F3A28]" />
                </button>
                <button type="button" onClick={() => deleteVoucher(v)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Hapus voucher">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          {data.vouchers.length === 0 && <li className="py-4 text-sm text-[#7E9488]">Belum ada voucher.</li>}
        </ul>
      </div>

      {zoneDraft && (
        <Modal title={zoneDraft.id ? 'Ubah zona' : 'Tambah zona'} onClose={() => setZoneDraft(null)} onSave={saveZone} saving={saving} saveLabel="Simpan">
          <Field label="Nama zona">
            <input className={inputClass} value={zoneDraft.name} onChange={(e) => setZoneDraft({ ...zoneDraft, name: e.target.value })} placeholder="Zona 1 (sampai 5 km)" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Jarak maks (km)">
              <input type="number" step="0.5" min="0" className={inputClass} value={zoneDraft.maxKm} onChange={(e) => setZoneDraft({ ...zoneDraft, maxKm: e.target.value })} />
            </Field>
            <Field label="Ongkir (Rp)">
              <input type="number" min="0" className={inputClass} value={zoneDraft.fee} onChange={(e) => setZoneDraft({ ...zoneDraft, fee: e.target.value })} />
            </Field>
            <Field label="Gratis ongkir mulai (Rp)">
              <input type="number" min="0" className={inputClass} value={zoneDraft.freeShippingMin} onChange={(e) => setZoneDraft({ ...zoneDraft, freeShippingMin: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#1F3A28]">
            <input type="checkbox" checked={zoneDraft.active} onChange={(e) => setZoneDraft({ ...zoneDraft, active: e.target.checked })} className="h-4 w-4 accent-[#2FA966]" />
            Zona aktif
          </label>
        </Modal>
      )}

      {voucherDraft && (
        <Modal title={voucherDraft.editing ? `Ubah voucher ${voucherDraft.code}` : 'Buat voucher'} onClose={() => setVoucherDraft(null)} onSave={saveVoucher} saving={saving} saveLabel="Simpan">
          <Field label="Kode voucher" hint="Huruf/angka tanpa spasi, mis. HEMAT10. Kode tidak bisa diubah setelah dibuat.">
            <input className={inputClass} value={voucherDraft.code} disabled={voucherDraft.editing} onChange={(e) => setVoucherDraft({ ...voucherDraft, code: e.target.value.toUpperCase() })} placeholder="HEMAT10" maxLength={30} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis voucher">
              <select className={inputClass} value={voucherDraft.type} onChange={(e) => setVoucherDraft({ ...voucherDraft, type: e.target.value })}>
                <option value="diskon_belanja">Diskon belanja</option>
                <option value="diskon_ongkir">Diskon ongkir</option>
              </select>
            </Field>
            <Field label="Potongan berupa">
              <select className={inputClass} value={voucherDraft.valueType} onChange={(e) => setVoucherDraft({ ...voucherDraft, valueType: e.target.value })}>
                <option value="nominal">Rupiah (nominal)</option>
                <option value="persen">Persen</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={voucherDraft.valueType === 'persen' ? 'Besar potongan (%)' : 'Besar potongan (Rp)'}>
              <input type="number" min="1" className={inputClass} value={voucherDraft.value} onChange={(e) => setVoucherDraft({ ...voucherDraft, value: e.target.value })} />
            </Field>
            <Field label="Potongan maksimal (Rp)" hint="Kosongkan bila tanpa batas. Berguna untuk voucher persen.">
              <input type="number" min="1" className={inputClass} value={voucherDraft.maxDiscount} onChange={(e) => setVoucherDraft({ ...voucherDraft, maxDiscount: e.target.value })} />
            </Field>
            <Field label="Belanja minimal (Rp)" hint="Kosongkan bila tanpa minimal.">
              <input type="number" min="0" className={inputClass} value={voucherDraft.minPurchase} onChange={(e) => setVoucherDraft({ ...voucherDraft, minPurchase: e.target.value })} />
            </Field>
            <Field label="Kuota pemakaian" hint="Kosongkan bila tak terbatas.">
              <input type="number" min="1" className={inputClass} value={voucherDraft.quota} onChange={(e) => setVoucherDraft({ ...voucherDraft, quota: e.target.value })} />
            </Field>
            <Field label="Mulai berlaku">
              <input type="date" className={inputClass} value={voucherDraft.startsAt} onChange={(e) => setVoucherDraft({ ...voucherDraft, startsAt: e.target.value })} />
            </Field>
            <Field label="Berlaku sampai (termasuk hari itu)">
              <input type="date" className={inputClass} value={voucherDraft.endsAt} onChange={(e) => setVoucherDraft({ ...voucherDraft, endsAt: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#1F3A28]">
            <input type="checkbox" checked={voucherDraft.active} onChange={(e) => setVoucherDraft({ ...voucherDraft, active: e.target.checked })} className="h-4 w-4 accent-[#2FA966]" />
            Voucher aktif
          </label>
        </Modal>
      )}
    </div>
  )
}
