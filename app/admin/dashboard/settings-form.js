'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  GalleryHorizontal,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'

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
  { id: 'orders', label: 'Pesanan', icon: ClipboardList },
  { id: 'hero', label: 'Hero Carousel', icon: GalleryHorizontal },
  { id: 'products', label: 'Produk & Promo', icon: Package },
  { id: 'contact', label: 'Kontak & Banner', icon: Phone },
  { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
]

const ORDER_STATUS_LABEL = {
  pending: 'Menunggu Pembayaran',
  paid: 'Sudah Dibayar',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
  refunded: 'Dikembalikan',
}

const ORDER_STATUS_CLASS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-[#E1F4E7] text-[#22824E] border-[#2FA966]/30',
  failed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
  refunded: 'bg-blue-50 text-blue-700 border-blue-200',
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

function ProductEditModal({ product, isNew, onChange, onSave, onClose, availableImages }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#D6EBDC] px-5 py-4">
          <h3 className="text-base font-semibold text-[#142A1C]">
            {isNew ? 'Tambah Produk' : 'Edit Produk'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-[#F7FBF8]" aria-label="Tutup">
            <X className="h-5 w-5 text-[#1F3A28]" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Field label="Nama Produk">
            <input
              className={inputClass}
              value={product.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Karkas Ayam Frozen"
              autoFocus
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kategori" hint="Untuk pengelompokan filter">
              <input
                className={inputClass}
                value={product.category || ''}
                onChange={(e) => onChange({ category: e.target.value })}
                placeholder="Ayam Segar"
              />
            </Field>
            <Field label="Satuan">
              <input
                className={inputClass}
                value={product.unit}
                onChange={(e) => onChange({ unit: e.target.value })}
                placeholder="per ekor (± 0.9–1 kg)"
              />
            </Field>
          </div>
          <Field label="Harga (Rp)">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={product.price || ''}
              onChange={(e) => onChange({ price: Number(e.target.value) || 0 })}
              placeholder="32000"
            />
          </Field>
          <Field label="Deskripsi">
            <textarea
              className={inputClass}
              rows={2}
              value={product.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </Field>
          <ImageField
            label="Gambar Produk"
            value={product.image}
            onChange={(path) => onChange({ image: path })}
            availableImages={availableImages}
          />
          <label className="flex items-center gap-2 text-sm text-[#1F3A28]">
            <input
              type="checkbox"
              checked={!!product.isPromo}
              onChange={(e) => onChange({ isPromo: e.target.checked })}
              className="h-4 w-4 rounded border-[#D6EBDC] text-[#2FA966] focus:ring-[#2FA966]"
            />
            Tampilkan di section Promo (kartu lebih besar, di atas semua produk)
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[#D6EBDC] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#D6EBDC] px-4 py-2.5 text-sm font-medium text-[#1F3A28] hover:border-[#2FA966]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#22824E]"
          >
            {isNew ? 'Tambah' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
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

  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl || '')
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
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')
  const [editingProduct, setEditingProduct] = useState(null)
  const [isNewProduct, setIsNewProduct] = useState(false)

  async function loadOrders() {
    setOrdersLoading(true)
    try {
      const res = await fetch('/api/admin/orders')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat pesanan.')
      setOrders(data.orders || [])
    } catch (error) {
      toast.error(error.message || 'Gagal memuat pesanan.')
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  function removeProduct(id) {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  function openNewProduct() {
    setEditingProduct(newProduct())
    setIsNewProduct(true)
  }
  function openEditProduct(p) {
    setEditingProduct({ ...p })
    setIsNewProduct(false)
  }
  function closeProductModal() {
    setEditingProduct(null)
  }
  function patchEditingProduct(patch) {
    setEditingProduct((prev) => ({ ...prev, ...patch }))
  }
  function saveProductModal() {
    if (!editingProduct.name.trim()) {
      toast.error('Nama produk tidak boleh kosong.')
      return
    }
    if (isNewProduct) {
      setProducts((prev) => [...prev, editingProduct])
    } else {
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? editingProduct : p)))
    }
    setEditingProduct(null)
  }
  function deleteProductConfirm(id, name) {
    if (window.confirm(`Hapus produk "${name || 'ini'}"?`)) {
      removeProduct(id)
    }
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
          logoUrl,
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
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length
  const paidOrdersCount = orders.filter((o) => o.status === 'paid').length
  const productCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()
  const filteredProducts = products.filter((p) => {
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter
    const q = productSearch.trim().toLowerCase()
    const matchesSearch =
      !q || p.name?.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })

  const navList = (onNavigate) => (
    <>
      <div className="border-b border-[#D6EBDC] px-6 py-5">
        {logoUrl ? (
          <div className="relative h-9 w-32">
            <Image src={logoUrl} alt="ladangpangan.id" fill sizes="128px" className="object-contain object-left" />
          </div>
        ) : (
          <p className="font-serif text-lg font-medium text-[#142A1C]">
            ladang<span className="text-[#2FA966]">pangan.id</span>
          </p>
        )}
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

        <form id="settings-form" onSubmit={handleSave} className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
          {tab === 'overview' && (
            <div className="mx-auto w-full max-w-3xl space-y-6">
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
                <StatCard label="Pesanan Menunggu" value={pendingOrdersCount} tone={pendingOrdersCount > 0 ? 'bad' : 'default'} />
                <StatCard label="Pesanan Terbayar" value={paidOrdersCount} tone="good" />
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

          {tab === 'orders' && (
            <div className="mx-auto w-full max-w-3xl space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#4C6356]">
                  {orders.length} pesanan{!hasMongo && ' — database belum tersambung, daftar akan selalu kosong'}
                </p>
                <button
                  type="button"
                  onClick={loadOrders}
                  disabled={ordersLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6EBDC] bg-white px-3 py-1.5 text-sm text-[#1F3A28] transition hover:border-[#2FA966] disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2FA966]" />
                </div>
              ) : orders.length === 0 ? (
                <div className={`${cardClass} text-center text-sm text-[#7E9488]`}>Belum ada pesanan masuk.</div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => {
                    const waDigits = (o.customer?.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '62')
                    return (
                      <div key={o.orderId} className={cardClass}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs text-[#7E9488]">{o.orderId}</p>
                            <p className="text-sm text-[#4C6356]">
                              {o.createdAt ? new Date(o.createdAt).toLocaleString('id-ID') : '-'}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              ORDER_STATUS_CLASS[o.status] || ORDER_STATUS_CLASS.pending
                            }`}
                          >
                            {ORDER_STATUS_LABEL[o.status] || o.status}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-sm font-medium text-[#142A1C]">{o.customer?.name}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#4C6356]">
                              <Phone className="h-3.5 w-3.5 shrink-0" /> {o.customer?.phone}
                            </p>
                            <p className="mt-1 flex items-start gap-1.5 text-sm text-[#4C6356]">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {o.customer?.address}
                            </p>
                            {waDigits && (
                              <a
                                href={`https://wa.me/${waDigits}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#E1F4E7] px-3 py-1.5 text-xs font-medium text-[#22824E] transition hover:bg-[#2FA966] hover:text-white"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Hubungi via WhatsApp
                              </a>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-[#7E9488]">Item Pesanan</p>
                            <ul className="mt-1.5 space-y-1">
                              {(o.items || []).map((it, i) => (
                                <li key={i} className="flex justify-between gap-2 text-sm text-[#1F3A28]">
                                  <span className="truncate">
                                    {it.qty}x {it.name}
                                  </span>
                                  <span className="shrink-0">{formatIDR(it.price * it.qty)}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-2 flex justify-between border-t border-dashed border-[#D6EBDC] pt-2 text-sm font-medium text-[#142A1C]">
                              <span>Total</span>
                              <span className="text-[#2FA966]">{formatIDR(o.grossAmount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'hero' && (
            <div className={`mx-auto w-full max-w-3xl ${cardClass}`}>
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
            <div className="mx-auto w-full max-w-5xl space-y-4">
              <div className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[#142A1C]">Produk & Promo</h2>
                    <p className="mt-1 text-sm text-[#4C6356]">
                      {products.length} produk total{promoCount > 0 && ` · ${promoCount} tampil di Promo`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openNewProduct}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#22824E]"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Produk
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E9488]" />
                    <input
                      className={`${inputClass} pl-10`}
                      placeholder="Cari nama atau kategori produk..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  {productCategories.length > 0 && (
                    <select
                      className={`${inputClass} sm:w-56`}
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                    >
                      <option value="all">Semua kategori</option>
                      {productCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#D6EBDC] bg-white">
                {filteredProducts.length === 0 ? (
                  <div className="p-10 text-center text-sm text-[#7E9488]">
                    {products.length === 0
                      ? 'Belum ada produk. Klik "Tambah Produk" untuk mulai.'
                      : 'Tidak ada produk yang cocok dengan pencarian/filter.'}
                  </div>
                ) : (
                  <div className="max-h-[65vh] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-[#F7FBF8] text-xs font-medium uppercase tracking-wide text-[#7E9488]">
                        <tr>
                          <th className="px-4 py-3">Produk</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3">Harga</th>
                          <th className="px-4 py-3">Promo</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFF6F1]">
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-[#F7FBF8]">
                            <td className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => openEditProduct(p)}
                                className="flex w-full items-center gap-3 text-left"
                              >
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#D6EBDC] bg-[#FBFEFC]">
                                  {p.image && (
                                    <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-[#142A1C]">{p.name || '(tanpa nama)'}</p>
                                  <p className="truncate text-xs text-[#7E9488]">{p.unit}</p>
                                </div>
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-[#4C6356]">{p.category || '-'}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-[#4C6356]">{formatIDR(p.price)}</td>
                            <td className="px-4 py-2.5">
                              {p.isPromo && (
                                <span className="rounded-full bg-[#E1F4E7] px-2.5 py-1 text-xs font-medium text-[#22824E]">
                                  Promo
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditProduct(p)}
                                  className="rounded-lg p-1.5 text-[#1F3A28] hover:bg-[#E1F4E7]"
                                  aria-label="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteProductConfirm(p.id, p.name)}
                                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                  aria-label="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'contact' && (
            <div className="mx-auto w-full max-w-3xl space-y-6">
              <div className={cardClass}>
                <h2 className="text-base font-semibold text-[#142A1C]">Logo</h2>
                <p className="mt-1 text-sm text-[#4C6356]">
                  Ditampilkan di header halaman utama dan footer. Kosongkan untuk memakai tulisan
                  &quot;ladangpangan.id&quot; sebagai gantinya.
                </p>
                <div className="mt-4">
                  <ImageField
                    label="Logo ladangpangan.id"
                    value={logoUrl}
                    onChange={setLogoUrl}
                    availableImages={availableImages}
                  />
                </div>
              </div>
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
            <div className={`mx-auto w-full max-w-3xl ${cardClass}`}>
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

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          isNew={isNewProduct}
          onChange={patchEditingProduct}
          onSave={saveProductModal}
          onClose={closeProductModal}
          availableImages={availableImages}
        />
      )}
    </div>
  )
}
