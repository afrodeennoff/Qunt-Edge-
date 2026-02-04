# QuntEdge Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Deployment Platforms](#deployment-platforms)
5. [Post-Deployment](#post-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Accounts & Services

| Service | Purpose | Tier |
|---------|---------|------|
| **Vercel** | Hosting | Hobby/Pro |
| **Supabase** | Database & Auth | Pro/Team |
| **Whop** | Payments | Required |
| **OpenAI** | AI Features | Pay-as-you-go |
| **Resend** | Email Service | Free/Pro |
| **GitHub** | Repository & CI/CD | Free |
| **Discord Developers** | OAuth App | Free |

### Required Software

- **Node.js** 20+ or **Bun** (latest)
- **Git** for version control
- **PostgreSQL** client (psql) or Supabase CLI

---

## Environment Configuration

### 1. Generate Encryption Keys

```bash
# Generate a 32-byte (256-bit) encryption key for token encryption
openssl rand -hex 32
```

Save this value - you'll need it for `ENCRYPTION_KEY`.

### 2. Generate Cron Secret

```bash
# Generate a random secret for cron job protection
openssl rand -hex 16
```

Save this value for `CRON_SECRET`.

### 3. Environment Variables

Create a `.env.local` file (or use Vercel Environment Variables):

```bash
# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL="postgresql://user:password@host:5432/dbname?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/dbname"

# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# ============================================
# SECURITY
# ============================================
ENCRYPTION_KEY="your-32-byte-hex-key-from-step-1"
CRON_SECRET="your-cron-secret-from-step-2"

# ============================================
# OPENAI CONFIGURATION
# ============================================
OPENAI_API_KEY="sk-..."

# ============================================
# WHOP PAYMENT CONFIGURATION
# ============================================
WHOP_API_KEY="your-whop-api-key"
WHOP_COMPANY_ID="your-company-id"
WHOP_WEBHOOK_SECRET="whop_webhook_secret_from_webhook_settings"
NEXT_PUBLIC_WHOP_APP_ID="your_app_id"

# Whop Plan IDs
NEXT_PUBLIC_WHOP_MONTHLY_PLAN_ID="plan_monthly_id"
NEXT_PUBLIC_WHOP_QUARTERLY_PLAN_ID="plan_quarterly_id"
NEXT_PUBLIC_WHOP_YEARLY_PLAN_ID="plan_yearly_id"

# Whop Checkout URLs
NEXT_PUBLIC_WHOP_MONTHLY_URL="https://whop.com/checkout/monthly_id"
NEXT_PUBLIC_WHOP_QUARTERLY_URL="https://whop.com/checkout/quarterly_id"
NEXT_PUBLIC_WHOP_YEARLY_URL="https://whop.com/checkout/yearly_id"

# ============================================
# DISCORD OAUTH
# ============================================
DISCORD_ID="your_discord_client_id"
DISCORD_SECRET="your_discord_client_secret"
NEXT_PUBLIC_DISCORD_INVITATION="https://discord.gg/your-invite-link"

# ============================================
# RESEND EMAIL
# ============================================
RESEND_API_KEY="re_..."

# ============================================
# APPLICATION
# ============================================
NEXT_PUBLIC_APP_URL="https://your-domain.com"  # Production URL
ADMIN_USER_ID="your_admin_user_id_from_supabase"

# ============================================
# OPTIONAL SERVICES
# ============================================
# GitHub (for community features)
GITHUB_TOKEN="ghp_..."
NEXT_PUBLIC_REPO_OWNER="your-username"
NEXT_PUBLIC_REPO_NAME="quntedge"

# Support emails
SUPPORT_TEAM_EMAIL="team@your-domain.com"
SUPPORT_EMAIL="support@your-domain.com"
```

---

## Database Setup

### Step 1: Apply Optimized Schema

```bash
# Run the optimization migration
psql $DATABASE_URL -f prisma/migrations/001_optimize_schema.sql

# Run the data type migration (if starting fresh, skip this)
psql $DATABASE_URL -f prisma/migrations/002_data_type_migration.sql
```

### Step 2: Generate Prisma Client

```bash
# Install dependencies
npm install

# Generate Prisma client with new schema
npx prisma generate

# Push schema to database
npx prisma db push
```

### Step 3: Seed Initial Data (Optional)

```bash
npx prisma db seed
```

### Step 4: Configure Row Level Security (Supabase)

```sql
-- Enable RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Trade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view own data" ON "User"
  FOR SELECT USING (auth.uid()::text = "auth_user_id");

CREATE POLICY "Users can update own data" ON "User"
  FOR UPDATE USING (auth.uid()::text = "auth_user_id");

-- Trade policies
CREATE POLICY "Users can view own trades" ON "Trade"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own trades" ON "Trade"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own trades" ON "Trade"
  FOR UPDATE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own trades" ON "Trade"
  FOR DELETE USING (auth.uid()::text = "userId");

-- Account policies
CREATE POLICY "Users can view own accounts" ON "Account"
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own accounts" ON "Account"
  FOR INSERT WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own accounts" ON "Account"
  FOR UPDATE USING (auth.uid()::text = "userId");
```

---

## Deployment Platforms

### Option A: Vercel (Recommended)

#### 1. Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

#### 2. Configure Vercel Project

```bash
# Set environment variables via CLI
vercel env add DATABASE_URL
vercel env add ENCRYPTION_KEY
# ... add all variables from step 3
```

Or use Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.local`

#### 3. Deploy

```bash
# Production deployment
vercel --prod

# Preview deployment
vercel
```

#### 4. Configure Cron Jobs

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/renew-tradovate-token",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/renewal-notice",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron",
      "schedule": "0 8 * * 0"
    },
    {
      "path": "/api/cron/compute-trade-data",
      "schedule": "0 2 * * 1"
    }
  ]
}
```

#### 5. Configure Domains

1. Go to Project Settings → Domains
2. Add custom domain: `app.your-domain.com`
3. Configure DNS records as shown

### Option B: Docker Deployment

#### 1. Build Docker Image

```bash
docker build -t quntedge:latest -f Dockerfile.bun .
```

#### 2. Docker Compose

```yaml
version: '3.8'

services:
  app:
    image: quntedge:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      # ... add all environment variables
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=quntedge
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 3. Run

```bash
docker-compose up -d
```

---

## Post-Deployment

### 1. Verify Installation

```bash
# Run tests
npm run test:run

# Check type errors
npm run typecheck

# Run linter
npm run lint
```

### 2. Create Admin User

1. Sign up via the application
2. Get user ID from Supabase dashboard
3. Set `ADMIN_USER_ID` environment variable
4. Redeploy

### 3. Configure Whop Webhooks

1. Go to Whop Dashboard → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/whop`
3. Copy webhook secret to `WHOP_WEBHOOK_SECRET`
4. Test webhook delivery

### 4. Test Authentication Flow

1. Test Discord OAuth: `/api/auth/callback?provider=discord`
2. Test Google OAuth: `/api/auth/callback?provider=google`
3. Test email/password login
4. Verify session management

### 5. Test Payment Flow

1. Create test checkout in Whop
2. Complete test payment
3. Verify webhook handler creates subscription
4. Check dashboard access granted

### 6. Monitor Initial Performance

```bash
# Check Vercel logs
vercel logs

# Monitor database connections
# In Supabase Dashboard → Database → Metrics
```

---

## Monitoring & Maintenance

### 1. Set Up Error Tracking

**Sentry Integration**:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

Configure `sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
})
```

### 2. Set Up Uptime Monitoring

**Recommended Services**:
- UptimeRobot (free)
- Pingdom (paid)
- Better Uptime (free tier)

**Endpoints to Monitor**:
- `https://your-domain.com/` (homepage)
- `https://your-domain.com/api/health` (add health check)
- `https://your-domain.com/dashboard` (authenticated)

### 3. Database Backups

**Supabase Automatic**: Enabled by default

**Manual Backup**:
```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup-YYYYMMDD.sql
```

### 4. Log Aggregation

**Vercel Logs**:
```bash
# View real-time logs
vercel logs -f

# Download logs
vercel logs --file logs.txt
```

**Database Query Logging**:
```typescript
// lib/prisma.ts - Enable query logging in development
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
})
```

### 5. Performance Monitoring

**Vercel Analytics** (built-in):
- Web Vitals
- Page views
- Route performance

**Custom Metrics**:
```typescript
// lib/monitoring.ts
export function recordMetric(name: string, value: number) {
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', { name, value })
  }
}
```

### 6. Security Maintenance

**Weekly Tasks**:
- Review audit logs for suspicious activity
- Check rate limit violations
- Review failed login attempts
- Monitor webhook failures

**Monthly Tasks**:
- Rotate `CRON_SECRET`
- Review and update dependencies
- Audit API access patterns
- Check database query performance

**Quarterly Tasks**:
- Review and update security policies
- Conduct penetration testing
- Review disaster recovery procedures
- Audit user permissions

### 7. Scaling Checklist

**When to Scale**:
- Average response time > 2s
- Database CPU > 80%
- Memory usage > 90%
- Error rate > 1%

**Scaling Options**:
1. **Vercel**: Upgrade to Pro plan for more execution time
2. **Database**: Enable read replicas, connection pooling
3. **CDN**: Configure caching for static assets
4. **Redis**: Add caching layer for frequently accessed data

---

## Troubleshooting

### Common Issues

**Issue**: Webhooks not processing
```bash
# Check webhook logs
vercel logs --filter /api/webhooks/whop

# Verify webhook signature
echo -n "payload" | openssl dgst -sha256 -hmac "WHOP_WEBHOOK_SECRET"
```

**Issue**: Database connection errors
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Issue**: Cron jobs not running
```bash
# Check Vercel cron logs
vercel logs --filter /api/cron

# Verify cron configuration
cat vercel.json | jq '.crons'
```

**Issue**: High memory usage
```bash
# Check Prisma connection pool
# In lib/prisma.ts, add:
connectionLimit: 10,  // Reduce from default
```

---

## Emergency Procedures

### Rollback Deployment

```bash
# Vercel rollback
vercel rollback

# Or deploy previous commit
git log
vercel --commit <previous-sha> --prod
```

### Emergency Maintenance Mode

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.rewrite(new URL('/maintenance', request.url))
  }
  // ... rest of middleware
}
```

### Database Emergency

```sql
-- Enable read-only mode
ALTER DATABASE your_database SET default_transaction_read_only = on;

-- Disable writes temporarily
-- Fix issue, then:
ALTER DATABASE your_database SET default_transaction_read_only = off;
```

---

## Support & Resources

**Documentation**:
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)

**Community**:
- Discord: [Join Community](https://discord.gg/a5YVF5Ec2n)
- GitHub Issues: [Report Bug](https://github.com/hugodemenez/quntedge/issues)

**Emergency Contact**:
- Email: support@your-domain.com
- Response time: <24 hours
