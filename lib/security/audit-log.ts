import { prisma } from '@/lib/prisma'

export enum AuditAction {
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED',
  AUTH_PASSWORD_CHANGED = 'AUTH_PASSWORD_CHANGED',
  AUTH_PASSWORD_RESET = 'AUTH_PASSWORD_RESET',
  AUTH_OAUTH_LINKED = 'AUTH_OAUTH_LINKED',
  AUTH_OAUTH_UNLINKED = 'AUTH_OAUTH_UNLINKED',

  TRADE_CREATED = 'TRADE_CREATED',
  TRADE_UPDATED = 'TRADE_UPDATED',
  TRADE_DELETED = 'TRADE_DELETED',
  TRADE_IMPORTED = 'TRADE_IMPORTED',
  TRADE_EXPORTED = 'TRADE_EXPORTED',

  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',

  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',

  TEAM_CREATED = 'TEAM_CREATED',
  TEAM_INVITED = 'TEAM_INVITED',
  TEAM_JOINED = 'TEAM_JOINED',
  TEAM_LEFT = 'TEAM_LEFT',

  BUSINESS_CREATED = 'BUSINESS_CREATED',
  BUSINESS_INVITED = 'BUSINESS_INVITED',
  BUSINESS_JOINED = 'BUSINESS_JOINED',

  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',

  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED = 'WEBHOOK_PROCESSED',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',

  ADMIN_USER_VIEWED = 'ADMIN_USER_VIEWED',
  ADMIN_ACTION = 'ADMIN_ACTION',

  DATA_EXPORTED = 'DATA_EXPORTED',
  DATA_DELETED = 'DATA_DELETED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditLogEntry {
  userId?: string
  action: AuditAction
  resource?: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  success?: boolean
  errorMessage?: string
  severity?: AuditSeverity
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const auditLogModel = (prisma as any).auditLog
    if (auditLogModel) {
      await auditLogModel.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details as any,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          success: entry.success ?? true,
          errorMessage: entry.errorMessage,
          severity: entry.severity || AuditSeverity.INFO,
        },
      })
    }
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export async function createSecurityAuditLog(
  action: AuditAction,
  details: Record<string, any>,
  severity: AuditSeverity = AuditSeverity.WARNING
): Promise<void> {
  await createAuditLog({
    action,
    details,
    severity,
    success: false,
  })
}

export async function logAuthAttempt(
  userId: string | undefined,
  success: boolean,
  authMethod: string,
  ipAddress?: string,
  userAgent?: string,
  failureReason?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: success ? AuditAction.AUTH_LOGIN : AuditAction.AUTH_LOGIN_FAILED,
    resource: 'User',
    details: { authMethod },
    ipAddress,
    userAgent,
    success,
    errorMessage: failureReason,
    severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
  })
}

export async function logAdminAction(
  userId: string,
  action: string,
  details: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: AuditAction.ADMIN_ACTION,
    resource: 'Admin',
    details: { action, ...details },
    ipAddress,
    success: true,
    severity: AuditSeverity.INFO,
  })
}

export async function logDataAccess(
  userId: string,
  resource: string,
  resourceId: string,
  ipAddress?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: AuditAction.DATA_EXPORTED,
    resource,
    resourceId,
    ipAddress,
    success: true,
  })
}

export async function getAuditLogsForUser(
  userId: string,
  limit: number = 100
): Promise<any[]> {
  const auditLogModel = (prisma as any).auditLog
  if (!auditLogModel) return []
  return auditLogModel.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
}

export async function getFailedLoginAttempts(
  ipAddress: string,
  since: Date = new Date(Date.now() - 15 * 60 * 1000)
): Promise<number> {
  const auditLogModel = (prisma as any).auditLog
  if (!auditLogModel) return 0
  return auditLogModel.count({
    where: {
      action: AuditAction.AUTH_LOGIN_FAILED,
      ipAddress,
      success: false,
      timestamp: { gte: since },
    },
  })
}

export async function isIPAddressBlocked(ipAddress: string): Promise<boolean> {
  const recentFailures = await getFailedLoginAttempts(ipAddress)
  return recentFailures >= 5
}

export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  const auditLogModel = (prisma as any).auditLog
  if (!auditLogModel) return 0
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

  const result = await auditLogModel.deleteMany({
    where: {
      timestamp: { lt: cutoffDate },
      severity: { in: [AuditSeverity.INFO, AuditSeverity.WARNING] },
    },
  })

  return result.count
}
