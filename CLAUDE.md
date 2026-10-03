# CLAUDE.md — Toko Online PT Ladang Pangan Indonesia (LPI)

Rencana lengkap ada di `docs/rencana.md`. Cara deploy ada di `DEPLOYMENT.md`.

## Pemilik & cara berkomunikasi
- Pemilik bukan programmer: jelaskan semuanya dengan bahasa Indonesia sederhana.
- **Minta persetujuan pemilik ("setuju") sebelum mengubah kode aplikasi.** Tulis rencana singkat dulu.
- Tahap dikerjakan satu per satu; lanjut hanya setelah pemilik bilang "lanjut tahap berikutnya".

## Aturan kerja
- Satu branch baru per tahap, lalu Pull Request. Jangan pernah ubah `main` langsung.
- Harga, ongkir, diskon, stok, kapasitas kirim: SELALU dihitung di server (jangan percaya angka dari browser).
- Jangan tulis password/kunci rahasia di kode. Rahasia hanya lewat environment variable di VPS.
- Jangan ganti teknologi: Next.js 15, Tailwind, MongoDB, Midtrans, Docker.
- Selama pengembangan pakai Midtrans SANDBOX; PRODUCTION hanya saat pemilik bilang siap rilis.
- Sebelum memasang ke VPS: pandu pemilik membuat backup sederhana dan tuliskan cara kembali ke versi lama.
- Aplikasi belum rilis & tanpa pembeli sungguhan: boleh ubah besar-besaran. Data contoh boleh dibuang; yang dipertahankan hanya logo, nomor WhatsApp, kunci Midtrans.
- Tidak ada staging; hasil tiap tahap langsung dipasang ke VPS untuk dicoba pemilik lewat HP.

## Bisnis
- Toko ayam frozen milik PT LPI (satu penjual), gudang di Sidoarjo. Pembeli utama: ibu rumah tangga lewat HP.
- Produk: karkas, potongan (dada, paha, sayap, fillet, ceker), Paket Hemat (bundling), Paket Masak (bahan + resep).
- Kurir: 1 kurir sendiri, motor listrik, maks 40 kg per trip, biaya Rp 20.000 per trip.
- Ongkir per zona dari gudang (gratis ongkir jika belanja ≥ batas):
  - Zona 1 (≤5 km): Rp 8.000, gratis ≥ Rp 100.000
  - Zona 2 (5–10 km): Rp 12.000, gratis ≥ Rp 150.000
  - Zona 3 (10–15 km): Rp 18.000, gratis ≥ Rp 200.000
  - >15 km: belum dilayani → tombol tanya via WhatsApp
  - Ada voucher diskon ongkir dan diskon belanja.
- Pengiriman: "Kirim Sekarang" (bayar sebelum 17.00 dikirim hari itu) atau "Terjadwal" (1–3 hari ke depan; slot Pagi 08–11, Siang 11–14, Sore 14–17). Slot penuh jika muatan 40 kg per trip.
- Status pesanan (tidak boleh mundur): Menunggu Bayar → Dibayar → Dikemas → Dikirim → Diterima; atau Batal / Gagal / Kedaluwarsa.
- Produk diinput lewat admin + impor Excel/CSV. Simpan "kode ERP" per produk untuk integrasi ERP nanti.

## Tampilan
- Bahasa Indonesia hangat & sederhana; HP dulu; tombol besar.
- Warna: hijau tua `#1E5A3A`, hijau muda `#E3F0E7`, latar `#F5F7F6`, kartu putih. DILARANG oranye/krem.
- Huruf: Plus Jakarta Sans.
- Halaman: Beranda, Detail Produk, Checkout, Sukses & Lacak Pesanan, Admin Daftar Kirim Kurir.

## Tahapan
1. Fondasi & keamanan: struktur data baru (produk, varian, paket, zona, jadwal, voucher, admin), perbaiki keamanan pembayaran & login, admin multi-akun (Owner & Staf).
2. Tampilan pembeli: beranda baru, detail produk, Paket Hemat/Masak, pencarian, produk habis.
3. Checkout: ongkir otomatis, gratis ongkir, voucher, jadwal kirim dengan batas 40 kg.
4. Setelah bayar & admin: halaman sukses + nomor pesanan, lacak pesanan, ubah status, daftar kirim kurir, cetak label, notifikasi WhatsApp, kelola produk/paket/zona/voucher.
5. Siap rilis: uji lewat HP, uji pembayaran, Meta Pixel & Google Analytics, keamanan tambahan, backup harian otomatis, Midtrans PRODUCTION.

## Kondisi kode saat ini (hasil pelajari sebelum Tahap 1)
- Next.js 15 (App Router, JavaScript, tanpa TypeScript), Tailwind 3, MongoDB driver 6, midtrans-client, `output: 'standalone'`. Tanpa test dan tanpa linter.
- `lib/db.js`: semua pengaturan + katalog produk disimpan dalam SATU dokumen `settings/landing` (produk berupa array). Kunci Midtrans juga disimpan di dokumen ini (teks biasa).
- `lib/orders.js`: koleksi `orders`; status saat ini `pending/paid/failed/cancelled/expired/refunded`; update status tanpa aturan urutan.
- `lib/admin-auth.js`: satu password bersama (`ADMIN_PASSWORD`), cookie bertanda tangan HMAC, tanpa akun/peran, tanpa batas percobaan login.
- `app/api/checkout/route.js`: harga diambil dari server (bagus), tetapi belum ada stok/ongkir/voucher/jadwal; pesanan disimpan SETELAH transaksi Midtrans dibuat; kegagalan simpan hanya di-log.
- `app/api/midtrans/notification/route.js`: signature diverifikasi, tetapi jumlah (`gross_amount`) tidak dicocokkan dengan pesanan, status bisa mundur, perbandingan signature bukan constant-time.
- `lib/erp-sync.js`: kirim pesanan ke ERP (opsional, fire-and-forget) — jangan rusak kontraknya (lihat DEPLOYMENT.md).
- Gambar upload disimpan di `/app/uploads` (volume Docker), disajikan lewat `app/api/uploads/[filename]` — jangan pindahkan ke `public/`.
- Alur WhatsApp, banner, hero slide, galeri/media ada di admin (`app/admin/dashboard/settings-form.js`).

## Deploy (ringkas; detail di DEPLOYMENT.md)
- VPS Hostinger KVM 1 (`srv919824`, IP 145.79.8.46, Ubuntu 24.04) dipakai bersama Odoo.
- Nginx sistem (bukan Docker) memegang port 80/443 dan proxy `marketplace.ladangpangan.id` → `127.0.0.1:3001`; SSL lewat certbot. JANGAN tambah Caddy/Traefik/port 80/443 di compose; jangan sentuh Nginx/Odoo.
- `docker-compose.yaml`: service `mongo` (mongo:7, volume `mongo_data`, tidak dibuka ke luar) dan `landing` (port `127.0.0.1:3001`, volume `uploads_data`). Jangan pakai bind-mount relatif.
- Deploy lewat Hostinger VPS MCP `VPS_createNewProjectV1(... project_name="ladang-landing", content=<URL repo>)` yang menggantikan project lama.
- Env var: `MONGO_ROOT_USER/PASSWORD` (harus tetap sama setiap deploy), `MONGO_DB_NAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `MIDTRANS_*`, `ERP_INTEGRATION_URL/KEY`. Nilai rahasia tidak pernah di-commit.
- Nginx `client_max_body_size 10m` wajib untuk upload gambar.
