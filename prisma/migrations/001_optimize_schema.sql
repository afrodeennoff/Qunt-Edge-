-- Migration: Optimized Database Schema for QuntEdge
-- Date: 2025-01-31
-- Description: Add indexes, update data types, and add security improvements

-- ============================================
-- COMPOUND INDEXES FOR COMMON QUERY PATTERNS
-- ============================================

-- Trade table indexes (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_trade_user_date ON "Trade"("userId", "entryDate" DESC);
CREATE INDEX IF NOT EXISTS idx_trade_user_account ON "Trade"("userId", "accountNumber");
CREATE INDEX IF NOT EXISTS idx_trade_user_instrument ON "Trade"("userId", "instrument");
CREATE INDEX IF NOT EXISTS idx_trade_account_entry_date ON "Trade"("accountNumber", "entryDate" DESC);

-- Partial index for active subscriptions only
CREATE INDEX IF NOT EXISTS idx_subscription_active ON "Subscription"("email", "status")
  WHERE "status" IN ('ACTIVE', 'TRIAL');

-- Account indexes for payment tracking
CREATE INDEX IF NOT EXISTS idx_account_next_payment ON "Account"("nextPaymentDate")
  WHERE "nextPaymentDate" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_user_payment ON "Account"("userId", "nextPaymentDate")
  WHERE "nextPaymentDate" IS NOT NULL;

-- Synchronization indexes
CREATE INDEX IF NOT EXISTS idx_synchronization_user_service ON "Synchronization"("userId", "service");
CREATE INDEX IF NOT EXISTS idx_synchronization_token_expiry ON "Synchronization"("tokenExpiresAt")
  WHERE "tokenExpiresAt" IS NOT NULL;

-- Newsletter indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON "Newsletter"("email", "isActive")
  WHERE "isActive" = true;

-- Team and invitation indexes
CREATE INDEX IF NOT EXISTS idx_team_invitation_status ON "TeamInvitation"("status", "expiresAt")
  WHERE "status" = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_team_invitation_email ON "TeamInvitation"("email");

-- GIN indexes for array searches
CREATE INDEX IF NOT EXISTS idx_trade_tags_gin ON "Trade" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS idx_trade_images_gin ON "Trade" USING GIN ("images");

-- Mood tracking indexes
CREATE INDEX IF NOT EXISTS idx_mood_user_date ON "Mood"("userId", "day" DESC);

-- Audit log indexes (for security monitoring)
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp ON "AuditLog"("userId", "timestamp" DESC)
  WHERE "userId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_action_timestamp ON "AuditLog"("action", "timestamp" DESC);

-- Webhook event tracking (for idempotency)
CREATE INDEX IF NOT EXISTS idx_webhook_event_processed ON "WebhookEvent"("eventId", "processed");

-- ============================================
-- PERFORMANCE: PARTIAL INDEXES FOR FILTERED QUERIES
-- ============================================

-- Only index trades that haven't been soft-deleted
CREATE INDEX IF NOT EXISTS idx_trade_active_by_user ON "Trade"("userId", "entryDate" DESC)
  WHERE "deletedAt" IS NULL;

-- Only index accounts with upcoming payments
CREATE INDEX IF NOT EXISTS idx_account_renewals_due ON "Account"("userId", "nextPaymentDate")
  WHERE "nextPaymentDate" > NOW() AND "autoRenewal" = true;

-- ============================================
-- SECURITY: ENCRYPTION MIGRATION
-- ============================================

-- Add columns for encrypted tokens (will be populated by migration script)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "etpTokenEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "thorTokenEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "encryptionVersion" INTEGER DEFAULT 1;

-- Add column for last security audit
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSecurityAudit" TIMESTAMP;

-- ============================================
-- AUDIT LOGGING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" VARCHAR(100) NOT NULL,
  "resource" VARCHAR(255),
  "resourceId" TEXT,
  "details" JSONB,
  "ipAddress" INET,
  "userAgent" TEXT,
  "success" BOOLEAN DEFAULT true,
  "errorMessage" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "severity" VARCHAR(20) DEFAULT 'INFO',

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp" DESC);

-- ============================================
-- WEBHOOK EVENT TRACKING (IDEMPOTENCY)
-- ============================================

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "payload" JSONB,
  "processed" BOOLEAN DEFAULT false,
  "processingAttempts" INTEGER DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_processed_idx" ON "WebhookEvent"("processed", "createdAt");

-- ============================================
-- SUBSCRIPTION CACHE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "SubscriptionCache" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "cachedData" JSONB NOT NULL,
  "lastValidated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubscriptionCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionCache_email_key" ON "SubscriptionCache"("email");
CREATE INDEX IF NOT EXISTS "SubscriptionCache_expiresAt_idx" ON "SubscriptionCache"("expiresAt");

-- ============================================
-- RATE LIMIT TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS "RateLimitTrack" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "endpoint" VARCHAR(255) NOT NULL,
  "requestCount" INTEGER DEFAULT 1,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedUntil" TIMESTAMP(3),

  CONSTRAINT "RateLimitTrack_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RateLimitTrack_identifier_endpoint_idx" ON "RateLimitTrack"("identifier", "endpoint", "windowStart");

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON INDEX idx_trade_user_date IS 'Primary index for trade queries by user and date range';
COMMENT ON INDEX idx_trade_user_account IS 'Index for account-specific trade queries';
COMMENT ON INDEX idx_subscription_active IS 'Partial index for active subscriptions only';
COMMENT ON INDEX idx_account_next_payment IS 'Index for upcoming payment notifications';
COMMENT ON TABLE "AuditLog" IS 'Security and compliance audit trail';
COMMENT ON TABLE "WebhookEvent" IS 'Idempotency tracking for webhooks to prevent duplicate processing';
COMMENT ON TABLE "SubscriptionCache" IS 'Cache layer for subscription data to reduce external API calls';
COMMENT ON TABLE "RateLimitTrack" IS 'Rate limiting to prevent abuse and brute force attacks';

-- ============================================
-- STATISTICS UPDATE FOR QUERY OPTIMIZER
-- ============================================

ANALYZE "Trade";
ANALYZE "Account";
ANALYZE "Subscription";
ANALYZE "User";
ANALYZE "AuditLog";
ANALYZE "WebhookEvent";
