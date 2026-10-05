// Sesi admin: cookie bertanda tangan berisi id akun. Setiap permintaan
// dicek ulang ke database, jadi akun yang dinonaktifkan langsung tidak bisa
// masuk dan peran (Owner/Staf) selalu yang terbaru.
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createToken, parseToken, SESSION_MAX_AGE_SECONDS } from '@/lib/session-token'
import { getAdminById } from '@/lib/admins'

export const SESSION_COOKIE = 'ladang_admin_session'

function secret() {
  return process.env.ADMIN_SESSION_SECRET || ''
}

export function createSessionToken(admin) {
  return createToken({ adminId: String(admin._id), version: admin.tokenVersion || 0, secret: secret() })
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
}

// Admin yang sedang login (atau null).
export async function getCurrentAdmin() {
  const store = await cookies()
  const parsed = parseToken(store.get(SESSION_COOKIE)?.value, { secret: secret() })
  if (!parsed) return null
  let admin
  try {
    admin = await getAdminById(parsed.adminId)
  } catch {
    return null
  }
  if (!admin || admin.active === false) return null
  if ((admin.tokenVersion || 0) !== parsed.version) return null
  return { id: String(admin._id), email: admin.email, name: admin.name || '', role: admin.role }
}

// Untuk route API. Pemakaian:
//   const { admin, error } = await requireAdmin()            // Owner atau Staf
//   const { admin, error } = await requireAdmin('owner')     // khusus Owner
export async function requireAdmin(role) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }
  if (role && admin.role !== role) {
    return { error: NextResponse.json({ error: 'Anda tidak punya izin untuk ini.' }, { status: 403 }) }
  }
  return { admin }
}
