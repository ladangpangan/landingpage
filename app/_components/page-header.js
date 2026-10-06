import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// Kepala halaman sederhana untuk halaman akun pembeli (Pesanan Saya, Alamat, Pengaturan).
export default function PageHeader({ title }) {
  return (
    <header className="border-b border-lpi-line bg-white">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light" aria-label="Ke beranda"><ArrowLeft className="h-5 w-5 text-lpi" /></Link>
        <h1 className="text-lg font-extrabold">{title}</h1>
      </div>
    </header>
  )
}
