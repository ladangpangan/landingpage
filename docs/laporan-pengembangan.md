# Laporan Pengembangan — Toko Online PT Ladang Pangan Indonesia (LPI)

Dokumen ini ditulis untuk memberi konteks lengkap tentang proyek kepada asisten AI/orang baru yang ikut mengerjakan.
Kondisi per **7 Oktober 2026** (setelah PR #24–#29 dipasang ke VPS). Bahasa kerja: **Indonesia sederhana** (pemilik bukan programmer).

> Catatan keamanan: dokumen ini sengaja **tidak memuat** kata sandi, kunci API, atau token. Semua rahasia hanya ada di environment variable VPS dan di pengaturan admin (khusus Owner).

---

## 1. Ringkasan proyek

| Hal | Isi |
|---|---|
| Pemilik / penjual | PT Ladang Pangan Indonesia (LPI), satu penjual |
| Produk | Ayam frozen: karkas, potongan (dada, paha, sayap, fillet, ceker), **Paket Hemat** (bundling), **Paket Masak** (bahan + resep) |
| Gudang | Sidoarjo (Royal Crown Palace, RA. 28, Jl. Anwar Hamzah, Tambak Oso, Waru, Sidoarjo 61256) |
| Pembeli utama | Ibu rumah tangga, lewat HP |
| Alamat situs | https://marketplace.ladangpangan.id |
| Repositori | github.com/ladangpangan/landingpage (cabang `main`; `master` harus selalu sama dengan `main`) |
| Status | **Belum rilis ke publik**, belum ada pembeli sungguhan. Semua pembayaran masih menunggu verifikasi akun penyedia. |

Tujuan: toko online sederhana, hangat, dan cepat di HP, dengan ongkir otomatis, jadwal kirim, pelacakan pesanan, dan pembayaran online.

## 2. Cara berkomunikasi & aturan kerja (WAJIB diikuti)

Aturan ini tertulis di `CLAUDE.md` di akar repositori.

- Jelaskan semuanya dengan **bahasa Indonesia sederhana**.
- **Minta persetujuan pemilik ("setuju") sebelum mengubah kode aplikasi.** Tulis rencana singkat dulu.
- Satu **branch baru per pekerjaan**, lalu **Pull Request**. Jangan pernah mengubah `main` langsung.
- Penggabungan dan pemasangan ke VPS hanya setelah pemilik bilang **"gabung pasang"** (kecuali pemilik sudah memberi izin tertulis di pesannya).
- **Harga, ongkir, diskon, stok, kapasitas kirim SELALU dihitung di server.** Jangan percaya angka dari browser.
- **Jangan tulis rahasia di kode.** Rahasia hanya lewat environment variable VPS atau pengaturan admin Owner.
- **Jangan ganti teknologi:** Next.js 15, Tailwind, MongoDB, Docker.
- Selama pengembangan pakai **sandbox**. Mode Production hanya saat pemilik bilang siap rilis.
- Sebelum memasang ke VPS: ingatkan backup dan cara kembali ke versi lama.
- Aplikasi belum rilis, jadi boleh ubah besar-besaran. Yang dipertahankan: logo, nomor WhatsApp, kunci pembayaran.
- Jujur soal yang **belum teruji**. Jangan menyatakan "berhasil" tanpa bukti (lihat bagian 10).

## 3. Tampilan & merek

- HP dulu, tombol besar, bahasa hangat.
- Warna: hijau tua `#1E5A3A`, hijau muda `#E3F0E7`, latar `#F5F7F6`, kartu putih. **Dilarang oranye/krem.**
- Huruf: Plus Jakarta Sans. Token Tailwind `lpi-*`.

## 4. Aturan bisnis

- **Kurir toko:** 1 kurir sendiri (motor listrik), maks **40 kg per trip**, biaya Rp 20.000 per trip.
- **Ongkir per zona dari gudang** (gratis ongkir bila belanja ≥ batas):

| Zona | Jarak | Ongkir | Gratis ongkir bila belanja |
|---|---|---|---|
| 1 | ≤ 5 km | Rp 8.000 | ≥ Rp 100.000 |
| 2 | 5–10 km | Rp 12.000 | ≥ Rp 150.000 |
| 3 | 10–15 km | Rp 18.000 | ≥ Rp 200.000 |
| — | > 15 km | belum dilayani | tombol tanya via WhatsApp |

- Ada **voucher** diskon belanja dan diskon ongkir.
- **Jadwal kirim:** "Kirim Sekarang" (bayar sebelum 17.00 dikirim hari itu) atau "Terjadwal" (1–3 hari ke depan; slot Pagi 08–11, Siang 11–14, Sore 14–17). Slot penuh bila muatan 40 kg per trip.
- **Kurir instan (Biteship):** GoSend/GrabExpress dll. untuk kirim langsung; maks 20 kg; tidak ada gratis ongkir per zona.
- **Status pesanan (tidak boleh mundur):** Menunggu Bayar → Dibayar → Dikemas → Dikirim → Diterima; atau Batal / Gagal / Kedaluwarsa. Pesanan belum dibayar kedaluwarsa dalam 1 jam; stok, slot, dan voucher dikembalikan (sekali).
- **Beli tanpa login.** Login Google hanya pilihan (riwayat, alamat tersimpan).
- Produk diinput lewat admin + impor Excel/CSV. Tiap produk punya "kode ERP" untuk integrasi ERP nanti.

## 5. Teknologi & arsitektur

- **Next.js 15** (App Router, JavaScript), **Tailwind 3**, **MongoDB 7** (driver 6), `output: 'standalone'`, **Docker**.
- Tes logika murni: `npm test` (node:test, folder `tests/`) — saat ini **136 tes, semua lolos**. Belum ada linter.
- Lingkungan pengembangan cloud **tidak punya MongoDB nyata** dan **tidak bisa membuka situs publik/penyedia pembayaran** (proxy memblokir). Logika DB diuji dengan tiruan (mingo) dan server tiruan; uji sungguhan dilakukan pemilik di VPS lewat HP.

### Struktur kode (ringkas)

- `app/` — halaman & API (App Router). Halaman pembeli: `/`, `/produk/[id]`, `/paket/[id]`, `/checkout`, `/pesanan/[orderId]`, `/lacak`, `/pesanan-saya`, `/alamat`, `/akun` (= Pengaturan), halaman kebijakan (`/syarat-dan-ketentuan`, `/kebijakan-privasi`, `/kebijakan-pengembalian-dana`, `/faq`, `/kontak`). Admin: `/admin` dan `/admin/dashboard`.
- `app/_components/` — komponen bersama (header, keranjang, kartu, menu samping `side-menu.js`, lonceng `notif-bell.js`).
- `lib/` — logika. Pola penting: **fungsi murni dipisah dari jaringan/DB** supaya teruji (mis. `ipaymu.js` murni vs `ipaymu-api.js` jaringan; `order-timeline.js`, `profile-input.js`, `cart-math.js`, `shipping.js`, `vouchers-math.js`, `checkout-math.js`).
- `lib/checkout-service.js` — satu pintu hitungan checkout (ongkir, voucher, jadwal, total) yang dipakai `/api/checkout/quote` (perkiraan) dan `/api/checkout` (pesanan).
- `lib/orders.js` — semua operasi pesanan (buat, ubah status, batal, kedaluwarsa, notifikasi tiap penyedia, kejadian kurir).
- `lib/schema.js` — dokumentasi koleksi + `ensureSchema()` (index, seed zona/aturan kirim, migrasi data lama).
- Koleksi MongoDB: products, variants, bundles, zones, delivery_config, delivery_usage, vouchers, admins, orders, customers, settings, login_attempts, payment_events.
- Gambar upload disimpan di `/app/uploads` (volume Docker) dan disajikan lewat `app/api/uploads/[filename]`. **Jangan dipindah ke `public/`.**

### Keamanan yang sudah ada

- Admin multi-akun (Owner & Staf), kata sandi di-hash scrypt, sesi dicek ke database, batas 5 gagal login per 15 menit.
- Kunci/ token penyedia **hanya Owner** yang bisa mengisi; tidak pernah dikembalikan mentah ke browser (hanya pratinjau "••••xxxx").
- Webhook diperiksa (Midtrans: tanda tangan; Mayar: header token; iPaymu & Biteship: token), jumlah dibandingkan dengan total server; ketidakcocokan → pesanan ditandai "perlu dicek".
- Halaman pesanan pembeli dilindungi **kunci akses** (HMAC nomor pesanan) atau nomor pesanan + nomor WhatsApp.
- Stok, slot kirim, dan kuota voucher ditahan **atomik** sebelum pesanan disimpan.
- Pesanan disimpan **sebelum** transaksi penyedia dibuat; bila penyedia gagal, pesanan ditandai gagal dan semua tahanan dikembalikan.

## 6. Riwayat pengembangan (urut waktu)

| Tahap / PR | Isi |
|---|---|
| Tahap 1 | Fondasi & keamanan: struktur data baru, admin Owner/Staf, perbaikan keamanan pembayaran & login |
| Tahap 2 | Tampilan pembeli baru: beranda, detail produk, Paket Hemat/Masak, pencarian, produk habis, stok |
| Deploy KVM 2 (PR #3–#7) | Pindah ke VPS KVM 2 + Traefik; perbaikan simpan produk, gambar, akun, kategori |
| PR #8 | Halaman paket |
| Tahap 3 (PR #9) | Checkout: ongkir otomatis dari lokasi HP, gratis ongkir, voucher, jadwal kirim + kapasitas 40 kg |
| Tahap 4A (PR #10) | Admin: halaman "Hari ini", ubah status pesanan, Daftar Kirim Kurir, cetak label, impor CSV, polling pesanan baru |
| Tahap 4B (PR #11) | Halaman pesanan & lacak (`/lacak`), batal oleh pembeli, login Google opsional, Kebijakan Privasi |
| PR #12 | Perbaikan foto produk (coba ulang saat gagal muat) |
| PR #13 | **Mayar.id** sebagai gateway kedua |
| PR #14–#16, #18 | **Biteship** (kurir instan): tarif, pesan kurir dari admin, webhook status, perbaikan header & ping webhook |
| PR #19 | **iPaymu** (gateway ketiga) + halaman Pengembalian Dana, FAQ, Kontak (syarat verifikasi iPaymu), footer berisi alamat usaha |
| PR #20 | Riwayat lengkap pesanan + lonceng pemberitahuan di aplikasi |
| PR #21 | Menu samping pembeli, Pesanan Saya, Alamat Tersimpan, Pengaturan (nomor WhatsApp) |
| PR #22 | Tombol "Tes koneksi" Mayar & iPaymu di admin |
| PR #17 | Perbaikan tes login Google yang sesekali gagal |
| PR #23 | **Perbaikan bug Mayar**: kabar `payment.reminder`/`testing` (status SUCCESS = status pengiriman kabar) sempat membuat pesanan belum-bayar tampak "Dibayar"; kini hanya event bayar sungguhan (`payment.received/success/paid/completed/settled`) yang dihitung |
| PR #24 | **Malam hari hanya Biteship**: lewat jam batas (bawaan 17.00 WIB) kurir toko disembunyikan/ditolak |
| PR #25 | **Data pelanggan** di admin (Owner saja) |
| PR #26 | **Referral**: kode perujuk, diskon pembeli, komisi perujuk |
| PR #27 | **Inspirasi Menu** (resep + tombol masukkan bahan ke keranjang) |
| PR #28 | **Notifikasi admin**: WhatsApp Cloud API resmi (Meta) + bot Telegram |
| PR #29 | **Notifikasi admin lewat Baileys** (WhatsApp tidak resmi, wadah `wa-gateway` terpisah) |

## 7. Fitur per area (kondisi sekarang)

### Pembeli (toko)
- Beranda, pencarian, kategori, Paket Hemat/Masak, detail produk, produk habis ("stok tinggal N" bila ≤ 5).
- Keranjang; checkout: nama, nomor WhatsApp, alamat, lokasi (tombol "Pakai lokasi saya"), pilih kurir toko (Kirim Sekarang/Terjadwal) atau kurir instan Biteship, voucher, rincian biaya. Nomor & alamat tersimpan terisi otomatis.
- Halaman pesanan: status, langkah, **Riwayat pesanan** (status + kejadian kurir, jam WIB), bayar lanjut, batal (selama belum dibayar), beli lagi, WhatsApp. Toast bila status berubah (polling 15 detik).
- **Lonceng** di header (polling 60 detik; titik merah bila ada kabar baru) memantau pesanan yang tersimpan di HP itu.
- **Menu samping (☰):** Beranda, Pesanan Saya, Alamat Tersimpan, Lacak Pesanan, FAQ, Pengembalian Dana, Kontak, Chat WhatsApp.
- **Ikon orang = Pengaturan:** nomor WhatsApp + masuk/keluar Google. **Tanpa ganti password** (pembeli hanya login Google).
- Tanpa login: nomor, alamat (maks 5), dan daftar pesanan disimpan di **localStorage HP** (tidak ikut ke HP lain). Dengan login Google: nomor & alamat di akun, riwayat belanja dari server.

### Admin (`/admin`)
- Tab: Hari ini, Pesanan, Daftar Kirim Kurir (cetak label), Produk & Paket (impor CSV/Excel), Paket Hemat & Masak, Ongkir & Voucher (titik gudang, kurir, zona, voucher), Pengaturan (halaman, Payment Gateway, Biteship, akun Owner/Staf).
- Payment Gateway: pilih satu dari Midtrans / Mayar / iPaymu; tombol **Tes koneksi** (Mayar, iPaymu); daftar "Pemberitahuan terakhir" (catatan mentah webhook, untuk pemeriksaan).
- Pesanan: ubah status satu langkah maju atau batalkan yang belum dibayar; tombol **Panggil Kurir** untuk Biteship (hanya setelah "Dikemas").
- **Admin sengaja tidak diubah** pada pekerjaan menu pembeli (permintaan pemilik).
- Tab baru (7 Okt): **Pelanggan** (Owner; daftar anggota login Google vs tamu dikelompokkan dari nomor WhatsApp, total belanja hanya status dibayar..diterima, ekspor CSV), **Referral** (Owner), **Inspirasi Menu** (Owner & Staf), **Notifikasi Admin** (Owner).

### Fitur baru 7 Oktober 2026
- **Malam hanya Biteship:** `storeCourierOpen` di `lib/shipping.js` (jam batas `cutoffHour`, bawaan 17 WIB). Sesudahnya `evaluateCheckout` memaksa `shippingMethod='biteship'` (juga untuk Terjadwal besok), `/api/checkout` menolak kurir toko dengan 409 `toko_tutup`, tab Kurir Toko disembunyikan. Muatan > 20 kg saat toko tutup → arahan WhatsApp (batas Biteship).
- **Referral:** kode dimasukkan di kolom voucher checkout ("Kode voucher atau referral"). Bukan voucher → dicari di koleksi `referrals`. Diskon pembeli memakai mesin voucher (`referralAsVoucher`: persen, maksimum, tanpa kuota; voucher menang bila kode sama; kode referral dan voucher tidak boleh kembar). Komisi = % dari belanja SETELAH diskon, tanpa ongkir, disimpan di `order.referral {code, commissionPct, commission, discount, status}`; status `pending` → `earned` (pesanan Diterima) → `paid` (Owner tandai sudah dibayar → `referral_payouts`) atau `void` (batal/gagal/kedaluwarsa), lewat `applyReferralStatus` di `transitionOrder`. Perujuk tidak boleh memakai kodenya sendiri (cocok nomor WhatsApp). Transfer komisi dilakukan manual. Pengaturan global di `referral_settings`. Murni: `lib/referral-math.js`; DB: `lib/referrals.js`.
- **Inspirasi Menu:** koleksi `recipes` (_id = slug; bahan toko = `{productId, qty}` bisa dimasukkan ke keranjang, bahan lain teks, langkah). Validasi murni `lib/recipe-input.js`, DB `lib/recipes.js`, 6 resep contoh dibuat SEKALI (bendera `recipe_flags`; foto kosong). Halaman `/inspirasi`, `/inspirasi/[id]`, bagian di beranda, menu samping, sitemap. Harga tetap dihitung ulang server saat checkout.
- **Notifikasi admin** (`lib/notify.js`, pengaturan di `notify_settings`, token tidak pernah dikembalikan ke browser): saluran (a) WhatsApp Cloud API Meta (templat `pesanan_dibayar` isian nomor/nama/total/pengiriman dan `pesanan_perlu_dicek` isian nomor/keterangan, bahasa `id`, Graph API v21.0), (b) bot Telegram, (c) Baileys. Pemicu lewat `notifyAdmin()` di `lib/orders.js`: pesanan Dibayar (sekali per pesanan), jumlah bayar tidak cocok, bayar masuk tapi pesanan sudah batal/kedaluwarsa, kurir Biteship bermasalah (sekali per pesanan+alasan, penjaga `order.notified`). Hasil kirim dicatat di `payment_events` (gateway 'notifikasi'). Admin: tab "Notifikasi Admin" + tombol "Kirim pesan tes".
- **Baileys (WhatsApp tidak resmi, hanya untuk admin):** wadah terpisah `wa-gateway/` (Node 20, `@whiskeysockets/baileys` 7.0.0-rc14 dipasang persis), sesi di volume `wa_auth`, TANPA port publik, token `WA_GATEWAY_TOKEN` wajib (kosong/<16 karakter = gateway diam). Inti murni `gateway-core.js` (antrean berurutan + jeda acak 1,5–3,5 dtk, sambung ulang bertahap, kode 401 = hapus sesi + QR baru; teruji dengan koneksi palsu); penghubung nyata `baileys-adapter.js` BELUM pernah diuji dengan WhatsApp sungguhan. App: `lib/baileys-notify.js`, `GET/POST /api/admin/notify/baileys` (status + QR, putuskan), env `WA_GATEWAY_URL` (bawaan `http://wa-gateway:3100`). Pakai nomor khusus; risiko diblokir WhatsApp; ganti ke Cloud API resmi bila terkena blokir.

## 8. Integrasi pihak ketiga

| Penyedia | Fungsi | Status |
|---|---|---|
| **Midtrans** (Snap) | Pembayaran | Kode siap; akun **masih verifikasi bisnis**; kunci belum diisi di VPS |
| **Mayar.id** | Pembayaran (redirect ke halaman bayar) | Kode siap; akun dalam verifikasi. Sempat **401 Unauthorized** (kunci Read Only / saklar Production tak cocok); per 7 Okt pemilik menyatakan pengaturan Mayar sudah selesai. Pembayaran sungguhan end-to-end masih perlu dicoba. Webhook: hanya event bayar (`payment.received/success/paid/completed/settled`) yang menandai Dibayar. |
| **iPaymu** | Pembayaran (redirect) | Kode siap; pemilik sedang mengisi formulir verifikasi (butuh halaman FAQ, Refund, S&K, Kontak — sudah ada) |
| **WhatsApp Cloud API (Meta)** | Notifikasi admin | Kode siap; **menunggu verifikasi perusahaan Meta**, lalu templat harus disetujui dan Phone number ID/token diisi di admin. Belum diuji dengan Meta sungguhan |
| **Baileys** | Notifikasi admin (sementara) | Terpasang di VPS (log: gateway "siap"); scan QR & kirim pesan belum pernah diuji |
| **Telegram bot** | Notifikasi admin | Kode siap; butuh token BotFather + chat ID; belum diuji sungguhan |
| **Biteship** | Tarif & pemesanan kurir instan + webhook status | Mode uji; tarif sudah terverifikasi pemilik; pemesanan kurir & webhook dengan kejadian nyata belum diuji (menunggu pembayaran aktif). Di mode uji sering "No courier available" untuk lokasi tertentu. |
| **Google OAuth** | Login pembeli opsional | **Berfungsi** (pemilik sudah berhasil login). Status aplikasi OAuth masih mode uji — ganti ke "In production" sebelum rilis. |
| **ERP** | Sinkron pesanan (`lib/erp-sync.js`) | Kontrak di DEPLOYMENT.md; kosong (nonaktif) sampai `ERP_INTEGRATION_URL/KEY` diisi |

### Detail gateway (abstraksi)
- Pengaturan toko menyimpan `paymentGateway` ('midtrans' | 'mayar' | 'ipaymu') dan kunci tiap penyedia.
- Pesanan menyimpan `payGateway` dan `payment.{invoiceId|sessionId, transactionId, payUrl}`.
- Penyedia berbasis redirect (Mayar, iPaymu): pesanan belum dibayar > 65 menit dikedaluwarsakan sendiri (`expireStaleMayarOrders`).
- **iPaymu:** `POST {base}/api/v2/payment`, tanda tangan `HMAC-SHA256("POST:VA:sha256(body):APIKey")`; sandbox `sandbox.ipaymu.com`, produksi `my.ipaymu.com`. Webhook `/api/ipaymu/notification?token=<rahasia>` (token dikirim di `notifyUrl` per pesanan), dicocokkan lewat `reference_id` = nomor pesanan.
- **Mayar:** `POST /hl/v2/invoices` (cadangan v1), `Authorization: Bearer`; sandbox `api.mayar.club`, produksi `api.mayar.id`. Webhook `/api/mayar/notification` dengan header `x-callback-token`.
- **Biteship:** `Authorization` = kunci mentah (tanpa "Bearer"); webhook `/api/biteship/webhook` dengan header `x-webhook-token` (cadangan `?token=`); ping instalasi dengan isi kosong harus dijawab 200.

## 9. Deploy & operasional

- **VPS KVM 2** (Hostinger id 1956504, IP 148.230.102.34, Ubuntu 24.04, Docker + Traefik). Traefik memegang 80/443 dan HTTPS. Server juga menjalankan ERP, n8n, dll. sebagai proyek terpisah: **jangan disentuh**. Marketplace memakai port lokal 3002.
- Pemasangan lewat konektor Hostinger: `vps_docker_create` dengan URL repo + **seluruh** environment (`MONGO_ROOT_USER/PASSWORD` harus tetap sama, `MONGO_DB_NAME`, `ADMIN_OWNER_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `MIDTRANS_*`, `GOOGLE_CLIENT_ID/SECRET`, `SITE_URL`, `ERP_INTEGRATION_URL/KEY`).
- Alat membaca cabang **`master`** → selalu samakan dengan `main` (fast-forward) sebelum memasang.
- **Selalu verifikasi log memuat "Building" lalu "Built"** (build ±1,5–2 menit) dan aplikasi "Ready" sebelum menyatakan berhasil. Status "success" saja tidak cukup.
- Data (database & unggahan foto) ada di volume Docker dan **tidak hilang** saat pasang ulang.
- Kembali ke versi lama: pasang ulang commit sebelumnya; untuk pembayaran cukup pilih gateway lain di admin.
- Hati-hati dengan log Hostinger: baris log MongoDB sangat panjang; simpan keluaran ke berkas lalu cari dengan `grep`/python.
- `vps_docker_get` menampilkan environment (rahasia) apa adanya — **jangan salin nilainya ke repositori/dokumen**.

## 10. Hal yang BELUM teruji / risiko (jujur)

1. **Pembayaran nyata belum pernah berhasil end-to-end** dengan penyedia mana pun (Midtrans, Mayar, iPaymu). Bentuk balasan dan webhook Mayar/iPaymu/Biteship **belum terverifikasi** dengan akun nyata; semua kabar dicatat mentah di "Pemberitahuan terakhir" untuk dicek pemilik.
2. Alamat uji untuk tombol Tes koneksi (daftar tagihan Mayar, cek saldo iPaymu) diambil dari pengetahuan umum API; dokumentasi `docs.mayar.id` tidak bisa dibuka dari lingkungan pengembangan.
3. Pemesanan kurir Biteship & webhook statusnya belum diuji dengan kejadian nyata; di mode uji lokasi tertentu "tidak ada kurir".
4. Kunci Midtrans disimpan **teks biasa** di dokumen settings database (hanya Owner bisa melihat pratinjau). Pertimbangkan enkripsi sebelum rilis.
5. Sandi admin, kunci rahasia Google, dan sandi database sempat **terlihat di percakapan/log pemasangan** → **ganti sebelum rilis** (sandi admin, buat ulang Google client secret).
6. Halaman **Kebijakan Privasi, Pengembalian Dana, FAQ, S&K adalah draf** yang harus ditinjau pemilik/hukum (batas komplain 24 jam, refund 3–7 hari kerja, dll.).
7. Pesanan, alamat, dan nomor pembeli tanpa login hanya di localStorage HP itu → hilang bila ganti HP atau hapus data browser.
8. Lonceng/ toast hanya bekerja saat situs terbuka; **bukan push notification**.
9. Kapasitas untuk banyak pesanan belum diuji (belum ada uji beban).
10. Alur Midtrans dengan item diskon negatif belum pernah diuji sungguhan.
11. **Baileys & Cloud API belum pernah diuji dengan WhatsApp/Meta sungguhan** (hanya server tiruan). Baileys tidak resmi: nomor bisa diblokir.
12. Referral, data pelanggan, Inspirasi Menu, dan aturan malam-Biteship diuji lewat HTTP/tampilan dengan database tiruan; **belum dicoba pemilik lewat HP**.
13. Cadangan keamanan Mayar belum ada: mencocokkan status tagihan ke API Mayar sebelum menandai Dibayar (endpoint belum terverifikasi).
14. Pemasangan 7 Okt menampilkan sandi admin & Google secret di keluaran konektor → pemilik diminta menggantinya.

## 11. Rencana ke depan

**Menunggu pemilik**
- Meta: selesaikan **verifikasi perusahaan**, buat templat `pesanan_dibayar` & `pesanan_perlu_dicek`, isi Phone number ID/token (sementara pakai Baileys/Telegram).
- Scan QR Baileys dengan nomor khusus, isi nomor admin, "Kirim pesan tes".
- Ganti sandi admin & Google client secret.
- Selesaikan verifikasi iPaymu (isi 4 link: `/faq`, `/kebijakan-pengembalian-dana`, `/syarat-dan-ketentuan`, `/kontak`; URL media sosial aktif dari pemilik).
- Mayar: sudah diatur (7 Okt); coba satu pesanan kecil dan bayar sungguhan; pesanan tak dibayar harus tetap "Menunggu Bayar".
- Midtrans: tunggu review bisnis selesai.
- Tinjau draf halaman kebijakan; ganti sandi/kunci yang terpapar.

**Pekerjaan berikutnya (setelah persetujuan "setuju")**
- **WhatsApp ke pembeli** (admin sudah ada, lihat atas) — menunggu Cloud API resmi (Meta).
- **Tahap 5 — siap rilis:** uji lewat HP, uji pembayaran sungguhan, Meta Pixel & Google Analytics, keamanan tambahan, backup harian otomatis, ganti ke Production (Midtrans/Mayar/iPaymu), Google OAuth "In production", enkripsi kunci, tinjau privasi.
- **Play Store (baru ditanyakan pemilik, belum disetujui):** jadikan situs PWA lalu bungkus jadi aplikasi Android (TWA via Bubblewrap/PWABuilder); butuh akun Google Play Console atas nama PT (organisasi, nomor D-U-N-S), ikon 512×512, gambar sampul 1024×500, tangkapan layar; **fitur hapus akun wajib** karena ada login Google; risiko penolakan "hanya pembungkus situs". iPhone/App Store urusan terpisah (US$99/tahun).
- Uji nyata Biteship (panggil kurir + webhook) setelah ada pembayaran aktif.
- Admin: tata ulang menu (rencana pilihan C) bila pemilik meminta.

## 12. Pelajaran teknis (agar tidak mengulang kesalahan)

- `pgrep -f`/`pkill -f` dengan kata yang ada di perintah itu sendiri membunuh shell sendiri; gunakan trik `[x]` pada regex atau cocokkan nama proses.
- Panel di dalam `<form>` besar `settings-form.js` **tidak boleh** memakai `<form>`/`type=submit` (formulir bersarang); pakai `type=button` + onClick.
- Fungsi yang dipanggil server jangan ditaruh di berkas `'use client'` (mis. `makeWaLink` ada di `lib/wa.js`).
- Modul murni yang diuji `node:test` memakai impor **relatif** (`./x.js`), bukan alias `@/`.
- Mengedit dengan skrip pemotong teks bisa diam-diam menghapus kode; jalankan ulang seluruh rangkaian uji API setelah suntingan besar.
- Uji ketahanan: jalankan tes berulang kali (30+) untuk mendeteksi tes yang kadang gagal (pernah terjadi pada tes state Google).
- Nilai `null` pada koordinat jangan dikonversi dengan `Number(null)` (hasilnya 0, bukan "kosong").
- Jangan impor pustaka berbasis `crypto` ke komponen client (membengkakkan bundel).
- Pemanggilan penyedia jaringan wajib punya batas waktu (15 detik) dan tidak boleh membuat pesanan menggantung.

## 13. Lampiran: perintah berguna

```bash
npm test                      # 136 tes logika murni
npx next build                # cek build produksi
git push origin origin/main:refs/heads/master   # samakan master dengan main sebelum deploy
```

Alur kerja standar satu perubahan: (1) tulis rencana singkat → pemilik "setuju" → (2) branch baru → (3) kode + tes + uji HTTP/tampilan dengan server tiruan → (4) PR → (5) pemilik "gabung pasang" → (6) gabung, samakan `master`, `vps_docker_create`, verifikasi log "Built" → (7) minta pemilik mencoba lewat HP.
