// Pembatas percobaan sederhana memakai koleksi login_attempts (terhapus otomatis setelah 1 jam).
import crypto from 'crypto'
import { getDb } from '@/lib/mongo'

const WINDOW_MS = 15 * 60 * 1000

export function clientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

const keyOf = (scope, ip) => crypto.createHash('sha256').update(`${scope}|${ip}`).digest('hex')

export async function isLimited(scope, ip, max) {
  const db = getDb()
  if (!db) return false
  const count = await db.collection('login_attempts').countDocuments({ key: keyOf(scope, ip), at: { $gte: new Date(Date.now() - WINDOW_MS) } })
  return count >= max
}

export async function recordAttempt(scope, ip) {
  const db = getDb()
  if (db) await db.collection('login_attempts').insertOne({ key: keyOf(scope, ip), at: new Date() })
}
