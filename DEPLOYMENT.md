# Deployment — VPS (Hostinger KVM 1)

> **PEMBARUAN (Oktober 2026): marketplace kini berjalan di VPS KVM 2, bukan KVM 1.**
> Bagian "Infrastructure", "Redeploying", dan "Nginx vhost" di bawah menggambarkan
> KVM 1 (Nginx + Odoo) dan sudah tidak dipakai untuk marketplace. Yang berlaku
> sekarang ada di bagian "VPS KVM 2 (aktif)" ini.

## VPS KVM 2 (aktif)

- **VPS**: Hostinger KVM 2, id `1956504`, hostname `srv1956504.hstgr.cloud`, IP
  `148.230.102.34`, Ubuntu 24.04 dengan Docker + Traefik.
- **DNS**: `marketplace.ladangpangan.id` (A record) mengarah ke IP ini.
- **Traefik** (proyek Docker `traefik`) memegang port 80/443 dan menerbitkan
  HTTPS (Let's Encrypt). Aplikasi ini hanya perlu label Traefik di
  `docker-compose.yaml` (sudah ada). Jangan menambah proxy lain.
- Server ini juga menjalankan aplikasi lain (ERP, n8n, dll.) sebagai proyek
  Docker terpisah. Jangan menghentikan atau menghapusnya. Port 3001 dipakai ERP;
  marketplace memakai 3002 (hanya localhost).
- Proyek Docker marketplace bernama `ladang-landing` (service `mongo` dan
  `landing`, volume `mongo_data` dan `uploads_data`).

### Cara memasang versi baru (lewat konektor Hostinger)

1. Pastikan kode sudah digabung ke `main` **dan** cabang `master` disamakan
   dengan `main` (alat Hostinger membaca `docker-compose.yaml` dari alamat repo;
   `master` dipertahankan sama dengan `main`).
2. Panggil `vps_docker_create` dengan `virtualMachineId=1956504`,
   `project_name="ladang-landing"`, `content="https://github.com/ladangpangan/landingpage"`
   dan `environment` berisi SEMUA variabel (penuh, bukan sebagian; lihat daftar di
   bawah). Alat ini mengganti proyek dengan nama yang sama, volume data tetap.
3. **Jangan** mengirim isi compose mentah (`content` berupa YAML): cara itu
   TIDAK membangun ulang aplikasi, hanya memakai ulang gambar lama. Itu sebabnya
   pemasangan pertama Tahap 1-2 sempat tidak mengubah kode. Mengisi `image:` dengan
   tag yang belum ada juga gagal dan sempat membuat database berhenti
   (pulihkan dengan `vps_docker_start`).
4. Cek `vps_docker_containers` dan `vps_docker_logs`: container `landing` harus
   baru dibuat dan log memuat proses build.
5. Jangan menulis nilai rahasia ke repo atau chat. `vps_docker_get` menampilkan
   `environment` apa adanya; baca hanya bila perlu.

Variabel `environment`: `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD` (harus tetap
sama), `MONGO_DB_NAME`, `ADMIN_OWNER_EMAIL`, `ADMIN_PASSWORD`,
`ADMIN_SESSION_SECRET`, `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`,
`MIDTRANS_IS_PRODUCTION`, `ERP_INTEGRATION_URL`, `ERP_INTEGRATION_KEY`.

### Foto yang diunggah (volume `uploads_data`)

Foto produk yang diunggah lewat admin disimpan di volume `uploads_data`, bukan di
database. Saat data dipindah antar server (mis. KVM 1 ke KVM 2), database ikut
tetapi foto TIDAK otomatis ikut: produk masih menunjuk ke berkas yang tidak ada
(`/api/uploads/...` kode 404). Tampilan toko menampilkan kotak ikon sebagai
pengganti; unggah ulang fotonya lewat admin. Foto contoh bawaan template sudah
dihapus dari kode; satu-satunya berkas gambar di kode kini `public/logo.png`
(alamat lama `/landing/logo.png` dialihkan ke sana lewat `next.config.js`).

### Backup dan kembali ke versi lama

- Backup: snapshot KVM 2 lewat hPanel atau `vps_snapshots_create` (menimpa
  snapshot sebelumnya). Memulihkan snapshot mengembalikan SELURUH server
  (termasuk ERP dan n8n), jadi gunakan sebagai pilihan terakhir.
- Kembali ke kode lama: arahkan `master` dan `main` ke commit lama yang baik,
  lalu pasang ulang dengan langkah di atas. Struktur data baru bersifat
  menambah, jadi versi lama tetap bisa membaca produknya.

This app runs on the **same VPS as Odoo**, not on its own server. That VPS
already has a system-level Nginx acting as the single public gateway on
ports 80/443, so this app's container never touches those ports directly.
Getting this working the first time took a long debugging session — read
this before changing the deployment setup again.

## Infrastructure

- **VPS**: Hostinger KVM 1, id `919824`, hostname `srv919824.hstgr.cloud`,
  IP `145.79.8.46`, Ubuntu 24.04. Access via Hostinger hPanel → VPS →
  "Konsol web" (root shell), or the Hostinger AI agent in the same panel.
- **Nginx** (system service, not Docker) is the only thing bound to ports
  80/443. It already has vhosts for `odoo.ladangpangan.id` and
  `internal.ladangpangan.id` (both proxy to Odoo on `127.0.0.1:8069`).
  **Never** run anything else (Caddy, Traefik, another Nginx) that tries to
  bind 80/443 on this VPS — it will either fail to start (port already in
  use) or, worse, silently become the implicit default_server and steal
  traffic meant for Odoo.
- **This app** runs as a single Docker container (via Hostinger's Docker
  Manager / Docker Compose), published **only to `127.0.0.1:3001`** — not
  public. Nginx has its own vhost (`/etc/nginx/sites-available/
  marketplace.ladangpangan.id`, symlinked into `sites-enabled/`) that
  reverse-proxies `marketplace.ladangpangan.id` → `http://127.0.0.1:3001`,
  and certbot manages its SSL cert the same way it does for the Odoo
  vhosts.
- **Domain**: `marketplace.ladangpangan.id` (an A record pointing directly
  at `145.79.8.46`, managed in Hostinger DNS). The apex domain
  `ladangpangan.id` runs a separate, unrelated Hostinger Website Builder
  site — never repoint the apex record for this project.

## Redeploying

Deploys go through the Hostinger VPS MCP tool
`VPS_createNewProjectV1(virtualMachineId=919824, project_name="ladang-landing",
content="https://github.com/ladangpangan/landingpage", environment="...")`.
It clones the repo fresh into a temp dir on the VPS, builds the image from
the `Dockerfile`, and runs `docker compose up` using `docker-compose.yaml`
at the repo root. This **replaces** the existing project of the same name.

Because the deploy only ever ends up copying `docker-compose.yaml` into a
persistent project directory (not the full repo) for the *running*
container's bind mounts, **never rely on relative bind-mounts in
docker-compose.yaml** (e.g. `./Caddyfile:/etc/...`) — they silently resolve
to a missing path and Docker creates an empty directory there instead,
which then fails to start with a "not a directory" mount error. If a
container needs a config file, `COPY` it into the image at build time
instead.

`docker-compose.yaml` should stay minimal: one service, one port publish to
`127.0.0.1:3001:3000`, no reverse proxy of its own. Do not add Caddy,
Traefik, or any `ports: - "80:80"` / `"443:443"` mapping back into this
file — see the Nginx note above.

### Uploaded images don't live under `public/`

Next's `output: 'standalone'` server only serves files under `public/` that
existed **at build time** — a file written to `public/uploads/` at runtime
(e.g. an admin image upload) 404s even though it's on disk, because the
standalone server doesn't re-scan that directory. Confirmed by testing
directly against `node server.js` from `.next/standalone`, not just `next
start` (which doesn't apply here at all and warns as much).

The fix already in place: uploads are written to a plain `uploads/`
directory at the project root (`lib/uploads.js` → `UPLOAD_DIR`), *outside*
`public/`, and served through `app/api/uploads/[filename]/route.js` — an
ordinary request handler that reads the file fresh on every request, so it
has no build-time/runtime split. `docker-compose.yaml` mounts the
`uploads_data` volume at `/app/uploads` (not `/app/public/uploads`) to
match. If image uploads ever start 404ing again, this is the first thing
to check — don't try to move them back under `public/`.

## Nginx vhost (lives on the VPS, not in this repo)

`/etc/nginx/sites-available/marketplace.ladangpangan.id` (symlinked into
`sites-enabled/`):

```
server {
    listen 80;
    server_name marketplace.ladangpangan.id;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

`client_max_body_size 10m` matters here: Nginx's own default is 1MB, well under
the app's 5MB image-upload limit (`app/api/admin/upload/route.js`). Without
raising it, any upload/save over 1MB never reaches the app at all — Nginx
rejects it and returns its own HTML 413 error page instead of JSON, which
shows up client-side as a `SyntaxError: Unexpected token '<' ... is not valid
JSON` toast (the client tried to `res.json()` an HTML page). If that error
ever reappears, this line is the first thing to check.

Certbot (`certbot --nginx -d marketplace.ladangpangan.id --redirect
--agree-tos --no-eff-email`) adds the SSL server block and HTTP→HTTPS
redirect on top of this automatically, and renews it on its own schedule.
This step only needs to be redone if the vhost file itself is ever
deleted/recreated from scratch — the running container/app deploys never
touch Nginx or the cert.

If `https://marketplace.ladangpangan.id` ever starts resolving to Odoo's
database selector again, or SSL breaks, check in this order:
1. `ls /etc/nginx/sites-enabled/ | grep marketplace` — vhost file must
   exist and be symlinked (it has gone missing/never got created before).
2. `nginx -T 2>&1 | grep -A15 "server_name marketplace"` — confirm Nginx
   actually loaded the block.
3. `curl -I -H "Host: marketplace.ladangpangan.id" http://127.0.0.1:80` —
   if this doesn't proxy correctly, the issue is Nginx routing, not the app.
4. `curl -I http://127.0.0.1:3001` — confirms the app container itself is
   up, independent of Nginx.
5. `certbot certificates` — confirms a cert for this exact domain exists
   and isn't expired.

## Database — self-hosted MongoDB on this VPS

There's no external database (no Atlas, no managed service). MongoDB runs
as its own container (`mongo`, image `mongo:7`) inside this same
`docker-compose.yaml`, on the compose-internal network only — it is never
published to a host port, so it isn't reachable from outside the VPS at
all (safer than a cloud DB that has to allow-list `0.0.0.0/0` because this
VPS has no static IP). The `landing` app container connects to it as
`mongodb://<user>:<password>@mongo:27017/?authSource=admin`, built from the
`MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` env vars.

Its data lives in the `mongo_data` named Docker volume — same durability
pattern as `uploads_data` above, which has already survived many redeploys.
**`MONGO_ROOT_PASSWORD` must stay identical across every redeploy** — it's
baked into the volume by Mongo on first init; changing it later doesn't
break existing data but does break the app's ability to authenticate until
it's set back to the original value. Keep the current value in a password
manager, not just in your head.

For extra safety beyond the volume (e.g. before any risky change), take a
full VPS snapshot from the Hostinger panel — that backs up `mongo_data`
along with everything else. There's no automated `mongodump` backup job
today; add one if the data ever becomes business-critical enough to need
point-in-time restores.

## Environment variables

Passed via the `environment` field on the VPS deploy call (not committed
anywhere):
- `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` — credentials for the
  self-hosted `mongo` container (see above). Must be set and must stay the
  same on every redeploy.
- `MONGO_DB_NAME` — optional, defaults to `ladang_landing`.
- `ADMIN_OWNER_EMAIL` / `ADMIN_PASSWORD` — dipakai sekali untuk membuat akun Owner
  pertama (lihat "Akun admin" di bawah). `ADMIN_SESSION_SECRET` — wajib,
  penanda sesi login.
- `MIDTRANS_SERVER_KEY` / `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` /
  `MIDTRANS_IS_PRODUCTION` — optional at deploy time; can also be set from
  the `/admin` page after login, which takes precedence.
- `ERP_INTEGRATION_URL` / `ERP_INTEGRATION_KEY` — optional; see below.

## Akun admin (sejak Tahap 1)

Login admin memakai email + password per orang, disimpan (di-hash) di koleksi
`admins`. Ada dua peran: **Owner** (semua akses, termasuk kunci Midtrans dan
kelola akun) dan **Staf** (produk, pesanan, galeri; tanpa pembayaran/akun).
Percobaan login gagal dibatasi (5x per 15 menit per email+IP).

Akun Owner pertama: isi `ADMIN_OWNER_EMAIL` dan `ADMIN_PASSWORD` di environment,
lalu masuk sekali di `/admin` dengan keduanya. Akun dibuat otomatis. **Segera
ganti password lewat menu Akun** (minimal 10 karakter). Setelah ada akun,
`ADMIN_PASSWORD` tidak dipakai lagi dan boleh dikosongkan.

Jika Owner lupa password dan tidak ada Owner lain: kosongkan koleksi `admins`
(`docker exec -it <mongo> mongosh ... --eval 'db.admins.deleteMany({})'`), lalu
login lagi dengan `ADMIN_OWNER_EMAIL`/`ADMIN_PASSWORD`.

## Backup sebelum memasang versi baru, dan cara kembali

**Backup (sebelum setiap pemasangan):**
1. hPanel Hostinger → VPS → **Snapshot & backup** → buat snapshot. Ini
   menyimpan `mongo_data` dan `uploads_data` sekaligus.
2. Opsional, salinan database saja (di Konsol web VPS):
   `docker exec $(docker ps -qf name=mongo) mongodump --username "$MONGO_ROOT_USER" --password "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --archive=/data/db/backup-$(date +%F).archive`

**Kembali ke versi sebelumnya bila ada masalah:**
- Aplikasi saja: deploy ulang commit sebelumnya (di GitHub, catat nomor commit
  yang jalan baik sebelum update; deploy dari commit itu).
- Data ikut rusak: pulihkan snapshot dari hPanel (menggantikan seluruh VPS
  ke kondisi snapshot, termasuk Odoo, jadi hati-hati) atau
  `mongorestore --archive=... --drop` dari file backup di atas.
- Perubahan Tahap 1 hanya MENAMBAH koleksi baru (`products`, `variants`,
  `zones`, `delivery_config`, `admins`, dst.) dan mengganti nama status pesanan.
  Versi lama tidak membaca koleksi baru, jadi kembali ke versi lama aman untuk
  produk, tetapi status pesanan baru (mis. `dibayar`) tidak dikenali versi lama.

## Pesanan & pembayaran (sejak Tahap 1)

- Pesanan disimpan dulu (status `menunggu_bayar`), baru transaksi Midtrans
  dibuat. Bila database mati, checkout menolak dengan pesan "coba lagi".
- Status: `menunggu_bayar → dibayar → dikemas → dikirim → diterima`, atau
  `batal` / `gagal` / `kedaluwarsa` (hanya dari `menunggu_bayar`). Tidak bisa mundur.
- Notifikasi Midtrans (`/api/midtrans/notification`): signature diverifikasi,
  `gross_amount` harus sama dengan total pesanan, dan status hanya maju.
  Pembayaran yang masuk untuk pesanan yang sudah batal/kedaluwarsa tidak
  mengubah status; pesanan ditandai `needsReview` agar dicek pemilik.

## Stok & paket (sejak Tahap 2)

- Stok per produk diatur di admin (Produk & Promo > Stok). Kosong = tidak
  dihitung (selalu tersedia), 0 = habis.
- Saat checkout, stok ditahan di server sebelum pesanan disimpan. Pesanan yang
  tidak dibayar kedaluwarsa dalam 60 menit (pengaturan `expiry` Midtrans) dan
  stoknya dikembalikan lewat notifikasi Midtrans `expire`. Pastikan URL
  notifikasi Midtrans terdaftar, kalau tidak stok yang ditahan tidak kembali
  otomatis.
- Pertama kali jalan, aplikasi mengisi 3 paket contoh (Paket Hemat x2, Paket
  Masak x1) satu kali. Menghapusnya tidak membuatnya muncul lagi.

## Ongkir, jadwal kirim, dan voucher (sejak Tahap 3)

- **Titik gudang wajib diisi** (admin > Ongkir & Voucher > Gudang & kurir) sebelum
  checkout bisa menghitung ongkir. Cara mudah: berdiri di gudang lalu tekan
  "Pakai lokasi saya sekarang", atau salin lintang/bujur dari Google Maps (tekan
  lama pada titik gudang). Tanpa titik gudang, pembeli melihat pesan "Lokasi gudang
  belum diatur" dan diarahkan ke WhatsApp.
- Zona ditentukan dari lokasi yang dibagikan HP pembeli (butuh HTTPS, sudah ada) dan
  **perkiraan jarak jalan = jarak garis lurus x faktor jalan** (awal 1,3, bisa diubah).
  Lokasi berasal dari HP pembeli, jadi periksa alamat tertulis dan tautan "Lihat di
  peta" di tab Pesanan sebelum mengantar.
- Kapasitas tiap slot (Pagi/Siang/Sore) = jumlah kurir x trip per slot x muatan per trip
  (awal 1 x 1 x 40 kg). Berat tiap produk diisi di form produk ("Berat per satuan").
  Produk yang beratnya belum diisi dihitung 1 kg.
- Kapasitas slot (koleksi `delivery_usage`), stok, dan kuota voucher ditahan saat pesanan
  dibuat dan dikembalikan bila pesanan batal/gagal/kedaluwarsa (sekali saja).
- Total ke Midtrans = belanja + ongkir - diskon. Ongkir dikirim sebagai item "Ongkos
  kirim" dan diskon sebagai item bernilai NEGATIF. Alur ini belum pernah diuji dengan
  Midtrans sungguhan; bila Midtrans menolak item negatif, lihat log `[checkout]`.
- Payload ERP bertambah (tidak mengubah isi lama): `delivery`, `location`, `pricing`, `weightKg`.

## ERP integration

Every successful checkout calls `syncOrderToErp()` (`lib/erp-sync.js`),
fire-and-forget, right after the order is saved locally. It no-ops silently
when `ERP_INTEGRATION_URL` isn't set, so checkout works identically with or
without this configured — nothing on the ERP side is required for the
landing page itself to function.

When set, it sends:

```
POST <ERP_INTEGRATION_URL>
Content-Type: application/json
x-api-key: <ERP_INTEGRATION_KEY>

{
  "orderId": "LPI-...",
  "customer": { "name": "...", "phone": "...", "address": "..." },
  "items": [{ "id": "...", "name": "...", "price": 32000, "qty": 2, "erpCode": "...",
             "components": [{ "id": "...", "name": "...", "qty": 1, "erpCode": "..." }] }],
  "grossAmount": 64000
}
```

The ERP side (a separate repo/app — this endpoint does not exist here) is
expected to: find-or-create a Contact by phone number, create a draft Sales
Order linked to it with these items, and return 2xx. Non-2xx responses and
network failures are logged (`[erp-sync]`) but never surface to the
customer or retry — this is a one-shot best-effort push, not a queue.

## What NOT to do

- Don't add a reverse proxy / TLS terminator (Caddy, Traefik, nginx-in-
  Docker) to this repo's compose file — Nginx on the host already owns
  80/443.
- Don't point DNS for the apex `ladangpangan.id` or `www` at this app —
  those belong to an unrelated Hostinger Website Builder site.
- Don't delete or restart Nginx/Odoo containers or services while
  debugging this app — they're shared infrastructure on the same VPS.
- Don't assume a relative bind-mount in docker-compose.yaml will find repo
  files on the VPS — bake anything needed into the image instead.


## Login Google pembeli (Tahap 4B, opsional)
Tanpa langkah ini toko tetap jalan; tombol "Masuk" hanya muncul bila kunci diisi.
1. Google Cloud Console → buat proyek → "APIs & Services" → "OAuth consent screen" (External, isi nama aplikasi, email, tautan Kebijakan Privasi `https://marketplace.ladangpangan.id/kebijakan-privasi`).
2. "Credentials" → "Create credentials" → "OAuth client ID" → Web application. Authorized redirect URI: `https://marketplace.ladangpangan.id/api/auth/google/callback`.
3. Isi variabel di VPS: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SITE_URL=https://marketplace.ladangpangan.id`, lalu pasang ulang.
4. Selama status aplikasi "Testing", hanya email yang didaftarkan sebagai test user yang bisa masuk. Ubah ke "In production" di Tahap 5 (sebelum rilis publik).
5. Cara kembali: kosongkan `GOOGLE_CLIENT_ID`; tombol masuk hilang, belanja tanpa login tidak terpengaruh.


## Pembayaran lewat Mayar.id (opsional, pilihan di admin)
1. Daftar di mayar.id. Buat **API Key** di web.mayar.id (menu API Keys). Sandbox dan Production punya kunci berbeda (Sandbox memakai alamat `*.mayar.club`).
2. Di admin toko → Payment Gateway: pilih **Mayar.id**, tempel API Key, karang **Webhook Token** (teks acak panjang), biarkan mode Production mati untuk uji coba, tekan Simpan.
3. Di Mayar, daftarkan webhook ke `https://marketplace.ladangpangan.id/api/mayar/notification` dengan token yang sama (dikirim di header `x-callback-token`).
4. Uji satu pesanan. Bila status tidak berubah menjadi Dibayar, buka admin → Payment Gateway → "Pemberitahuan terakhir dari penyedia" dan kirim isinya ke developer.
5. Cara kembali ke Midtrans: pilih Midtrans di admin, Simpan. Pesanan Mayar yang masih menunggu tetap bisa dibayar lewat tautannya.
Catatan: Mayar mewajibkan email pembeli; toko memakai email Google bila pembeli login, selain itu alamat sementara `<nomor-pesanan>@pesanan.ladangpangan.id`.


## Kurir instan lewat Biteship (opsional)
1. Daftar di biteship.com; ambil **API Key** (mulai dari kunci uji coba) dan isi saldo bila memakai kunci sungguhan (biaya kurir dipotong dari saldo; pembeli membayar ongkir ke toko).
2. Admin (Owner) → Kurir Instan (Biteship): isi API Key, data penjemputan gudang (nama, telepon, alamat), tekan "Cek kurir tersedia", centang kurir instan yang diizinkan, nyalakan, Simpan. Titik gudang diambil dari menu Ongkir & Voucher.
3. Cara mematikan: matikan saklar di tab yang sama; pembeli hanya melihat Kurir Toko.

Memanggil kurir dan status otomatis (Biteship):
- Setelah pesanan Dibayar lalu Dikemas, admin menekan **Panggil Kurir** di kartu pesanan. Bila gagal (mis. "Area tidak terjangkau") pesan Biteship tampil dan tombol bisa ditekan lagi.
- Webhook: di admin tab Kurir Instan isi **Webhook Token** (teks acak), Simpan, lalu daftarkan di dashboard Biteship (Integrasi → Webhook): URL `https://marketplace.ladangpangan.id/api/biteship/webhook`, Headers Signature Key `x-webhook-token`, Headers Signature Secret = token yang sama, event pesanan semua. (Cadangan: `?token=<token>` di alamat.) Bila status tidak bergerak otomatis, lihat "Kabar terakhir dari Biteship" di tab itu dan kirim isinya ke developer.


## iPaymu (pembayaran ketiga)
1. Admin > Pengaturan > Payment Gateway > pilih iPaymu.
2. Isi Nomor VA, API Key (dashboard iPaymu > Integrasi), dan Token Notifikasi (teks acak min. 24 karakter karangan sendiri). Nyalakan "Production" hanya saat siap rilis.
3. Alamat notifikasi dikirim otomatis per pesanan (`/api/ipaymu/notification?token=...`); tidak perlu didaftarkan manual.
4. Uji pertama: buat pesanan, bayar di sandbox, lalu lihat "Pemberitahuan terakhir" di admin. Bila status pesanan tidak berubah, bentuk kabar iPaymu perlu disesuaikan.
5. Kembali ke versi lama: pilih Midtrans/Mayar lagi di admin.
