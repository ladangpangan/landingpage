# Rencana Pengembangan Toko Online PT Ladang Pangan Indonesia

Dokumen ini disalin apa adanya dari brief pemilik. Jika ada perubahan rencana, ubah di sini dan di `CLAUDE.md`.

Tugas pertama:

1. Buat file CLAUDE.md di folder utama repo, isinya ringkasan semua informasi di bawah, supaya selalu ingat di sesi berikutnya.
2. Buat file docs/rencana.md berisi informasi di bawah apa adanya.
3. Pelajari kode yang ada sekarang, termasuk cara aplikasi ini di-deploy (Docker, Nginx, file deploy yang ada), lalu jelaskan ke pemilik dengan bahasa sederhana apa yang akan dikerjakan di Tahap 1.
4. Beri tahu pemilik apa saja yang perlu disiapkan atau diisi sendiri (misalnya kunci rahasia), dan pandu langkah demi langkah.
5. Jangan ubah kode aplikasi sebelum pemilik bilang "setuju".

## KONDISI APLIKASI SAAT INI

* Aplikasi sudah terpasang dan berjalan di VPS Hostinger saya (marketplace.ladangpangan.id), tetapi BELUM dirilis ke publik dan belum ada pembeli sungguhan. Jadi kita bebas mengubah besar-besaran.
* Data yang ada sekarang hanya data contoh; tidak perlu dipertahankan kecuali pengaturan penting (logo, nomor WhatsApp, kunci Midtrans).
* Tidak perlu lingkungan uji (staging) terpisah; hasil tiap tahap boleh langsung dipasang ke VPS untuk saya coba lewat HP.
* Tetap: sebelum memasang versi baru ke VPS, pandu saya membuat backup sederhana, dan tuliskan cara kembali ke versi sebelumnya bila ada masalah.
* Selama pengembangan pakai Midtrans SANDBOX. Ganti ke kunci PRODUCTION hanya saat saya bilang siap rilis ke publik.

## ATURAN KERJA

* Selalu kerja di branch baru untuk setiap tahap, lalu buat Pull Request. Jangan pernah langsung mengubah branch main.
* Sebelum mengubah kode, tulis rencana singkat dan tunggu persetujuan saya.
* Harga, ongkir, diskon, stok, dan kapasitas kirim selalu dihitung di server.
* Jangan pernah menulis password atau kunci rahasia ke dalam kode.
* Jangan ganti teknologi yang sudah dipakai (Next.js, Tailwind, MongoDB, Midtrans, Docker).

## TENTANG BISNIS

* Toko online ayam frozen milik PT LPI sendiri (satu penjual), gudang di Sidoarjo.
* Pembeli utama: Ibu Rumah Tangga, belanja lewat HP.
* Produk: karkas, potongan ayam (dada, paha, sayap, fillet, ceker), Paket Hemat (bundling), Paket Masak (bahan + resep).
* Kurir: 1 kurir sendiri, motor listrik, muat maksimal 40 kg per trip, biaya Rp 20.000 per trip.
* Ongkir per zona dari gudang:
   * Zona 1 (sampai 5 km): Rp 8.000, gratis jika belanja minimal Rp 100.000
   * Zona 2 (5–10 km): Rp 12.000, gratis jika belanja minimal Rp 150.000
   * Zona 3 (10–15 km): Rp 18.000, gratis jika belanja minimal Rp 200.000
   * Lebih dari 15 km: belum dilayani, tampilkan tombol tanya via WhatsApp
   * Ada voucher diskon ongkir dan diskon belanja.
* Pengiriman: "Kirim Sekarang" (bayar sebelum jam 17.00 dikirim hari itu) atau "Terjadwal" (pilih hari, 1–3 hari ke depan, slot Pagi 08–11, Siang 11–14, Sore 14–17). Slot penuh jika muatan sudah 40 kg per trip.
* Status pesanan: Menunggu Bayar → Dibayar → Dikemas → Dikirim → Diterima (atau Batal / Gagal / Kedaluwarsa). Status tidak boleh mundur.
* Data produk diinput lewat halaman admin dan bisa impor dari file Excel/CSV. Simpan juga "kode ERP" untuk integrasi ERP di masa depan.

## TAMPILAN

* Bahasa Indonesia yang hangat dan sederhana.
* Dirancang untuk HP dulu, tombol besar dan mudah ditekan.
* Warna: hijau tua `#1E5A3A`, hijau muda `#E3F0E7`, latar abu sangat muda `#F5F7F6`, kartu putih. JANGAN pakai warna oranye atau krem.
* Huruf: Plus Jakarta Sans.
* Halaman: Beranda, Detail Produk, Checkout, Sukses & Lacak Pesanan, Admin Daftar Kirim Kurir.

## TAHAPAN (kerjakan satu per satu, tunggu pemilik bilang "lanjut tahap berikutnya")

* Tahap 1 — Fondasi & keamanan: struktur data baru (produk, varian, paket, zona, jadwal, voucher, admin), perbaiki keamanan pembayaran dan login, admin bisa lebih dari satu akun (Owner dan Staf).
* Tahap 2 — Tampilan pembeli: beranda baru, detail produk, Paket Hemat, Paket Masak, pencarian, produk habis.
* Tahap 3 — Checkout: ongkir otomatis, gratis ongkir, voucher, pilih jadwal kirim dengan batas 40 kg.
* Tahap 4 — Setelah bayar & admin: halaman sukses dengan nomor pesanan, lacak pesanan, admin ubah status, daftar kirim kurir, cetak label, notifikasi WhatsApp, kelola produk/paket/zona/voucher.
* Tahap 5 — Siap rilis publik: uji lengkap lewat HP, uji pembayaran, pasang pelacak iklan (Meta Pixel, Google Analytics), keamanan tambahan, backup otomatis harian, ganti ke Midtrans PRODUCTION.
