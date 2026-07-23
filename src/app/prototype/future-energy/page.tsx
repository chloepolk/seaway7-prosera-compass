"use client"

import * as React from "react"
import { useStore } from "./_store"
import { CustomerIntelPage } from "./_pages/customer-intel"
import { PricingIntelPage } from "./_pages/pricing-intel"
import { MarketPositionPage } from "./_pages/market-position"
import { ProcessVelocityPage } from "./_pages/process-velocity"
import { OperatingLoopPage } from "./_pages/operating-loop"
import { CommercialCenterPage } from "./_pages/commercial-center"
import { TenderStudioPage } from "./_pages/tender-studio"
import { BidEvaluationPage } from "./_pages/bid-evaluation"

export default function CompassPage() {
  const { activePage } = useStore()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-xl bg-muted/40" />
        <div className="h-12 rounded-lg bg-muted/30" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-lg bg-muted/30" />)}
        </div>
        <div className="h-64 rounded-lg bg-muted/30" />
      </div>
    )
  }

  switch (activePage) {
    case "commercial-center":
      return <CommercialCenterPage />
    case "customer-intel":
      return <CustomerIntelPage />
    case "pricing-intel":
      return <PricingIntelPage />
    case "market-position":
      return <MarketPositionPage />
    case "process-velocity":
      return <ProcessVelocityPage />
    case "operating-loop":
      return <OperatingLoopPage />
    case "tender-studio":
      return <TenderStudioPage />
    case "bid-evaluation":
      return <BidEvaluationPage />
  }
}

