"use client"

import * as React from "react"
import { useStore } from "../_store"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { ActionCard } from "@/components/ActionCard"
import { AgenticFocusHero } from "../_components/agentic-hero"
import { RegionStrategyRow, StrategyFilterBar } from "../_components/hub/region-strategy-row"
import { barFillMotion } from "../_components/motion"
import type { ExpansionPrescription, ExpansionStrategy, MarketSignal, StrategyScorecard } from "../data/_expansion"
import { ReasoningTooltip } from "../_components/reasoning-disclosure"
import { reasoningFromExpansionPrescription } from "../_components/reasoning-helpers"

const strategyConfig: Record<ExpansionStrategy, { label: string; color: string; bg: string; icon: string; description: string }> = {
  invest:  { label: "Invest",   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: "TrendingUp",  description: "Scale through M&A and sales" },
  expand:  { label: "Expand",   color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/10 border-blue-500/20",       icon: "ArrowUpRight", description: "Accelerate market entry" },
  defend:  { label: "Defend",   color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/10 border-amber-500/20",     icon: "Shield",       description: "Protect margins and lock-in" },
  harvest: { label: "Harvest",  color: "text-slate-500 dark:text-slate-400",     bg: "bg-slate-500/10 border-slate-500/20",     icon: "ArrowDownRight", description: "Extract value, redeploy capital" },
  explore: { label: "Explore",  color: "text-purple-600 dark:text-purple-400",   bg: "bg-purple-500/10 border-purple-500/20",   icon: "Search",       description: "Evaluate opportunistically" },
}

const sourceColors: Record<string, string> = {
  BLS: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  Census: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  EIA: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Internal: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
}

export function MarketPositionPage() {
  const { data, setPage } = useStore()
  const prescriptions = data?.expansionPrescriptions ?? []
  const [expandedRegion, setExpandedRegion] = React.useState<string | null>(null)
  const [strategyFilter, setStrategyFilter] = React.useState<ExpansionStrategy | null>(null)

  if (prescriptions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-16">
        <p className="text-sm text-muted-foreground">Loading market data...</p>
      </div>
    )
  }

  const margins = prescriptions.map((p) => p.currentFootprint.margin)
  const marginSpread = ((Math.max(...margins) - Math.min(...margins)) * 100).toFixed(1)

  const filtered = strategyFilter
    ? prescriptions.filter((p) => p.strategy === strategyFilter)
    : prescriptions

  return (
    <div className="space-y-7">
      <AgenticFocusHero
        eyebrow="Regional market intelligence · from BluePilot"
        staticHeadline="Where to invest, defend, and harvest across six regions."
        staticBody="Central is the growth engine at the strongest margin — scale it. Three regions need defending as wage and fuel costs climb. Mountain is a watch-list; harvest South and redeploy that capital."
        staticReasoning={{
          summary: "Regional strategy scored from BLS wages, Census construction, EIA fuel, and internal margin/footprint data.",
          steps: [
            "Weighted scorecard: construction growth (25%), margin (20%), wages (15%), footprint (15%), fuel (15%), labor (10%)",
            "Mapped composite score to invest / defend / harvest / explore posture per region",
            "Assigned lever-specific actions per strategy bucket",
          ],
        }}
        agentReasoningSummary="BluePilot scored regional expansion posture from labor, construction demand, fuel, and portfolio signals."
        ctaLabel="See top actions"
        onCta={() => setPage("operating-loop")}
        stats={[
          { value: String(prescriptions.length), label: "regions" },
          { value: `${marginSpread}pt`, label: "margin spread" },
        ]}
      />

      <div className="space-y-3">
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Your regions</h2>
          <p className="text-[13px] text-[var(--color-text-muted)]">Grouped by strategy — where to grow, hold, and step back</p>
        </div>
        <StrategyFilterBar active={strategyFilter} onChange={setStrategyFilter} />
      </div>

      <div className="space-y-3">
        {filtered.map((rx, i) => {
          const isExpanded = expandedRegion === rx.region
          return (
            <div key={rx.region} className="space-y-0">
              <RegionStrategyRow
                index={i}
                name={rx.regionName}
                strategy={rx.strategy}
                narrative={rx.strategyRationale}
                margin={`${(rx.currentFootprint.margin * 100).toFixed(1)}%`}
                jobs={rx.currentFootprint.jobs}
                customers={rx.currentFootprint.customers}
                score={rx.compositeScore}
                reasoning={reasoningFromExpansionPrescription(rx)}
                onClick={() => setExpandedRegion(isExpanded ? null : rx.region)}
              />
              {isExpanded && (
                <div className="mt-2 space-y-4 rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5">
                  <ScorecardBreakdown scorecard={rx.scorecard} composite={rx.compositeScore} strategy={rx.strategy} />
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Market Signals</p>
                    <div className="grid grid-cols-2 gap-2">
                      {rx.marketSignals.map((sig, i) => (
                        <SignalCard key={i} signal={sig} />
                      ))}
                    </div>
                  </div>
                  {rx.actions.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recommended Actions</p>
                      <div className="space-y-2">
                        {rx.actions.map((action, i) => (
                          <ActionCard key={i} action={action} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const scorecardMeta: { key: keyof StrategyScorecard; label: string; weight: string; source: string }[] = [
  { key: "constructionGrowth", label: "Construction Demand", weight: "25%", source: "Census" },
  { key: "currentMargin",      label: "Current Margin",      weight: "20%", source: "Internal" },
  { key: "wageFavorability",    label: "Wage Favorability",   weight: "15%", source: "BLS" },
  { key: "footprintStrength",   label: "Footprint Strength",  weight: "15%", source: "Internal" },
  { key: "fuelExposure",        label: "Fuel Exposure",       weight: "15%", source: "EIA" },
  { key: "laborSupply",         label: "Labor Supply",        weight: "10%", source: "BLS" },
]

function scoreColor(score: number): string {
  if (score >= 70) return "bg-emerald-500"
  if (score >= 50) return "bg-amber-400"
  return "bg-red-400"
}

function ScorecardBreakdown({ scorecard, composite, strategy }: { scorecard: StrategyScorecard; composite: number; strategy: ExpansionStrategy }) {
  const cfg = strategyConfig[strategy]
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Strategy Scorecard</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Composite</span>
          <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums border", cfg.bg, cfg.color)}>{composite}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {scorecardMeta.map(({ key, label, weight, source }, i) => {
          const val = scorecard[key]
          const bar = barFillMotion(i, val, scoreColor(val))
          return (
            <div key={key} className="flex items-center gap-2 text-[11px]">
              <span className="w-[110px] shrink-0 text-muted-foreground truncate">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={bar.className} style={bar.style} />
              </div>
              <span className="w-6 text-right font-mono font-medium tabular-nums">{val}</span>
              <span className="w-7 text-right text-[9px] text-muted-foreground/60">{weight}</span>
              <span className={cn("inline-flex items-center rounded px-1 py-px text-[8px] font-semibold tracking-wide w-12 justify-center", sourceColors[source])}>
                {source}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SignalCard({ signal }: { signal: MarketSignal }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {signal.metric}
          <ReasoningTooltip
            reasoning={{
              summary: signal.implication,
              equations: [`${signal.source} — ${signal.metric} = ${signal.value}`],
              sources: [signal.source === "Internal" ? "Internal — Platform export" : `${signal.source} — External data`],
            }}
            label={`Why ${signal.metric} matters`}
          />
        </span>
        <span className={cn("inline-flex items-center rounded px-1 py-px text-[8px] font-semibold tracking-wide", sourceColors[signal.source])}>
          {signal.source}
        </span>
      </div>
      <p className="text-xs font-semibold">{signal.value}</p>
    </div>
  )
}

