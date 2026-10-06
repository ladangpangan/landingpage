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
- Jangan ganti teknologi: Next.js 15, Tailwind, MongoDB, Docker. Pembayaran: Midtrans, Mayar.id, dan iPaymu (pilihan Owner di admin; Mayar disetujui pemilik karena review bisnis Midtrans belum selesai).
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
4. Setelah bayar & admin: halaman sukses + nomor pesanan, lacak pesanan (tanpa login: nomor pesanan + nomor WA; plus login Google OPSIONAL untuk riwayat & alamat tersimpan), ubah status, daftar kirim kurir, cetak label, notifikasi WhatsApp, kelola zona/voucher (produk dan paket sudah ada di admin).
5. Siap rilis: uji lewat HP, uji pembayaran, Meta Pixel & Google Analytics, keamanan tambahan, backup harian otomatis, Midtrans PRODUCTION.

## Kondisi kode (setelah Tahap 2, branch `claude/tahap-2-tampilan-pembeli`)
- Next.js 15 (App Router, JavaScript), Tailwind 3, MongoDB driver 6, midtrans-client, `output: 'standalone'`. Tes logika: `npm test` (node:test, folder `tests/`). Belum ada linter.
- Struktur data: komentar di `lib/schema.js` (products, variants, bundles, zones, delivery_config, vouchers, admins, orders, login_attempts). `ensureSchema()` membuat index, mengisi zona & aturan kirim, memigrasi data lama, dan mengisi 3 paket contoh SATU kali (flag `seed-flags` di koleksi settings).
- Katalog: `lib/catalog.js`; UI admin masih bentuk "datar" (1 produk = 1 varian, id sama). Stok ada di varian (`stock`: null = tak terbatas, angka = sisa). Produk publik tidak membawa stok mentah (`lib/db.js` `toPublicProduct` -> `soldOut`, `stockLeft` bila <= 5).
- Paket: `lib/bundles.js` (Paket Hemat/Masak, isi = variantId+qty, resep untuk Masak) + validasi murni `lib/bundle-input.js`. Admin: tab "Paket Hemat & Masak" (`app/admin/dashboard/bundles-panel.js`, API `app/api/admin/bundles`), langsung tersimpan; Owner dan Staf boleh. 3 paket contoh bertanda "(contoh)" bisa dihapus. Panel yang tampil di dalam `<form>` besar `settings-form.js` TIDAK boleh memakai `<form>`/`type=submit` (formulir bersarang membuat tombol menyimpan pengaturan halaman); pakai `type=button` + onClick.
- Hitungan murni & teruji: `lib/cart-math.js` (ringkasan paket, stok, `resolveCartLines`), `lib/search.js`, `lib/order-status.js`, `lib/passwords.js`, `lib/session-token.js`, `lib/midtrans-signature.js`.
- Checkout (`app/api/checkout/route.js`): harga & isi paket dari server; stok ditahan atomik (`lib/stock.js`) SEBELUM pesanan disimpan; pesanan disimpan SEBELUM transaksi Midtrans; Midtrans kedaluwarsa 60 menit; pesanan batal/gagal/kedaluwarsa mengembalikan stok (sekali, `stockReleased`). Baris keranjang = `{kind: 'produk'|'paket', productId, qty}`.
- Tampilan pembeli: komponen bersama di `app/_components/` (header+cari, keranjang, kartu, kerangka), halaman `/`, `/produk/[id]`, `/paket/[id]`; warna/huruf lewat token Tailwind `lpi-*` dan Plus Jakarta Sans (link di `app/layout.js`). Halaman checkout & admin BELUM digayakan ulang (Tahap 3 dan 4). `makeWaLink` ada di `lib/wa.js` (jangan taruh fungsi yang dipanggil server di berkas 'use client').
- Login admin: akun per orang (Owner/Staf), scrypt, sesi dicek ke database, batas 5 gagal/15 menit. Kunci Midtrans hanya Owner (masih teks biasa di dokumen settings).
- Tahap 3 (branch `claude/tahap-3-checkout`): ongkir otomatis dari lokasi HP pembeli (`lib/shipping.js`: haversine x faktor jalan -> zona), gratis ongkir, voucher (`lib/vouchers-math.js`, `lib/vouchers.js`), jadwal kirim Sekarang/Terjadwal dengan kapasitas slot (`lib/delivery.js`, koleksi `delivery_usage`), hitung total (`lib/checkout-math.js`), semuanya digabung di `lib/checkout-service.js` yang dipakai `/api/checkout/quote` (perkiraan) dan `/api/checkout` (pesanan). Stok + slot + voucher ditahan atomik dan dikembalikan saat batal/gagal/kedaluwarsa (`lib/orders.js`). Admin Owner: tab "Ongkir & Voucher" (`delivery-panel.js`: titik gudang, kurir, zona, voucher). Produk punya berat (`weightKg`). Halaman checkout baru di `app/checkout/checkout-client.js`.
- Belum ada: ubah status dari admin, halaman sukses/lacak, notifikasi WhatsApp, Daftar Kirim Kurir, cetak label, admin "Hari ini" (rencana C di Tahap 4). Alur bayar dengan Midtrans sungguhan (termasuk item diskon negatif) belum pernah diuji.
- `lib/erp-sync.js`: kontrak di DEPLOYMENT.md (field tambahan `erpCode`, `components` untuk paket).
- Gambar upload di `/app/uploads` lewat `app/api/uploads/[filename]` — jangan pindahkan ke `public/`.
- Uji database nyata tidak tersedia di cloud (mongod tidak bisa diunduh); logika DB diuji dengan tiruan (mingo). Uji sungguhan di VPS. Hati-hati: `pkill -f` / `pgrep -f` dengan kata yang ada di perintah itu sendiri membunuh shell sendiri.

