import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth'
import { UPLOAD_DIR, ALLOWED_UPLOAD_TYPES } from '@/lib/uploads'

const MAX_BYTES = 5 * 1024 * 1024

async function requireAdmin() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }
  return {}
}

export async function POST(request) {
  const { error } = await requireAdmin()
  if (error) return error

  let formData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 })
  }
  const type = ALLOWED_UPLOAD_TYPES[file.type]
  if (!type) {
    return NextResponse.json(
      { error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.' },
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Ukuran file maksimal 5MB.' }, { status: 400 })
  }

  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${type.ext}`
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const bytes = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(path.join(UPLOAD_DIR, filename), bytes)
  } catch (e) {
    console.error('[upload] gagal menyimpan file:', e?.message || e)
    return NextResponse.json({ error: 'Gagal menyimpan file di server.' }, { status: 500 })
  }

  return NextResponse.json({ path: `/api/uploads/${filename}` })
}
