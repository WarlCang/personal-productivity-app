/**
 * Encryption for the password vault. Entries are stored only as an AES-GCM
 * ciphertext blob; the key is derived from a master password (PBKDF2,
 * 310k iterations) that is never persisted. A wrong password simply fails
 * GCM authentication — there is no recovery, by design.
 */

export interface VaultEntry {
  id: string
  name: string
  username: string
  password: string
  notes?: string
}

export interface VaultBlob {
  salt: string // base64
  iv: string // base64
  data: string // base64 ciphertext of JSON VaultEntry[]
}

const enc = new TextEncoder()
const dec = new TextDecoder()

function toB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export function newSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)))
}

export async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(saltB64) as BufferSource, iterations: 310_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptVault(
  key: CryptoKey,
  salt: string,
  entries: VaultEntry[],
): Promise<VaultBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(JSON.stringify(entries)),
  )
  return { salt, iv: toB64(iv), data: toB64(new Uint8Array(ciphertext)) }
}

/** Throws if the key (i.e. the master password) is wrong. */
export async function decryptVault(key: CryptoKey, blob: VaultBlob): Promise<VaultEntry[]> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(blob.iv) as BufferSource },
    key,
    fromB64(blob.data) as BufferSource,
  )
  return JSON.parse(dec.decode(plaintext)) as VaultEntry[]
}

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+'

export function generatePassword(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('')
}
