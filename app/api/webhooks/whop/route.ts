import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Whop Webhook Types (Simplified)
type WhopEvent = {
    action: string
    data: {
        id: string
        user_id: string
        email: string
        status: string // 'active', 'past_due', 'canceled'
        plan_id: string
        billing_period: string // 'monthly', 'yearly'
        current_period_end: number // unix timestamp
        quantity: number
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const signature = (await headers()).get('whop-signature')

        // TODO: Verify signature with process.env.WHOP_WEBHOOK_SECRET
        // if (!verifySignature(JSON.stringify(body), signature)) {
        //   return new NextResponse('Invalid signature', { status: 401 })
        // }

        const { action, data } = body as WhopEvent

        console.log('[Whop Webhook] Received event:', action, data.email)

        // Ensure user exists
        let user = await prisma.user.findUnique({
            where: { email: data.email },
        })

        if (!user) {
            console.error(`[Whop Webhook] User not found for email: ${data.email}`)
            // Optional: Create user placeholder or ignore? 
            // For now, we ignore, assuming they must sign up first.
            return new NextResponse('User not found', { status: 200 }) // Return 200 to acknowledge receipt
        }

        // Handle events
        switch (action) {
            case 'membership.went_active':
            case 'membership.went_valid':
            case 'payment.succeeded':
                // Update or Create Subscription
                await prisma.subscription.upsert({
                    where: { userId: user.id },
                    create: {
                        userId: user.id,
                        email: user.email,
                        status: 'ACTIVE',
                        plan: data.plan_id || 'pro', // Map to your plan names
                        interval: data.billing_period || 'month',
                        endDate: new Date((data.current_period_end || Date.now() / 1000 + 30 * 24 * 60 * 60) * 1000),
                    },
                    update: {
                        status: 'ACTIVE',
                        plan: data.plan_id || 'pro',
                        interval: data.billing_period || 'month',
                        endDate: new Date((data.current_period_end || Date.now() / 1000 + 30 * 24 * 60 * 60) * 1000),
                    },
                })
                break

            case 'membership.went_cancelled':
            case 'membership.went_expired':
                // Mark as expired or keep active until endDate?
                // Usually we just mark status if immediately revoked, or rely on the last known endDate.
                await prisma.subscription.update({
                    where: { userId: user.id },
                    data: {
                        status: 'CANCELED', // Or 'EXPIRED'
                    }
                })
                break

            default:
                console.log('[Whop Webhook] Unhandled action:', action)
        }

        return new NextResponse('Webhook processed', { status: 200 })
    } catch (error) {
        console.error('[Whop Webhook] Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
