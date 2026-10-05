// Hash password dengan scrypt bawaan Node (tanpa library tambahan).
import crypto from 'crypto'

const KEYLEN = 64
const COST = { N: 16384, r: 8, p: 1 }

export const MIN_PASSWORD_LENGTH = 10

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEYLEN, COST, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false
  const [scheme, saltHex, keyHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false
  const expected = Buffer.from(keyHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'))
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`
  }
  return null
}
