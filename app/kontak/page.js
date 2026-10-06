import Link from 'next/link'
import { ArrowLeft, Mail, MapPin, MessageCircle } from 'lucide-react'
import { getLandingSettings } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kontak — ladangpangan.id',
  description: 'Hubungi PT Ladang Pangan Indonesia lewat WhatsApp, email, atau alamat usaha kami di Sidoarjo.',
}

export default async function KontakPage() {
  const s = await getLandingSettings().catch(() => ({}))
  const wa = s.whatsappNumber || '6282229348883'
  const local = wa.startsWith('62') ? `0${wa.slice(2)}` : wa
  const rows = [
    { icon: MessageCircle, label: 'WhatsApp / Telepon', value: local, href: `https://wa.me/${wa}` },
    { icon: Mail, label: 'Email', value: 'ladangpangan.id@gmail.com', href: 'mailto:ladangpangan.id@gmail.com' },
    { icon: MapPin, label: 'Alamat usaha', value: 'PT Ladang Pangan Indonesia, Royal Crown Palace, RA. 28, Jl. Anwar Hamzah, Tambak Oso, Waru, Sidoarjo 61256' },
  ]
  return (
    <div className="min-h-screen bg-lpi-bg text-lpi-ink">
      <header className="border-b border-lpi-line bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light" aria-label="Ke beranda"><ArrowLeft className="h-5 w-5 text-lpi" /></Link>
          <h1 className="text-lg font-extrabold">Kontak</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        <p className="text-sm text-lpi-muted">Ada pertanyaan soal pesanan atau produk? Hubungi kami. Sebutkan nomor pesanan Anda supaya cepat kami tangani.</p>
        {rows.map((r) => (
          <section key={r.label} className="flex items-start gap-3 rounded-2xl border border-lpi-line bg-white p-4">
            <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-lpi" />
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold">{r.label}</h2>
              {r.href ? (
                <a href={r.href} className="mt-1 block break-words text-sm text-lpi underline underline-offset-4">{r.value}</a>
              ) : (
                <p className="mt-1 text-sm text-lpi-muted">{r.value}</p>
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