## Deploy (ringkas; detail di DEPLOYMENT.md bagian "VPS KVM 2 (aktif)")
- Marketplace berjalan di **VPS KVM 2** (id 1956504, IP 148.230.102.34, Ubuntu 24.04 + Docker + Traefik). DNS `marketplace.ladangpangan.id` mengarah ke sana. KVM 1 (919824, Nginx + Odoo) sudah tidak dipakai untuk marketplace.
- Traefik memegang 80/443 dan HTTPS (label ada di `docker-compose.yaml`). Server juga menjalankan ERP, n8n, dll sebagai proyek terpisah: JANGAN sentuh. Marketplace pakai port lokal 3002 (3001 = ERP).
- Pasang lewat konektor Hostinger: `vps_docker_create(virtualMachineId=1956504, project_name="ladang-landing", content="https://github.com/ladangpangan/landingpage", environment=<SEMUA variabel>)`. Alat membaca cabang `master`, jadi `master` harus selalu disamakan dengan `main` (fast-forward). JANGAN kirim isi compose mentah: itu tidak membangun ulang kode. Selalu verifikasi log memuat "Building"/"Built" sebelum menyatakan berhasil; status "success" saja tidak cukup.
- `vps_docker_get` menampilkan `environment` (rahasia) apa adanya: jangan salin nilai ke repo/dokumen. Pemilik sudah mengatakan boleh live berubah langsung (belum ada pengguna) dan sudah membuat backup sendiri; tetap hati-hati.
- Variabel: `MONGO_ROOT_USER/PASSWORD` (harus tetap sama), `MONGO_DB_NAME`, `ADMIN_OWNER_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `MIDTRANS_*`, `ERP_INTEGRATION_URL/KEY`.
- Dari sandbox cloud tidak bisa membuka situs publik (proxy); verifikasi lewat log/status wadah, minta pemilik mencoba lewat HP.

- iPaymu (branch `claude/pembayaran-ipaymu`): `lib/ipaymu.js` (murni, teruji), `lib/ipaymu-api.js`, `/api/ipaymu/notification` (token di `?token=` pada notifyUrl yang dikirim tiap pesanan; JSON/form diterima), `applyIpaymuEvent` di `lib/orders.js` (cocok lewat reference_id = nomor pesanan). BENTUK BALASAN & KABAR iPaymu BELUM TERVERIFIKASI dengan akun nyata: cek daftar "Pemberitahuan terakhir" di admin saat uji pertama. Halaman wajib verifikasi: /faq, /kebijakan-pengembalian-dana, /syarat-dan-ketentuan, /kontak (draf, harus ditinjau pemilik).
- Riwayat & lonceng (branch `claude/riwayat-notifikasi`): `lib/order-timeline.js` (murni, teruji: riwayat gabungan status + kejadian kurir, tanda tangan status, `computeUnread`), `courier.events` dicatat di `applyBiteshipEvent`, `buyerView.timeline/signature`, `POST /api/pesanan/ringkas` (hanya kunci akses sah), `lib/saved-orders.js` (localStorage `lpi-orders-v1`), `app/_components/notif-bell.js` di header (polling 60 dtk, pesanan baru dianggap sudah dibaca; panel `fixed` di HP). Halaman pesanan menyimpan pesanan + toast bila status berubah; `/akun` ikut menyimpan pesanan aktif. Bukan push notification (butuh izin browser/layanan terpisah).
- Menu pembeli (branch `claude/menu-sidebar-pembeli`): tombol ☰ di header membuka `app/_components/side-menu.js` (Beranda, Pesanan Saya `/pesanan-saya`, Alamat Tersimpan `/alamat`, Lacak, FAQ, Pengembalian Dana, Kontak, WhatsApp). Ikon orang -> `/akun` = Pengaturan (nomor WhatsApp + masuk/keluar Google; TIDAK ada password karena pembeli hanya login Google). Tanpa login: nomor & alamat di localStorage `lpi-profile-v1` (`lib/saved-profile.js`, validasi murni `lib/profile-input.js`); login: `customers.phone`, `PUT /api/akun/profil`, `PUT /api/akun/alamat/[id]`. Checkout mengisi nomor/alamat otomatis. Admin TIDAK berubah.
