# Deployment — VPS (Hostinger KVM 1)

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

## Environment variables

Passed via the `environment` field on the VPS deploy call (not committed
anywhere):
- `MONGO_URL` / `MONGO_DB_NAME` — optional; without these, the public page
  still works fine with built-in defaults, but the `/admin` page can't
  persist changes.
- `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` — required for `/admin` login.
- `MIDTRANS_SERVER_KEY` / `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` /
  `MIDTRANS_IS_PRODUCTION` — optional at deploy time; can also be set from
  the `/admin` page after login, which takes precedence.
- `ERP_INTEGRATION_URL` / `ERP_INTEGRATION_KEY` — optional; see below.

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
  "items": [{ "id": "...", "name": "...", "price": 32000, "qty": 2 }],
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
