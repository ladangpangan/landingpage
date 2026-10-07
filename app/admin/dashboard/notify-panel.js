'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Notifikasi admin (khusus Owner). Tampil di dalam <form> besar halaman admin: TIDAK memakai <form>/type=submit;
// semua tombol bertipe "button", Enter di kolom isian dicegah.

const inputClass = 'w-full rounded-xl border border-[#D6EBDC] bg-[#FBFEFC] px-4 py-2.5 text-[#1F3A28] outline-none focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20'
const cardClass = 'rounded-2xl border border-[#D6EBDC] bg-white p-4 sm:p-6'
const btnPrimary = 'inline-flex items-center gap-2 rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#22824E] disabled:opacity-60'
const btnGhost = 'inline-flex items-center gap-2 rounded-xl border-2 border-[#1E5A3A] bg-white px-4 py-2.5 text-sm font-medium text-[#1E5A3A] disabled:opacity-60'
const noEnter = (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault() }

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

function Switch({ checked, onChange, title, desc }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#D6EBDC] p-3">
      <div>
        <p className="text-sm font-medium text-[#142A1C]">{title}</p>
        <p className="text-xs text-[#7E9488]">{desc}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#2FA966]' : 'bg-[#D6EBDC]'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export default function NotifyPanel() {
  const [view, setView] = useState(null)
  const [wa, setWa] = useState(null)
  const [tg, setTg] = useState(null)
  const [busy, setBusy] = useState('')
  const [results, setResults] = useState(null)
  const [bl, setBl] = useState(null)
  const [gw, setGw] = useState(null)

  const apply = useCallback((v) => {
    setView(v)
    setWa({ enabled: v.wa.enabled, phoneNumberId: v.wa.phoneNumberId, adminNumbers: v.wa.adminNumbers.join('\n'), templatePaid: v.wa.templatePaid, templateReview: v.wa.templateReview, language: v.wa.language, token: '' })
    setTg({ enabled: v.telegram.enabled, chatIds: v.telegram.chatIds.join('\n'), token: '' })
    setBl({ enabled: v.baileys.enabled, adminNumbers: v.baileys.adminNumbers.join('\n') })
  }, [])

  useEffect(() => {
    api('/api/admin/notify', 'GET').then(apply).catch((e) => toast.error(e.message))
  }, [apply])

  // Status sambungan WhatsApp (Baileys) + QR: diperbarui tiap 4 detik selama tab ini terbuka.
  useEffect(() => {
    let alive = true
    const tick = () => api('/api/admin/notify/baileys', 'GET').then((d) => alive && setGw(d)).catch(() => {})
    tick()
    const t = setInterval(tick, 4000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  async function disconnect() {
    if (!window.confirm('Putuskan WhatsApp dari HP ini? Anda perlu scan QR lagi untuk menyambung.')) return
    try {
      await api('/api/admin/notify/baileys', 'POST', { action: 'logout' })
      toast.success('Diputuskan. QR baru akan muncul sebentar lagi.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function save() {
    setBusy('save')
    try {
      apply(await api('/api/admin/notify', 'PUT', { wa, telegram: tg, baileys: bl }))
      toast.success('Pengaturan notifikasi tersimpan.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy('')
    }
  }

  async function sendTest() {
    setBusy('test')
    setResults(null)
    try {
      setResults((await api('/api/admin/notify/test', 'POST')).results)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy('')
    }
  }

  if (!view || !wa || !tg || !bl) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#2FA966]" /></div>
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3" onKeyDown={noEnter}>
      <div className={cardClass}>
        <h2 className="text-base font-semibold text-[#142A1C]">Notifikasi ke Admin</h2>
        <p className="mt-1 text-sm text-[#4C6356]">Kabar otomatis saat <b>pesanan sudah dibayar</b> dan saat <b>pesanan perlu dicek</b> (jumlah tidak cocok, kurir bermasalah). Anda bisa mengaktifkan salah satu atau keduanya.</p>
      </div>

      <div className={`${cardClass} space-y-4`}>
        <h3 className="font-semibold text-[#142A1C]">Telegram <span className="ml-1 rounded-md bg-[#E3F0E7] px-2 py-0.5 text-xs text-[#1E5A3A]">gratis, tanpa verifikasi</span></h3>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-[#4C6356]">
          <li>Di Telegram cari <b>@BotFather</b>, kirim <code>/newbot</code>, ikuti langkahnya, lalu salin <b>token</b> yang diberikan.</li>
          <li>Buka bot baru Anda dan tekan <b>Start</b> (untuk grup: tambahkan bot ke grup).</li>
          <li>Cari <b>@userinfobot</b> dan kirim pesan apa saja untuk mengetahui <b>Chat ID</b> Anda (angka).</li>
        </ol>
        <Field label="Token bot" hint={view.telegram.hasToken ? `Tersimpan (${view.telegram.tokenPreview}). Kosongkan untuk mempertahankan.` : 'Contoh: 123456789:AAF...'}>
          <input type="password" autoComplete="off" className={inputClass} value={tg.token} onChange={(e) => setTg({ ...tg, token: e.target.value })} placeholder={view.telegram.hasToken ? '••••••••••••' : 'Tempel token bot'} />
        </Field>
        <Field label="Chat ID penerima (satu per baris, maks. 5)" hint="Grup memakai angka diawali tanda minus."><textarea className={inputClass} rows={2} value={tg.chatIds} onChange={(e) => setTg({ ...tg, chatIds: e.target.value })} /></Field>
        <Switch checked={tg.enabled} onChange={(v) => setTg({ ...tg, enabled: v })} title="Kirim lewat Telegram" desc={tg.enabled ? 'AKTIF' : 'Nonaktif'} />
      </div>

      <div className={`${cardClass} space-y-4`}>
        <h3 className="font-semibold text-[#142A1C]">WhatsApp lewat Baileys <span className="ml-1 rounded-md bg-[#FDECEC] px-2 py-0.5 text-xs text-[#9B2C2C]">tidak resmi</span></h3>
        <p className="rounded-xl bg-[#FDF6E3] p-3 text-xs text-[#5C4A12]">
          Cara ini menautkan satu nomor WhatsApp seperti &ldquo;WhatsApp Web&rdquo;. <b>Hanya untuk kabar ke admin.</b> WhatsApp tidak mengizinkan cara ini secara resmi, jadi nomornya <b>bisa saja diblokir</b>.
          Pakai <b>nomor khusus</b> (bukan nomor toko untuk pembeli), simpan nomor itu di kontak admin, dan kirim satu pesan &ldquo;hai&rdquo; ke nomor itu dari HP admin sebelum dipakai.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full px-3 py-1 font-semibold ${gw?.state === 'open' ? 'bg-[#E3F0E7] text-[#1E5A3A]' : gw?.state === 'qr' ? 'bg-[#E8F0FE] text-[#1A4FA3]' : 'bg-[#F3F4F6] text-[#4B5563]'}`}>{gw ? gw.label : 'Memeriksa…'}</span>
          {gw?.me && <span className="text-[#4C6356]">Nomor tertaut: {gw.me}</span>}
          {gw?.state === 'open' && <button type="button" onClick={disconnect} className="rounded-xl border border-[#D6EBDC] px-3 py-1.5 text-xs font-medium text-red-700 hover:border-red-300">Putuskan</button>}
        </div>
        {gw?.state === 'not_installed' && <p className="text-xs text-[#9B2C2C]">Gateway belum dipasang di server (WA_GATEWAY_TOKEN kosong). Hubungi pengembang untuk mengaktifkannya.</p>}
        {gw?.state === 'unauthorized' && <p className="text-xs text-[#9B2C2C]">Token gateway tidak cocok dengan server. Hubungi pengembang.</p>}
        {gw?.state === 'unreachable' && <p className="text-xs text-[#9B2C2C]">Gateway tidak menjawab. Tunggu satu menit setelah pemasangan, lalu muat ulang halaman.</p>}
        {gw?.qrImage && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[#D6EBDC] p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gw.qrImage} alt="Kode QR WhatsApp" width={240} height={240} className="h-60 w-60" />
            <ol className="list-decimal space-y-0.5 pl-5 text-xs text-[#4C6356]">
              <li>Di HP nomor khusus, buka WhatsApp.</li>
              <li>Ketuk <b>titik tiga / Pengaturan &gt; Perangkat tertaut &gt; Tautkan perangkat</b>.</li>
              <li>Arahkan kamera ke kode QR ini (kode berganti otomatis).</li>
            </ol>
          </div>
        )}
        <Field label="Nomor WhatsApp admin penerima (satu per baris, maks. 5)" hint="Contoh: 0812 3456 7890."><textarea className={inputClass} rows={3} value={bl.adminNumbers} onChange={(e) => setBl({ ...bl, adminNumbers: e.target.value })} /></Field>
        <Switch checked={bl.enabled} onChange={(v) => setBl({ ...bl, enabled: v })} title="Kirim lewat WhatsApp (Baileys)" desc={bl.enabled ? 'AKTIF' : 'Nonaktif'} />
      </div>

      <div className={`${cardClass} space-y-4`}>
        <h3 className="font-semibold text-[#142A1C]">WhatsApp Cloud API (Meta) <span className="ml-1 rounded-md bg-[#F7FBF8] px-2 py-0.5 text-xs text-[#7E9488]">resmi, perlu templat disetujui</span></h3>
        <Field label="Phone number ID" hint="Dari Meta for Developers > WhatsApp > Penyiapan API. Hanya angka."><input className={inputClass} inputMode="numeric" value={wa.phoneNumberId} onChange={(e) => setWa({ ...wa, phoneNumberId: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Token tetap" hint={view.wa.hasToken ? `Tersimpan (${view.wa.tokenPreview}). Kosongkan untuk mempertahankan.` : 'Token pengguna sistem (kedaluwarsa: tidak pernah). Jangan dikirim lewat chat.'}>
          <input type="password" autoComplete="off" className={inputClass} value={wa.token} onChange={(e) => setWa({ ...wa, token: e.target.value })} placeholder={view.wa.hasToken ? '••••••••••••' : 'Tempel token'} />
        </Field>
        <Field label="Nomor WhatsApp admin (satu per baris, maks. 5)" hint="Contoh: 0812 3456 7890. Dengan nomor uji Meta, nomor ini harus sudah didaftarkan sebagai penerima uji."><textarea className={inputClass} rows={3} value={wa.adminNumbers} onChange={(e) => setWa({ ...wa, adminNumbers: e.target.value })} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Templat 'pesanan dibayar'" hint="Isian: nomor, nama, total, pengiriman"><input className={inputClass} value={wa.templatePaid} onChange={(e) => setWa({ ...wa, templatePaid: e.target.value })} /></Field>
          <Field label="Templat 'perlu dicek'" hint="Isian: nomor, keterangan"><input className={inputClass} value={wa.templateReview} onChange={(e) => setWa({ ...wa, templateReview: e.target.value })} /></Field>
          <Field label="Bahasa templat" hint="id = Indonesia"><input className={inputClass} value={wa.language} onChange={(e) => setWa({ ...wa, language: e.target.value })} /></Field>
        </div>
        <Switch checked={wa.enabled} onChange={(v) => setWa({ ...wa, enabled: v })} title="Kirim lewat WhatsApp" desc={wa.enabled ? 'AKTIF' : 'Nonaktif'} />
      </div>

      <div className={cardClass}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={!!busy} className={btnPrimary}>{busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />} Simpan</button>
          <button type="button" onClick={sendTest} disabled={!!busy} className={btnGhost}>{busy === 'test' && <Loader2 className="h-4 w-4 animate-spin" />} Kirim pesan tes</button>
        </div>
        <p className="mt-2 text-xs text-[#7E9488]">Pesan tes memakai pengaturan yang sudah tersimpan: tekan Simpan dulu bila baru mengubah.</p>
        {results && (
          <ul className="mt-3 space-y-1 text-sm">
            {results.length === 0 && <li className="rounded-xl bg-[#FDECEC] p-3 text-[#9B2C2C]">Belum ada saluran yang aktif. Nyalakan salah satu lalu Simpan.</li>}
            {results.map((r, i) => (
              <li key={i} className={`rounded-xl p-3 ${r.ok ? 'bg-[#E3F0E7] text-[#1E5A3A]' : 'bg-[#FDECEC] text-[#9B2C2C]'}`}>
                {r.channel === 'whatsapp' ? 'WhatsApp (resmi)' : r.channel === 'baileys' ? 'WhatsApp (Baileys)' : 'Telegram'} {r.to}: {r.ok ? 'terkirim' : r.error}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
