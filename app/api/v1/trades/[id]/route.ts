import { NextRequest } from 'next/server'
import { getTradeById, updateTrade, deleteTrade } from '@/server/api/trades'
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response'
import { enforceRateLimit } from '@/lib/security/rate-limiter'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await enforceRateLimit(`api:trades:${id}`, 'api')

    const trade = await getTradeById(id)
    return successResponse(trade)
  } catch (error: any) {
    if (error.message === 'Trade not found') {
      return notFoundResponse('Trade')
    }
    if (error.name === 'RateLimitError') {
      return errorResponse(error.message, 429, 'RATE_LIMIT_EXCEEDED')
    }
    return errorResponse(error.message || 'Failed to fetch trade', 500, 'FETCH_ERROR')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    await enforceRateLimit(`api:trades:update:${id}`, 'api')

    const trade = await updateTrade(id, body)
    return successResponse(trade, 200, { message: 'Trade updated successfully' })
  } catch (error: any) {
    if (error.message === 'Trade not found') {
      return notFoundResponse('Trade')
    }
    if (error.name === 'RateLimitError') {
      return errorResponse(error.message, 429, 'RATE_LIMIT_EXCEEDED')
    }
    if (error.name === 'ZodError') {
      return errorResponse('Invalid trade data', 400, 'VALIDATION_ERROR', error.issues)
    }
    return errorResponse(error.message || 'Failed to update trade', 500, 'UPDATE_ERROR')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await enforceRateLimit(`api:trades:delete:${id}`, 'api')

    await deleteTrade(id)
    return successResponse({ success: true })
  } catch (error: any) {
    if (error.message === 'Trade not found') {
      return notFoundResponse('Trade')
    }
    if (error.name === 'RateLimitError') {
      return errorResponse(error.message, 429, 'RATE_LIMIT_EXCEEDED')
    }
    return errorResponse(error.message || 'Failed to delete trade', 500, 'DELETE_ERROR')
  }
}
