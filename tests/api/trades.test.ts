import { describe, it, expect, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/v1/trades/route'
import { prisma } from '../setup'

describe('Trades API', () => {
  let testUserId: string

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        auth_user_id: `auth-${Date.now()}`,
      },
    })
    testUserId = user.id
  })

  describe('POST /api/v1/trades', () => {
    it('should create a new trade', async () => {
      const tradeData = {
        userId: testUserId,
        accountNumber: 'TEST001',
        quantity: 1,
        instrument: 'ES',
        entryPrice: 4500.25,
        closePrice: 4510.50,
        entryDate: new Date().toISOString(),
        closeDate: new Date().toISOString(),
        pnl: 500.00,
        side: 'LONG',
      }

      const request = new Request('http://localhost:3000/api/v1/trades', {
        method: 'POST',
        body: JSON.stringify(tradeData),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data.accountNumber).toBe('TEST001')
    })

    it('should validate required fields', async () => {
      const invalidData = {
        userId: testUserId,
        accountNumber: 'TEST001',
      }

      const request = new Request('http://localhost:3000/api/v1/trades', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR')
    })

    it('should enforce rate limiting', async () => {
      const tradeData = {
        userId: testUserId,
        accountNumber: 'TEST001',
        quantity: 1,
        instrument: 'ES',
        entryPrice: 4500.25,
        closePrice: 4510.50,
        entryDate: new Date().toISOString(),
        closeDate: new Date().toISOString(),
        pnl: 500.00,
      }

      const promises = Array(150).fill(null).map(() => {
        const request = new Request('http://localhost:3000/api/v1/trades', {
          method: 'POST',
          body: JSON.stringify(tradeData),
        })
        return POST(request as any)
      })

      const responses = await Promise.all(promises)
      const rateLimitedResponses = responses.filter(r => r.status === 429)

      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('GET /api/v1/trades', () => {
    beforeEach(async () => {
      await prisma.trade.createMany({
        data: [
          {
            userId: testUserId,
            accountNumber: 'TEST001',
            quantity: 1,
            instrument: 'ES',
            entryPrice: 4500.25,
            closePrice: 4510.50,
            entryDate: new Date(),
            closeDate: new Date(),
            pnl: 500.00,
            side: 'LONG',
          },
          {
            userId: testUserId,
            accountNumber: 'TEST001',
            quantity: 1,
            instrument: 'NQ',
            entryPrice: 15000.00,
            closePrice: 15050.00,
            entryDate: new Date(),
            closeDate: new Date(),
            pnl: 250.00,
            side: 'SHORT',
          },
        ],
      })
    })

    it('should return trades for user', async () => {
      const request = new Request(`http://localhost:3000/api/v1/trades?userId=${testUserId}`)
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.meta).toHaveProperty('pagination')
    })

    it('should filter by account number', async () => {
      const request = new Request(`http://localhost:3000/api/v1/trades?userId=${testUserId}&accountNumber=TEST001`)
      const response = await GET(request as any)
      const data = await response.json()

      expect(data.data).toHaveLength(2)
      data.data.forEach((trade: any) => {
        expect(trade.accountNumber).toBe('TEST001')
      })
    })

    it('should filter by date range', async () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const request = new Request(
        `http://localhost:3000/api/v1/trades?userId=${testUserId}&startDate=${yesterday.toISOString()}&endDate=${today.toISOString()}`
      )
      const response = await GET(request as any)
      const data = await response.json()

      expect(data.data.length).toBeGreaterThan(0)
    })
  })
})
