import { ZodError, z } from 'zod'
import { createAuditLog, AuditSeverity, AuditAction } from '@/lib/security/audit-log'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public isDev: boolean = process.env.NODE_ENV === 'development'
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(403, message, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: any) {
    super(400, message, 'VALIDATION_ERROR')
  }
}

export class RateLimitError extends AppError {
  constructor(public retryAfter: number) {
    super(
      429,
      `Too many requests. Try again in ${retryAfter} seconds.`,
      'RATE_LIMIT_EXCEEDED'
    )
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      502,
      message || `External service ${service} is unavailable`,
      'EXTERNAL_SERVICE_ERROR'
    )
  }
}

export async function logError(error: unknown, context?: Record<string, any>): Promise<void> {
  const userId = context?.userId as string | undefined

  if (error instanceof AppError) {
    await createAuditLog({
      userId,
      action: AuditAction.DATA_DELETED,
      resource: 'Error',
      details: {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        context,
      },
      success: false,
      errorMessage: error.message,
      severity: error.statusCode >= 500 ? AuditSeverity.ERROR : AuditSeverity.WARNING,
    })
  } else if (error instanceof Error) {
    await createAuditLog({
      userId,
      action: AuditAction.DATA_DELETED,
      resource: 'Error',
      details: {
        error: error.message,
        stack: error.stack,
        context,
      },
      success: false,
      errorMessage: error.message,
      severity: AuditSeverity.ERROR,
    })
  }
}

export function handleError(error: unknown) {
  console.error('Error:', error)

  if (error instanceof AppError) {
    return {
      error: {
        message: error.isDev ? error.message : 'An error occurred',
        code: error.code,
        ...(error.isDev && { stack: error.stack }),
      },
      status: error.statusCode,
    }
  }

  if (error instanceof ZodError) {
    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.issues,
      },
      status: 400,
    }
  }

  if (error instanceof Error) {
    return {
      error: {
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      status: 500,
    }
  }

  return {
    error: {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    },
    status: 500,
  }
}

export function asyncHandler<T extends any[]>(
  fn: (...args: T) => Promise<any>
) {
  return async (...args: T) => {
    try {
      return await fn(...args)
    } catch (error) {
      const handled = handleError(error)
      throw new AppError(handled.status, handled.error.message, handled.error.code)
    }
  }
}

export function validateRequestBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Invalid request body', error.issues)
    }
    throw new ValidationError('Invalid request body')
  }
}
