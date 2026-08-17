import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const N = 16384
const KEYLEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, KEYLEN, { N })
  return `scrypt:${N}:${salt.toString('hex')}:${key.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, nStr, saltHex, keyHex] = stored.split(':')
  if (scheme !== 'scrypt' || !nStr || !saltHex || !keyHex) return false
  const expected = Buffer.from(keyHex, 'hex')
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(nStr),
  })
  return timingSafeEqual(actual, expected)
}
