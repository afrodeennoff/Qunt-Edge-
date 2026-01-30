import { prisma } from "@/lib/prisma"

const WHOP_API_KEY = process.env.WHOP_API_KEY

export const WhopAPI = {
    // Check if Whop is configured
    isConfigured: !!WHOP_API_KEY,

    async getSubscriptionParam(email: string) {
        if (!WHOP_API_KEY) {
            console.warn('WHOP_API_KEY is not set')
            return null
        }

        try {
            // 1. Search for user by email to get Whop User ID
            // Whop API: GET /users/search?email=...
            const searchRes = await fetch(`https://api.whop.com/api/v2/users/search?email=${encodeURIComponent(email)}`, {
                headers: {
                    'Authorization': `Bearer ${WHOP_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!searchRes.ok) return null

            const searchData = await searchRes.json()
            // Type safe check needed here depending on exact API response structure
            const whopUserId = searchData?.data?.[0]?.id || searchData?.id // Adjust based on actual API

            if (!whopUserId) return null

            // 2. Get Memberships for this user
            // Whop API: GET /users/{id}/memberships
            const membershipsRes = await fetch(`https://api.whop.com/api/v2/users/${whopUserId}/memberships`, {
                headers: {
                    'Authorization': `Bearer ${WHOP_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!membershipsRes.ok) return null

            const membershipsData = await membershipsRes.json()

            // 3. Check for valid membership
            // Filter for active or past_due (grace period)
            const validMembership = membershipsData?.data?.find((m: any) =>
                ['active', 'past_due', 'trialing'].includes(m.status)
            )

            if (validMembership) {
                return {
                    status: 'active', // Normalize status
                    plan: validMembership.plan_id || 'pro',
                    interval: validMembership.billing_period || 'month',
                    endDate: validMembership.current_period_end ? new Date(validMembership.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            }

            return null

        } catch (error) {
            console.error('[WhopAPI] Error checking subscription:', error)
            throw error;
        }
    }
}
