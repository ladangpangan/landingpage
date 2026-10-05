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

- Admin: tata ulang menu (halaman "Hari ini", Pesanan, Daftar Kirim Kurir, Produk & Paket, Pengaturan) = pilihan C, dikerjakan di Tahap 4. Tahap 2 hanya menambah kolom Stok di form produk.
- Pembeli: beli TANPA login. Login Google hanya pilihan (riwayat belanja, alamat tersimpan), dikerjakan di Tahap 4; butuh kunci Google OAuth + halaman Kebijakan Privasi dari pemilik.

## Tampilan
- Bahasa Indonesia hangat & sederhana; HP dulu; tombol besar.
- Warna: hijau tua `#1E5A3A`, hijau muda `#E3F0E7`, latar `#F5F7F6`, kartu putih. DILARANG oranye/krem.
- Huruf: Plus Jakarta Sans.
- Halaman: Beranda, Detail Produk, Checkout, Sukses & Lacak Pesanan, Admin Daftar Kirim Kurir.

## Tahapan
1. Fondasi & keamanan: struktur data baru (produk, varian, paket, zona, jadwal, voucher, admin), perbaiki keamanan pembayaran & login, admin multi-akun (Owner & Staf).
2. Tampilan pembeli: beranda baru, detail produk, Paket Hemat/Masak, pencarian, produk habis.
3. Checkout: ongkir otomatis, gratis ongkir, voucher, jadwal kirim dengan batas 40 kg.
4. Setelah bayar & admin: halaman sukses + nomor pesanan, lacak pesanan (tanpa login: nomor pesanan + nomor WA; plus login Google OPSIONAL untuk riwayat & alamat tersimpan), ubah status, daftar kirim kurir, cetak label, notifikasi WhatsApp, kelola produk/paket/zona/voucher.
5. Siap rilis: uji lewat HP, uji pembayaran, Meta Pixel & Google Analytics, keamanan tambahan, backup harian otomatis, Midtrans PRODUCTION.

## Kondisi kode (setelah Tahap 2, branch `claude/tahap-2-tampilan-pembeli`)
- Next.js 15 (App Router, JavaScript), Tailwind 3, MongoDB driver 6, midtrans-client, `output: 'standalone'`. Tes logika: `npm test` (node:test, folder `tests/`). Belum ada linter.
- Struktur data: komentar di `lib/schema.js` (products, variants, bundles, zones, delivery_config, vouchers, admins, orders, login_attempts). `ensureSchema()` membuat index, mengisi zona & aturan kirim, memigrasi data lama, dan mengisi 3 paket contoh SATU kali (flag `seed-flags` di koleksi settings).
- Katalog: `lib/catalog.js`; UI admin masih bentuk "datar" (1 produk = 1 varian, id sama). Stok ada di varian (`stock`: null = tak terbatas, angka = sisa). Produk publik tidak membawa stok mentah (`lib/db.js` `toPublicProduct` -> `soldOut`, `stockLeft` bila <= 5).
- Paket: `lib/bundles.js` (Paket Hemat/Masak, isi = variantId+qty, resep untuk Masak). Belum ada UI admin untuk paket (Tahap 4); 3 paket contoh bertanda "(contoh)".
- Hitungan murni & teruji: `lib/cart-math.js` (ringkasan paket, stok, `resolveCartLines`), `lib/search.js`, `lib/order-status.js`, `lib/passwords.js`, `lib/session-token.js`, `lib/midtrans-signature.js`.
- Checkout (`app/api/checkout/route.js`): harga & isi paket dari server; stok ditahan atomik (`lib/stock.js`) SEBELUM pesanan disimpan; pesanan disimpan SEBELUM transaksi Midtrans; Midtrans kedaluwarsa 60 menit; pesanan batal/gagal/kedaluwarsa mengembalikan stok (sekali, `stockReleased`). Baris keranjang = `{kind: 'produk'|'paket', productId, qty}`.
- Tampilan pembeli: komponen bersama di `app/_components/` (header+cari, keranjang, kartu, kerangka), halaman `/`, `/produk/[id]`, `/paket/[id]`; warna/huruf lewat token Tailwind `lpi-*` dan Plus Jakarta Sans (link di `app/layout.js`). Halaman checkout & admin BELUM digayakan ulang (Tahap 3 dan 4). `makeWaLink` ada di `lib/wa.js` (jangan taruh fungsi yang dipanggil server di berkas 'use client').
- Login admin: akun per orang (Owner/Staf), scrypt, sesi dicek ke database, batas 5 gagal/15 menit. Kunci Midtrans hanya Owner (masih teks biasa di dokumen settings).
- Belum ada: ongkir, voucher, jadwal kirim, ubah status dari admin, halaman sukses/lacak, notifikasi WhatsApp, admin "Hari ini" (rencana C di Tahap 4).
- `lib/erp-sync.js`: kontrak di DEPLOYMENT.md (field tambahan `erpCode`, `components` untuk paket).
- Gambar upload di `/app/uploads` lewat `app/api/uploads/[filename]` — jangan pindahkan ke `public/`.
- Uji database nyata tidak tersedia di cloud (mongod tidak bisa diunduh); logika DB diuji dengan tiruan (mingo). Uji sungguhan di VPS. Hati-hati: `pkill -f` / `pgrep -f` dengan kata yang ada di perintah itu sendiri membunuh shell sendiri.

## Deploy (ringkas; detail di DEPLOYMENT.md)
- VPS Hostinger KVM 1 (`srv919824`, IP 145.79.8.46, Ubuntu 24.04) dipakai bersama Odoo.
- Nginx sistem (bukan Docker) memegang port 80/443 dan proxy `marketplace.ladangpangan.id` → `127.0.0.1:3001`; SSL lewat certbot. JANGAN tambah Caddy/Traefik/port 80/443 di compose; jangan sentuh Nginx/Odoo.
- `docker-compose.yaml`: service `mongo` (mongo:7, volume `mongo_data`, tidak dibuka ke luar) dan `landing` (port `127.0.0.1:3001`, volume `uploads_data`). Jangan pakai bind-mount relatif.
- Deploy lewat Hostinger VPS MCP `VPS_createNewProjectV1(... project_name="ladang-landing", content=<URL repo>)` yang menggantikan project lama.
- Env var: `MONGO_ROOT_USER/PASSWORD` (harus tetap sama setiap deploy), `MONGO_DB_NAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `MIDTRANS_*`, `ERP_INTEGRATION_URL/KEY`. Nilai rahasia tidak pernah di-commit.
- Nginx `client_max_body_size 10m` wajib untuk upload gambar.
