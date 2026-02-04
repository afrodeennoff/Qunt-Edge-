interface RateLimitConfig {
  requests: number
  window: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: Date
  limit: number
}

class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetAt: number }>

  constructor() {
    this.requests = new Map()
    this.cleanupExpired()
  }

  private cleanupExpired() {
    const now = Date.now()
    for (const [key, value] of this.requests.entries()) {
      if (value.resetAt < now) {
        this.requests.delete(key)
      }
    }
    setTimeout(() => this.cleanupExpired(), 60000)
  }

  async check(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const key = identifier
    const windowStart = now + config.window

    let record = this.requests.get(key)

    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: windowStart }
      this.requests.set(key, record)
    }

    const remaining = Math.max(0, config.requests - record.count - 1)
    const success = record.count < config.requests

    if (success) {
      record.count++
    }

    return {
      success,
      remaining,
      resetAt: new Date(record.resetAt),
      limit: config.requests,
    }
  }

  async reset(identifier: string): Promise<void> {
    this.requests.delete(identifier)
  }
}

const rateLimiter = new InMemoryRateLimiter()

export const rateLimitConfigs = {
  authentication: { requests: 5, window: 60000 },
  api: { requests: 100, window: 60000 },
  webhook: { requests: 1000, window: 60000 },
  upload: { requests: 10, window: 60000 },
  ai: { requests: 20, window: 60000 },
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return rateLimiter.check(identifier, config)
}

export class RateLimitError extends Error {
  public readonly retryAfter: number

  constructor(result: RateLimitResult) {
    const retryAfterSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
    super(`Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfterSeconds
  }
}

export async function enforceRateLimit(
  identifier: string,
  configName: keyof typeof rateLimitConfigs
): Promise<void> {
  const config = rateLimitConfigs[configName]
  const result = await checkRateLimit(identifier, config)

  if (!result.success) {
    throw new RateLimitError(result)
  }
}
