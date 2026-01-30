import { describe, it, expect } from 'vitest'
import { signInWithEmail, signUpWithEmail } from '@/server/auth-enhanced'
import { prisma } from './setup'

describe('Authentication', () => {
  describe('signUpWithEmail', () => {
    it('should reject passwords less than 8 characters', async () => {
      const result = await signUpWithEmail(
        'test@example.com',
        'short',
        'short'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('8 characters')
    })

    it('should reject mismatched passwords', async () => {
      const result = await signUpWithEmail(
        'test@example.com',
        'password123',
        'password456'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('do not match')
    })

    it('should enforce rate limiting', async () => {
      const email = `test-${Date.now()}@example.com`
      const promises = Array(10).fill(null).map((_, i) =>
        signUpWithEmail(email, 'password123', 'password123')
      )

      const results = await Promise.all(promises)
      const failures = results.filter(r => !r.success)

      expect(failures.length).toBeGreaterThan(5)
    })
  })

  describe('signInWithEmail', () => {
    it('should reject invalid credentials', async () => {
      const result = await signInWithEmail(
        'nonexistent@example.com',
        'wrongpassword'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email or password')
    })

    it('should enforce rate limiting', async () => {
      const email = 'test@example.com'
      const promises = Array(10).fill(null).map(() =>
        signInWithEmail(email, 'wrongpassword')
      )

      const results = await Promise.all(promises)
      const failures = results.filter(r => !r.success)

      expect(failures.length).toBeGreaterThan(5)
    })
  })
})
