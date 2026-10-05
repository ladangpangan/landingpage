// Akun admin (koleksi admins): Owner dan Staf.
import crypto from 'crypto'
import { getDb } from '@/lib/mongo'
import { ensureSchema } from '@/lib/schema'
import { hashPassword, verifyPassword, validateNewPassword } from '@/lib/passwords'

export const ROLES = ['owner', 'staf']

const MAX_FAILED_ATTEMPTS = 5
const LOCK_WINDOW_MS = 15 * 60 * 1000

async function admins() {
  const db = getDb()
  if (!db) throw new Error('MONGO_URL belum diatur di environment variables.')
  await ensureSchema()
  return db.collection('admins')
}

function publicAdmin(a) {
  return {
    id: String(a._id),
    email: a.email,
    name: a.name || '',
    role: a.role,
    active: a.active !== false,
    createdAt: a.createdAt,
  }
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120
}

export async function getAdminById(id) {
  const col = await admins()
  const { ObjectId } = await import('mongodb')
  if (!ObjectId.isValid(id)) return null
  return col.findOne({ _id: new ObjectId(id) })
}

export async function listAdmins() {
  const col = await admins()
  const docs = await col.find({}).sort({ createdAt: 1 }).toArray()
  return docs.map(publicAdmin)
}

export async function createAdmin({ email, name, role, password }) {
  email = normalizeEmail(email)
  if (!validateEmail(email)) throw new Error('Email tidak valid.')
  if (!ROLES.includes(role)) throw new Error('Peran harus Owner atau Staf.')
  const pwError = validateNewPassword(password)
  if (pwError) throw new Error(pwError)
  const col = await admins()
  const now = new Date().toISOString()
  try {
    const res = await col.insertOne({
      email,
      name: String(name || '').trim().slice(0, 80),
      role,
      passwordHash: await hashPassword(password),
      active: true,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    })
    return publicAdmin({ _id: res.insertedId, email, name, role, active: true, createdAt: now })
  } catch (e) {
    if (e?.code === 11000) throw new Error('Email itu sudah terdaftar.')
    throw e
  }
}

// Ubah akun lain (oleh Owner). Tidak boleh menonaktifkan/menurunkan diri
// sendiri atau Owner aktif terakhir.
export async function updateAdmin(id, changes, { actingAdminId }) {
  const col = await admins()
  const target = await getAdminById(id)
  if (!target) throw new Error('Akun tidak ditemukan.')

  const set = { updatedAt: new Date().toISOString() }
  const inc = {}
  if (typeof changes.name === 'string') set.name = changes.name.trim().slice(0, 80)
  if (changes.role !== undefined) {
    if (!ROLES.includes(changes.role)) throw new Error('Peran harus Owner atau Staf.')
    set.role = changes.role
  }
  if (typeof changes.active === 'boolean') set.active = changes.active
  if (changes.password !== undefined) {
    const pwError = validateNewPassword(changes.password)
    if (pwError) throw new Error(pwError)
    set.passwordHash = await hashPassword(changes.password)
    inc.tokenVersion = 1 // semua sesi lama akun ini otomatis keluar
  }

  const losingOwner =
    target.role === 'owner' &&
    target.active !== false &&
    ((set.role && set.role !== 'owner') || set.active === false)
  if (losingOwner) {
    if (String(target._id) === String(actingAdminId)) {
      throw new Error('Anda tidak bisa menonaktifkan atau menurunkan akun Anda sendiri.')
    }
    const otherOwners = await col.countDocuments({ role: 'owner', active: { $ne: false }, _id: { $ne: target._id } })
    if (!otherOwners) throw new Error('Harus ada minimal satu Owner aktif.')
  }
  if (set.active === false || set.role) inc.tokenVersion = 1

  const update = { $set: set }
  if (Object.keys(inc).length) update.$inc = inc
  await col.updateOne({ _id: target._id }, update)
  return publicAdmin({ ...target, ...set })
}

export async function changeOwnPassword(adminId, currentPassword, newPassword) {
  const col = await admins()
  const me = await getAdminById(adminId)
  if (!me || !(await verifyPassword(currentPassword, me.passwordHash))) {
    throw new Error('Password saat ini salah.')
  }
  const pwError = validateNewPassword(newPassword)
  if (pwError) throw new Error(pwError)
  await col.updateOne(
    { _id: me._id },
    { $set: { passwordHash: await hashPassword(newPassword), updatedAt: new Date().toISOString() }, $inc: { tokenVersion: 1 } }
  )
  // Versi token naik, jadi sesi ini juga perlu masuk lagi.
}

// --- Login ---------------------------------------------------------------

function attemptKey(ip, email) {
  return crypto.createHash('sha256').update(`${ip}|${email}`).digest('hex')
}

async function isLockedOut(key) {
  const db = getDb()
  const since = new Date(Date.now() - LOCK_WINDOW_MS)
  const count = await db.collection('login_attempts').countDocuments({ key, at: { $gte: since } })
  return count >= MAX_FAILED_ATTEMPTS
}

async function recordFailure(key) {
  await getDb().collection('login_attempts').insertOne({ key, at: new Date() })
}

async function clearFailures(key) {
  await getDb().collection('login_attempts').deleteMany({ key })
}

// Owner pertama: bila belum ada akun sama sekali dan ADMIN_OWNER_EMAIL +
// ADMIN_PASSWORD diisi, login dengan keduanya membuat akun Owner. Setelah
// itu ADMIN_PASSWORD tidak dipakai lagi untuk login.
async function bootstrapOwnerIfNeeded(email, password) {
  const ownerEmail = normalizeEmail(process.env.ADMIN_OWNER_EMAIL)
  const bootPassword = process.env.ADMIN_PASSWORD
  if (!ownerEmail || !bootPassword || email !== ownerEmail) return null
  const col = await admins()
  if ((await col.countDocuments({}, { limit: 1 })) > 0) return null
  const given = Buffer.from(String(password))
  const expected = Buffer.from(bootPassword)
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
  const now = new Date().toISOString()
  try {
    // Password awal boleh pendek; wajib diganti lewat menu Akun.
    const res = await col.insertOne({
      email: ownerEmail,
      name: 'Owner',
      role: 'owner',
      passwordHash: await hashPassword(password),
      active: true,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    })
    return col.findOne({ _id: res.insertedId })
  } catch (e) {
    if (e?.code === 11000) return null
    throw e
  }
}

// Mengembalikan { admin } bila berhasil, atau { error, status }.
export async function authenticate({ email, password, ip }) {
  email = normalizeEmail(email)
  if (!email || typeof password !== 'string' || !password) {
    return { error: 'Email dan password wajib diisi.', status: 400 }
  }
  const col = await admins()
  const key = attemptKey(ip || 'unknown', email)
  if (await isLockedOut(key)) {
    return { error: 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.', status: 429 }
  }

  let admin = await col.findOne({ email })
  let ok = false
  if (admin) {
    ok = admin.active !== false && (await verifyPassword(password, admin.passwordHash))
  } else {
    // Samakan waktu respons agar email yang tidak terdaftar tidak bisa ditebak.
    await verifyPassword(password, 'scrypt$00$00')
    admin = await bootstrapOwnerIfNeeded(email, password)
    ok = !!admin
  }

  if (!ok) {
    await recordFailure(key)
    return { error: 'Email atau password salah.', status: 401 }
  }
  await clearFailures(key)
  return { admin }
}
