import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Syarat & Ketentuan — ladangpangan.id',
  description:
    'Syarat & Ketentuan penggunaan situs dan pemesanan di ladangpangan.id, termasuk kebijakan privasi, pembayaran, pengiriman, dan pengembalian.',
}

const SECTIONS = [
  {
    title: '1. Ketentuan Penggunaan',
    body: `ladangpangan.id ditawarkan kepada Anda dengan syarat Anda menyetujui seluruh syarat, ketentuan, dan pemberitahuan yang tercantum atau dirujuk di sini, beserta syarat dan ketentuan tambahan lain yang berlaku pada setiap halaman atau bagian dari Situs ini.`,
  },
  {
    title: '2. Ringkasan',
    body: `Dengan menggunakan Situs ini, Anda dianggap menyetujui seluruh syarat, ketentuan, dan pemberitahuan yang berlaku. Mohon dibaca dengan saksama. Apabila Anda tidak menyetujui Syarat & Ketentuan ini, mohon untuk tidak melanjutkan penggunaan Situs, termasuk untuk melihat informasi maupun melakukan pemesanan produk.`,
  },
  {
    title: '3. Perubahan Situs dan Syarat & Ketentuan Ini',
    body: `ladangpangan.id berhak untuk mengubah, memodifikasi, memperbarui, atau menghentikan syarat, ketentuan, pemberitahuan, tautan, konten, informasi, harga, dan materi lain yang ditawarkan melalui Situs ini sewaktu-waktu tanpa pemberitahuan sebelumnya. Kami berhak menyesuaikan harga dari waktu ke waktu. Apabila terjadi kesalahan harga karena sebab apa pun, ladangpangan.id berhak untuk membatalkan pesanan tersebut. Dengan tetap menggunakan Situs setelah adanya perubahan, Anda dianggap menyetujui perubahan tersebut.`,
  },
  {
    title: '4. Hak Cipta',
    body: `Situs ini dimiliki dan dioperasikan oleh PT Ladang Pangan Indonesia. Kecuali dinyatakan lain, seluruh materi pada Situs ini — termasuk merek dagang, merek layanan, dan logo — adalah milik ladangpangan.id dan dilindungi oleh undang-undang hak cipta yang berlaku di Indonesia. Materi yang dipublikasikan oleh ladangpangan.id di Situs ini tidak boleh disalin, direproduksi, dimodifikasi, dipublikasikan ulang, diunggah, atau didistribusikan dalam bentuk apa pun tanpa izin tertulis sebelumnya dari ladangpangan.id.`,
  },
  {
    title: '5. Proses Pemesanan',
    body: `Situs ini tidak mengharuskan Anda membuat akun untuk berbelanja. Untuk melakukan pemesanan, Anda cukup memasukkan Nama Lengkap, Nomor WhatsApp yang aktif, dan Lokasi Pengiriman yang benar pada halaman checkout. Anda bertanggung jawab penuh atas kebenaran dan keakuratan data yang Anda berikan, karena data tersebut digunakan untuk memproses dan mengirimkan pesanan Anda. Kesalahan data (misalnya nomor WhatsApp atau alamat yang salah) yang menyebabkan keterlambatan atau kegagalan pengiriman berada di luar tanggung jawab ladangpangan.id.`,
  },
  {
    title: '6. Komunikasi Elektronik',
    body: `Dengan melakukan pemesanan, Anda menyetujui bahwa ladangpangan.id dapat mengirimkan pesan melalui WhatsApp dan/atau media komunikasi elektronik lain sehubungan dengan status pesanan, konfirmasi pembayaran, pengiriman, maupun informasi promosi. Apabila Anda tidak ingin menerima informasi promosi, Anda dapat menyampaikannya langsung melalui kontak WhatsApp kami.`,
  },
  {
    title: '7. Deskripsi Produk',
    body: `Kami selalu berusaha menampilkan informasi, berat, dan foto produk seakurat mungkin. Namun, karena produk yang kami jual adalah produk segar/beku alami (seperti ayam potong), dapat terjadi variasi kecil pada berat, ukuran, maupun tampilan antara foto dan produk yang diterima. Variasi wajar semacam ini bukan merupakan cacat produk.`,
  },
  {
    title: '8. Harga dan Pembayaran',
    body: `Seluruh harga yang tercantum di Situs adalah dalam mata uang Rupiah (IDR) dan dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya. Pembayaran diproses melalui mitra payment gateway resmi kami, Midtrans, yang mendukung berbagai metode pembayaran (kartu kredit/debit, transfer bank, e-wallet, dan lainnya sesuai yang tersedia). Pesanan akan diproses setelah pembayaran Anda berhasil dikonfirmasi oleh sistem.`,
  },
  {
    title: '9. Pengiriman dan Risiko',
    body: `Produk dikirimkan ke alamat yang Anda cantumkan saat checkout menggunakan jasa pengiriman/kurir yang bekerja sama dengan kami. Karena produk berupa bahan makanan beku, mohon pastikan ada pihak yang dapat menerima pesanan segera setelah tiba agar kualitas produk tetap terjaga. Risiko kerusakan akibat penerimaan yang tertunda di luar kendali kami (misalnya alamat tidak dapat diakses atau tidak ada yang menerima) menjadi tanggung jawab pembeli.`,
  },
  {
    title: '10. Kebijakan Pengembalian & Komplain',
    body: `Karena sifat produk yang mudah rusak (perishable), kami tidak menerima pengembalian barang akibat perubahan pikiran (change of mind). Namun, apabila produk yang Anda terima rusak, tidak sesuai pesanan, atau terdapat kekurangan jumlah, silakan hubungi kami melalui WhatsApp selambat-lambatnya 1x24 jam sejak barang diterima, disertai foto/video bukti kondisi produk. Kami akan menindaklanjuti dengan penggantian produk atau pengembalian dana sesuai hasil verifikasi. Biaya pengiriman yang sudah dibayarkan tidak dapat dikembalikan, kecuali kesalahan terbukti berasal dari pihak kami.`,
  },
  {
    title: '11. Kebijakan Privasi',
    body: `Data Anda aman bersama kami. ladangpangan.id memahami bahwa privasi adalah hal yang penting bagi pelanggan kami. Data pribadi (nama, nomor WhatsApp, alamat) yang Anda berikan hanya digunakan untuk keperluan memproses pesanan, pengiriman, dan komunikasi terkait transaksi Anda, serta tidak akan disalahgunakan, diperjualbelikan, atau dibagikan kepada pihak ketiga di luar mitra yang diperlukan untuk menyelesaikan pesanan Anda (seperti mitra payment gateway dan jasa pengiriman).`,
  },
  {
    title: '12. Ganti Rugi',
    body: `Anda setuju untuk membebaskan dan melindungi ladangpangan.id dari segala tuntutan, kerugian, atau biaya (termasuk biaya hukum yang wajar) yang timbul akibat pelanggaran Anda terhadap Syarat & Ketentuan ini atau penyalahgunaan Situs.`,
  },
  {
    title: '13. Penyangkalan Tanggung Jawab',
    body: `ladangpangan.id tidak bertanggung jawab atas keakuratan, ketepatan waktu, atau kelengkapan materi yang disediakan di Situs ini secara terus-menerus. ladangpangan.id juga tidak bertanggung jawab atas kegagalan transaksi yang disebabkan oleh gangguan di luar kendali kami, termasuk namun tidak terbatas pada gangguan jaringan, layanan payment gateway, maupun jasa pengiriman pihak ketiga.`,
  },
  {
    title: '14. Hukum yang Berlaku',
    body: `Syarat & Ketentuan ini diatur dan tunduk pada hukum yang berlaku di Republik Indonesia.`,
  },
  {
    title: '15. Pertanyaan dan Masukan',
    body: `Kami senang menerima pertanyaan, komentar, dan masukan dari Anda terkait privasi maupun hal lain seputar Situs ini. Silakan hubungi kami melalui WhatsApp yang tercantum di halaman utama Situs.`,
  },
]

