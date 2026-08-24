"use client"

import * as React from "react"
import { TooltipProvider } from "@/components/ui/prosera/tooltip"
import { AcmeDemoStoreProvider } from "./_store"
import { LayoutShell } from "./_shell"
import { CompassMotionStyles } from "./_components/motion"

export default function FutureEnergyClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AcmeDemoStoreProvider>
        <CompassMotionStyles />
        <LayoutShell>{children}</LayoutShell>
      </AcmeDemoStoreProvider>
    </TooltipProvider>
  )
}
