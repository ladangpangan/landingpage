import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Kebijakan Privasi — ladangpangan.id',
  description: 'Data apa yang kami kumpulkan di ladangpangan.id, untuk apa dipakai, dan bagaimana Anda bisa meminta penghapusan.',
}

// DRAF untuk ditinjau pemilik / penasihat hukum sebelum rilis publik.
const SECTIONS = [
  {
    title: '1. Siapa kami',
    body: 'Situs ladangpangan.id dikelola oleh PT Ladang Pangan Indonesia, penjual ayam frozen dengan gudang di Sidoarjo, Jawa Timur.',
  },
  {
    title: '2. Data yang kami kumpulkan',
    body: 'Saat memesan: nama, nomor WhatsApp, alamat pengantaran, titik lokasi yang Anda bagikan dari HP, dan catatan untuk kurir. Bila Anda memilih masuk dengan Google: nama, alamat email, dan foto profil dari akun Google Anda. Kami tidak menerima kata sandi Google Anda. Data kartu atau rekening Anda diproses langsung oleh Midtrans dan tidak disimpan oleh kami.',
  },
  {
    title: '3. Untuk apa data dipakai',
    body: 'Untuk memproses pembayaran, menyiapkan dan mengantar pesanan, menghitung ongkos kirim dari lokasi Anda, menghubungi Anda soal pesanan, serta (bila Anda masuk dengan Google) menampilkan riwayat belanja dan alamat tersimpan. Kami tidak menjual data Anda.',
  },
  {
    title: '4. Dengan siapa data dibagikan',
    body: 'Hanya dengan pihak yang diperlukan untuk menyelesaikan pesanan, yaitu Midtrans sebagai penyedia pembayaran, dan Google bila Anda memilih masuk dengan Google. Kurir kami menerima nama, nomor telepon, dan alamat untuk mengantar pesanan.',
  },
  {
    title: '5. Berapa lama data disimpan',
    body: 'Data pesanan disimpan selama diperlukan untuk pembukuan dan layanan pelanggan. Data akun Google dan alamat tersimpan disimpan selama akun Anda aktif.',
  },
  {
    title: '6. Pilihan Anda',
    body: 'Anda bisa berbelanja tanpa masuk. Anda bisa menghapus alamat tersimpan kapan saja di halaman Akun, dan keluar dari akun kapan saja. Untuk meminta salinan atau penghapusan data Anda, hubungi kami lewat WhatsApp yang tercantum di halaman utama.',
  },
  {
    title: '7. Perubahan kebijakan',
    body: 'Kebijakan ini dapat diperbarui. Versi terbaru selalu ada di halaman ini.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-lpi-bg text-lpi-ink">
      <header className="border-b border-lpi-line bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lpi-light" aria-label="Ke beranda"><ArrowLeft className="h-5 w-5 text-lpi" /></Link>
          <h1 className="text-lg font-extrabold">Kebijakan Privasi</h1>
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
