"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { PortfolioRoi } from "../../_diamond/adapter"
import { formatCurrency } from "../../_diamond/stages"
import { enterMotion, sparkDrawMotion } from "../motion"
import { ReasoningTooltip } from "../reasoning-disclosure"
import { formatGbp } from "../../_format"

function compactUsd(n: number): string {
  return formatGbp(n)
}



function Sparkline({ values }: { values: number[] }) {

  if (values.length < 2) return null

  const w = 120

  const h = 40

  const max = Math.max(...values)

  const min = Math.min(...values, 0)

  const span = max - min || 1

  const pts = values.map((v, i) => {

    const x = (i / (values.length - 1)) * w

    const y = h - ((v - min) / span) * h

    return [x, y] as const

  })

  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")

  const area = `0,${h} ${line} ${w},${h}`



  let pathLength = 0

  for (let i = 1; i < pts.length; i++) {

    const dx = pts[i][0] - pts[i - 1][0]

    const dy = pts[i][1] - pts[i - 1][1]

    pathLength += Math.hypot(dx, dy)

  }



  const draw = sparkDrawMotion(pathLength)



  return (

    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 overflow-visible" aria-hidden>

      <polygon points={area} fill="var(--accent-positive)" fillOpacity={0.12} className="animate-in fade-in duration-500 fill-mode-forwards" style={{ animationDelay: "400ms" }} />

      <polyline

        points={line}

        fill="none"

        stroke="var(--accent-positive)"

        strokeWidth={1.75}

        strokeLinejoin="round"

        strokeLinecap="round"

        className={draw.className}

        style={draw.style}

      />

    </svg>

  )

}



function LedgerMetric({
  value,
  label,
  index,
  reasoning,
}: {
  value: string
  label: string
  index: number
  reasoning?: string
}) {

  const motion = enterMotion(index + 1)

  return (

    <div className={cn(motion.className, "flex shrink-0 flex-col gap-0.5")} style={motion.style}>

      <p className="text-[18px] font-bold tabular-nums text-[var(--color-text-primary)]">{value}</p>

      <p className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)]">
        {label}
        {reasoning && <ReasoningTooltip reasoning={{ summary: reasoning }} label={`Why ${label}`} />}
      </p>

    </div>

  )

}



export function PortfolioLedger({ roi, className }: { roi: PortfolioRoi; className?: string }) {

  const avgMultiple =

    roi.ledger.length > 0 ? roi.ledger.reduce((s, e) => s + e.roiMultiple, 0) / roi.ledger.length : 0



  const headerMotion = enterMotion(0)



  return (

    <section

      className={cn(

        headerMotion.className,

        "flex items-center gap-6 overflow-x-auto rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-[26px] py-[18px] sm:gap-8 lg:gap-10",

        className,

      )}

      style={headerMotion.style}

    >

      <div className="flex shrink-0 flex-col gap-0.5">

        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-muted)]">

          Negotiated savings

        </p>

        <p className="text-[12px] text-[var(--color-text-muted)]">

          Booked across {roi.missionsClosed} awarded packages

        </p>

      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-x-4 sm:gap-x-6 md:gap-x-8 lg:gap-x-10 xl:gap-x-14">
        <LedgerMetric
          value={compactUsd(roi.realizedToDate)}
          label="Realized to date"
          index={0}
          reasoning="Sum of realized value from all closed missions in the portfolio ledger."
        />
        <LedgerMetric
          value={`${roi.blendedRoi.toFixed(1)}x`}
          label="Blended ROI"
          index={1}
          reasoning="Total realized value divided by total invested cost across closed missions."
        />
        <LedgerMetric
          value={compactUsd(roi.inFlightProjected)}
          label="In-flight"
          index={2}
          reasoning="Projected value from missions still in progress (not yet realized)."
        />
        <LedgerMetric
          value={`${avgMultiple.toFixed(1)}x`}
          label="Avg multiple"
          index={3}
          reasoning="Average projected-value-to-cost multiple across all active missions."
        />
      </div>

      <div className="hidden h-10 w-[120px] shrink-0 sm:block">

        <Sparkline values={roi.cumulative.map((c) => c.total)} />

      </div>

    </section>

  )

}



export { compactUsd, formatCurrency }


