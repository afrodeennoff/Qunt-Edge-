'use client'

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { useI18n } from "@/locales/client"
import { useUserStore } from "@/store/user-store"

export function SubscriptionBadge({ className }: { className?: string }) {
  const t = useI18n()

  // Use user store data
  const subscription = useUserStore(state => state.subscription)
  const isLoading = useUserStore(state => state.isLoading)

  // Compute values directly from subscription data
  const formattedPlan = subscription?.plan || 'Free'

  const isActive = subscription?.status === 'active' || subscription?.status === 'ACTIVE'

  // Show loading state only when actually loading
  if (isLoading) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "px-2 py-0.5 text-xs whitespace-nowrap",
          "bg-secondary text-secondary-foreground",
          className
        )}
      >
        {t('pricing.loading')}
      </Badge>
    )
  }

  // If no subscription data after loading, user is on Free plan
  if (!subscription || !isActive) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "px-2 py-0.5 text-xs whitespace-nowrap",
          "bg-secondary text-secondary-foreground",
          className
        )}
      >
        {t('pricing.free.name')}
      </Badge>
    )
  }

  // Active Plan
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/dashboard/billing">
            <Badge
              variant="secondary"
              className={cn(
                "px-2 py-0.5 text-xs whitespace-nowrap cursor-help transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                className
              )}
            >
              {formattedPlan}
            </Badge>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('billing.status.active')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}