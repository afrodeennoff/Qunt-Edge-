import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

let encryptionKey: Buffer | null = null

function getKey(): Buffer {
  if (!encryptionKey) {
    const keyString = process.env.ENCRYPTION_KEY
    if (!keyString) {
      throw new Error('ENCRYPTION_KEY environment variable is not set')
    }
    
    if (keyString.length === KEY_LENGTH * 2) {
      encryptionKey = Buffer.from(keyString, 'hex')
    } else {
      encryptionKey = crypto.createHash('sha256').update(keyString).digest()
    }
  }
  return encryptionKey
}

export function encrypt(plaintext: string): string {
  try {
    const key = getKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ])
    
    return combined.toString('base64')
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function decrypt(ciphertext: string): string {
  try {
    const key = getKey()
    const combined = Buffer.from(ciphertext, 'base64')
    
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid ciphertext length')
    }
    
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    return decrypted.toString('utf8')
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length)
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const digest = hmac.digest('hex')
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    )
  } catch {
    return false
  }
}

export function generateApiKey(prefix: string = 'dltx'): string {
  const randomPart = crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '')
  return `${prefix}_${randomPart}`
}
