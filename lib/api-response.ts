import { NextResponse } from 'next/server'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
    [key: string]: any
  }
}

export function successResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  )
}

export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  )
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  status: number = 200
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(total / limit)

  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    },
    { status }
  )
}

export function createdResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: 201 }
  )
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
  return errorResponse(message, 401, 'UNAUTHORIZED')
}

export function forbiddenResponse(message: string = 'Forbidden'): NextResponse<ApiResponse> {
  return errorResponse(message, 403, 'FORBIDDEN')
}

export function notFoundResponse(resource: string = 'Resource'): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found`, 404, 'NOT_FOUND')
}

export function validationErrorResponse(
  message: string,
  errors?: any
): NextResponse<ApiResponse> {
  return errorResponse(message, 400, 'VALIDATION_ERROR', errors)
}

export function rateLimitResponse(retryAfter: number): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
      },
      meta: {
        timestamp: new Date().toISOString(),
        retryAfter,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
      },
    }
  )
}

export function serverErrorResponse(message?: string): NextResponse<ApiResponse> {
  return errorResponse(
    message || 'Internal server error',
    500,
    'INTERNAL_ERROR'
  )
}

export function serviceUnavailableResponse(message?: string): NextResponse<ApiResponse> {
  return errorResponse(
    message || 'Service temporarily unavailable',
    503,
    'SERVICE_UNAVAILABLE'
  )
}
