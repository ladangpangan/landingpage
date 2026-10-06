import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'FAQ — ladangpangan.id',
  description: 'Pertanyaan yang sering ditanyakan tentang pemesanan, pembayaran, pengiriman, dan produk di ladangpangan.id.',
}

// DRAF untuk ditinjau pemilik; angka (zona, ongkir, jam) mengikuti pengaturan toko saat ini.
const FAQS = [
  ['Apakah harus login untuk belanja?', 'Tidak. Anda cukup mengisi nama, nomor WhatsApp, dan alamat saat checkout. Login dengan Google bersifat pilihan, untuk melihat riwayat belanja dan menyimpan alamat.'],
  ['Bagaimana cara memesan?', 'Pilih produk, masukkan ke keranjang, buka checkout, isi data penerima, bagikan lokasi dari HP Anda supaya ongkir terhitung, pilih pengiriman, lalu bayar.'],
  ['Metode pembayaran apa saja yang tersedia?', 'Pembayaran diproses lewat penyedia pembayaran resmi (misalnya QRIS, transfer virtual account, atau e-wallet, sesuai yang tersedia saat Anda membayar). Pesanan yang belum dibayar dalam 1 jam otomatis dibatalkan.'],
  ['Berapa ongkos kirim dan apakah ada gratis ongkir?', 'Ongkir dihitung otomatis dari lokasi Anda. Kurir toko: Zona 1 (sampai 5 km) Rp 8.000, Zona 2 (5 sampai 10 km) Rp 12.000, Zona 3 (10 sampai 15 km) Rp 18.000, dan gratis ongkir bila belanja mencapai Rp 100.000 / Rp 150.000 / Rp 200.000. Untuk alamat lebih jauh, tersedia pilihan kurir instan dengan tarif sesuai kurir.'],
  ['Kapan pesanan saya sampai?', 'Dengan "Kirim Sekarang", pesanan yang dibayar sebelum pukul 17.00 dikirim di hari yang sama. Dengan "Terjadwal", Anda memilih hari (1 sampai 3 hari ke depan) dan jam: Pagi 08.00–11.00, Siang 11.00–14.00, atau Sore 14.00–17.00.'],
  ['Bagaimana melacak pesanan saya?', 'Buka halaman pesanan setelah membayar, atau halaman Lacak Pesanan dengan nomor pesanan dan nomor WhatsApp yang dipakai saat memesan. Untuk kurir instan, ada tautan untuk melihat posisi kurir.'],
  ['Produk datang dalam keadaan beku?', 'Ya. Produk dikemas beku dan diantar segera. Mohon segera simpan di freezer setelah diterima. Bila produk rusak atau sudah mencair saat diterima, lihat Kebijakan Pengembalian Dana.'],
  ['Bagaimana bila ada produk yang bermasalah?', 'Hubungi kami lewat WhatsApp maksimal 24 jam setelah pesanan diterima dengan nomor pesanan serta foto atau video produk. Ketentuan lengkap ada di halaman Kebijakan Pengembalian Dana.'],
  ['Bisakah saya membatalkan pesanan?', 'Pesanan yang belum dibayar bisa dibatalkan sendiri di halaman pesanan. Pesanan yang sudah dibayar bisa dibatalkan selama belum dikemas; hubungi kami lewat WhatsApp.'],
  ['Alamat saya di luar jangkauan, bagaimana?', 'Kurir toko melayani sampai 15 km dari gudang kami di Sidoarjo. Untuk alamat lebih jauh, gunakan kurir instan bila tersedia, atau tanyakan kami lewat WhatsApp.'],
  ['Apakah data saya aman?', 'Data Anda hanya dipakai untuk memproses pesanan dan pengiriman. Detailnya ada di halaman Kebijakan Privasi.'],
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-lpi-bg text-lpi-ink">
      <header className="border-b border-lpi-line bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light" aria-label="Ke beranda"><ArrowLeft className="h-5 w-5 text-lpi" /></Link>
          <h1 className="text-lg font-extrabold">Pertanyaan yang Sering Ditanyakan</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {FAQS.map(([q, a]) => (
          <details key={q} className="group rounded-2xl border border-lpi-line bg-white p-4 open:bg-lpi-light/40">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-extrabold">
              {q}
              <span className="text-lpi transition group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-lpi-muted">{a}</p>
          </details>
        ))}
        <p className="pt-2 text-center text-sm text-lpi-muted">
          Masih ada pertanyaan? <Link href="/kebijakan-pengembalian-dana" className="font-bold text-lpi underline">Kebijakan Pengembalian Dana</Link> · <Link href="/lacak" className="font-bold text-lpi underline">Lacak Pesanan</Link>
        </p>
      </main>
    </div>
  )
}
