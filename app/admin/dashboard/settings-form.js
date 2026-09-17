'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Plus, Trash2, ExternalLink, Loader2, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'

let uid = 0
const newProduct = () => ({
  id: `produk-${Date.now()}-${uid++}`,
  name: '',
  category: '',
  unit: '',
  price: 0,
  image: '',
  description: '',
})

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#3B2C21]">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-[#9C8A76]">{hint}</p>}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-[#E7D9C4] bg-[#FBF6EE] px-4 py-2.5 text-[#3B2C21] outline-none focus:border-[#B3402A] focus:ring-2 focus:ring-[#B3402A]/20'

async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Gagal upload gambar.')
  return data.path
}

function ImageField({ label, value, onChange, availableImages }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = await uploadImage(file)
      onChange(path)
      toast.success('Gambar berhasil diunggah.')
    } catch (error) {
      toast.error(error.message || 'Gagal upload gambar.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[#3B2C21]">{label}</span>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#E7D9C4] bg-[#FBF6EE]">
            <Image src={value} alt="" fill sizes="64px" className="object-cover" />
          </div>
        )}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E7D9C4] bg-white px-4 py-2.5 text-sm font-medium text-[#3B2C21] transition hover:border-[#B3402A] disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {value ? 'Ganti Gambar' : 'Upload Gambar'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {availableImages?.length > 0 && (
        <div className="mt-3">
          <span className="mb-1.5 block text-xs text-[#9C8A76]">Atau pilih dari foto yang tersedia</span>
          <div className="flex flex-wrap gap-2">
            {availableImages.map((src) => (
              <button
                type="button"
                key={src}
                onClick={() => onChange(src)}
                className={`overflow-hidden rounded-md border-2 transition ${
                  value === src ? 'border-[#B3402A]' : 'border-transparent hover:border-[#E7D9C4]'
                }`}
                title={src}
              >
                <Image src={src} alt="" width={56} height={56} className="h-14 w-14 object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsForm({ initialSettings, availableImages }) {
  const [whatsappNumber, setWhatsappNumber] = useState(initialSettings.whatsappNumber || '')
  const [waMessage, setWaMessage] = useState(initialSettings.waMessage || '')
  const [heroBadge, setHeroBadge] = useState(initialSettings.heroBadge || '')
  const [heroTitle, setHeroTitle] = useState(initialSettings.heroTitle || '')
  const [heroSubtitle, setHeroSubtitle] = useState(initialSettings.heroSubtitle || '')
  const [heroImage, setHeroImage] = useState(initialSettings.heroImage || '')
  const [bannerTitle, setBannerTitle] = useState(initialSettings.bannerTitle || '')
  const [bannerSubtitle, setBannerSubtitle] = useState(initialSettings.bannerSubtitle || '')
  const [products, setProducts] = useState(initialSettings.products || [])
  const [clientKey, setClientKey] = useState(initialSettings.midtransClientKey || '')
  const [serverKey, setServerKey] = useState('')
  const [isProduction, setIsProduction] = useState(!!initialSettings.midtransIsProduction)
  const [hasServerKey, setHasServerKey] = useState(initialSettings.hasMidtransServerKey)
  const [serverKeyPreview, setServerKeyPreview] = useState(initialSettings.midtransServerKeyPreview)
  const [saving, setSaving] = useState(false)

  function updateProduct(id, patch) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }
  function removeProduct(id) {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }
  function addProduct() {
    setProducts((prev) => [...prev, newProduct()])
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!products.length) {
      toast.error('Minimal harus ada satu produk.')
      return
    }
    for (const p of products) {
      if (!p.name.trim()) {
        toast.error('Nama produk tidak boleh kosong.')
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/landing-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappNumber,
          waMessage,
          heroBadge,
          heroTitle,
          heroSubtitle,
          heroImage,
          bannerTitle,
          bannerSubtitle,
          products,
          midtransClientKey: clientKey,
          midtransServerKey: serverKey,
          midtransIsProduction: isProduction,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.')

      setHasServerKey(data.hasMidtransServerKey)
      setServerKeyPreview(data.midtransServerKeyPreview)
      setServerKey('')
      toast.success('Pengaturan landing page berhasil disimpan.')
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan pengaturan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-10">
      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#241C15]">Hero &amp; Banner</h2>
        <p className="mt-1 text-sm text-[#6B5D4F]">Teks dan gambar utama yang tampil di paling atas halaman.</p>
        <div className="mt-4 space-y-4">
          <Field label="Badge Kecil" hint="Teks pendek di atas judul, contoh: Produsen Ayam Langsung dari Peternak">
            <input className={inputClass} value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} />
          </Field>
          <Field label="Judul Utama">
            <textarea className={inputClass} rows={2} value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
          </Field>
          <Field label="Sub-judul">
            <textarea className={inputClass} rows={2} value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
          </Field>
          <ImageField label="Gambar Hero" value={heroImage} onChange={setHeroImage} availableImages={availableImages} />
          <div className="grid gap-4 border-t border-dashed border-[#E7D9C4] pt-4 sm:grid-cols-2">
            <Field label="Judul Banner Promo">
              <input className={inputClass} value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} />
            </Field>
            <Field label="Sub-judul Banner Promo">
              <input className={inputClass} value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#241C15]">Kontak WhatsApp</h2>
        <p className="mt-1 text-sm text-[#6B5D4F]">Nomor dan pesan default untuk semua tombol WhatsApp.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nomor WhatsApp" hint="Format internasional tanpa &quot;+&quot;, contoh 6282229348883.">
            <input
              className={inputClass}
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="6282229348883"
            />
          </Field>
          <Field label="Pesan Default">
            <textarea
              className={inputClass}
              rows={2}
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#241C15]">Produk</h2>
        <p className="mt-1 text-sm text-[#6B5D4F]">Produk yang tampil di halaman, termasuk harga saat checkout.</p>
        <div className="mt-4 space-y-5">
          {products.map((p, idx) => (
            <div key={p.id} className="space-y-3 rounded-xl border border-[#E7D9C4] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#9C8A76]">Produk {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeProduct(p.id)}
                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama Produk">
                  <input
                    className={inputClass}
                    value={p.name}
                    onChange={(e) => updateProduct(p.id, { name: e.target.value })}
                    placeholder="Karkas Ayam Frozen"
                  />
                </Field>
                <Field label="Kategori" hint="Untuk pengelompokan filter di halaman utama">
                  <input
                    className={inputClass}
                    value={p.category || ''}
                    onChange={(e) => updateProduct(p.id, { category: e.target.value })}
                    placeholder="Ayam Segar"
                  />
                </Field>
                <Field label="Satuan">
                  <input
                    className={inputClass}
                    value={p.unit}
                    onChange={(e) => updateProduct(p.id, { unit: e.target.value })}
                    placeholder="per ekor (± 0.9–1 kg)"
                  />
                </Field>
                <Field label="Harga (Rp)">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={p.price || ''}
                    onChange={(e) => updateProduct(p.id, { price: Number(e.target.value) || 0 })}
                    placeholder="32000"
                  />
                </Field>
              </div>
              <Field label="Deskripsi">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={p.description}
                  onChange={(e) => updateProduct(p.id, { description: e.target.value })}
                />
              </Field>
              <ImageField
                label="Gambar Produk"
                value={p.image}
                onChange={(path) => updateProduct(p.id, { image: path })}
                availableImages={availableImages}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addProduct}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#E7D9C4] py-3 text-sm font-medium text-[#3B2C21] hover:border-[#B3402A] hover:text-[#B3402A]"
          >
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-6">
        <h2 className="text-lg font-semibold text-[#241C15]">Payment Gateway (Midtrans)</h2>
        <p className="mt-1 text-sm text-[#6B5D4F]">
          Ambil Server Key &amp; Client Key dari dashboard Midtrans (Settings &gt; Access Keys). Gunakan
          mode Sandbox dulu sebelum go-live.
        </p>
        <div className="mt-4 space-y-4">
          <Field label="Client Key">
            <input
              className={inputClass}
              value={clientKey}
              onChange={(e) => setClientKey(e.target.value)}
              placeholder="SB-Mid-client-xxxxxxxxxxxx"
            />
          </Field>
          <Field
            label="Server Key"
            hint={
              hasServerKey
                ? `Tersimpan (${serverKeyPreview}) — kosongkan untuk mempertahankan.`
                : 'Belum ada server key tersimpan — checkout tidak akan berfungsi sampai diisi.'
            }
          >
            <input
              type="password"
              autoComplete="off"
              className={inputClass}
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              placeholder={hasServerKey ? '••••••••••••' : 'SB-Mid-server-xxxxxxxxxxxx'}
            />
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-[#E7D9C4] p-3">
            <div>
              <p className="text-sm font-medium text-[#241C15]">Mode Production</p>
              <p className="text-xs text-[#9C8A76]">
                {isProduction ? 'AKTIF — pembayaran nyata akan diproses.' : 'Nonaktif (Sandbox) — aman untuk uji coba.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isProduction}
              onClick={() => setIsProduction((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                isProduction ? 'bg-[#B3402A]' : 'bg-[#E7D9C4]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  isProduction ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B5D4F] underline underline-offset-4 hover:text-[#241C15]"
        >
          Lihat halaman <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B3402A] px-6 py-3 font-medium text-white transition hover:bg-[#96311D] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Pengaturan
        </button>
      </div>
    </form>
  )
}
