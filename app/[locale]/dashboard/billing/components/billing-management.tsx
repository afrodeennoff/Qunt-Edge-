'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/locales/client"

export default function BillingManagement() {
  const t = useI18n()
  const WHOP_MANAGE_URL = "https://whop.com/hub"

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('billing.currentPlan')}</CardTitle>
          <CardDescription>Manage your subscription directly on Whop</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm text-muted-foreground">
              Billing and subscription management is handled securely by Whop.
              To cancel your subscription, update payment methods, or view invoices, please visit your Whop Hub.
            </p>
            <Button asChild variant="outline">
              <Link href={WHOP_MANAGE_URL} target="_blank" rel="noopener noreferrer">
                Manage Subscription on Whop
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}