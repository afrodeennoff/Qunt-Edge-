'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Loader2 } from "lucide-react"
import { useI18n } from "@/locales/client"
import { cn } from "@/lib/utils"

// These will be populated by the user
const WHOP_LINKS = {
  monthly: process.env.NEXT_PUBLIC_WHOP_MONTHLY_URL || "https://whop.com/checkout/monthly",
  quarterly: process.env.NEXT_PUBLIC_WHOP_QUARTERLY_URL || "https://whop.com/checkout/quarterly",
  yearly: process.env.NEXT_PUBLIC_WHOP_YEARLY_URL || "https://whop.com/checkout/yearly",
}

type BillingInterval = 'monthly' | 'quarterly' | 'yearly'

export default function PricingPlans({ isModal, onClose, trigger }: { isModal?: boolean, onClose?: () => void, trigger?: React.ReactNode }) {
  const t = useI18n()
  const [interval, setInterval] = useState<BillingInterval>('monthly')

  const features = [
    t('pricing.plus.feature1'),
    t('pricing.plus.feature2'),
    'Advanced Analytics',
    'Priority Support',
    'Unlimited History',
    t('pricing.plus.feature6'),
  ]

  const PricingCard = () => (
    <Card className="relative bg-background h-full border-primary/20 shadow-lg flex flex-col">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap shadow-md">
          {t('pricing.fullVersion')}
        </span>
      </div>
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">{t('pricing.plus.name')}</CardTitle>
        <CardDescription>{t('pricing.plus.description')}</CardDescription>
      </CardHeader>

      <div className="flex justify-center mb-6 px-6">
        <div className="grid grid-cols-3 bg-muted p-1 rounded-lg w-full max-w-sm">
          <button
            onClick={() => setInterval('monthly')}
            className={cn(
              "text-sm font-medium px-3 py-1.5 rounded-md transition-all",
              interval === 'monthly' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('quarterly')}
            className={cn(
              "text-sm font-medium px-3 py-1.5 rounded-md transition-all",
              interval === 'quarterly' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Quarterly
          </button>
          <button
            onClick={() => setInterval('yearly')}
            className={cn(
              "text-sm font-medium px-3 py-1.5 rounded-md transition-all",
              interval === 'yearly' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Yearly
          </button>
        </div>
      </div>

      <CardContent className="flex-1">
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center gap-1">
            {interval === 'monthly' && <span className="text-3xl font-bold">$XX</span>}
            {interval === 'quarterly' && <span className="text-3xl font-bold">$XX</span>}
            {interval === 'yearly' && <span className="text-3xl font-bold">$XX</span>}
            <span className="text-muted-foreground">/{interval === 'monthly' ? 'mo' : interval === 'quarterly' ? 'qtr' : 'yr'}</span>
          </div>
          {interval === 'yearly' && (
            <p className="text-xs text-green-500 font-medium mt-1">Best Value</p>
          )}
        </div>

        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-primary mr-3 shrink-0" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="pt-4">
        <Button asChild className="w-full" size="lg">
          <Link href={WHOP_LINKS[interval]} target="_blank" rel="noopener noreferrer">
            Get {interval === 'monthly' ? 'Monthly' : interval === 'quarterly' ? 'Quarterly' : 'Yearly'} Access
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )

  if (trigger) {
    return (
      <div className="p-4 h-full">
        <PricingCard />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 w-full">
      <PricingCard />
    </div>
  )
}