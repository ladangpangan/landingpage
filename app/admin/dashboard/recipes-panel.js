'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

// Inspirasi menu / resep (Owner dan Staf). Tampil di dalam <form> besar halaman admin:
// TIDAK memakai <form>/type=submit; semua tombol bertipe "button", Enter di kolom isian dicegah.

const inputClass = 'w-full rounded-xl border border-[#D6EBDC] bg-[#FBFEFC] px-4 py-2.5 text-[#1F3A28] outline-none focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20'
const cardClass = 'rounded-2xl border border-[#D6EBDC] bg-white p-4 sm:p-6'
const btnPrimary = 'inline-flex items-center gap-2 rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#22824E] disabled:opacity-60'
const btnGhost = 'rounded-xl border border-[#D6EBDC] px-3 py-2 text-sm font-medium text-[#1F3A28] hover:border-[#2FA966]'
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

const EMPTY = { id: '', title: '', description: '', image: '', minutes: '30', servings: '4', ingredients: [], extrasText: '', stepsText: '', active: true }
const toDraft = (r) => ({ id: r.id, title: r.title, description: r.description, image: r.image, minutes: String(r.minutes || ''), servings: String(r.servings || ''), ingredients: r.ingredients.map((i) => ({ ...i })), extrasText: (r.extras || []).join('\n'), stepsText: (r.steps || []).join('\n'), active: r.active })
const toPayload = (d) => ({
  title: d.title, description: d.description, image: d.image, minutes: d.minutes, servings: d.servings, active: d.active,
  ingredients: d.ingredients.filter((i) => i.productId).map((i) => ({ productId: i.productId, qty: i.qty })),
  extras: d.extrasText.split('\n'), steps: d.stepsText.split('\n'),
})

export default function RecipesPanel({ ImageField, availableImages }) {
  const [data, setData] = useState(null)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await api('/api/admin/recipes', 'GET'))
    } catch (e) {
      toast.error(e.message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const patch = (p) => setDraft((d) => ({ ...d, ...p }))
  const setIng = (idx, p) => setDraft((d) => ({ ...d, ingredients: d.ingredients.map((x, i) => (i === idx ? { ...x, ...p } : x)) }))

  async function save() {
    setBusy(true)
    try {
      const d = draft.id ? await api(`/api/admin/recipes/${draft.id}`, 'PUT', toPayload(draft)) : await api('/api/admin/recipes', 'POST', toPayload(draft))
      setData(d)
      setDraft(null)
      toast.success('Resep tersimpan.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(r) {
    if (!window.confirm(`Hapus resep "${r.title}"?`)) return
    try {
      setData(await api(`/api/admin/recipes/${r.id}`, 'DELETE'))
      toast.success('Resep dihapus.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (!data) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#2FA966]" /></div>

  if (draft) {
    return (
      <div className={`mx-auto w-full max-w-3xl ${cardClass}`} onKeyDown={noEnter}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#142A1C]">{draft.id ? 'Ubah resep' : 'Resep baru'}</h2>
          <button type="button" onClick={() => setDraft(null)} className="rounded-lg p-2 hover:bg-[#F7FBF8]" aria-label="Tutup"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-4">
          <Field label="Judul resep"><input className={inputClass} value={draft.title} onChange={(e) => patch({ title: e.target.value })} maxLength={80} /></Field>
          <Field label="Deskripsi singkat" hint="Satu dua kalimat yang menggoda."><input className={inputClass} value={draft.description} onChange={(e) => patch({ description: e.target.value })} maxLength={300} /></Field>
          <ImageField label="Foto resep" value={draft.image} onChange={(image) => patch({ image })} availableImages={availableImages} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Waktu masak (menit)"><input className={inputClass} inputMode="numeric" value={draft.minutes} onChange={(e) => patch({ minutes: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Porsi"><input className={inputClass} inputMode="numeric" value={draft.servings} onChange={(e) => patch({ servings: e.target.value.replace(/\D/g, '') })} /></Field>
          </div>

          <div>
            <p className="text-sm font-medium text-[#142A1C]">Bahan dari toko (bisa dimasukkan ke keranjang pembeli)</p>
            <div className="mt-2 space-y-2">
              {draft.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select className={inputClass} value={ing.productId} onChange={(e) => setIng(idx, { productId: e.target.value })}>
                    <option value="">Pilih produk…</option>
                    {data.products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                  </select>
                  <input className={`${inputClass} w-20`} inputMode="numeric" value={ing.qty} onChange={(e) => setIng(idx, { qty: e.target.value.replace(/\D/g, '') })} aria-label="Jumlah" />
                  <button type="button" onClick={() => patch({ ingredients: draft.ingredients.filter((_, i) => i !== idx) })} className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label="Hapus bahan"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => patch({ ingredients: [...draft.ingredients, { productId: '', qty: 1 }] })} className={btnGhost}><Plus className="inline h-4 w-4" /> Tambah bahan toko</button>
            </div>
          </div>

          <Field label="Bahan lain (satu per baris)" hint="Bumbu, sayur, dan lainnya yang disiapkan pembeli sendiri."><textarea className={inputClass} rows={5} value={draft.extrasText} onChange={(e) => patch({ extrasText: e.target.value })} /></Field>
          <Field label="Langkah memasak (satu langkah per baris)"><textarea className={inputClass} rows={7} value={draft.stepsText} onChange={(e) => patch({ stepsText: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(e) => patch({ active: e.target.checked })} className="h-4 w-4 accent-[#1E5A3A]" /> Tampilkan di toko</label>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy} className={btnPrimary}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Resep</button>
            <button type="button" onClick={() => setDraft(null)} className={btnGhost}>Batal</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className={cardClass}>
        <h2 className="text-base font-semibold text-[#142A1C]">Inspirasi Menu</h2>
        <p className="mt-1 text-sm text-[#4C6356]">Resep yang tampil di beranda dan halaman /inspirasi. Bahan toko yang Anda tautkan bisa dimasukkan pembeli ke keranjang sekali tekan. Resep bertanda &ldquo;(contoh)&rdquo; boleh diubah atau dihapus.</p>
        <button type="button" onClick={() => setDraft({ ...EMPTY })} className={`${btnPrimary} mt-3`}><Plus className="h-4 w-4" /> Tambah Resep</button>
      </div>
      {data.recipes.length === 0 ? (
        <p className="rounded-2xl border border-[#D6EBDC] bg-white p-6 text-center text-sm text-[#7E9488]">Belum ada resep.</p>
      ) : (
        <ul className="space-y-2">
          {data.recipes.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#D6EBDC] bg-white p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#142A1C]">{r.title}{!r.active && <span className="ml-2 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">disembunyikan</span>}</p>
                <p className="text-xs text-[#7E9488]">{r.ingredients.length} bahan toko · {r.steps.length} langkah{r.minutes ? ` · ${r.minutes} menit` : ''}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => setDraft(toDraft(r))} className={btnGhost} aria-label="Ubah"><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => remove(r)} className={`${btnGhost} text-red-700`} aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
