'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import SafeImage from '../../_components/safe-image'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  GalleryHorizontal,
  ImageIcon,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Boxes,
  Truck,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatIDR } from '@/lib/format'
import AccountsPanel from './accounts-panel'
import BundlesPanel from './bundles-panel'
import DeliveryPanel from './delivery-panel'
import TodayPanel from './today-panel'
import OrdersPanel from './orders-panel'
import KirimPanel from './kirim-panel'
import BiteshipPanel from './biteship-panel'
import ImportPanel from './import-panel'
import NotifyPanel from './notify-panel'
import RecipesPanel from './recipes-panel'
import ReferralPanel from './referral-panel'
import CustomersPanel from './customers-panel'
import { wibNow } from '@/lib/shipping'

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
  erpCode: '',
  stock: null,
  weightKg: 1,
})
const newSlide = () => ({
  id: `slide-${Date.now()}-${uid++}`,
  badge: '',
  title: '',
  subtitle: '',
  image: '',
})

const NAV_ITEMS = [
  { id: 'today', label: 'Hari ini', icon: LayoutDashboard, group: 'Harian', noSave: true },
  { id: 'orders', label: 'Pesanan', icon: ClipboardList, noSave: true },
  { id: 'kirim', label: 'Daftar Kirim Kurir', icon: Truck, noSave: true },
  { id: 'customers', label: 'Pelanggan', icon: Users, ownerOnly: true, noSave: true },
  { id: 'products', label: 'Produk & Promo', icon: Package, group: 'Produk & Paket' },
  { id: 'bundles', label: 'Paket Hemat & Masak', icon: Boxes },
  { id: 'recipes', label: 'Inspirasi Menu', icon: Boxes, noSave: true },
  { id: 'referral', label: 'Referral', icon: Users, ownerOnly: true, noSave: true },
  { id: 'delivery', label: 'Ongkir & Voucher', icon: Truck, ownerOnly: true, group: 'Pengaturan' },
  { id: 'biteship', label: 'Kurir Instan (Biteship)', icon: Truck, ownerOnly: true, noSave: true },
  { id: 'contact', label: 'Pengaturan Toko', icon: Phone },
  { id: 'hero', label: 'Hero Carousel', icon: GalleryHorizontal },
  { id: 'media', label: 'Galeri Gambar', icon: ImageIcon },
  { id: 'payment', label: 'Payment Gateway', icon: CreditCard, ownerOnly: true },
  { id: 'notify', label: 'Notifikasi Admin', icon: Phone, ownerOnly: true, noSave: true },
  { id: 'accounts', label: 'Akun', icon: Users },
]

const wibToday = () => wibNow().date

function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const ORDER_STATUS_LABEL = {
  menunggu_bayar: 'Menunggu Bayar',
  dibayar: 'Dibayar',
  dikemas: 'Dikemas',
  dikirim: 'Dikirim',
  diterima: 'Diterima',
  batal: 'Batal',
  gagal: 'Gagal',
  kedaluwarsa: 'Kedaluwarsa',
}

const ORDER_STATUS_CLASS = {
  menunggu_bayar: 'bg-amber-50 text-amber-700 border-amber-200',
  dibayar: 'bg-[#E1F4E7] text-[#22824E] border-[#2FA966]/30',
  dikemas: 'bg-[#E1F4E7] text-[#22824E] border-[#2FA966]/30',
  dikirim: 'bg-blue-50 text-blue-700 border-blue-200',
  diterima: 'bg-[#E1F4E7] text-[#22824E] border-[#2FA966]/30',
  batal: 'bg-gray-100 text-gray-600 border-gray-200',
  gagal: 'bg-red-50 text-red-700 border-red-200',
  kedaluwarsa: 'bg-gray-100 text-gray-600 border-gray-200',
}

