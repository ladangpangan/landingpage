import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Kebijakan Pengembalian Dana — ladangpangan.id',
  description: 'Aturan pembatalan, komplain, penggantian barang, dan pengembalian dana untuk pesanan di ladangpangan.id.',
}

// DRAF untuk ditinjau pemilik sebelum rilis publik (batas waktu dan ketentuan bisa disesuaikan).
const SECTIONS = [
  {
    title: '1. Pembatalan sebelum dikemas',
    body: 'Pesanan yang belum dibayar bisa dibatalkan sendiri lewat halaman pesanan. Pesanan yang sudah dibayar tetapi belum berstatus Dikemas dapat dibatalkan dengan menghubungi kami lewat WhatsApp; dana dikembalikan penuh ke metode pembayaran yang dipakai. Setelah pesanan dikemas atau kurir dipanggil, pembatalan tidak bisa dilakukan karena produk beku sudah disiapkan khusus untuk Anda.',
  },
  {
    title: '2. Komplain barang',
    body: 'Produk kami adalah makanan beku, jadi komplain harus disampaikan maksimal 24 jam setelah pesanan diterima. Kirim ke WhatsApp kami: nomor pesanan, foto atau video produk dan kemasannya, serta penjelasan singkat. Komplain yang kami terima setelah 24 jam, atau tanpa bukti foto/video, tidak dapat diproses.',
  },
  {
    title: '3. Kondisi yang bisa diganti atau dikembalikan dananya',
    body: 'Produk rusak atau kemasan bocor, produk sudah mencair atau tidak beku saat diterima, produk tidak sesuai pesanan (salah jenis atau kurang jumlah), atau produk berbau atau berkualitas tidak layak. Kami mengganti produk yang sama atau, bila stok tidak ada, mengembalikan dana sesuai nilai produk yang bermasalah.',
  },
  {
    title: '4. Kondisi yang tidak bisa diganti',
    body: 'Perubahan selera atau salah pilih produk oleh pembeli, produk yang sudah dimasak atau sebagian dikonsumsi, produk yang disimpan tidak sesuai anjuran (tidak dibekukan) setelah diterima, alamat atau nomor telepon yang salah sehingga pesanan gagal diantar, dan komplain di luar batas waktu pada poin 2.',
  },
  {
    title: '5. Cara pengembalian dana',
    body: 'Pengembalian dana dikirim ke metode pembayaran yang Anda pakai atau, bila tidak memungkinkan, ke rekening atas nama pembeli yang Anda berikan. Prosesnya biasanya selesai dalam 3 sampai 7 hari kerja setelah komplain disetujui, tergantung penyedia pembayaran dan bank.',
  },
  {
    title: '6. Ongkos kirim',
    body: 'Bila penyebabnya kesalahan kami (produk rusak, tidak sesuai, atau terlambat parah tanpa kabar), ongkos kirim penggantian kami yang tanggung. Bila penyebabnya dari pembeli (alamat salah, pembeli tidak ada di tempat), ongkos kirim ulang ditanggung pembeli.',
  },
  {
    title: '7. Pesanan gagal diantar atau tidak jadi dibayar',
    body: 'Pesanan yang tidak dibayar dalam 1 jam otomatis dibatalkan dan tidak ada yang ditagih. Bila pembayaran sudah masuk tetapi pesanan tidak bisa kami penuhi (stok habis atau alamat di luar jangkauan), dana dikembalikan penuh.',
  },
  {
    title: '8. Hubungi kami',
    body: 'Hubungi kami lewat WhatsApp yang tercantum di halaman utama. Sebutkan nomor pesanan Anda supaya cepat kami tangani.',
  },
]

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-lpi-bg text-lpi-ink">
      <header className="border-b border-lpi-line bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light" aria-label="Ke beranda"><ArrowLeft className="h-5 w-5 text-lpi" /></Link>
          <h1 className="text-lg font-extrabold">Kebijakan Pengembalian Dana</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-4">
        {SECTIONS.map((s) => (
          <section key={s.title} className="rounded-2xl border border-lpi-line bg-white p-4">
            <h2 className="font-extrabold">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-lpi-muted">{s.body}</p>
          </section>
        ))}
      </main>
    </div>
  )
}
