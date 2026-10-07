// Penghubung ke Baileys (WhatsApp Web, TIDAK resmi). Bagian ini hanya bisa diuji dengan WhatsApp sungguhan.
import fs from 'node:fs/promises'
import path from 'node:path'
import pino from 'pino'
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys'

export function makeConnector({ authDir }) {
  return async function connect({ onUpdate }) {
    const { state, saveCreds } = await useMultiFileAuthState(authDir)
    let version
    try {
      ;({ version } = await fetchLatestBaileysVersion())
    } catch {
      /* pakai versi bawaan pustaka */
    }
    const sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: state,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      logger: pino({ level: 'silent' }),
    })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (u) => {
      const statusCode = u.lastDisconnect?.error?.output?.statusCode
      onUpdate({ qr: u.qr, connection: u.connection, statusCode, me: u.connection === 'open' ? sock.user?.id : undefined })
    })
    return {
      async sendText(jid, text) {
        const res = await sock.sendMessage(jid, { text })
        return res?.key?.id
      },
      async exists(jid) {
        const r = await sock.onWhatsApp(jid)
        return !!r?.[0]?.exists
      },
      async logout() {
        await sock.logout()
      },
    }
  }
}

// Hapus berkas sesi (dipakai saat perangkat dikeluarkan dari HP) agar QR baru muncul.
export async function wipeAuthDir(authDir) {
  const entries = await fs.readdir(authDir).catch(() => [])
  await Promise.all(entries.map((f) => fs.rm(path.join(authDir, f), { recursive: true, force: true })))
}
