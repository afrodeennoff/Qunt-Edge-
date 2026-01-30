import { NextRequest } from 'next/server'
import { getTrades, createTrade, bulkCreateTrades } from '@/server/api/trades'
import { successResponse, errorResponse, paginatedResponse, createdResponse } from '@/lib/api-response'
import { enforceRateLimit } from '@/lib/security/rate-limiter'
import { validateRequestBody } from '@/lib/errors'
import { z } from 'zod'

const TradeQuerySchema = z.object({
  accountNumber: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  instrument: z.string().optional(),
  tags: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return errorResponse('userId is required', 400, 'MISSING_USER_ID')
    }

    await enforceRateLimit(`api:trades:${userId}`, 'api')

    const query = TradeQuerySchema.parse(Object.fromEntries(searchParams))

    const tags = query.tags ? query.tags.split(',') : undefined

    const result = await getTrades({
      userId,
      accountNumber: query.accountNumber,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      instrument: query.instrument,
      tags,
      limit: query.limit,
      offset: query.offset,
    })

    return paginatedResponse(
      result.trades,
      result.total,
      Math.floor((query.offset || 0) / (query.limit || 100)) + 1,
      query.limit || 100
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return errorResponse('Invalid query parameters', 400, 'VALIDATION_ERROR', error.issues)
    }
    if (error.name === 'RateLimitError') {
      return errorResponse(error.message, 429, 'RATE_LIMIT_EXCEEDED')
    }
    return errorResponse(error.message || 'Failed to fetch trades', 500, 'FETCH_ERROR')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId = body.userId

    if (!userId) {
      return errorResponse('userId is required', 400, 'MISSING_USER_ID')
    }

    await enforceRateLimit(`api:trades:create:${userId}`, 'api')

    if (Array.isArray(body.trades)) {
      const result = await bulkCreateTrades(body.trades)
      return createdResponse(result, `${result.count} trades imported successfully`)
    }

    const trade = await createTrade({ ...body, userId })
    return createdResponse(trade, 'Trade created successfully')
  } catch (error: any) {
    if (error.name === 'RateLimitError') {
      return errorResponse(error.message, 429, 'RATE_LIMIT_EXCEEDED')
    }
    if (error.name === 'ZodError') {
      return errorResponse('Invalid trade data', 400, 'VALIDATION_ERROR', error.issues)
    }
    return errorResponse(error.message || 'Failed to create trade', 500, 'CREATE_ERROR')
  }
}
