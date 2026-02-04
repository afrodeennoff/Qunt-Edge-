import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/server/auth-enhanced'
import { createAuditLog, AuditAction } from '@/lib/security/audit-log'
import { z } from 'zod'

const TradeSchema = z.object({
  accountNumber: z.string(),
  quantity: z.number().int().positive(),
  entryId: z.string().optional().default(''),
  closeId: z.string().optional().default(''),
  instrument: z.string().min(1),
  entryPrice: z.union([z.number(), z.string()]),
  closePrice: z.union([z.number(), z.string()]),
  entryDate: z.string(),
  closeDate: z.string(),
  pnl: z.number(),
  timeInPosition: z.number().int().optional().default(0),
  side: z.string().optional().default(''),
  commission: z.number().optional().default(0),
  comment: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  imageBase64: z.string().optional(),
  videoUrl: z.string().optional(),
  groupId: z.string().optional().default(''),
})

const UpdateTradeSchema = TradeSchema.partial().extend({
  id: z.string().uuid(),
})

export async function getTrades(params: {
  userId: string
  accountNumber?: string
  startDate?: Date
  endDate?: Date
  instrument?: string
  tags?: string[]
  limit?: number
  offset?: number
}) {
  const user = await requireAuth()
  if (user.id !== params.userId) {
    throw new Error('Unauthorized: You can only view your own trades')
  }

  const where: any = {
    userId: params.userId,
    deletedAt: null,
  }

  if (params.accountNumber) {
    where.accountNumber = params.accountNumber
  }

  if (params.startDate || params.endDate) {
    where.entryDate = {}
    if (params.startDate) where.entryDate.gte = params.startDate
    if (params.endDate) where.entryDate.lte = params.endDate
  }

  if (params.instrument) {
    where.instrument = params.instrument
  }

  if (params.tags && params.tags.length > 0) {
    where.tags = {
      hasSome: params.tags,
    }
  }

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { entryDate: 'desc' },
      take: params.limit || 100,
      skip: params.offset || 0,
    }),
    prisma.trade.count({ where }),
  ])

  return { trades, total }
}

export async function getTradeById(id: string) {
  const user = await requireAuth()

  const trade = await prisma.trade.findFirst({
    where: {
      id,
      userId: user.id,
    },
  })

  if (!trade) {
    throw new Error('Trade not found')
  }

  return trade
}

export async function createTrade(data: any) {
  const user = await requireAuth()

  const validated = TradeSchema.parse(data)

  const trade = await prisma.trade.create({
    data: {
      ...validated,
      userId: user.id,
    } as any,
  })

  await createAuditLog({
    userId: user.id,
    action: AuditAction.TRADE_CREATED,
    resource: 'Trade',
    resourceId: trade.id,
    details: { accountNumber: trade.accountNumber, pnl: trade.pnl },
  })

  return trade
}

export async function updateTrade(id: string, data: any) {
  const user = await requireAuth()

  const existingTrade = await prisma.trade.findFirst({
    where: { id, userId: user.id },
  })

  if (!existingTrade) {
    throw new Error('Trade not found or unauthorized')
  }

  const validated = UpdateTradeSchema.parse(Object.assign({}, data, { id }))

  const trade = await prisma.trade.update({
    where: { id },
    data: validated as any,
  })

  await createAuditLog({
    userId: user.id,
    action: AuditAction.TRADE_UPDATED,
    resource: 'Trade',
    resourceId: trade.id,
    details: { changes: validated },
  })

  return trade
}

export async function deleteTrade(id: string) {
  const user = await requireAuth()

  const trade = await prisma.trade.findFirst({
    where: { id, userId: user.id },
  })

  if (!trade) {
    throw new Error('Trade not found or unauthorized')
  }

  await prisma.trade.update({
    where: { id },
    data: { deletedAt: new Date() } as any,
  })

  await createAuditLog({
    userId: user.id,
    action: AuditAction.TRADE_DELETED,
    resource: 'Trade',
    resourceId: id,
    details: { accountNumber: trade.accountNumber },
  })

  return { success: true }
}

export async function bulkCreateTrades(trades: unknown[]) {
  const user = await requireAuth()

  const validatedTrades = trades.map(trade =>
    TradeSchema.parse(Object.assign({}, trade, { userId: user.id }))
  )

  const result = await prisma.trade.createMany({
    data: validatedTrades as any,
    skipDuplicates: true,
  })

  await createAuditLog({
    userId: user.id,
    action: AuditAction.TRADE_IMPORTED,
    resource: 'Trade',
    details: { count: result.count },
  })

  return result
}

export async function getTradeStats(userId: string, filters?: {
  accountNumber?: string
  startDate?: Date
  endDate?: Date
}) {
  const user = await requireAuth()
  if (user.id !== userId) {
    throw new Error('Unauthorized')
  }

  const where: any = { userId, deletedAt: null }

  if (filters?.accountNumber) {
    where.accountNumber = filters.accountNumber
  }

  if (filters?.startDate || filters?.endDate) {
    where.entryDate = {}
    if (filters.startDate) where.entryDate.gte = filters.startDate
    if (filters.endDate) where.entryDate.lte = filters.endDate
  }

  const [totalTrades, stats] = await Promise.all([
    prisma.trade.count({ where }),
    prisma.trade.aggregate({
      where,
      _sum: { pnl: true, commission: true },
      _avg: { pnl: true },
    }),
  ])

  return {
    totalTrades,
    totalPnL: stats._sum.pnl || 0,
    totalCommission: stats._sum.commission || 0,
    averagePnL: stats._avg.pnl || 0,
  }
}
