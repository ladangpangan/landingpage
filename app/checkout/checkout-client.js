'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, MapPin, MessageCircle, ShieldCheck, ShoppingBag, Tag, Zap } from 'lucide-react'
import { toast } from 'sonner'
import SafeImage from '../_components/safe-image'
import { useCart } from '@/lib/cart-context'
import { formatIDR } from '@/lib/format'
import { getLocalProfile, saveLocalAddress } from '@/lib/saved-profile'

const inputClass =
  'w-full rounded-xl border border-lpi-line bg-white px-4 py-3 text-base text-lpi-ink outline-none placeholder:text-lpi-muted focus:border-lpi focus:ring-2 focus:ring-lpi/15'
const cardClass = 'rounded-2xl border border-lpi-line bg-white p-4 sm:p-5'

const jam = (hhmm) => String(hhmm || '').replace(':', '.')

function formatDay(date) {
  const d = new Date(`${date}T00:00:00+07:00`)
  return {
    hari: d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }),
    tanggal: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }),
  }
}

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className={cardClass}>
      <h2 className="flex items-center gap-2 text-base font-extrabold text-lpi-ink">
        {Icon && <Icon className="h-5 w-5 text-lpi" />}
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-lpi-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default function CheckoutClient({ whatsappNumber, waMessage, midtransClientKey, midtransIsProduction, paymentGateway }) {
  const router = useRouter()
  const { items, total: cartTotal, hydrated, clearCart } = useCart()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [me, setMe] = useState(null) // { enabled, customer }
  const [saveAddr, setSaveAddr] = useState(true)
  const [localAddrs, setLocalAddrs] = useState([])

  const [location, setLocation] = useState(null) // { lat, lng }
  const [locState, setLocState] = useState('idle') // idle | loading | ok | denied | error
  const [voucherInput, setVoucherInput] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [mode, setMode] = useState('') // 'sekarang' | 'terjadwal'
  const [date, setDate] = useState('')
  const [slotId, setSlotId] = useState('')
  const [shipMethod, setShipMethod] = useState('toko') // 'toko' | 'biteship'
  const [courierKey, setCourierKey] = useState('')

  const [quote, setQuote] = useState(null)
  const [reload, setReload] = useState(0)
  const [quoting, setQuoting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [snapReady, setSnapReady] = useState(false)
  const reqId = useRef(0)

  const snapSrc = midtransIsProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js'

  useEffect(() => {
    if (paymentGateway === 'mayar' || paymentGateway === 'ipaymu' || !midtransClientKey || typeof window === 'undefined') return
    if (window.snap) {
      setSnapReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = snapSrc
    script.setAttribute('data-client-key', midtransClientKey)
    script.async = true
    script.onload = () => setSnapReady(true)
    document.head.appendChild(script)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midtransClientKey])

  const cartLines = items.map((it) => ({ kind: it.kind || 'produk', productId: it.productId, qty: it.qty }))
  const cartKey = JSON.stringify(cartLines)

  // Perkiraan biaya dari server (zona, ongkir, voucher, slot). Semua angka dihitung server.
  useEffect(() => {
    if (!hydrated || items.length === 0) return
    const id = ++reqId.current
    setQuoting(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/checkout/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartLines,
            location,
            voucherCode,
            delivery: mode ? { mode, date: mode === 'terjadwal' ? date : undefined, slotId: mode === 'terjadwal' ? slotId : undefined } : null,
            shipping: { method: shipMethod, courier: courierKey },
          }),
        })
        const data = await res.json()
        if (id !== reqId.current) return
        if (!res.ok) throw new Error(data.error || 'Gagal menghitung biaya.')
        setQuote(data)
        if (data.storeCourier && data.storeCourier.open === false) setShipMethod('biteship')
      } catch (e) {
        if (id === reqId.current) toast.error(e.message || 'Gagal menghitung biaya.')
      } finally {
        if (id === reqId.current) setQuoting(false)
      }
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, cartKey, location, voucherCode, mode, date, slotId, shipMethod, courierKey, reload])

  // Login Google bersifat pilihan: bila ada, isi nama dan tawarkan alamat tersimpan.
  useEffect(() => {
    fetch('/api/akun/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setMe(d)
        if (d.customer?.name) setName((cur) => cur || d.customer.name)
        if (d.customer?.phone) setPhone((cur) => cur || d.customer.phone)
      })
      .catch(() => {})
    // Pembeli tanpa login: nomor dan alamat yang tersimpan di HP ini.
    const prof = getLocalProfile()
    setLocalAddrs(prof.addresses)
    if (prof.phone) setPhone((cur) => cur || prof.phone)
  }, [])
  const savedAddrs = me?.customer ? me.customer.addresses || [] : localAddrs

  function pickSavedAddress(a) {
    setName(a.name)
    setPhone(a.phone)
    setAddress(a.address)
    setLocation({ lat: a.lat, lng: a.lng })
    setLocState('ok')
    setSaveAddr(false)
  }

  function askLocation() {
    if (!navigator.geolocation) {
      setLocState('error')
      return
    }
    setLocState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocState('ok')
      },
      (err) => setLocState(err.code === 1 ? 'denied' : 'error'),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    )
  }

  function applyVoucher() {
    const code = voucherInput.trim()
    if (!code) return
    setVoucherCode(code)
  }

  const waLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`
  const pricing = quote?.pricing
  const zoneOk = !!quote?.zone
  const zoneErr = quote?.zoneError && quote.zoneError.code !== 'lokasi' ? quote.zoneError : null
  const deliveryOk = !!quote?.delivery?.ok
  const deliveryErr = mode && quote?.delivery && !quote.delivery.ok ? quote.delivery.error : null
  const storeClosed = quote?.storeCourier?.open === false
  const viaB = shipMethod === 'biteship' || storeClosed
  const chosenCourier = viaB ? quote?.biteship?.options?.find((o) => o.key === quote.biteship.chosen) || null : null
  // Ongkir sudah diketahui: kurir toko (zona + jadwal) atau kurir instan yang dipilih.
  const shippingKnown = viaB ? !!chosenCourier : zoneOk
  const ready =
    !!name.trim() && !!phone.trim() && !!address.trim() && shippingKnown && (viaB || deliveryOk) && !quote?.voucherError && !quoting && pricing?.total > 0

  async function handlePay() {
    if (!name.trim() || !phone.trim() || !address.trim()) return toast.error('Nama, nomor WhatsApp, dan alamat lengkap wajib diisi.')
    if (viaB) {
      if (!location) return toast.error('Bagikan lokasi Anda dulu supaya tarif kurir bisa dihitung.')
      if (!chosenCourier) return toast.error('Pilih kurir instan dulu.')
    } else {
      if (!zoneOk) return toast.error('Bagikan lokasi Anda dulu supaya ongkir bisa dihitung.')
      if (!deliveryOk) return toast.error('Pilih cara dan jam pengiriman.')
    }
    if (paymentGateway !== 'mayar' && paymentGateway !== 'ipaymu') {
      if (!midtransClientKey) return toast.error('Pembayaran belum disiapkan oleh toko. Silakan pesan via WhatsApp.')
      if (!snapReady || !window.snap) return toast.error('Pembayaran masih dimuat, coba lagi sebentar lagi.')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartLines,
          customer: { name, phone, address, note },
          location,
          voucherCode,
          delivery: viaB ? undefined : { mode, date: mode === 'terjadwal' ? date : undefined, slotId: mode === 'terjadwal' ? slotId : undefined },
          shipping: { method: viaB ? 'biteship' : shipMethod, courier: courierKey, expectedFee: chosenCourier ? chosenCourier.price : undefined },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) setQuote(null) // jadwal/stok berubah: hitung ulang
        throw new Error(data.error || 'Gagal membuat transaksi.')
      }

      if (!me?.customer && saveAddr && location) {
        saveLocalAddress({ label: 'Alamat', name, phone, address, lat: location.lat, lng: location.lng })
      }
      if (me?.customer && saveAddr) {
        fetch('/api/akun/alamat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: 'Alamat', name, phone, address, lat: location.lat, lng: location.lng }),
        }).catch(() => {})
      }
      // Mayar/iPaymu: pembeli diantar ke halaman bayar penyedia, lalu kembali ke halaman pesanan.
      if ((data.gateway === 'mayar' || data.gateway === 'ipaymu') && data.redirectUrl) {
        clearCart()
        window.location.href = data.redirectUrl
        return
      }
      // Pesanan sudah tersimpan: apa pun hasil jendela bayar, pembeli diantar ke halaman pesanannya
      // (di sana ia bisa melanjutkan bayar, membatalkan, atau melacak).
      const goToOrder = () => {
        clearCart()
        router.push(`/pesanan/${encodeURIComponent(data.orderId)}${data.accessKey ? `?k=${data.accessKey}` : ''}`)
      }
      window.snap.pay(data.token, {
        onSuccess: goToOrder,
        onPending: goToOrder,
        onError: () => {
          toast.error('Pembayaran gagal. Silakan coba lagi dari halaman pesanan.')
          goToOrder()
        },
        onClose: goToOrder,
      })
    } catch (error) {
      toast.error(error.message || 'Terjadi kesalahan, silakan coba lagi.')
      setReload((n) => n + 1)
    } finally {
      setLoading(false)
    }
  }
  if (hydrated && items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-lpi-bg px-6 text-center">
        <ShoppingBag className="h-12 w-12 text-lpi-muted" />
        <h1 className="mt-4 text-2xl font-extrabold text-lpi-ink">Keranjang Anda kosong</h1>
        <p className="mt-2 text-sm text-lpi-muted">Pilih produk dulu sebelum checkout.</p>
        <Link href="/" className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-lpi px-6 text-sm font-bold text-white hover:bg-lpi-dark">
          <ArrowLeft className="h-4 w-4" />
          Kembali Belanja
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-lpi-bg pb-32 text-lpi-ink">
      <header className="sticky top-0 z-30 border-b border-lpi-line bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light" aria-label="Kembali">
            <ArrowLeft className="h-5 w-5 text-lpi" />
          </Link>
          <h1 className="text-lg font-extrabold">Checkout</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
        <Section title="Pesanan Anda">
          <div className="space-y-3">
            {items.map((it) => (
              <div key={`${it.kind || 'produk'}:${it.productId}`} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-lpi-light">
                  <SafeImage src={it.image} alt={it.name} fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold">{it.name}</p>
                  <p className="text-xs text-lpi-muted">
                    {it.qty} × {formatIDR(it.price)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold">{formatIDR(it.qty * it.price)}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Data penerima">
          <div className="space-y-3">
            {savedAddrs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-lpi-ink">Pakai alamat tersimpan</p>
                <div className="flex flex-wrap gap-2">
                  {savedAddrs.map((a) => (
                    <button key={a.id} type="button" onClick={() => pickSavedAddress(a)} className="min-h-11 rounded-xl border-2 border-lpi bg-white px-4 text-sm font-bold text-lpi hover:bg-lpi-light">
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {me?.enabled && !me.customer && (
              <a href="/api/auth/google?returnTo=/checkout" className="block rounded-xl bg-lpi-light px-4 py-3 text-sm text-lpi-ink">
                <b>Sudah punya akun?</b> Masuk dengan Google untuk memakai alamat tersimpan. (Boleh dilewati, belanja tanpa login tetap bisa.)
              </a>
            )}
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" autoComplete="name" maxLength={50} />
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nomor WhatsApp, mis. 0812xxxxxxx" inputMode="tel" autoComplete="tel" maxLength={30} />
            <textarea className={inputClass} rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap (jalan, nomor, RT/RW, patokan)" maxLength={200} />
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan untuk kurir (boleh kosong)" maxLength={200} />
            {(me?.customer || me) && (
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="h-5 w-5 accent-[#1E5A3A]" />
                {me?.customer ? 'Simpan alamat ini untuk belanja berikutnya' : 'Simpan alamat ini di HP ini untuk belanja berikutnya'}
              </label>
            )}
          </div>
        </Section>

        <Section icon={MapPin} title="Lokasi pengantaran" hint="Ongkir dihitung dari lokasi Anda. Tekan tombol ini saat Anda berada di alamat pengantaran.">
          <button
            type="button"
            onClick={askLocation}
            disabled={locState === 'loading'}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-lpi bg-white text-base font-bold text-lpi hover:bg-lpi-light disabled:opacity-60"
          >
            {locState === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
            {location ? 'Ulangi ambil lokasi' : 'Pakai lokasi saya'}
          </button>
          {locState === 'denied' && (
            <p className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm text-[#9B2C2C]">
              Akses lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser HP Anda, lalu tekan tombol lagi. Atau pesan lewat WhatsApp.
            </p>
          )}
          {locState === 'error' && (
            <p className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm text-[#9B2C2C]">Lokasi belum bisa diambil. Coba lagi di tempat terbuka, atau pesan lewat WhatsApp.</p>
          )}
          {zoneOk && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-lpi-light px-4 py-3 text-sm text-lpi">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">{quote.zone.name}</p>
                <p>
                  Sekitar {quote.zone.distanceKm} km dari gudang · ongkir {formatIDR(quote.zone.fee)}, gratis bila belanja ≥ {formatIDR(quote.zone.freeShippingMin)}
                </p>
                {location && (
                  <a href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    Lihat lokasi di peta
                  </a>
                )}
              </div>
            </div>
          )}
          {zoneErr && (
            <div className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm text-[#9B2C2C]">
              <p>{zoneErr.message}</p>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex h-11 items-center gap-2 rounded-xl bg-lpi px-4 font-bold text-white">
                <MessageCircle className="h-4 w-4" />
                Tanya via WhatsApp
              </a>
            </div>
          )}
        </Section>

        <Section icon={CalendarDays} title="Pengiriman">
          {storeClosed && (
            <p className="mb-3 rounded-xl bg-lpi-light px-4 py-3 text-sm text-lpi-ink">
              Kurir toko beroperasi sampai jam {String(quote.storeCourier.cutoffHour).padStart(2, '0')}.00 WIB. Saat ini pengiriman hanya lewat <b>Kurir Instan</b>.
            </p>
          )}
          {quote?.biteship?.available && !storeClosed && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {[['toko', 'Kurir Toko'], ['biteship', 'Kurir Instan']].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setShipMethod(id)} className={`min-h-12 rounded-xl border-2 px-3 text-sm font-extrabold ${shipMethod === id ? 'border-lpi bg-lpi text-white' : 'border-lpi-line bg-white text-lpi-ink'}`}>
                  {label}
                </button>
              ))}
              <p className="col-span-2 text-xs text-lpi-muted">{shipMethod === 'toko' ? 'Kurir kami sendiri (Sidoarjo), pilih jadwal.' : 'Kurir instan seperti Gojek/Grab, dikirim sekarang. Ongkir sesuai tarif kurir.'}</p>
            </div>
          )}

          {viaB && (
            <div className="space-y-2">
              {!location && <p className="rounded-xl bg-lpi-light px-4 py-3 text-sm text-lpi-ink">Bagikan lokasi Anda dulu (tombol di atas) untuk melihat kurir instan.</p>}
              {quote?.biteship?.error && location && <p className="rounded-xl bg-[#FDECEC] px-4 py-3 text-sm text-[#9B2C2C]">{quote.biteship.error}</p>}
              {(quote?.biteship?.options || []).map((o) => (
                <button key={o.key} type="button" onClick={() => setCourierKey(o.key)} className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-3 text-left ${courierKey === o.key ? 'border-lpi bg-lpi-light' : 'border-lpi-line bg-white'}`}>
                  <span>
                    <span className="block text-sm font-extrabold">{o.name} {o.serviceName}</span>
                    <span className="block text-xs text-lpi-muted">{o.duration ? `Estimasi ${o.duration}` : o.description || 'Dikirim sekarang'}</span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-lpi">{formatIDR(o.price)}</span>
                </button>
              ))}
            </div>
          )}

          {!viaB && (<>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={!quote || !quote.immediate?.available}
              onClick={() => setMode('sekarang')}
              className={`rounded-xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${mode === 'sekarang' ? 'border-lpi bg-lpi-light' : 'border-lpi-line bg-white'}`}
            >
              <span className="flex items-center gap-2 text-sm font-extrabold">
                <Zap className="h-4 w-4 text-lpi" /> Kirim Sekarang
              </span>
              <span className="mt-1 block text-xs text-lpi-muted">
                {quote?.immediate?.available
                  ? `Hari ini, ${quote.immediate.slotLabel} (${jam(quote.immediate.start)}–${jam(quote.immediate.end)})`
                  : quote?.immediate?.error || 'Memeriksa jadwal…'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('terjadwal')
                if (!date && quote?.schedule?.[0]) setDate(quote.schedule[0].date)
              }}
              className={`rounded-xl border-2 p-3 text-left transition ${mode === 'terjadwal' ? 'border-lpi bg-lpi-light' : 'border-lpi-line bg-white'}`}
            >
              <span className="flex items-center gap-2 text-sm font-extrabold">
                <CalendarDays className="h-4 w-4 text-lpi" /> Terjadwal
              </span>
              <span className="mt-1 block text-xs text-lpi-muted">Pilih hari dan jam yang cocok untuk Anda</span>
            </button>
          </div>

          {mode === 'terjadwal' && quote?.schedule && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {quote.schedule.map((day, i) => {
                  const f = formatDay(day.date)
                  const active = date === day.date
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        setDate(day.date)
                        setSlotId('')
                      }}
                      className={`shrink-0 rounded-xl border-2 px-4 py-2 text-center ${active ? 'border-lpi bg-lpi text-white' : 'border-lpi-line bg-white'}`}
                    >
                      <span className="block text-sm font-bold">{i === 0 ? 'Besok' : f.hari}</span>
                      <span className={`block text-xs ${active ? 'text-white/90' : 'text-lpi-muted'}`}>{f.tanggal}</span>
                    </button>
                  )
                })}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {(quote.schedule.find((d) => d.date === date)?.slots || []).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setSlotId(s.id)}
                    className={`rounded-xl border-2 p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${slotId === s.id ? 'border-lpi bg-lpi-light' : 'border-lpi-line bg-white'}`}
                  >
                    <span className="block text-sm font-extrabold">{s.label}</span>
                    <span className="block text-xs text-lpi-muted">
                      {jam(s.start)}–{jam(s.end)}
                    </span>
                    {!s.available && <span className="mt-1 block text-xs font-bold text-[#9B2C2C]">{s.reason === 'penuh' ? 'Penuh' : s.reason === 'terlalu_berat' ? 'Terlalu berat' : 'Sudah lewat'}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {deliveryErr && <p className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm text-[#9B2C2C]">{deliveryErr}</p>}
          {deliveryOk && (
            <p className="mt-3 text-sm font-semibold text-lpi">
              Dikirim {quote.delivery.mode === 'sekarang' ? 'hari ini' : `${formatDay(quote.delivery.date).hari}, ${formatDay(quote.delivery.date).tanggal}`} · {quote.delivery.slotLabel} ({jam(quote.delivery.start)}–{jam(quote.delivery.end)})
            </p>
          )}
          </>)}
        </Section>

        <Section icon={Tag} title="Kode voucher atau referral">
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && applyVoucher()}
              placeholder="Punya kode voucher atau referral?"
              maxLength={30}
            />
            <button type="button" onClick={applyVoucher} className="h-12 shrink-0 rounded-xl bg-lpi px-5 text-sm font-bold text-white hover:bg-lpi-dark">
              Pakai
            </button>
          </div>
          {voucherCode && quote?.voucherError && <p className="mt-2 text-sm text-[#9B2C2C]">{quote.voucherError}</p>}
          {voucherCode && quote && !quote.voucherError && pricing?.voucherCode && (
            <p className="mt-2 flex items-center justify-between text-sm font-semibold text-lpi">
              <span>{quote.referral ? 'Kode referral' : 'Voucher'} {pricing.voucherCode} dipakai</span>
              <button
                type="button"
                onClick={() => {
                  setVoucherCode('')
                  setVoucherInput('')
                }}
                className="text-xs font-normal text-lpi-muted underline"
              >
                Hapus
              </button>
            </p>
          )}
        </Section>

        <Section title="Rincian biaya">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-lpi-muted">Belanja</dt>
              <dd className="font-semibold">{formatIDR(pricing?.subtotal ?? cartTotal)}</dd>
            </div>
            {pricing?.discountShop > 0 && (
              <div className="flex justify-between text-lpi">
                <dt>{quote?.referral ? 'Diskon referral' : 'Diskon voucher'}</dt>
                <dd className="font-semibold">− {formatIDR(pricing.discountShop)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-lpi-muted">Ongkos kirim</dt>
              <dd className="font-semibold">
                {!shippingKnown ? (
                  <span className="text-lpi-muted">{viaB ? 'pilih kurir instan' : 'dihitung setelah lokasi dibagikan'}</span>
                ) : pricing.freeShipping ? (
                  <span className="text-lpi">Gratis</span>
                ) : (
                  formatIDR(pricing.shippingFee)
                )}
              </dd>
            </div>
            {pricing?.shippingDiscount > 0 && (
              <div className="flex justify-between text-lpi">
                <dt>Diskon ongkir</dt>
                <dd className="font-semibold">− {formatIDR(pricing.shippingDiscount)}</dd>
              </div>
            )}
            {!viaB && zoneOk && !pricing.freeShipping && quote.zone.freeShippingMin - pricing.subtotalAfter > 0 && (
              <p className="rounded-lg bg-lpi-light px-3 py-2 text-xs text-lpi">Tambah belanja {formatIDR(quote.zone.freeShippingMin - pricing.subtotalAfter)} lagi untuk gratis ongkir.</p>
            )}
            <div className="flex items-baseline justify-between border-t border-dashed border-lpi-line pt-3">
              <dt className="text-base font-extrabold">Total</dt>
              <dd className="text-2xl font-extrabold text-lpi">{shippingKnown ? formatIDR(pricing.total) : formatIDR(pricing?.subtotal ?? cartTotal)}</dd>
            </div>
          </dl>
        </Section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-lpi-line bg-white p-3">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={handlePay}
            disabled={loading || !ready}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-lpi text-base font-bold text-white transition hover:bg-lpi-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading || quoting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            {ready ? `Bayar ${formatIDR(pricing.total)}` : 'Lengkapi data untuk membayar'}
          </button>
        </div>
      </div>
    </div>
  )
}
