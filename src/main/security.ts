import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 32
const IV_LENGTH = 12
const TAG_LENGTH = 16

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH)
}

export function generateSalt(): string {
  return randomBytes(16).toString('hex')
}

export function hashSecret(secret: string, salt: string): string {
  const key = deriveKey(secret, Buffer.from(salt, 'hex'))
  return key.toString('hex')
}

export function verifySecret(secret: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashSecret(secret, salt), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function encryptText(plain: string, secret: string, salt: string): string {
  const key = deriveKey(secret, Buffer.from(salt, 'hex'))
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, tag, encrypted])
  return payload.toString('base64')
}

export function decryptText(cipherText: string, secret: string, salt: string): string | null {
  try {
    const payload = Buffer.from(cipherText, 'base64')
    if (payload.length < IV_LENGTH + TAG_LENGTH) return null
    const iv = payload.subarray(0, IV_LENGTH)
    const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const data = payload.subarray(IV_LENGTH + TAG_LENGTH)
    const key = deriveKey(secret, Buffer.from(salt, 'hex'))
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return null
  }
}
