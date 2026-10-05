'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'

// Halaman Paket (Hemat & Masak). Tampil di dalam <form> besar halaman admin,
// jadi di sini TIDAK memakai <form>: semua tombol bertipe "button", dan Enter
// di kolom isian dicegah supaya tidak ikut menyimpan pengaturan halaman.

const inputClass =
  'w-full rounded-xl border border-[#D6EBDC] bg-[#FBFEFC] px-4 py-2.5 text-[#1F3A28] outline-none focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20'
const cardClass = 'rounded-2xl border border-[#D6EBDC] bg-white p-6'
const TYPE_LABEL = { hemat: 'Paket Hemat', masak: 'Paket Masak' }

const emptyDraft = (type = 'hemat') => ({
  id: null,
  type,
  name: '',
  description: '',
  image: '',
  price: '',
  items: [{ variantId: '', qty: 1 }],
  ingredientsText: '',
  stepsText: '',
  erpCode: '',
  active: true,
})

const toLines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean)

async function api(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.')
  return data
}

function Label({ text, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#1F3A28]">{text}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-[#7E9488]">{hint}</p>}
    </label>
  )
}

export default function BundlesPanel({ ImageField, availableImages }) {
  const [bundles, setBundles] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  const apply = (data) => {
    setBundles(data.bundles || [])
    setProducts(data.products || [])
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      apply(await api('/api/admin/bundles', 'GET'))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const productById = new Map(products.map((p) => [p.id, p]))
  const normalPrice = draft
    ? draft.items.reduce((sum, it) => sum + (productById.get(it.variantId)?.price || 0) * (Number(it.qty) || 0), 0)
    : 0
  const savings = draft ? Math.max(0, normalPrice - (Number(draft.price) || 0)) : 0

  function openNew(type) {
    setDraft(emptyDraft(type))
  }
  function openEdit(b) {
    setDraft({
      id: b.id,
      type: b.type,
      name: b.name,
      description: b.description || '',
      image: b.image || '',
      price: String(b.price),
      items: (b.rawItems || []).map((it) => ({ variantId: it.variantId, qty: it.qty })),
      ingredientsText: (b.recipe?.ingredients || []).join('\n'),
      stepsText: (b.recipe?.steps || []).join('\n'),
      erpCode: b.erpCode || '',
      active: b.active !== false,
    })
  }
  const patch = (changes) => setDraft((d) => ({ ...d, ...changes }))
  const patchItem = (i, changes) => setDraft((d) => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, ...changes } : it)) }))

  async function save() {
    setSaving(true)
    try {
      const bundle = {
        type: draft.type,
        name: draft.name,
        description: draft.description,
        image: draft.image,
        price: draft.price,
        items: draft.items,
        recipe: { ingredients: toLines(draft.ingredientsText), steps: toLines(draft.stepsText) },
        erpCode: draft.erpCode,
        active: draft.active,
      }
      apply(await api('/api/admin/bundles', 'POST', { id: draft.id || undefined, bundle }))
      toast.success(draft.id ? 'Perubahan paket tersimpan.' : 'Paket ditambahkan dan tersimpan.')
      setDraft(null)
    } catch (e) {
      toast.error(e.message) // jendela tetap terbuka supaya isian tidak hilang
    } finally {
      setSaving(false)
    }
  }

  async function remove(b) {
    if (!window.confirm(`Hapus paket "${b.name}"?`)) return
    try {
      await api(`/api/admin/bundles/${b.id}`, 'DELETE')
      setBundles((prev) => prev.filter((x) => x.id !== b.id))
      toast.success('Paket dihapus.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#142A1C]">Paket Hemat &amp; Paket Masak</h2>
            <p className="mt-1 text-sm text-[#4C6356]">
              Gabungan beberapa produk dengan satu harga. Paket Masak bisa dilengkapi bahan dan langkah memasak.
              Perubahan langsung tersimpan.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openNew('hemat')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#22824E]"
            >
              <Plus className="h-4 w-4" /> Paket Hemat
            </button>
            <button
              type="button"
              onClick={() => openNew('masak')}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2FA966] px-4 py-2.5 text-sm font-medium text-[#22824E] hover:bg-[#E1F4E7]"
            >
              <Plus className="h-4 w-4" /> Paket Masak
            </button>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#2FA966]" />
          </div>
        ) : bundles.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#7E9488]">Belum ada paket. Tekan &quot;Paket Hemat&quot; atau &quot;Paket Masak&quot; di atas.</p>
        ) : (
          <ul className="divide-y divide-[#D6EBDC]">
            {bundles.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#142A1C]">{b.name}</p>
                  <p className="text-xs text-[#4C6356]">
                    {TYPE_LABEL[b.type]} · {formatIDR(b.price)}
                    {b.savings > 0 && ` · hemat ${formatIDR(b.savings)}`} · {b.items.map((it) => `${it.qty}× ${it.name}`).join(', ')}
                  </p>
                  <p className="mt-0.5 text-xs">
                    {b.active ? <span className="text-[#22824E]">Tampil di toko</span> : <span className="text-[#7E9488]">Disembunyikan</span>}
                    {b.soldOut && <span className="ml-2 font-semibold text-[#9B2C2C]">Stok bahan habis / produk hilang</span>}
                    {b.isSample && <span className="ml-2 text-[#7E9488]">(contoh)</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(b)} className="rounded-lg p-2 text-[#1F3A28] hover:bg-[#F7FBF8]" aria-label="Ubah paket">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => remove(b)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Hapus paket">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault()
          }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setDraft(null)} />
          <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#D6EBDC] px-5 py-4">
              <h3 className="text-base font-semibold text-[#142A1C]">
                {draft.id ? 'Ubah' : 'Tambah'} {TYPE_LABEL[draft.type]}
              </h3>
              <button type="button" onClick={() => setDraft(null)} className="rounded-full p-1.5 hover:bg-[#F7FBF8]" aria-label="Tutup">
                <X className="h-5 w-5 text-[#1F3A28]" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <Label text="Jenis paket">
                <select className={inputClass} value={draft.type} onChange={(e) => patch({ type: e.target.value })}>
                  <option value="hemat">Paket Hemat (beli bundel lebih murah)</option>
                  <option value="masak">Paket Masak (bahan + resep)</option>
                </select>
              </Label>
              <Label text="Nama paket">
                <input className={inputClass} value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Paket Hemat Keluarga" maxLength={100} />
              </Label>
              <Label text="Deskripsi singkat">
                <textarea className={inputClass} rows={2} value={draft.description} onChange={(e) => patch({ description: e.target.value })} maxLength={500} />
              </Label>
              <ImageField label="Foto paket" value={draft.image} onChange={(image) => patch({ image })} availableImages={availableImages} />

              <div>
                <span className="mb-1.5 block text-sm font-medium text-[#1F3A28]">Isi paket</span>
                <div className="space-y-2">
                  {draft.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select className={inputClass} value={it.variantId} onChange={(e) => patchItem(i, { variantId: e.target.value })}>
                        <option value="">Pilih produk…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatIDR(p.price)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        inputMode="numeric"
                        className="w-20 shrink-0 rounded-xl border border-[#D6EBDC] bg-[#FBFEFC] px-3 py-2.5 text-center text-[#1F3A28] outline-none focus:border-[#2FA966]"
                        value={it.qty}
                        onChange={(e) => patchItem(i, { qty: e.target.value === '' ? '' : Math.floor(Number(e.target.value) || 1) })}
                        aria-label="Jumlah"
                      />
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }))}
                        disabled={draft.items.length === 1}
                        className="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"
                        aria-label="Hapus baris"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, items: [...d.items, { variantId: '', qty: 1 }] }))}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#22824E]"
                >
                  <Plus className="h-4 w-4" /> Tambah produk ke paket
                </button>
              </div>

              <Label text="Harga paket (Rp)" hint={normalPrice > 0 ? `Harga satuan semua isi: ${formatIDR(normalPrice)}${savings > 0 ? ` · pembeli hemat ${formatIDR(savings)}` : ''}` : 'Pilih isi paket dulu untuk melihat harga satuan.'}>
                <input type="number" min="1" inputMode="numeric" className={inputClass} value={draft.price} onChange={(e) => patch({ price: e.target.value })} placeholder="80000" />
              </Label>

              {draft.type === 'masak' && (
                <>
                  <Label text="Bahan-bahan" hint="Satu bahan per baris (termasuk bumbu yang disiapkan pembeli).">
                    <textarea className={inputClass} rows={5} value={draft.ingredientsText} onChange={(e) => patch({ ingredientsText: e.target.value })} />
                  </Label>
                  <Label text="Cara memasak" hint="Satu langkah per baris, otomatis diberi nomor.">
                    <textarea className={inputClass} rows={6} value={draft.stepsText} onChange={(e) => patch({ stepsText: e.target.value })} />
                  </Label>
                </>
              )}

              <Label text="Kode ERP" hint="Untuk sambungan ke ERP nanti. Boleh dikosongkan.">
                <input className={inputClass} value={draft.erpCode} onChange={(e) => patch({ erpCode: e.target.value })} maxLength={60} />
              </Label>

              <label className="flex items-center gap-2 text-sm text-[#1F3A28]">
                <input type="checkbox" checked={draft.active} onChange={(e) => patch({ active: e.target.checked })} className="h-4 w-4 accent-[#2FA966]" />
                Tampilkan di toko
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#D6EBDC] px-5 py-4">
              <button type="button" onClick={() => setDraft(null)} disabled={saving} className="rounded-xl border border-[#D6EBDC] px-4 py-2.5 text-sm font-medium text-[#1F3A28]">
                Batal
              </button>
              <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#22824E] disabled:opacity-60">
                {saving ? 'Menyimpan...' : draft.id ? 'Simpan Perubahan' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
