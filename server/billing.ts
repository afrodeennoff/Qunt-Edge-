'use server'

import { createClient } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { WhopAPI } from '@/server/whop'

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

  const userEmail = user.email

  // 1. Instant Local Check (Fast)
  const localSubscription = await (prisma as any).subscription.findUnique({
    where: { email: userEmail },
  })

    // 2. Background Validation (Lazy)
    // We fire this off but do NOT await it for the UI return.
    // This ensures "Instant Login" speed.
    // The validation runs on the server; if it detects a mismatch, it updates the DB.
    // The *next* request (or a client-side revalidation) will catch the update.
    (async () => {
      try {
        const whopSubscription = await WhopAPI.getSubscriptionParam(userEmail)

        // Sync Logic in Background
        if (whopSubscription) {
          // If Whop is active, ensure DB matches
          await (prisma as any).subscription.upsert({
            where: { email: userEmail },
            create: {
              userId: user.id || localSubscription?.userId || '',
              email: userEmail,
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
            console.log(`[Revocation] User ${userEmail} has active local sub but no Whop sub. Revoking.`)
            await (prisma as any).subscription.update({
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