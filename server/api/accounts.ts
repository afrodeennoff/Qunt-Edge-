import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/server/auth-enhanced'
import { createAuditLog, AuditAction } from '@/lib/security/audit-log'
import { z } from 'zod'

const AccountSchema = z.object({
  number: z.string().min(1),
  propfirm: z.string().optional().default(''),
  drawdownThreshold: z.number().optional().default(0),
  profitTarget: z.number().optional().default(0),
  isPerformance: z.boolean().optional().default(false),
  startingBalance: z.number().optional().default(0),
  payoutCount: z.number().int().optional().default(0),
  trailingDrawdown: z.boolean().optional().default(false),
  trailingStopProfit: z.number().optional(),
  resetDate: z.coerce.date().optional(),
  consistencyPercentage: z.number().optional().default(30),
  groupId: z.string().uuid().optional(),
  accountSize: z.string().optional(),
  accountSizeName: z.string().optional(),
  activationFees: z.number().optional(),
  balanceRequired: z.number().optional(),
  dailyLoss: z.number().optional(),
  evaluation: z.boolean().optional().default(true),
  isRecursively: z.string().optional(),
  maxFundedAccounts: z.number().int().optional(),
  maxPayout: z.string().optional(),
  minDays: z.number().int().optional(),
  minPayout: z.number().optional(),
  minTradingDaysForPayout: z.number().int().optional(),
  payoutBonus: z.number().optional(),
  payoutPolicy: z.string().optional(),
  price: z.number().optional(),
  priceWithPromo: z.number().optional(),
  profitSharing: z.number().optional(),
  rulesDailyLoss: z.string().optional(),
  tradingNewsAllowed: z.boolean().optional().default(true),
  trailing: z.string().optional(),
  autoRenewal: z.boolean().optional().default(false),
  nextPaymentDate: z.coerce.date().optional(),
  paymentFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL', 'CUSTOM']).optional(),
  promoPercentage: z.number().optional(),
  promoType: z.enum(['DIRECT', 'PERCENTAGE']).optional(),
  renewalNotice: z.number().int().optional(),
  minPnlToCountAsDay: z.number().optional(),
  buffer: z.number().optional().default(0),
  considerBuffer: z.boolean().optional().default(true),
  shouldConsiderTradesBeforeReset: z.boolean().optional().default(true),
})

const UpdateAccountSchema = AccountSchema.partial().extend({
  id: z.string().uuid(),
})

export async function getAccounts(userId: string) {
  const user = await requireAuth()
  if (user.id !== userId) {
    throw new Error('Unauthorized')
  }

  return prisma.account.findMany({
    where: { userId },
    include: {
      group: true,
      payouts: {
        where: { status: 'PENDING' },
        orderBy: { date: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getAccountById(id: string) {
  const user = await requireAuth()

  const account = await prisma.account.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      group: true,
      payouts: {
        orderBy: { date: 'desc' },
      },
    },
  })

  if (!account) {
    throw new Error('Account not found')
  }

  return account
}

export async function createAccount(data: unknown) {
  const user = await requireAuth()

  const validated = AccountSchema.parse(data)

  const account = await prisma.account.create({
    data: {
      ...validated,
      userId: user.id,
    },
  })

  await createAuditLog({
    userId: user.id,
    action: AuditAction.ACCOUNT_CREATED,
    resource: 'Account',
    resourceId: account.id,
    details: { accountNumber: account.number },
  })

  return account
}

export async function updateAccount(id: string, data: any) {
  const user = await requireAuth()

  const existingAccount = await prisma.account.findFirst({
    where: { id, userId: user.id },
  })

  if (!existingAccount) {
    throw new Error('Account not found or unauthorized')
  }

  const validated = UpdateAccountSchema.parse(Object.assign({}, data, { id }))

  const account = await prisma.account.update({
    where: { id },
    data: validated,
  })

  await createAuditLog({
    userId: user.id,
    action: AuditAction.ACCOUNT_UPDATED,
    resource: 'Account',
    resourceId: account.id,
    details: { changes: validated },
  })

  return account
}

export async function deleteAccount(id: string) {
  const user = await requireAuth()

  const account = await prisma.account.findFirst({
    where: { id, userId: user.id },
  })

  if (!account) {
    throw new Error('Account not found or unauthorized')
  }

  await prisma.account.delete({
    where: { id },
  })

  await createAuditLog({
    userId: user.id,
    action: AuditAction.ACCOUNT_DELETED,
    resource: 'Account',
    resourceId: id,
    details: { accountNumber: account.number },
  })

  return { success: true }
}

export async function getAccountStats(accountId: string) {
  const user = await requireAuth()

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: user.id },
  })

  if (!account) {
    throw new Error('Account not found or unauthorized')
  }

  const [tradeCount, totalPnL, latestTrade] = await Promise.all([
    prisma.trade.count({
      where: {
        accountNumber: account.number,
        userId: user.id,
      },
    }),
    prisma.trade.aggregate({
      where: {
        accountNumber: account.number,
        userId: user.id,
      },
      _sum: { pnl: true },
    }),
    prisma.trade.findFirst({
      where: {
        accountNumber: account.number,
        userId: user.id,
      },
      orderBy: { closeDate: 'desc' },
    }),
  ])

  return {
    accountNumber: account.number,
    tradeCount,
    totalPnL: totalPnL._sum.pnl || 0,
    latestTradeDate: latestTrade?.closeDate || null,
    startingBalance: account.startingBalance,
    currentBalance: account.startingBalance + (totalPnL._sum.pnl || 0),
    drawdownThreshold: account.drawdownThreshold,
    profitTarget: account.profitTarget,
  }
}
