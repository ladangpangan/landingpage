// Gateway WhatsApp (Baileys) untuk notifikasi admin ladangpangan.id. Hanya dipakai dari jaringan internal Docker;
// semua jalur wajib memakai token (GATEWAY_TOKEN). Sesi login disimpan di /data/auth (volume).
import http from 'node:http'
import QRCode from 'qrcode'
import { createGateway, handleRequest } from './gateway-core.js'
import { makeConnector, wipeAuthDir } from './baileys-adapter.js'

const token = process.env.GATEWAY_TOKEN || ''
const port = Number(process.env.PORT) || 3100
const authDir = process.env.AUTH_DIR || '/data/auth'

if (token.length < 16) {
  // Diam saja (bukan keluar) supaya Docker tidak memulai ulang terus-menerus; aplikasi utama tidak terpengaruh.
  console.error('[wa-gateway] GATEWAY_TOKEN belum diisi (minimal 16 karakter). Gateway tidak aktif.')
  setInterval(() => {}, 1 << 30)
} else {
  main()
}

function main() {

const gw = createGateway({
  connect: makeConnector({ authDir }),
  wipeAuth: () => wipeAuthDir(authDir),
  log: (...a) => console.log('[wa-gateway]', ...a),
})

const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', (d) => {
    body += d
    if (body.length > 10_000) req.destroy()
  })
  req.on('end', async () => {
    try {
      const r = await handleRequest(gw, { method: req.method, path: (req.url || '').split('?')[0], headers: req.headers, body }, { token, qrToDataUrl: (s) => QRCode.toDataURL(s, { margin: 1, width: 280 }) })
      res.writeHead(r.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(r.json))
    } catch (e) {
      console.error('[wa-gateway] galat:', e?.message || e)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end('{"error":"internal"}')
    }
  })
})

server.listen(port, '0.0.0.0', () => console.log(`[wa-gateway] siap di port ${port}`))
gw.start()
process.on('SIGTERM', () => { gw.stop(); server.close(() => process.exit(0)) })
}
