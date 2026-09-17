'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  GalleryHorizontal,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  Phone,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
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
  isPromo: false,
})
const newSlide = () => ({
  id: `slide-${Date.now()}-${uid++}`,
  badge: '',
  title: '',
  subtitle: '',
  image: '',
})

const NAV_ITEMS = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'hero', label: 'Hero Carousel', icon: GalleryHorizontal },
  { id: 'products', label: 'Produk & Promo', icon: Package },
  { id: 'contact', label: 'Kontak & Banner', icon: Phone },
  { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
]

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#1F3A28]">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-[#7E9488]">{hint}</p>}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-[#D6EBDC] bg-[#FBFEFC] px-4 py-2.5 text-[#1F3A28] outline-none focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20'

const cardClass = 'rounded-2xl border border-[#D6EBDC] bg-white p-6'

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
      <span className="mb-1.5 block text-sm font-medium text-[#1F3A28]">{label}</span>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#D6EBDC] bg-[#FBFEFC]">
            <Image src={value} alt="" fill sizes="64px" className="object-cover" />
          </div>
        )}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#D6EBDC] bg-white px-4 py-2.5 text-sm font-medium text-[#1F3A28] transition hover:border-[#2FA966] disabled:opacity-60"
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
          <span className="mb-1.5 block text-xs text-[#7E9488]">Atau pilih dari foto yang tersedia</span>
          <div className="flex flex-wrap gap-2">
            {availableImages.map((src) => (
              <button
                type="button"
                key={src}
                onClick={() => onChange(src)}
                className={`overflow-hidden rounded-md border-2 transition ${
                  value === src ? 'border-[#2FA966]' : 'border-transparent hover:border-[#D6EBDC]'
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

function StatCard({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'good'
      ? 'text-[#2FA966]'
      : tone === 'bad'
        ? 'text-red-600'
        : 'text-[#142A1C]'
  return (
    <div className={cardClass}>
      <p className="text-xs font-medium uppercase tracking-wide text-[#7E9488]">{label}</p>
      <p className={`mt-2 font-serif text-3xl ${toneClass}`}>{value}</p>
    </div>
  )
}

export default function SettingsForm({ initialSettings, availableImages, hasMongo }) {
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [whatsappNumber, setWhatsappNumber] = useState(initialSettings.whatsappNumber || '')
  const [waMessage, setWaMessage] = useState(initialSettings.waMessage || '')
  const [heroSlides, setHeroSlides] = useState(initialSettings.heroSlides || [])
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

  function updateSlide(id, patch) {
    setHeroSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  function removeSlide(id) {
    setHeroSlides((prev) => prev.filter((s) => s.id !== id))
  }
  function addSlide() {
    setHeroSlides((prev) => [...prev, newSlide()])
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
    router.refresh()
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!products.length) {
      toast.error('Minimal harus ada satu produk.')
      setTab('products')
      return
    }
    for (const p of products) {
      if (!p.name.trim()) {
        toast.error('Nama produk tidak boleh kosong.')
        setTab('products')
        return
      }
    }
    if (!heroSlides.length) {
      toast.error('Minimal harus ada satu slide hero.')
      setTab('hero')
      return
    }
    for (const s of heroSlides) {
      if (!s.title.trim()) {
        toast.error('Judul slide hero tidak boleh kosong.')
        setTab('hero')
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
          heroSlides,
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

  const activeLabel = NAV_ITEMS.find((n) => n.id === tab)?.label || ''
  const promoCount = products.filter((p) => p.isPromo).length

  const navList = (onNavigate) => (
    <>
      <div className="border-b border-[#D6EBDC] px-6 py-5">
        <p className="font-serif text-lg font-medium text-[#142A1C]">
          Ladang <span className="text-[#2FA966]">pangan.id</span>
        </p>
        <p className="text-xs text-[#7E9488]">Admin Panel</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id)
                onNavigate?.()
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-[#E1F4E7] text-[#22824E]'
                  : 'text-[#4C6356] hover:bg-[#F7FBF8] hover:text-[#142A1C]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="space-y-1 border-t border-[#D6EBDC] p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[#4C6356] transition hover:bg-[#F7FBF8] hover:text-[#142A1C]"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          Lihat Halaman
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-[#F7FBF8]">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#D6EBDC] bg-white lg:flex">
        {navList()}
      </aside>

      {/* Sidebar (mobile drawer) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-4 rounded-full p-1.5 hover:bg-[#F7FBF8]"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5 text-[#1F3A28]" />
            </button>
            {navList(() => setSidebarOpen(false))}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#D6EBDC] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 hover:bg-[#F7FBF8] lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5 text-[#1F3A28]" />
            </button>
            <h1 className="truncate text-lg font-semibold text-[#142A1C]">{activeLabel}</h1>
          </div>
          <button
            type="submit"
            form="settings-form"
            disabled={saving}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#22824E] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">Simpan</span>
          </button>
        </header>

        <form id="settings-form" onSubmit={handleSave} className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:px-6">
          {tab === 'overview' && (
            <div className="space-y-6">
              {!hasMongo && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Database belum tersambung</p>
                    <p className="mt-0.5 text-sm text-amber-800">
                      Perubahan yang Anda simpan di sini tidak akan tersimpan permanen sampai MongoDB
                      disambungkan. Halaman publik tetap tampil normal memakai data bawaan.
                    </p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label="Total Produk" value={products.length} />
                <StatCard label="Produk Promo" value={promoCount} />
                <StatCard label="Slide Hero" value={heroSlides.length} />
                <StatCard
                  label="Database"
                  value={hasMongo ? 'Tersambung' : 'Belum'}
                  tone={hasMongo ? 'good' : 'bad'}
                />
                <StatCard
                  label="Midtrans"
                  value={hasServerKey ? 'Aktif' : 'Belum'}
                  tone={hasServerKey ? 'good' : 'bad'}
                />
                <StatCard
                  label="Mode Pembayaran"
                  value={isProduction ? 'Production' : 'Sandbox'}
                  tone={isProduction ? 'good' : 'default'}
                />
              </div>
              <div className={cardClass}>
                <h2 className="text-base font-semibold text-[#142A1C]">Mulai dari sini</h2>
                <p className="mt-1 text-sm text-[#4C6356]">
                  Kelola tampilan dan pengaturan landing page dari menu di samping.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {NAV_ITEMS.filter((n) => n.id !== 'overview').map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className="flex items-center gap-2.5 rounded-xl border border-[#D6EBDC] px-4 py-3 text-left text-sm font-medium text-[#1F3A28] transition hover:border-[#2FA966] hover:text-[#2FA966]"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'hero' && (
            <div className={cardClass}>
              <h2 className="text-base font-semibold text-[#142A1C]">Hero Carousel</h2>
              <p className="mt-1 text-sm text-[#4C6356]">
                Slide yang tampil bergantian di paling atas halaman. Tambahkan beberapa slide supaya jadi carousel.
              </p>
              <div className="mt-4 space-y-5">
                {heroSlides.map((s, idx) => (
                  <div key={s.id} className="space-y-3 rounded-xl border border-[#D6EBDC] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#7E9488]">Slide {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSlide(s.id)}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Field label="Badge Kecil" hint="Teks pendek di atas judul, contoh: Produsen Ayam Langsung dari Peternak">
                      <input className={inputClass} value={s.badge} onChange={(e) => updateSlide(s.id, { badge: e.target.value })} />
                    </Field>
                    <Field label="Judul">
                      <textarea
                        className={inputClass}
                        rows={2}
                        value={s.title}
                        onChange={(e) => updateSlide(s.id, { title: e.target.value })}
                      />
                    </Field>
                    <Field label="Sub-judul">
                      <textarea
                        className={inputClass}
                        rows={2}
                        value={s.subtitle}
                        onChange={(e) => updateSlide(s.id, { subtitle: e.target.value })}
                      />
                    </Field>
                    <ImageField
                      label="Gambar Slide"
                      value={s.image}
                      onChange={(path) => updateSlide(s.id, { image: path })}
                      availableImages={availableImages}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSlide}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D6EBDC] py-3 text-sm font-medium text-[#1F3A28] hover:border-[#2FA966] hover:text-[#2FA966]"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Slide
                </button>
              </div>
            </div>
          )}

          {tab === 'products' && (
            <div className={cardClass}>
              <h2 className="text-base font-semibold text-[#142A1C]">Produk</h2>
              <p className="mt-1 text-sm text-[#4C6356]">Produk yang tampil di halaman, termasuk harga saat checkout.</p>
              <div className="mt-4 space-y-5">
                {products.map((p, idx) => (
                  <div key={p.id} className="space-y-3 rounded-xl border border-[#D6EBDC] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#7E9488]">Produk {idx + 1}</span>
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
                    <label className="flex items-center gap-2 text-sm text-[#1F3A28]">
                      <input
                        type="checkbox"
                        checked={!!p.isPromo}
                        onChange={(e) => updateProduct(p.id, { isPromo: e.target.checked })}
                        className="h-4 w-4 rounded border-[#D6EBDC] text-[#2FA966] focus:ring-[#2FA966]"
                      />
                      Tampilkan di section Promo (kartu lebih besar, di atas semua produk)
                    </label>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addProduct}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D6EBDC] py-3 text-sm font-medium text-[#1F3A28] hover:border-[#2FA966] hover:text-[#2FA966]"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Produk
                </button>
              </div>
            </div>
          )}

          {tab === 'contact' && (
            <div className="space-y-6">
              <div className={cardClass}>
                <h2 className="text-base font-semibold text-[#142A1C]">Kontak WhatsApp</h2>
                <p className="mt-1 text-sm text-[#4C6356]">Nomor dan pesan default untuk semua tombol WhatsApp.</p>
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
              </div>
              <div className={cardClass}>
                <h2 className="text-base font-semibold text-[#142A1C]">Banner Promo</h2>
                <p className="mt-1 text-sm text-[#4C6356]">Strip promo gelap yang tampil di bawah hero carousel.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Judul Banner Promo">
                    <input className={inputClass} value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} />
                  </Field>
                  <Field label="Sub-judul Banner Promo">
                    <input className={inputClass} value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {tab === 'payment' && (
            <div className={cardClass}>
              <h2 className="text-base font-semibold text-[#142A1C]">Payment Gateway (Midtrans)</h2>
              <p className="mt-1 text-sm text-[#4C6356]">
                Ambil Server Key &amp; Client Key dari dashboard Midtrans (Settings &gt; Access Keys). Gunakan
                mode Sandbox dulu sebelum go-live.
              </p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  {hasServerKey ? (
                    <CheckCircle2 className="h-4 w-4 text-[#2FA966]" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={hasServerKey ? 'text-[#2FA966]' : 'text-red-600'}>
                    {hasServerKey ? 'Payment gateway aktif' : 'Payment gateway belum aktif'}
                  </span>
                </div>
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
                <div className="flex items-center justify-between rounded-xl border border-[#D6EBDC] p-3">
                  <div>
                    <p className="text-sm font-medium text-[#142A1C]">Mode Production</p>
                    <p className="text-xs text-[#7E9488]">
                      {isProduction ? 'AKTIF — pembayaran nyata akan diproses.' : 'Nonaktif (Sandbox) — aman untuk uji coba.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isProduction}
                    onClick={() => setIsProduction((v) => !v)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      isProduction ? 'bg-[#2FA966]' : 'bg-[#D6EBDC]'
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
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