const SHIPPING_LABEL = {
  internal: 'Kurir Internal',
  gosend: 'GoSend',
  grabexpress: 'GrabExpress',
  lainnya: 'Lainnya',
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

// Pilih kategori dari daftar yang sudah ada, atau tambah kategori baru.
function CategoryField({ value, options, onChange }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const list = Array.from(new Set(['Lainnya', ...options, ...(value ? [value] : [])])).sort((a, b) => a.localeCompare(b, 'id'))

  function confirmNew() {
    const name = draft.trim().slice(0, 60)
    if (!name) return
    onChange(name)
    setAdding(false)
    setDraft('')
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          className={inputClass}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              confirmNew()
            }
          }}
          placeholder="Nama kategori baru"
          maxLength={60}
        />
        <button
          type="button"
          onClick={confirmNew}
          className="shrink-0 rounded-xl bg-[#2FA966] px-4 text-sm font-medium text-white hover:bg-[#22824E]"
        >
          Pakai
        </button>
        <button
          type="button"
          onClick={() => {
            setAdding(false)
            setDraft('')
          }}
          className="shrink-0 rounded-xl border border-[#D6EBDC] px-3 text-sm text-[#4C6356]"
        >
          Batal
        </button>
      </div>
    )
  }

  return (
    <select
      className={inputClass}
      value={value || 'Lainnya'}
      onChange={(e) => (e.target.value === '__baru__' ? setAdding(true) : onChange(e.target.value))}
    >
      {list.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
      <option value="__baru__">+ Tambah kategori baru…</option>
    </select>
  )
}

