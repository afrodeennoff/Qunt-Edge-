'use server'

import { createClient } from '@/server/auth'
import { PrismaClient } from '@/prisma/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { WhopAPI } from '@/server/whop'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export type SubscriptionWithPrice = {
  id: string
  status: string
  current_period_end: number
  plan: {
    id: string
    name: string
    interval: 'month' | 'year' | 'lifetime'
  }
}

export async function getSubscriptionData(): Promise<SubscriptionWithPrice | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return null

  // 1. Instant Local Check (Fast)
  const localSubscription = await prisma.subscription.findUnique({
    where: { email: user.email },
  })

    // 2. Background Validation (Lazy)
    // We fire this off but do NOT await it for the UI return. 
    // This ensures "Instant Login" speed.
    // The validation runs on the server; if it detects a mismatch, it updates the DB.
    // The *next* request (or a client-side revalidation) will catch the update.
    (async () => {
      try {
        const whopSubscription = await WhopAPI.getSubscriptionParam(user.email)

        // Sync Logic in Background
        if (whopSubscription) {
          // If Whop is active, ensure DB matches
          await prisma.subscription.upsert({
            where: { email: user.email },
            create: {
              userId: user.id || localSubscription?.userId || '',
              email: user.email,
              status: 'ACTIVE',
              plan: whopSubscription.plan,
              interval: whopSubscription.interval,
              endDate: whopSubscription.endDate
            },
            update: {
              status: 'ACTIVE',
              plan: whopSubscription.plan,
              interval: whopSubscription.interval,
              endDate: whopSubscription.endDate
            }
          })
        } else {
          // If Whop confirms NO subscription (null), but local says Active -> Revoke
          if (localSubscription && localSubscription.status === 'ACTIVE') {
            console.log(`[Revocation] User ${user.email} has active local sub but no Whop sub. Revoking.`)
            await prisma.subscription.update({
              where: { id: localSubscription.id },
              data: { status: 'CANCELLED' }
            })
          }
        }
      } catch (err) {
        console.warn("Background Whop validation failed:", err)
      }
    })() // Immediately invoked, not awaited

  // 3. Return Local State Immediately
  // If they were active last time, let them in instantly.
  // If the background check finds they expired, the DB updates, and they lose access on next refresh.
  if (localSubscription && localSubscription.status === 'ACTIVE') {
    return {
      id: localSubscription.id,
      status: 'active',
      current_period_end: Math.floor(localSubscription.endDate ? localSubscription.endDate.getTime() / 1000 : 0),
      plan: {
        id: localSubscription.plan,
        name: localSubscription.plan,
        interval: localSubscription.interval as 'month' | 'year' | 'lifetime' || 'month'
      }
    }
  }

  return null
}