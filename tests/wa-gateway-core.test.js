import test from 'node:test'
import assert from 'node:assert/strict'
import { createGateway, handleRequest, isValidTarget, jitter, LOGGED_OUT, RESTART_REQUIRED } from '../wa-gateway/gateway-core.js'

// Koneksi palsu: mencatat pesan, bisa memicu kejadian lewat `fire`.
function fakeEnv({ exists = true } = {}) {
  const env = { sent: [], connects: 0, wiped: 0, sleeps: [], onUpdate: null, loggedOut: false }
  env.connect = async ({ onUpdate }) => {
    env.connects += 1
    env.onUpdate = onUpdate
    return {
      sendText: async (jid, text) => { env.sent.push({ jid, text }); return `id${env.sent.length}` },
      exists: async () => exists,
      logout: async () => { env.loggedOut = true },
    }
  }
  env.sleep = async (ms) => { env.sleeps.push(ms) }
  env.wipeAuth = async () => { env.wiped += 1 }
  return env
}
const mk = (env, extra = {}) => createGateway({ connect: env.connect, wipeAuth: env.wipeAuth, sleep: env.sleep, rnd: () => 0, ...extra })
const tick = () => new Promise((r) => setImmediate(r))

test('nomor tujuan dan jeda', () => {
  assert.equal(isValidTarget('6281234567890'), true)
  assert.equal(isValidTarget('081234567890'), false)
  assert.equal(isValidTarget('62812'), false)
  assert.equal(jitter(() => 0), 1500)
  assert.equal(jitter(() => 0.999), 3498)
})

test('alur: QR -> tersambung -> kirim -> jeda antar pesan', async () => {
  const env = fakeEnv(); const gw = mk(env)
  await gw.start()
  assert.equal(gw.status().state, 'connecting')
  env.onUpdate({ qr: 'QR-STRING' })
  assert.deepEqual([gw.status().state, gw.status().qr], ['qr', 'QR-STRING'])
  await assert.rejects(gw.send({ to: '6281234567890', text: 'x' }), { code: 'not_connected' })
  env.onUpdate({ connection: 'open', me: '62811:1@s.whatsapp.net' })
  assert.deepEqual([gw.status().state, gw.status().qr, gw.status().me], ['open', null, '62811:1@s.whatsapp.net'])
  const r1 = await gw.send({ to: '+62 812-3456-7890', text: 'halo' })
  const r2 = await gw.send({ to: '6281311112222', text: 'dua' })
  assert.deepEqual(env.sent, [{ jid: '6281234567890@s.whatsapp.net', text: 'halo' }, { jid: '6281311112222@s.whatsapp.net', text: 'dua' }])
  assert.equal(r1.id, 'id1'); assert.equal(r2.id, 'id2')
  assert.equal(env.sleeps.filter((s) => s === 1500).length, 2) // jeda setelah tiap pesan
})

test('pesan dikirim berurutan walau dipanggil bersamaan', async () => {
  const env = fakeEnv(); const gw = mk(env)
  await gw.start(); env.onUpdate({ connection: 'open' })
  await Promise.all([gw.send({ to: '6281234567890', text: 'A' }), gw.send({ to: '6281234567890', text: 'B' }), gw.send({ to: '6281234567890', text: 'C' })])
  assert.deepEqual(env.sent.map((s) => s.text), ['A', 'B', 'C'])
})

test('nomor tidak terdaftar di WhatsApp dan nomor jelek ditolak', async () => {
  const env = fakeEnv({ exists: false }); const gw = mk(env)
  await gw.start(); env.onUpdate({ connection: 'open' })
  await assert.rejects(gw.send({ to: '6281234567890', text: 'x' }), { code: 'not_on_whatsapp' })
  await assert.rejects(gw.send({ to: '123', text: 'x' }), { code: 'bad_target' })
  assert.equal(env.sent.length, 0)
})