function ProductEditModal({ product, isNew, onChange, onSave, onClose, availableImages, saving, categories }) {
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
              <CategoryField
                value={product.category || ''}
                options={categories || []}
                onChange={(category) => onChange({ category })}
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
          <Field label="Stok" hint="Kosongkan bila stok tidak dihitung (selalu tersedia). Isi 0 untuk menandai habis.">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              className={inputClass}
              value={product.stock ?? ''}
              onChange={(e) => onChange({ stock: e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
              placeholder="Tidak dihitung"
            />
          </Field>
          <Field label="Berat per satuan (kg)" hint="Dipakai menghitung muatan kurir (maks 40 kg per trip). Contoh: 1 ekor karkas 0,9; ceker per kg 1.">
            <input
              type="number"
              min="0.01"
              step="0.05"
              inputMode="decimal"
              className={inputClass}
              value={product.weightKg ?? ''}
              onChange={(e) => onChange({ weightKg: e.target.value === '' ? '' : Number(e.target.value) })}
            />
          </Field>
          <Field label="Kode ERP" hint="Dipakai untuk menyambungkan ke ERP nanti. Boleh dikosongkan.">
            <input
              className={inputClass}
              value={product.erpCode || ''}
              onChange={(e) => onChange({ erpCode: e.target.value })}
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
            disabled={saving}
            className="rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#22824E] disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : isNew ? 'Tambah' : 'Simpan Perubahan'}
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

export default function SettingsForm({ initialSettings, availableImages, hasMongo, admin }) {
  const isOwner = admin?.role === 'owner'
  const router = useRouter()
  const [tab, setTab] = useState('today')
  const [ordersFilter, setOrdersFilter] = useState('')
  const [summary, setSummary] = useState(null)
  const seenPaid = useRef(null)

  function goTo(next, filter = '') {
    setOrdersFilter(filter)
    setTab(next)
  }
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
  const [gateway, setGateway] = useState(initialSettings.paymentGateway || 'midtrans')
  const [mayarKey, setMayarKey] = useState('')
  const [mayarToken, setMayarToken] = useState('')
  const [mayarProd, setMayarProd] = useState(!!initialSettings.mayarIsProduction)
  const [hasMayarKey, setHasMayarKey] = useState(!!initialSettings.hasMayarApiKey)
  const [hasMayarToken, setHasMayarToken] = useState(!!initialSettings.hasMayarWebhookToken)
  const [mayarKeyPreview, setMayarKeyPreview] = useState(initialSettings.mayarApiKeyPreview)
  const [ipVa, setIpVa] = useState(initialSettings.ipaymuVa || '')
  const [ipKey, setIpKey] = useState('')
  const [ipToken, setIpToken] = useState('')
  const [ipProd, setIpProd] = useState(!!initialSettings.ipaymuIsProduction)
  const [hasIpKey, setHasIpKey] = useState(!!initialSettings.hasIpaymuApiKey)
  const [hasIpToken, setHasIpToken] = useState(!!initialSettings.hasIpaymuNotifyToken)
  const [ipKeyPreview, setIpKeyPreview] = useState(initialSettings.ipaymuApiKeyPreview)
  const [payEvents, setPayEvents] = useState([])
  const [testing, setTesting] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savingProducts, setSavingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')
  const [editingProduct, setEditingProduct] = useState(null)
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [mediaImages, setMediaImages] = useState([])
  const [mediaLoading, setMediaLoading] = useState(true)
  const [mediaUploading, setMediaUploading] = useState(false)
  const mediaFileRef = useRef(null)

  // Tes koneksi memakai kunci yang sudah tersimpan: simpan dulu bila baru mengganti kunci/mode.
  async function testGateway(id) {
    setTesting(id)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/payment-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gateway: id }) })
      const data = await res.json().catch(() => ({}))
      setTestResult({ gateway: id, ok: !!data.ok, message: data.message || data.error || 'Tes gagal.' })
    } catch {
      setTestResult({ gateway: id, ok: false, message: 'Tes gagal. Periksa koneksi internet Anda.' })
    } finally {
      setTesting('')
    }
  }

  useEffect(() => {
    if (tab !== 'payment' || !isOwner) return
    fetch('/api/admin/payment-events').then((r) => r.json()).then((d) => setPayEvents(d.events || [])).catch(() => {})
  }, [tab, isOwner])

  // Cek pesanan baru yang sudah dibayar tiap 30 detik (pemberitahuan di aplikasi).
  useEffect(() => {
    if (!hasMongo) return undefined
    let stop = false
    async function check() {
      try {
        const res = await fetch('/api/admin/today', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (stop) return
        setSummary(data)
        const paid = data.counts?.dibayar || 0
        const marker = `${paid}|${data.latestPaidAt || ''}`
        if (seenPaid.current !== null && seenPaid.current !== marker && data.latestPaidAt) {
          toast.success('Ada pesanan baru yang sudah dibayar!', { duration: 8000 })
        }
        seenPaid.current = marker
      } catch {}
    }
    check()
    const t = setInterval(check, 30000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [hasMongo])

  useEffect(() => {
    const n = summary?.counts?.dibayar || 0
    document.title = n > 0 ? `(${n}) Admin — Ladang Pangan` : 'Admin — Ladang Pangan'
  }, [summary])

  async function loadMedia() {
    setMediaLoading(true)
    try {
      const res = await fetch('/api/admin/upload')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat galeri gambar.')
      setMediaImages(data.images || [])
    } catch (error) {
      toast.error(error.message || 'Gagal memuat galeri gambar.')
    } finally {
      setMediaLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [])

  async function handleMediaUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaUploading(true)
    try {
      await uploadImage(file)
      toast.success('Gambar berhasil diunggah.')
      await loadMedia()
    } catch (error) {
      toast.error(error.message || 'Gagal upload gambar.')
    } finally {
      setMediaUploading(false)
      if (mediaFileRef.current) mediaFileRef.current.value = ''
    }
  }

  async function deleteMediaImage(filename) {
    if (!window.confirm('Hapus gambar ini? Produk/slide yang masih memakainya akan tampil rusak.')) return
    try {
      const res = await fetch(`/api/admin/upload/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus gambar.')
      setMediaImages((prev) => prev.filter((img) => img.filename !== filename))
      toast.success('Gambar dihapus.')
    } catch (error) {
      toast.error(error.message || 'Gagal menghapus gambar.')
    }
  }

  // Produk langsung disimpan ke server (tidak menunggu tombol Simpan di atas).
  // Mengembalikan true bila berhasil; daftar di layar diganti dengan versi server.
  async function persistProducts(list, okMessage) {
    setSavingProducts(true)
    try {
      const res = await fetch('/api/admin/landing-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: list }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan produk.')
      setProducts(data.products || list)
      toast.success(okMessage)
      return true
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan produk. Perubahan belum tersimpan.')
      return false
    } finally {
      setSavingProducts(false)
    }
  }

  async function removeProduct(id) {
    await persistProducts(products.filter((p) => p.id !== id), 'Produk dihapus.')
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
  async function saveProductModal() {
    if (!editingProduct.name.trim()) {
      toast.error('Nama produk tidak boleh kosong.')
      return
    }
    if (!(Number(editingProduct.price) > 0)) {
      toast.error('Harga produk harus lebih dari 0.')
      return
    }
    const next = isNewProduct
      ? [...products, editingProduct]
      : products.map((p) => (p.id === editingProduct.id ? editingProduct : p))
    // Jendela tetap terbuka bila gagal supaya isian tidak hilang.
    const ok = await persistProducts(next, isNewProduct ? 'Produk ditambahkan dan tersimpan.' : 'Perubahan produk tersimpan.')
    if (ok) setEditingProduct(null)
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
          paymentGateway: gateway,
          mayarApiKey: mayarKey,
          mayarWebhookToken: mayarToken,
          mayarIsProduction: mayarProd,
          ipaymuVa: ipVa,
          ipaymuApiKey: ipKey,
          ipaymuNotifyToken: ipToken,
          ipaymuIsProduction: ipProd,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.')

      setHasServerKey(data.hasMidtransServerKey)
      setServerKeyPreview(data.midtransServerKeyPreview)
      setHasMayarKey(!!data.hasMayarApiKey)
      setHasMayarToken(!!data.hasMayarWebhookToken)
      setMayarKeyPreview(data.mayarApiKeyPreview)
      setMayarKey('')
      setMayarToken('')
      setHasIpKey(!!data.hasIpaymuApiKey)
      setHasIpToken(!!data.hasIpaymuNotifyToken)
      setIpKeyPreview(data.ipaymuApiKeyPreview)
      setIpKey('')
      setIpToken('')
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
  const paidBadge = summary?.counts?.dibayar || 0
  const hideSave = !!NAV_ITEMS.find((n) => n.id === tab)?.noSave
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
        {NAV_ITEMS.filter((item) => isOwner || !item.ownerOnly).map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <div key={item.id}>
            {item.group && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#7E9488]">{item.group}</p>}
            <button
              type="button"
              onClick={() => {
                if (item.id === 'orders') setOrdersFilter('')
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
              {item.id === 'orders' && paidBadge > 0 && (
                <span className="ml-auto rounded-full bg-[#1E5A3A] px-2 py-0.5 text-xs font-bold text-white">{paidBadge}</span>
              )}
            </button>
            </div>
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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#D6EBDC] bg-white print:!hidden lg:flex">
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
        <header className="sticky top-0 z-30 print:hidden flex items-center justify-between gap-3 border-b border-[#D6EBDC] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
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
          {!hideSave && <button
            type="submit"
            form="settings-form"
            disabled={saving}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#22824E] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">Simpan</span>
          </button>}
        </header>

        <form id="settings-form" onSubmit={handleSave} className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
          {tab === 'today' && <TodayPanel summary={summary} go={goTo} hasMongo={hasMongo} />}

          {tab === 'orders' && <OrdersPanel key={ordersFilter} initialFilter={ordersFilter} />}

          {tab === 'notify' && isOwner && <NotifyPanel />}
          {tab === 'referral' && isOwner && <ReferralPanel />}
          {tab === 'customers' && isOwner && <CustomersPanel />}

          {tab === 'kirim' && <KirimPanel today={summary?.today || wibToday()} />}

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
              <ImportPanel onImported={() => window.location.reload()} />
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
                          <th className="px-4 py-3">Stok</th>
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
                                    <SafeImage src={p.image} alt="" fill sizes="40px" className="object-cover" />
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
                            <td className="px-4 py-2.5 whitespace-nowrap text-[#4C6356]">
                              {p.stock === null || p.stock === undefined ? 'Tak dihitung' : p.stock <= 0 ? 'Habis' : p.stock}
                            </td>
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

          {tab === 'media' && (
            <div className="mx-auto w-full max-w-5xl space-y-4">
              <div className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[#142A1C]">Galeri Gambar</h2>
                    <p className="mt-1 text-sm text-[#4C6356]">
                      Semua gambar yang pernah diunggah. Hapus yang tidak terpakai supaya galeri
                      tetap rapi.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadMedia}
                      disabled={mediaLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6EBDC] bg-white px-3 py-2.5 text-sm text-[#1F3A28] transition hover:border-[#2FA966] disabled:opacity-60"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${mediaLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      disabled={mediaUploading}
                      onClick={() => mediaFileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#22824E] disabled:opacity-60"
                    >
                      {mediaUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload Gambar
                    </button>
                    <input
                      ref={mediaFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleMediaUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                {mediaLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-[#2FA966]" />
                  </div>
                ) : mediaImages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-[#7E9488]">
                    Belum ada gambar yang diunggah. Klik &quot;Upload Gambar&quot; untuk mulai.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {mediaImages.map((img) => (
                      <div key={img.filename} className="group relative overflow-hidden rounded-xl border border-[#D6EBDC]">
                        <div className="relative aspect-square w-full bg-[#FBFEFC]">
                          <Image src={img.path} alt={img.filename} fill sizes="200px" className="object-cover" />
                        </div>
                        <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-2">
                          <span className="truncate text-xs text-[#7E9488]">{formatBytes(img.size)}</span>
                          <button
                            type="button"
                            onClick={() => deleteMediaImage(img.filename)}
                            className="rounded-lg p-1 text-red-600 hover:bg-red-50"
                            aria-label="Hapus gambar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
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

          {tab === 'delivery' && isOwner && <DeliveryPanel />}

          {tab === 'biteship' && isOwner && <BiteshipPanel />}

          {tab === 'recipes' && <RecipesPanel ImageField={ImageField} availableImages={availableImages} />}

          {tab === 'bundles' && <BundlesPanel ImageField={ImageField} availableImages={availableImages} />}

          {tab === 'accounts' && <AccountsPanel admin={admin} />}

          {tab === 'payment' && isOwner && (
            <div className={`mx-auto w-full max-w-3xl ${cardClass}`}>
              <h2 className="text-base font-semibold text-[#142A1C]">Payment Gateway</h2>
              <p className="mt-1 text-sm text-[#4C6356]">Pilih satu penyedia pembayaran yang dipakai pembeli. Isi kunci keduanya bila perlu; yang aktif hanya yang dipilih.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[['midtrans', 'Midtrans'], ['mayar', 'Mayar.id'], ['ipaymu', 'iPaymu']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setGateway(id)}
                    className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${gateway === id ? 'border-[#1E5A3A] bg-[#1E5A3A] text-white' : 'border-[#D6EBDC] bg-white text-[#1F3A28]'}`}
                  >
                    {label}{gateway === id ? ' (aktif)' : ''}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-[#7E9488]">Tekan Simpan di kanan atas setelah memilih.</p>

              {gateway === 'mayar' && (
                <div className="mt-5 space-y-4 rounded-xl border border-[#D6EBDC] p-4">
                  <h3 className="text-sm font-semibold text-[#142A1C]">Pengaturan Mayar.id</h3>
                  <div className="flex items-center gap-2 text-sm">
                    {hasMayarKey && hasMayarToken ? <CheckCircle2 className="h-4 w-4 text-[#2FA966]" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    <span className={hasMayarKey && hasMayarToken ? 'text-[#2FA966]' : 'text-red-600'}>
                      {hasMayarKey && hasMayarToken ? 'Mayar siap dipakai' : 'Mayar belum lengkap: isi API Key dan Webhook Token'}
                    </span>
                  </div>
                  <Field label="API Key Mayar" hint={hasMayarKey ? `Tersimpan (${mayarKeyPreview}) — kosongkan untuk mempertahankan.` : 'Buat di web.mayar.id (menu API Keys) dan pilih izin "Read & Write" (kunci "Read Only" tidak bisa membuat tagihan). Sandbox (web.mayar.club) dan Production punya kunci berbeda.'}>
                    <input type="password" autoComplete="off" className={inputClass} value={mayarKey} onChange={(e) => setMayarKey(e.target.value)} placeholder={hasMayarKey ? '••••••••••••' : 'Tempel API Key'} />
                  </Field>
                  <Field label="Webhook Token" hint={hasMayarToken ? 'Tersimpan — kosongkan untuk mempertahankan.' : 'Karang sendiri sebuah teks acak panjang (min. 24 huruf/angka). Teks yang sama dimasukkan di Mayar saat mendaftarkan webhook.'}>
                    <input type="password" autoComplete="off" className={inputClass} value={mayarToken} onChange={(e) => setMayarToken(e.target.value)} placeholder={hasMayarToken ? '••••••••••••' : 'Teks rahasia acak'} />
                  </Field>
                  <div className="rounded-xl bg-[#F7FBF8] p-3 text-xs text-[#1F3A28]">
                    <p className="font-semibold">Alamat webhook untuk didaftarkan di Mayar:</p>
                    <p className="mt-1 break-all font-mono">https://marketplace.ladangpangan.id/api/mayar/notification</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#D6EBDC] p-3">
                    <div>
                      <p className="text-sm font-medium text-[#142A1C]">Mayar mode Production</p>
                      <p className="text-xs text-[#7E9488]">{mayarProd ? 'AKTIF — pembayaran nyata.' : 'Nonaktif (Sandbox) — aman untuk uji coba.'}</p>
                    </div>
                    <button type="button" role="switch" aria-checked={mayarProd} onClick={() => setMayarProd((v) => !v)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${mayarProd ? 'bg-[#2FA966]' : 'bg-[#D6EBDC]'}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${mayarProd ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <button type="button" onClick={() => testGateway('mayar')} disabled={!!testing} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1E5A3A] bg-white text-sm font-semibold text-[#1E5A3A] disabled:opacity-60">
                      {testing === 'mayar' && <Loader2 className="h-4 w-4 animate-spin" />} Tes koneksi
                    </button>
                    <p className="text-xs text-[#7E9488]">Memakai kunci yang sudah tersimpan. Tekan Simpan dulu bila baru mengganti kunci atau saklar Production.</p>
                    {testResult?.gateway === 'mayar' && (
                      <p className={`rounded-xl p-3 text-sm ${testResult.ok ? 'bg-[#E3F0E7] text-[#1E5A3A]' : 'bg-red-50 text-red-700'}`}>{testResult.message}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#142A1C]">Pemberitahuan terakhir dari penyedia</p>
                    {payEvents.length === 0 ? (
                      <p className="mt-1 text-xs text-[#7E9488]">Belum ada. Setelah pembayaran uji coba, isinya muncul di sini (berguna bila status pesanan tidak berubah).</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {payEvents.map((e, i) => (
                          <li key={i} className="rounded-lg border border-[#D6EBDC] p-2 text-xs">
                            <p className="font-semibold">{e.gateway} · {new Date(e.at).toLocaleString('id-ID')} · {e.outcome}</p>
                            <p className="mt-1 break-all font-mono text-[11px] text-[#4C6356]">{e.payload}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {gateway === 'ipaymu' && (
                <div className="mt-5 space-y-4 rounded-xl border border-[#D6EBDC] p-4">
                  <h3 className="text-sm font-semibold text-[#142A1C]">Pengaturan iPaymu</h3>
                  <div className="flex items-center gap-2 text-sm">
                    {ipVa && hasIpKey && hasIpToken ? <CheckCircle2 className="h-4 w-4 text-[#2FA966]" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    <span className={ipVa && hasIpKey && hasIpToken ? 'text-[#2FA966]' : 'text-red-600'}>
                      {ipVa && hasIpKey && hasIpToken ? 'iPaymu siap dipakai' : 'iPaymu belum lengkap: isi VA, API Key, dan Token Notifikasi'}
                    </span>
                  </div>
                  <Field label="Nomor VA iPaymu" hint="Angka VA dari dashboard iPaymu (menu Integrasi > API).">
                    <input inputMode="numeric" autoComplete="off" className={inputClass} value={ipVa} onChange={(e) => setIpVa(e.target.value.replace(/\D/g, ''))} placeholder="Contoh: 0000001234567890" />
                  </Field>
                  <Field label="API Key iPaymu" hint={hasIpKey ? `Tersimpan (${ipKeyPreview}) — kosongkan untuk mempertahankan.` : 'Dari dashboard iPaymu. Sandbox dan Production punya kunci berbeda.'}>
                    <input type="password" autoComplete="off" className={inputClass} value={ipKey} onChange={(e) => setIpKey(e.target.value)} placeholder={hasIpKey ? '••••••••••••' : 'Tempel API Key'} />
                  </Field>
                  <Field label="Token Notifikasi" hint={hasIpToken ? 'Tersimpan — kosongkan untuk mempertahankan.' : 'Karang sendiri teks acak panjang (min. 24 huruf/angka). Dipasang otomatis di alamat notifikasi; tidak perlu diisi di iPaymu.'}>
                    <input type="password" autoComplete="off" className={inputClass} value={ipToken} onChange={(e) => setIpToken(e.target.value)} placeholder={hasIpToken ? '••••••••••••' : 'Teks rahasia acak'} />
                  </Field>
                  <div className="rounded-xl bg-[#F7FBF8] p-3 text-xs text-[#1F3A28]">
                    <p className="font-semibold">Alamat notifikasi dikirim otomatis oleh toko ke iPaymu pada tiap pesanan:</p>
                    <p className="mt-1 break-all font-mono">https://marketplace.ladangpangan.id/api/ipaymu/notification</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[#D6EBDC] p-3">
                    <div>
                      <p className="text-sm font-medium text-[#142A1C]">iPaymu mode Production</p>
                      <p className="text-xs text-[#7E9488]">{ipProd ? 'AKTIF — pembayaran nyata.' : 'Nonaktif (Sandbox) — aman untuk uji coba.'}</p>
                    </div>
                    <button type="button" role="switch" aria-checked={ipProd} onClick={() => setIpProd((v) => !v)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${ipProd ? 'bg-[#2FA966]' : 'bg-[#D6EBDC]'}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${ipProd ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <button type="button" onClick={() => testGateway('ipaymu')} disabled={!!testing} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#1E5A3A] bg-white text-sm font-semibold text-[#1E5A3A] disabled:opacity-60">
                      {testing === 'ipaymu' && <Loader2 className="h-4 w-4 animate-spin" />} Tes koneksi
                    </button>
                    <p className="text-xs text-[#7E9488]">Memakai kunci yang sudah tersimpan. Tekan Simpan dulu bila baru mengganti kunci atau saklar Production.</p>
                    {testResult?.gateway === 'ipaymu' && (
                      <p className={`rounded-xl p-3 text-sm ${testResult.ok ? 'bg-[#E3F0E7] text-[#1E5A3A]' : 'bg-red-50 text-red-700'}`}>{testResult.message}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#142A1C]">Pemberitahuan terakhir dari penyedia</p>
                    {payEvents.length === 0 ? (
                      <p className="mt-1 text-xs text-[#7E9488]">Belum ada. Setelah pembayaran uji coba, isinya muncul di sini.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {payEvents.map((e, i) => (
                          <li key={i} className="rounded-lg border border-[#D6EBDC] p-2 text-xs">
                            <p className="font-semibold">{e.gateway} · {new Date(e.at).toLocaleString('id-ID')} · {e.outcome}</p>
                            <p className="mt-1 break-all font-mono text-[11px] text-[#4C6356]">{e.payload}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {gateway === 'midtrans' && (
              <div>
              <h3 className="mt-5 text-sm font-semibold text-[#142A1C]">Pengaturan Midtrans</h3>
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
          saving={savingProducts}
          categories={productCategories}
          availableImages={availableImages}
        />
      )}
    </div>
  )
}