export default function TermsPage() {
  return (
    <div className="lpi-landing min-h-screen bg-[#F7FBF8]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Inter:wght@300;400;500;600&display=swap');
        .lpi-landing { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .lpi-landing .font-serif { font-family: 'Playfair Display', ui-serif, Georgia, serif; }
      `}</style>

      <header className="border-b border-[#D6EBDC] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2FA966] hover:text-[#22824E]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <h1 className="font-serif text-2xl font-medium text-[#142A1C] sm:text-3xl">
          Syarat &amp; Ketentuan
        </h1>
        <p className="mt-2 text-sm text-[#7E9488]">Terakhir diperbarui: 18 September 2026</p>

        <p className="mt-6 text-sm leading-relaxed text-[#4C6356]">
          Selamat datang di ladangpangan.id. Halaman ini menjelaskan syarat dan ketentuan
          penggunaan situs serta pemesanan produk, termasuk kebijakan privasi kami. Dengan
          mengakses atau menggunakan Situs ini, Anda dianggap telah membaca, memahami, dan
          menyetujui seluruh isi Syarat &amp; Ketentuan berikut.
        </p>

        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-base font-semibold text-[#142A1C]">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#4C6356]">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[#D6EBDC] bg-white p-5 text-xs text-[#7E9488]">
          Keterangan Legal
          <br />
          ladangpangan.id adalah merek dari PT Ladang Pangan Indonesia.
          <br />
          Hak Cipta © {new Date().getFullYear()} Seluruh Hak Dilindungi.
        </div>
      </main>
    </div>
  )
}