test('terputus biasa: sambung ulang dengan jeda bertambah; 515: segera', async () => {
  const env = fakeEnv(); const gw = mk(env)
  await gw.start(); env.onUpdate({ connection: 'open' })
  env.onUpdate({ connection: 'close', statusCode: 428 }); await tick(); await tick()
  assert.equal(env.connects, 2)
  env.onUpdate({ connection: 'close', statusCode: 428 }); await tick(); await tick()
  assert.equal(env.connects, 3)
  assert.deepEqual(env.sleeps.slice(0, 2), [2000, 4000])
  env.onUpdate({ connection: 'close', statusCode: RESTART_REQUIRED }); await tick(); await tick()
  assert.equal(env.sleeps[2], 300)
  env.onUpdate({ connection: 'open' }) // berhasil: hitungan jeda diulang
  env.onUpdate({ connection: 'close', statusCode: 408 }); await tick(); await tick()
  assert.equal(env.sleeps[3], 2000)
})

test('dikeluarkan dari HP (401): hapus sesi dan minta QR baru', async () => {
  const env = fakeEnv(); const gw = mk(env)
  await gw.start(); env.onUpdate({ connection: 'open' })
  env.onUpdate({ connection: 'close', statusCode: LOGGED_OUT }); await tick(); await tick(); await tick()
  assert.equal(env.wiped, 1)
  assert.equal(env.connects, 2)
  env.onUpdate({ qr: 'NEW' })
  assert.equal(gw.status().state, 'qr')
})

test('putuskan dari admin (logout)', async () => {
  const env = fakeEnv(); const gw = mk(env)
  await gw.start(); env.onUpdate({ connection: 'open' })
  await gw.logout(); await tick(); await tick()
  assert.equal(env.loggedOut, true); assert.equal(env.wiped, 1); assert.equal(env.connects, 2)
})

test('gagal membuat koneksi tidak membuat proses mati', async () => {
  let n = 0
  const gw = createGateway({ connect: async () => { n += 1; if (n === 1) throw new Error('boom'); return { sendText: async () => 'x' } }, sleep: async () => {} })
  await gw.start(); await tick(); await tick()
  assert.equal(n, 2)
  assert.match(gw.status().lastError || 'boom', /boom/)
})

test('HTTP: token wajib, status, kirim, validasi, galat terpetakan', async () => {
  const env = fakeEnv(); const gw = mk(env)
  await gw.start()
  const opt = { token: 'rahasia-rahasia-123', qrToDataUrl: async (s) => `data:image/png;base64,${s}` }
  const H = { authorization: 'Bearer rahasia-rahasia-123' }
  const call = (method, path, headers = H, body = '') => handleRequest(gw, { method, path, headers, body }, opt)
  assert.equal((await call('GET', '/status', {})).status, 401)
  assert.equal((await call('GET', '/status', { authorization: 'Bearer salah' })).status, 401)
  assert.equal((await handleRequest(gw, { method: 'GET', path: '/status', headers: H }, { token: '', qrToDataUrl: null })).status, 401)
  env.onUpdate({ qr: 'QQ' })
  const s = await call('GET', '/status'); assert.equal(s.status, 200); assert.equal(s.json.qrImage, 'data:image/png;base64,QQ'); assert.equal(s.json.state, 'qr')
  assert.equal((await call('POST', '/send', H, JSON.stringify({ to: '6281234567890', text: 'a' }))).status, 409)
  env.onUpdate({ connection: 'open' })
  assert.deepEqual((await call('POST', '/send', H, JSON.stringify({ to: '6281234567890', text: 'a' }))).json.ok, true)
  assert.equal((await call('POST', '/send', H, '{bukan json')).status, 400)
  assert.equal((await call('POST', '/send', H, JSON.stringify({ to: '123', text: 'a' }))).status, 400)
  assert.equal((await call('POST', '/send', H, JSON.stringify({ to: '6281234567890', text: '   ' }))).status, 400)
  assert.equal((await call('GET', '/lain')).status, 404)
  assert.equal((await call('POST', '/logout')).status, 200)
})
