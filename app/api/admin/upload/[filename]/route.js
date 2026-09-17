import fs from 'fs/promises'
import path from 'path'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth'
import { UPLOAD_DIR } from '@/lib/uploads'

async function requireAdmin() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }
  return {}
}

export async function DELETE(request, { params }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { filename } = await params
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Nama file tidak valid.' }, { status: 400 })
  }

  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename))
  } catch (e) {
    if (e?.code !== 'ENOENT') {
      console.error('[upload] gagal menghapus file:', e?.message || e)
      return NextResponse.json({ error: 'Gagal menghapus file.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
