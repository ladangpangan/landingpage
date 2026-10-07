// Inti gateway WhatsApp (Baileys) untuk notifikasi ADMIN. Tidak bergantung pada pustaka luar supaya mudah diuji:
// koneksi nyata disuntikkan lewat `connect` (lihat baileys-adapter.js). WhatsApp tidak resmi: pakai nomor khusus,
// kirim hanya ke admin, dengan jeda antar pesan.
import crypto from 'node:crypto'

export const LOGGED_OUT = 401
export const RESTART_REQUIRED = 515

const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms))

export function digitsOnly(v) {
  return String(v ?? '').replace(/\D/g, '')
}

export function isValidTarget(to) {
  return /^62\d{8,13}$/.test(digitsOnly(to))
}

export function timingSafeEqualStr(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// Jeda antar pesan 1,5 sampai 3,5 detik (acak) supaya tidak tampak seperti robot.
export const jitter = (rnd = Math.random) => 1500 + Math.floor(rnd() * 2000)

export function createGateway({ connect, wipeAuth = async () => {}, sleep = sleepReal, rnd = Math.random, log = () => {}, sendTimeoutMs = 20000 }) {
  const st = { state: 'starting', qr: null, me: null, lastError: null, since: Date.now() }
  let conn = null
  let attempts = 0
  let stopped = false
  let queue = Promise.resolve()

  const set = (patch) => Object.assign(st, patch, { since: Date.now() })

  async function start() {
    if (stopped) return
    set({ state: 'connecting', qr: null })
    try {
      conn = await connect({
        onUpdate: (u) => onUpdate(u),
      })
    } catch (e) {
      log('gagal membuat koneksi:', e?.message || e)
      set({ lastError: String(e?.message || e).slice(0, 200) })
      scheduleReconnect()
    }
  }

  function scheduleReconnect(immediate = false) {
    if (stopped) return
    attempts += 1
    const wait = immediate ? 300 : Math.min(30000, 2000 * 2 ** Math.min(attempts - 1, 4))
    set({ state: 'connecting', qr: null })
    sleep(wait).then(() => start())
  }

  async function onUpdate(u) {
    if (u.qr) set({ state: 'qr', qr: u.qr, lastError: null })
    if (u.connection === 'open') {
      attempts = 0
      set({ state: 'open', qr: null, me: u.me || st.me, lastError: null })
      log('tersambung')
    }
    if (u.connection === 'close') {
      const code = u.statusCode
      log('terputus, kode', code)
      conn = null
      if (code === LOGGED_OUT) {
        // Perangkat dikeluarkan dari HP: hapus sesi lama, lalu minta QR baru.
        set({ state: 'logged_out', qr: null, me: null })
        await wipeAuth().catch(() => {})
        attempts = 0
        scheduleReconnect(true)
      } else {
        set({ lastError: `terputus (kode ${code ?? '?'})` })
        scheduleReconnect(code === RESTART_REQUIRED)
      }
    }
  }

  // Antrean berurutan: satu pesan sekali jalan, dengan jeda acak di antaranya.
  function send({ to, text }) {
    const run = async () => {
      if (st.state !== 'open' || !conn) throw Object.assign(new Error('WhatsApp belum tersambung. Scan QR di admin dulu.'), { code: 'not_connected' })
      const number = digitsOnly(to)
      if (!isValidTarget(number)) throw Object.assign(new Error('Nomor tujuan tidak valid.'), { code: 'bad_target' })
      const jid = `${number}@s.whatsapp.net`
      const withTimeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('Pengiriman terlalu lama.'), { code: 'timeout' })), sendTimeoutMs))])
      if (conn.exists && !(await withTimeout(conn.exists(jid)))) throw Object.assign(new Error('Nomor itu tidak terdaftar di WhatsApp.'), { code: 'not_on_whatsapp' })
      const id = await withTimeout(conn.sendText(jid, String(text).slice(0, 1000)))
      await sleep(jitter(rnd))
      return { id: id || null }
    }
    const result = queue.then(run, run)
    queue = result.catch(() => {})
    return result
  }

  async function logout() {
    try {
      if (conn?.logout) await conn.logout()
    } catch (e) {
      log('logout:', e?.message || e)
    }
    conn = null
    await wipeAuth().catch(() => {})
    attempts = 0
    set({ state: 'logged_out', qr: null, me: null })
    scheduleReconnect(true)
  }

  return {
    start,
    send,
    logout,
    status: () => ({ state: st.state, qr: st.qr, me: st.me, lastError: st.lastError, since: st.since }),
    stop: () => { stopped = true },
  }
}

// Lapisan HTTP murni: (method, path, headers, bodyText) -> { status, json }. Token wajib untuk semua jalur.
export async function handleRequest(gw, { method, path, headers = {}, body = '' }, { token, qrToDataUrl }) {
  const auth = String(headers.authorization || '')
  if (!token || !auth.startsWith('Bearer ') || !timingSafeEqualStr(auth.slice(7), token)) return { status: 401, json: { error: 'unauthorized' } }
  if (method === 'GET' && path === '/status') {
    const s = gw.status()
    let qrImage = null
    if (s.qr && qrToDataUrl) qrImage = await qrToDataUrl(s.qr).catch(() => null)
    return { status: 200, json: { state: s.state, qrImage, me: s.me, lastError: s.lastError, since: s.since } }
  }
  if (method === 'POST' && path === '/send') {
    let j
    try {
      j = JSON.parse(body || '{}')
    } catch {
      return { status: 400, json: { error: 'body tidak valid' } }
    }
    if (!isValidTarget(j.to) || typeof j.text !== 'string' || !j.text.trim()) return { status: 400, json: { error: 'to dan text wajib diisi', code: 'bad_request' } }
    try {
      return { status: 200, json: { ok: true, ...(await gw.send({ to: j.to, text: j.text })) } }
    } catch (e) {
      const code = e?.code || 'error'
      return { status: code === 'not_connected' ? 409 : code === 'not_on_whatsapp' || code === 'bad_target' ? 422 : 502, json: { ok: false, error: String(e?.message || e).slice(0, 200), code } }
    }
  }
  if (method === 'POST' && path === '/logout') {
    await gw.logout()
    return { status: 200, json: { ok: true } }
  }
  return { status: 404, json: { error: 'not found' } }
}
