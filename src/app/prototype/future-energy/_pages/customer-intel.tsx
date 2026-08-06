"use client"

import { activeLocaleTag, formatActivePercent, formatActiveUsd, localizeActiveCopy } from "../_i18n/legacy"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Card, CardContent } from "@/components/ui/prosera/card"
import { Badge } from "@/components/ui/prosera/badge"
import { Separator } from "@/components/ui/prosera/separator"
import { useStore } from "../_store"
import { regionLabels, type Region } from "../data/_regions"
import type { CustomerAggregate, CityAggregate, RegionAggregate, Job, Tier, ComputedData } from "../data/_transform"
import type { TrendDirection } from "../data/_temporal"
import type { CustomerScore, ScoreGrade } from "../data/_scorecard"
import type { CustomerTam, ServiceLinePotential, IntelSignal, Confidence } from "../data/_tam"
import { buildTamRollup } from "../data/_tam"
import { highlightFlashClass, pcmButton, useRowFlash } from "../_components/motion"
import { cn } from "@/lib/utils"
import { getEIAFuelForRegion, getEIAFuelSummaryForRegion } from "../data/_eia"
import { BluePilotSummary, BluePilotSkeleton } from "../_components/bluepilot-summary"
import { IntelBoard } from "../_components/intel-board"
import type { IntelModule, ModuleSummary } from "../_modules/types"

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

function fmtUsd(n: number): string {
  return formatActiveUsd(n)
}

function fmtPct(n: number): string {
  return formatActivePercent(n)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/* ------------------------------------------------------------------ */
/*  Region composite-score rollups (enhance — not replace — BCG tiers) */
/* ------------------------------------------------------------------ */

interface RegionScoreSummary {
  region: Region
  count: number
  /** Revenue-weighted composite score across the region's customers. */
  weighted: number
  /** Median composite score (less sensitive to a few big accounts). */
  median: number
  low: { name: string; score: number } | null
  high: { name: string; score: number } | null
}

/** Each customer's primary region = the region holding the most of their jobs. */
function primaryRegion(c: CustomerAggregate): Region | null {
  let best: Region | null = null
  let bestN = -1
  for (const [region, n] of Object.entries(c.regionDistribution) as [Region, number][]) {
    if (n > bestN) { bestN = n; best = region }
  }
  return best
}

function computeRegionScoreSummaries(customers: CustomerAggregate[]): Map<Region, RegionScoreSummary> {
  const groups = new Map<Region, CustomerAggregate[]>()
  for (const c of customers) {
    if (!c.customerScore) continue
    const r = primaryRegion(c)
    if (!r) continue
    const arr = groups.get(r) ?? []
    arr.push(c)
    groups.set(r, arr)
  }

  const result = new Map<Region, RegionScoreSummary>()
  for (const [region, group] of groups) {
    const scores = group.map(c => c.customerScore!.score)
    let weightNum = 0
    let weightDen = 0
    for (const c of group) {
      const w = Math.max(0, c.validated.totalRevenue)
      weightNum += w * c.customerScore!.score
      weightDen += w
    }
    const weighted = weightDen > 0 ? weightNum / weightDen : (scores.reduce((s, v) => s + v, 0) / scores.length)
    const sortedByScore = [...group].sort((a, b) => a.customerScore!.score - b.customerScore!.score)
    const lowC = sortedByScore[0]
    const highC = sortedByScore[sortedByScore.length - 1]
    result.set(region, {
      region,
      count: group.length,
      weighted: Math.round(weighted),
      median: Math.round(median(scores)),
      low: lowC ? { name: lowC.customerName, score: lowC.customerScore!.score } : null,
      high: highC ? { name: highC.customerName, score: highC.customerScore!.score } : null,
    })
  }
  return result
}

/* ------------------------------------------------------------------ */
/*  Tier styling                                                       */
/* ------------------------------------------------------------------ */

const tierColor: Record<Tier, string> = {
  Stars: "bg-amber-500",
  "Cash Cows": "bg-blue-500",
  "Question Marks": "bg-yellow-500",
  Dogs: "bg-red-500",
}

const tierBadgeClass: Record<Tier, string> = {
  Stars: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
  "Cash Cows": "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25",
  "Question Marks": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/25",
  Dogs: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25",
}

const jobTypeColors = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
]

/* ------------------------------------------------------------------ */
/*  Customer Score (CI-04) styling + shared widgets                    */
/* ------------------------------------------------------------------ */

const gradeOrder: ScoreGrade[] = ["A", "B", "C", "D", "F"]

// Customer Score is ordinal 0-100 → single-hue (indigo) sequential ramp, A strongest → F lightest.
// Deliberately NOT the categorical tier palette (amber/blue/yellow/red) so the two systems never read as correlated.
const gradeColor: Record<ScoreGrade, string> = {
  A: "bg-indigo-700",
  B: "bg-indigo-600",
  C: "bg-indigo-500",
  D: "bg-indigo-400",
  F: "bg-indigo-300",
}

const gradeText = "text-indigo-600 dark:text-indigo-400"

function ScorePill({ score }: { score: CustomerScore | undefined }) {
  if (!score) return <span className="text-[11px] text-muted-foreground/50">—</span>
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs ${gradeText}`}
      title={`CS ${score.score} (${score.grade}) · ${score.businessType}`}
    >
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${gradeColor[score.grade]}`} />
      {score.score}
      <span className="text-[10px] font-semibold">{score.grade}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <SafeIcon name="ArrowLeft" className="h-4 w-4" />
      Back
    </button>
  )
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy(label)}</span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  )
}

function TrendArrow({ direction }: { direction: TrendDirection | undefined | null }) {
  if (!direction || direction === "stable") return null
  const isUp = direction === "improving"
  return (
    <span
      className={`inline-block text-[10px] font-bold leading-none ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}
      title={`Margin trend: ${direction}`}
    >
      {isUp ? "▲" : "▼"}
    </span>
  )
}

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${tierColor[tier]}`} />
      {tier}
    </span>
  )
}

function HeadlineSkeleton() {
  const { agentPhase } = useStore()
  const phaseText = agentPhase === "orchestrating" || agentPhase === "verifying"
    ? "Synthesizing findings…"
    : "BluePilot is analyzing…"

  return <BluePilotSkeleton label={phaseText} />
}

/* ------------------------------------------------------------------ */
/*  Executive Brief — Computed Fallback + LLM Override                  */
/* ------------------------------------------------------------------ */

interface ExecBrief {
  sentences: string[]
  bullets: string[]
  severity: string
}

function useExecutiveBrief(
  data: ComputedData,
  drillLevel: string,
  filteredCustomers: CustomerAggregate[],
  filteredRegion: RegionAggregate | null,
  filteredCity: CityAggregate | null,
  selectedRegion: Region | null,
  selectedCity: string | null,
): ExecBrief {
  return React.useMemo(() => {
    const { portfolioSummary, regions, quoteAnalysis, dispatchAuthEvents } = data
    const sortedRegions = [...regions].sort((a, b) => b.validated.avgMarginPct - a.validated.avgMarginPct)
    const bestRegion = sortedRegions[0]
    const worstRegion = sortedRegions[sortedRegions.length - 1]
    const exitCustomers = filteredCustomers.filter(c => c.tier === "Dogs")
    const cloneCustomers = filteredCustomers.filter(c => c.tier === "Stars")
    const exitLoss = exitCustomers.reduce((s, c) => s + Math.min(0, c.validated.totalMargin), 0)
    const atRiskHigh = quoteAnalysis.atRiskQuotes.filter(q => q.riskScore >= 3)
    const nteEscalations = dispatchAuthEvents.filter(e => e.revenueToNteRatio > 1.0)
    const fuelRegion = selectedRegion ?? "RW"
    const eiaFuel = getEIAFuelForRegion(fuelRegion)
    const recentFuel = eiaFuel.length >= 2 ? eiaFuel[eiaFuel.length - 1] : null
    const priorFuel = eiaFuel.length >= 7 ? eiaFuel[eiaFuel.length - 7] : null
    const fuelDelta = recentFuel && priorFuel
      ? ((recentFuel.pricePerGallon - priorFuel.pricePerGallon) / priorFuel.pricePerGallon) * 100
      : null

    if (drillLevel === "city" && filteredCity && selectedCity && selectedRegion) {
      const regionLabel = regionLabels[selectedRegion] ?? selectedRegion
      const cityMargin = filteredCity.avgMarginPct
      const regionMargin = filteredRegion?.validated.avgMarginPct ?? portfolioSummary.validated.avgMarginPct
      const vRegion = cityMargin - regionMargin
      const cityExitCount = exitCustomers.length
      const cityCloneCount = cloneCustomers.length

      return {
        severity: cityExitCount >3 ? "high" : vRegion< -0.05 ? "medium" : "info",
        sentences: [
          `${selectedCity} services ${filteredCity.customerCount} customers across ${filteredCity.jobCount} jobs generating ${fmtUsd(filteredCity.totalRevenue)} revenue at ${fmtPct(cityMargin)} gross margin.`,
          `This market runs ${Math.abs(vRegion * 100).toFixed(1)} percentage points ${vRegion >= 0 ? "above" : "below"} ${regionLabel}'s ${fmtPct(regionMargin)} state average, ${vRegion >= 0 ? "indicating premium pricing power or favorable service mix" : "signaling pricing misalignment or cost overruns relative to the state"}.`,
          `${cityCloneCount > 0 ? `${cityCloneCount} Stars accounts anchor profitability` : "No Stars accounts are present"}, while ${cityExitCount} Dogs accounts ${cityExitCount > 0 ? `are consuming resources at negative returns costing ${fmtUsd(Math.abs(exitLoss))}` : "have been identified"}.`,
          `${nteEscalations.length > 0 ? `${nteEscalations.length} NTE scope escalation events portfolio-wide add dispatch friction when jobs exceed customer-set authorization caps.` : "NTE escalation levels appear low — minimal re-authorization overhead detected."}`,
          `${cityExitCount > 0 ? `Adjust future pricing or divest the ${cityExitCount} negative-margin accounts` : "Protect existing margin"} and ${cityCloneCount > 0 ? `replicate the Stars DNA across acquisition targets in ${regionLabel}` : `develop Stars candidates through service mix optimization`}.`,
        ],
        bullets: [
          `Review ${filteredCity.customerCount} customers contributing ${fmtUsd(filteredCity.totalRevenue)} in ${selectedCity} revenue.`,
          `${cityExitCount > 0 ? `Escalate ${cityExitCount} Dogs accounts destroying ${fmtUsd(Math.abs(exitLoss))} in margin.` : `Maintain zero Dogs accounts — current portfolio is healthy.`}`,
          `${cityCloneCount > 0 ? `Protect ${cityCloneCount} Stars accounts averaging ${fmtPct(cloneCustomers.length > 0 ? cloneCustomers.reduce((s, c) => s + c.validated.avgMarginPct, 0) / cloneCustomers.length : 0)} gross margin.` : `Identify candidates for Stars development in this market.`}`,
          `Compare ${selectedCity}'s ${fmtPct(cityMargin)} margin against ${regionLabel}'s ${fmtPct(regionMargin)} average.`,
          `Investigate ${filteredCity.jobCount} jobs for unbilled labor or pricing compression signals.`,
          `${atRiskHigh.length > 0 ? `Monitor ${atRiskHigh.length} at-risk quotes exceeding pricing ceilings portfolio-wide.` : `No high-risk quotes currently flagged for pricing review.`}`,
          `${fuelDelta != null ? `Track fuel costs ${fuelDelta > 0 ? "up" : "down"} ${Math.abs(fuelDelta).toFixed(1)}% over the past 6 weeks for contract fuel clause review.` : `Monitor EIA fuel pricing for contract clause recalibration triggers.`}`,
        ],
      }
    }

    if (drillLevel === "region" && filteredRegion && selectedRegion) {
      const label = regionLabels[selectedRegion] ?? selectedRegion
      const regionMargin = filteredRegion.validated.avgMarginPct
      const delta = regionMargin - portfolioSummary.validated.avgMarginPct
      const cities = filteredRegion.cities
      const bestCity = cities.length > 0 ? [...cities].sort((a, b) => b.avgMarginPct - a.avgMarginPct)[0] : null
      const worstCity = cities.length > 1 ? [...cities].sort((a, b) => a.avgMarginPct - b.avgMarginPct)[0] : null
      const regionExitCount = exitCustomers.length
      const regionCloneCount = cloneCustomers.length

      return {
        severity: regionExitCount >5 ? "high" : delta< -0.03 ? "medium" : "info",
        sentences: [
          `${localizeActiveCopy(label)} processes ${filteredRegion.validated.jobCount.toLocaleString(activeLocaleTag())} jobs across ${filteredRegion.customerCount} customers in ${cities.length} markets, generating ${fmtUsd(filteredRegion.validated.totalRevenue)} revenue at ${fmtPct(regionMargin)} gross margin.`,
          `The state runs ${Math.abs(delta * 100).toFixed(1)} percentage points ${delta >= 0 ? "above" : "below"} the portfolio average of ${fmtPct(portfolioSummary.validated.avgMarginPct)}, ${delta >= 0 ? "contributing positive margin uplift" : "dragging overall portfolio performance"}.`,
          `${bestCity && worstCity && bestCity.city !== worstCity.city ? `Intra-state variance is significant: ${bestCity.city} leads at ${fmtPct(bestCity.avgMarginPct)} while ${worstCity.city} trails at ${fmtPct(worstCity.avgMarginPct)} — a ${((bestCity.avgMarginPct - worstCity.avgMarginPct) * 100).toFixed(1)}pt spread requiring investigation.` : `Market performance is relatively uniform across ${cities.length} cities.`}`,
          `${regionExitCount} Dogs accounts are destroying ${fmtUsd(Math.abs(exitLoss))} in margin through negative-margin jobs, predominantly driven by pricing misalignment or unbilled labor.`,
          `Prioritize Dogs cleanup ${worstCity ? `starting in ${worstCity.city}` : ""} and replicate ${regionCloneCount > 0 ? `the ${regionCloneCount} Stars accounts` : "proven margin models"} to establish acquisition DNA for PE scaling in ${localizeActiveCopy(label)}.`,
        ],
        bullets: [
          `Investigate ${cities.length} markets for pricing variance across ${fmtUsd(filteredRegion.validated.totalRevenue)} in revenue.`,
          `Escalate ${regionExitCount} Dogs accounts costing ${fmtUsd(Math.abs(exitLoss))} in margin destruction.`,
          `${regionCloneCount > 0 ? `Protect ${regionCloneCount} Stars accounts anchoring ${localizeActiveCopy(label)}'s profitability at ${fmtPct(filteredRegion.validated.avgMarginPct)}.` : `Develop Stars candidates through service mix optimization in ${localizeActiveCopy(label)}.`}`,
          `${bestCity ? `Benchmark ${bestCity.city}'s ${fmtPct(bestCity.avgMarginPct)} margin model for replication across ${localizeActiveCopy(label)}.` : `Benchmark top-performing market for replication opportunities.`}`,
          `${worstCity ? `Review ${worstCity.city}'s ${fmtPct(worstCity.avgMarginPct)} margin for pricing or operational intervention.` : `Review lowest-performing market for pricing or operational intervention.`}`,
          `${atRiskHigh.length > 0 ? `Monitor ${atRiskHigh.length} at-risk quotes exceeding pricing ceilings portfolio-wide.` : `No high-risk quotes currently flagged for pricing ceiling review.`}`,
          `${fuelDelta != null ? `Track fuel costs ${fuelDelta > 0 ? "up" : "down"} ${Math.abs(fuelDelta).toFixed(1)}% over the past 6 weeks for contract fuel clause review.` : `Monitor EIA fuel pricing for contract clause recalibration triggers.`}`,
        ],
      }
    }

    const regionSpread = bestRegion && worstRegion
      ? ((bestRegion.validated.avgMarginPct - worstRegion.validated.avgMarginPct) * 100).toFixed(1)
      : null

    return {
      severity: exitCustomers.length > 10 ? "high" : "medium",
      sentences: [
        `ACME Field Services operates ${portfolioSummary.totalCustomers} customers across ${regions.length} states generating ${fmtUsd(portfolioSummary.validated.totalRevenue)} in revenue at ${fmtPct(portfolioSummary.validated.avgMarginPct)} blended gross margin.`,
        `Margin concentration is acute — the top ${portfolioSummary.topMarginCustomerPct.toFixed(0)}% of customers deliver ${portfolioSummary.topMarginSharePct}% of total margin, creating single-point-of-failure exposure across the portfolio.`,
        `${bestRegion && worstRegion ? `Regional performance varies sharply: ${regionLabels[bestRegion.region] ?? bestRegion.region} leads at ${fmtPct(bestRegion.validated.avgMarginPct)} while ${regionLabels[worstRegion.region] ?? worstRegion.region} trails at ${fmtPct(worstRegion.validated.avgMarginPct)} — a ${regionSpread}pt spread signaling pricing or operational misalignment.` : `Regional performance data is limited.`}`,
        `${exitCustomers.length} Dogs accounts are destroying ${fmtUsd(Math.abs(exitLoss))} in margin, while ${nteEscalations.length} NTE scope escalation events add dispatch friction when jobs exceed customer-set authorization caps.`,
        `Prioritize Dogs cleanup, replicate Stars DNA (${cloneCustomers.length} accounts averaging ${fmtPct(cloneCustomers.length > 0 ? cloneCustomers.reduce((s, c) => s + c.validated.avgMarginPct, 0) / cloneCustomers.length : 0)} margin) into acquisition targeting, and close the ${regionSpread ?? "0"}pt regional margin gap.`,
      ],
      bullets: [
        `Replicate Stars DNA from ${cloneCustomers.length} high-margin accounts averaging ${fmtPct(cloneCustomers.length > 0 ? cloneCustomers.reduce((s, c) => s + c.validated.avgMarginPct, 0) / cloneCustomers.length : 0)} for acquisition targeting.`,
        `Divest or adjust future pricing for ${exitCustomers.length} Dogs accounts costing ${fmtUsd(Math.abs(exitLoss))} in margin destruction.`,
        `${bestRegion ? `Protect ${regionLabels[bestRegion.region] ?? bestRegion.region}'s ${fmtPct(bestRegion.validated.avgMarginPct)} margin leadership across ${bestRegion.validated.jobCount} jobs.` : `Benchmark top-performing region for margin replication.`}`,
        `${worstRegion ? `Investigate ${regionLabels[worstRegion.region] ?? worstRegion.region}'s ${fmtPct(worstRegion.validated.avgMarginPct)} margin gap for pricing intervention.` : `Review lowest-performing region for pricing intervention.`}`,
        `${atRiskHigh.length > 0 ? `Review ${atRiskHigh.length} at-risk quotes exceeding pricing ceilings before conversion loss.` : `No high-risk quotes currently flagged for pricing review.`}`,
        `${nteEscalations.length > 0 ? `Streamline re-auth workflow for top-friction customers — ${nteEscalations.length} scope escalation events generating unnecessary dispatch overhead.` : `NTE escalation levels are low — no re-authorization friction detected.`}`,
        `${fuelDelta != null ? `Monitor fuel costs ${fuelDelta > 0 ? "up" : "down"} ${Math.abs(fuelDelta).toFixed(1)}% over the past 6 weeks for contract fuel clause adjustment.` : `Track EIA fuel pricing for contract clause recalibration triggers.`}`,
      ],
    }
  }, [data, drillLevel, filteredCustomers, filteredRegion, filteredCity, selectedRegion, selectedCity])
}

function ExecutiveBrief({ computed }: { computed: ExecBrief }) {
  const { bpHeadline, isAgentLoading, useStaticFallback, orchestratorResult, bpReasoning } = useStore()

  if (isAgentLoading) return <HeadlineSkeleton />

  const llmBrief = orchestratorResult?.executiveSummary
  const sentences = useStaticFallback
    ? computed.sentences
    : (llmBrief?.sentences ?? (bpHeadline ? [bpHeadline.narrative] : computed.sentences))
  const bullets = useStaticFallback
    ? computed.bullets
    : (llmBrief?.bullets ?? computed.bullets)
  const severity = useStaticFallback
    ? computed.severity
    : (bpHeadline?.severity ?? computed.severity)

  return (
    <BluePilotSummary
      sentences={sentences}
      bullets={bullets}
      severity={severity}
      reasoning={
        useStaticFallback
          ? {
              summary: "Derived from validated job margins, customer tiers, regional spread, and quote risk signals.",
              steps: [
                "Joined jobs across JobInfo, JobStats, and JobVisit tables",
                "Computed realized margin per customer and assigned tiers",
                "Flagged concentration, exit candidates, and regional gaps",
              ],
            }
          : bpReasoning.length > 0
            ? {
                summary: "BluePilot cross-referenced portfolio, pricing, and market specialists to produce this brief.",
                steps: bpReasoning.map((s) => s.text),
              }
            : undefined
      }
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Tier Strip                                                         */
/* ------------------------------------------------------------------ */

const tiers: Tier[] = ["Stars", "Cash Cows", "Question Marks", "Dogs"]
const tierMeta: Record<Tier, { color: string; activeRing: string }> = {
  Stars: { color: "bg-amber-500", activeRing: "ring-amber-500/50" },
  "Cash Cows": { color: "bg-blue-500", activeRing: "ring-blue-500/50" },
  "Question Marks": { color: "bg-yellow-500", activeRing: "ring-yellow-500/50" },
  Dogs: { color: "bg-red-500", activeRing: "ring-red-500/50" },
}

function TierStrip({ tierCounts, onTierClick, activeTier }: { tierCounts: Record<Tier, number>; onTierClick: (tier: string) => void; activeTier?: string | null }) {
  const total = tiers.reduce((s, t) => s + tierCounts[t], 0)
  return (
    <div className="space-y-2">
      <div className="flex h-10 overflow-hidden rounded-lg">
        {tiers.map(tier => {
          const count = tierCounts[tier]
          if (count === 0) return null
          const pct = (count / total) * 100
          const isActive = activeTier === tier
          const meta = tierMeta[tier]
          return (
            <button key={tier} onClick={() => onTierClick(tier)}
              className={`${meta.color} relative flex items-center justify-center text-xs font-medium text-white transition-all hover:brightness-110 ${isActive ? `ring-2 ${meta.activeRing} ring-offset-1 ring-offset-background z-10` : ""}`}
              style={{ width: `${pct}%`, minWidth: 48 }}>
              <span className="truncate px-1.5">{tier} · {count}</span>
            </button>
          )
        })}
      </div>
      <div className="flex justify-between">
        {tiers.map(tier => {
          const meta = tierMeta[tier]
          const isActive = activeTier === tier
          return (
            <button key={tier} onClick={() => onTierClick(tier)}
              className={`flex items-center gap-1.5 text-xs transition-colors ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${meta.color}`} />
              {tier}
              <span className="font-mono text-[11px]">{tierCounts[tier]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Customer Score Distribution (CI-04, additive to tiering)           */
/* ------------------------------------------------------------------ */

function ScoreDistribution({ customers }: { customers: CustomerAggregate[] }) {
  const dist = React.useMemo(() => {
    const scored = customers.filter(c => c.customerScore)
    const gradeCounts: Record<ScoreGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
    let total = 0
    for (const c of scored) {
      gradeCounts[c.customerScore!.grade]++
      total += c.customerScore!.score
    }
    return {
      count: scored.length,
      avgScore: scored.length > 0 ? Math.round(total / scored.length) : 0,
      gradeCounts,
    }
  }, [customers])

  if (dist.count === 0) return null

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Customer Score (CI-04)")}</h3>
      <Card><CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Portfolio Avg · composite health")}</span>
            <span className="mt-1 font-mono text-2xl font-semibold leading-none text-indigo-600 dark:text-indigo-400">
              {dist.avgScore}<span className="text-sm font-normal text-muted-foreground">/100</span>
            </span>
          </div>
          <span className="text-right text-[10px] uppercase tracking-wider text-muted-foreground/60">{dist.count} {localizeActiveCopy("scored")}<br />{localizeActiveCopy("additive to tier")}</span>
        </div>

        {/* 0-100 health gauge — distinct form from the categorical tier strip */}
        <div className="space-y-1">
          <div className="relative h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${dist.avgScore}%` }} />
          </div>
          <div className="flex justify-between font-mono text-[9px] text-muted-foreground/50"><span>0</span><span>50</span><span>100</span></div>
        </div>

        {/* Grade mix — single-hue ordinal ramp */}
        <div className="space-y-1.5 border-t border-border/30 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">{localizeActiveCopy("Grade Mix")}</p>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted/40">
            {gradeOrder.map(g => {
              const pct = (dist.gradeCounts[g] / dist.count) * 100
              if (pct === 0) return null
              return <div key={g} className={gradeColor[g]} style={{ width: `${pct}%` }} title={`${g}: ${dist.gradeCounts[g]}`} />
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {gradeOrder.map(g => (
              <span key={g} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`inline-block h-2 w-2 rounded-full ${gradeColor[g]}`} />
                {g}<span className="font-mono">{dist.gradeCounts[g]}</span>
              </span>
            ))}
          </div>
        </div>
      </CardContent></Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Region Grid                                                        */
/* ------------------------------------------------------------------ */

function RegionGrid() {
  const { data, drillToRegion } = useStore()
  const regions = data.regions

  const bestMarginRegion = React.useMemo(() => {
    if (regions.length === 0) return null
    return regions.reduce((best, r) => r.validated.avgMarginPct > best.validated.avgMarginPct ? r : best).region
  }, [regions])

  const scoreSummaries = React.useMemo(() => computeRegionScoreSummaries(data.customers), [data.customers])

  const cols = regions.length <= 2 ? "grid-cols-2" : regions.length <= 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-3"

  return (
    <div className={`grid gap-3 ${cols}`}>
      {regions.map(r => {
        const isBest = r.region === bestMarginRegion
        const ss = scoreSummaries.get(r.region)
        return (
          <Card key={r.region} onClick={() => drillToRegion(r.region)}
            className={`cursor-pointer px-4 py-3.5 transition-all hover:shadow-md ${isBest ? "border-emerald-500/40" : ""}`}>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-semibold">{regionLabels[r.region]}</h3>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.region}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div><span className="text-muted-foreground">{localizeActiveCopy("Jobs")}</span><span className="ml-1.5 font-mono">{r.validated.jobCount.toLocaleString(activeLocaleTag())}</span></div>
              <div><span className="text-muted-foreground">{localizeActiveCopy("Revenue")}</span><span className="ml-1.5 font-mono">{fmtUsd(r.validated.totalRevenue)}</span></div>
              <div><span className="text-muted-foreground">{localizeActiveCopy("Avg Margin")}</span><span className={`ml-1.5 font-mono ${isBest ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{fmtPct(r.validated.avgMarginPct)}</span>{r.trend && <TrendArrow direction={r.trend.direction} />}</div>
              <div><span className="text-muted-foreground">{localizeActiveCopy("Avg Ticket")}</span><span className="ml-1.5 font-mono">{fmtUsd(r.validated.avgTicket)}</span></div>
              <div><span className="text-muted-foreground">{localizeActiveCopy("Customers")}</span><span className="ml-1.5 font-mono">{r.customerCount.toLocaleString(activeLocaleTag())}</span></div>
            </div>
            {ss && (
              <div className="mt-2.5 space-y-1 border-t border-border/30 pt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                    Customer Score
                  </span>
                  <span className={`font-mono font-semibold ${gradeText}`} title={localizeActiveCopy("Revenue-weighted CI-04 composite score")}>
                    {ss.weighted}<span className="text-[9px] font-normal text-muted-foreground">{localizeActiveCopy("wtd")}</span>
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">{ss.median} {localizeActiveCopy("median short")}</span>
                  </span>
                </div>
                {ss.low && ss.high && ss.low.name !== ss.high.name && (
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground/70">
                    <span className="truncate" title={`Lowest: ${ss.low.name}`}>▼ {ss.low.name} ({ss.low.score})</span>
                    <span className="truncate text-right" title={`Highest: ${ss.high.name}`}>▲ {ss.high.name} ({ss.high.score})</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Customer Table                                                     */
/* ------------------------------------------------------------------ */

type SortKey = "margin" | "revenue" | "jobs" | "marginPct" | "score"

const sortLabels: Record<SortKey, string> = { margin: "Margin $", revenue: "Revenue", jobs: "Jobs", marginPct: "Margin %", score: "Score" }

function sortCustomers(customers: CustomerAggregate[], key: SortKey): CustomerAggregate[] {
  return [...customers].sort((a, b) => {
    switch (key) {
      case "margin": return b.validated.totalMargin - a.validated.totalMargin
      case "revenue": return b.validated.totalRevenue - a.validated.totalRevenue
      case "jobs": return b.validated.jobCount - a.validated.jobCount
      case "marginPct": return b.validated.avgMarginPct - a.validated.avgMarginPct
      case "score": return (b.customerScore?.score ?? -1) - (a.customerScore?.score ?? -1)
    }
  })
}

function CustomerTable({ customers, onCustomerClick, limit }: { customers: CustomerAggregate[]; onCustomerClick: (name: string) => void; limit?: number }) {
  const [showAll, setShowAll] = React.useState(false)
  const [sortKey, setSortKey] = React.useState<SortKey>("margin")
  const { flashKey, flash } = useRowFlash()
  const sorted = React.useMemo(() => sortCustomers(customers, sortKey), [customers, sortKey])
  const display = limit && !showAll ? sorted.slice(0, limit) : sorted

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1">{localizeActiveCopy("Sort by")}</span>
        {(Object.keys(sortLabels) as SortKey[]).map(k => (
          <button
            key={k}
            onClick={() => setSortKey(k)}
            className={cn(
              pcmButton,
              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
              k === sortKey
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {sortLabels[k]}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">{localizeActiveCopy("Customer")}</th>
              <th className={`pb-2 pr-4 font-medium text-right cursor-pointer hover:text-foreground transition-colors ${sortKey === "jobs" ? "text-foreground" : ""}`} onClick={() => setSortKey("jobs")}>{localizeActiveCopy("Jobs")}{sortKey === "jobs" ? " ↓" : ""}</th>
              <th className={`pb-2 pr-4 font-medium text-right cursor-pointer hover:text-foreground transition-colors ${sortKey === "revenue" ? "text-foreground" : ""}`} onClick={() => setSortKey("revenue")}>{localizeActiveCopy("Revenue")}{sortKey === "revenue" ? " ↓" : ""}</th>
              <th className={`pb-2 pr-4 font-medium text-right cursor-pointer hover:text-foreground transition-colors ${sortKey === "margin" ? "text-foreground" : ""}`} onClick={() => setSortKey("margin")}>{localizeActiveCopy("Margin")}{sortKey === "margin" ? " ↓" : ""}</th>
              <th className={`pb-2 pr-4 font-medium text-right cursor-pointer hover:text-foreground transition-colors ${sortKey === "marginPct" ? "text-foreground" : ""}`} onClick={() => setSortKey("marginPct")}>{localizeActiveCopy("Margin %")}{sortKey === "marginPct" ? " ↓" : ""}</th>
              <th className={`pb-2 pr-4 font-medium text-right cursor-pointer hover:text-foreground transition-colors ${sortKey === "score" ? "text-foreground" : ""}`} onClick={() => setSortKey("score")} title={localizeActiveCopy("CI-04 Composite Customer Score (0-100)")}>{localizeActiveCopy("Score")}{sortKey === "score" ? " ↓" : ""}</th>
              <th className="pb-2 font-medium">{localizeActiveCopy("Tier")}</th>
            </tr>
          </thead>
          <tbody>
            {display.map(c => (
              <tr
                key={c.customerName}
                onClick={() => flash(c.customerName, () => onCustomerClick(c.customerName))}
                className={cn(
                  "border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/40",
                  flashKey === c.customerName && highlightFlashClass,
                )}
              >
                <td className="py-2.5 pr-4 font-medium">{c.customerName}</td>
                <td className="py-2.5 pr-4 text-right font-mono">{c.validated.jobCount}</td>
                <td className="py-2.5 pr-4 text-right font-mono">{fmtUsd(c.validated.totalRevenue)}</td>
                <td className={`py-2.5 pr-4 text-right font-mono ${c.validated.totalMargin < 0 ? "text-red-500" : ""}`}>{fmtUsd(c.validated.totalMargin)}</td>
                <td className={`py-2.5 pr-4 text-right font-mono ${c.validated.avgMarginPct < 0 ? "text-red-500" : ""}`}>{fmtPct(c.validated.avgMarginPct)} <TrendArrow direction={c.trend?.direction} /></td>
                <td className="py-2.5 pr-4 text-right"><ScorePill score={c.customerScore} /></td>
                <td className="py-2.5"><TierBadge tier={c.tier} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit && sorted.length > limit && !showAll && (
        <button onClick={() => setShowAll(true)} className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Show all {sorted.length} customers
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Job Table                                                          */
/* ------------------------------------------------------------------ */

function JobTable({ jobs }: { jobs: Job[] }) {
  const sorted = React.useMemo(() => [...jobs].sort((a, b) => (b.margin ?? -Infinity) - (a.margin ?? -Infinity)), [jobs])
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">{localizeActiveCopy("Job #")}</th>
            <th className="pb-2 pr-4 font-medium">{localizeActiveCopy("Type")}</th>
            <th className="pb-2 pr-4 font-medium">{localizeActiveCopy("Status")}</th>
            <th className="pb-2 pr-4 font-medium text-right">{localizeActiveCopy("Revenue")}</th>
            <th className="pb-2 pr-4 font-medium text-right">{localizeActiveCopy("Cost")}</th>
            <th className="pb-2 pr-4 font-medium text-right">{localizeActiveCopy("Margin")}</th>
            <th className="pb-2 font-medium text-right">{localizeActiveCopy("Margin %")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(j => (
            <tr key={j.jobNumber} className="border-b border-border/50">
              <td className="py-2.5 pr-4 font-mono">{j.jobNumber}</td>
              <td className="py-2.5 pr-4">{j.jobType}</td>
              <td className="py-2.5 pr-4">{j.jobStatus}</td>
              <td className="py-2.5 pr-4 text-right font-mono">{j.totalAmount != null ? fmtUsd(j.totalAmount) : "—"}</td>
              <td className="py-2.5 pr-4 text-right font-mono">{j.actualCost != null ? fmtUsd(j.actualCost) : "—"}</td>
              <td className={`py-2.5 pr-4 text-right font-mono ${j.margin != null && j.margin < 0 ? "text-red-500" : ""}`}>{j.margin != null ? fmtUsd(j.margin) : "—"}</td>
              <td className={`py-2.5 text-right font-mono ${j.marginPct != null && j.marginPct < 0 ? "text-red-500" : ""}`}>{j.marginPct != null ? fmtPct(j.marginPct) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Service Mix Bar                                                    */
/* ------------------------------------------------------------------ */

function ServiceMixBar({ mix }: { mix: Record<string, number> }) {
  const entries = React.useMemo(() => Object.entries(mix).sort((a, b) => b[1] - a[1]), [mix])
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex h-8 overflow-hidden rounded-lg">
        {entries.map(([type, count], i) => {
          const pct = (count / total) * 100
          if (pct < 2) return null
          return (
            <div key={type} className={`${jobTypeColors[i % jobTypeColors.length]} flex items-center justify-center text-[10px] font-medium text-white`}
              style={{ width: `${pct}%`, minWidth: 32 }} title={`${type}: ${count} jobs`}>
              <span className="truncate px-1">{type}</span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([type, count], i) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`inline-block h-2 w-2 rounded-full ${jobTypeColors[i % jobTypeColors.length]}`} />
            {type} <span className="font-mono">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Macro View                                                         */
/* ------------------------------------------------------------------ */

/* ---- modular app sections (macro view) --------------------------- */

function CustomerScoreDetail() {
  const { data } = useStore()
  return <ScoreDistribution customers={data.customers} />
}

function UntappedRevenueDetail() {
  const { data } = useStore()
  return <WhitespaceRollup customers={data.customers} />
}

function RegionalPerformanceDetail() {
  return <RegionGrid />
}

function CustomerPortfolioDetail() {
  const { data, drillToCustomer } = useStore()
  const { portfolioSummary, customers } = data
  const [activeTier, setActiveTier] = React.useState<string | null>(null)

  const filteredByTier = React.useMemo(
    () => activeTier ? customers.filter(c => c.tier === activeTier) : customers,
    [customers, activeTier]
  )

  const tierSummaries = React.useMemo(() => {
    const portfolioTotalMargin = customers.reduce((s, c) => s + c.validated.totalMargin, 0)
    return tiers.map(tier => {
      const group = customers.filter(c => c.tier === tier)
      const totalMargin = group.reduce((s, c) => s + c.validated.totalMargin, 0)
      const totalRevenue = group.reduce((s, c) => s + c.validated.totalRevenue, 0)
      const avgTicket = group.length > 0 ? group.reduce((s, c) => s + c.validated.avgTicket, 0) / group.length : 0
      const marginShare = portfolioTotalMargin > 0 ? totalMargin / portfolioTotalMargin : 0
      const jtCounts: Record<string, number> = {}
      for (const c of group) for (const [jt, n] of Object.entries(c.jobTypeMix)) jtCounts[jt] = (jtCounts[jt] || 0) + n
      const topJobTypes = Object.entries(jtCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([type]) => type)
      return { tier, count: group.length, totalMargin, totalRevenue, avgMarginPct: totalRevenue > 0 ? totalMargin / totalRevenue : 0, avgTicket, marginShare, topJobTypes }
    })
  }, [customers])

  return (
    <div className="space-y-6">
      <TierStrip tierCounts={portfolioSummary.tierCounts} onTierClick={tier => setActiveTier(prev => prev === tier ? null : tier)} activeTier={activeTier} />

      <div className="flex items-baseline gap-2 text-sm text-muted-foreground">
        <span>{localizeActiveCopy("Portfolio Margin")}</span>
        <span className="font-mono font-medium text-foreground">{fmtPct(portfolioSummary.validated.avgMarginPct)}</span>
        <TrendArrow direction={data.portfolioTrend?.direction} />
        <span className="text-xs font-mono">{portfolioSummary.validated.jobCount.toLocaleString(activeLocaleTag())} {localizeActiveCopy("validated jobs")}</span>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {tierSummaries.map(ts => (
          <Card key={ts.tier} className="px-4 py-3.5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${tierColor[ts.tier]}`} />
              <span className="text-sm font-semibold">{ts.tier}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{ts.count}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">{localizeActiveCopy("Margin Share")}</span><span className={`font-mono ${ts.marginShare < 0 ? "text-red-500" : ""}`}>{fmtPct(ts.marginShare)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{localizeActiveCopy("Gross Margin")}</span><span className={`font-mono ${ts.avgMarginPct < 0 ? "text-red-500" : ""}`}>{fmtPct(ts.avgMarginPct)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{localizeActiveCopy("Avg Ticket")}</span><span className="font-mono">{fmtUsd(ts.avgTicket)}</span></div>
              {ts.topJobTypes.length > 0 && <div className="pt-1 text-[11px] text-muted-foreground truncate">{ts.topJobTypes.join(", ")}</div>}
            </div>
          </Card>
        ))}
      </div>

      <CustomerTable customers={filteredByTier} onCustomerClick={drillToCustomer} limit={20} />
    </div>
  )
}

const CUSTOMER_MODULES: IntelModule[] = [
  {
    id: "customer-portfolio",
    title: "Customer Portfolio",
    icon: "Users",
    category: "customer",
    Detail: CustomerPortfolioDetail,
    summary: (data: ComputedData): ModuleSummary => {
      const c = data.customers
      const stars = c.filter(x => x.tier === "Stars").length
      const dogs = c.filter(x => x.tier === "Dogs").length
      return {
        headline: `${data.portfolioSummary.totalCustomers.toLocaleString(activeLocaleTag())} customers — ${stars} Stars anchor margin, ${dogs} Dogs need pricing or exit decisions.`,
        severity: dogs > 10 ? "high" : "medium",
        figures: [
          { label: "Customers", value: data.portfolioSummary.totalCustomers.toLocaleString(activeLocaleTag()), tone: "neutral" },
          { label: "Stars", value: stars.toString(), tone: "good" },
          { label: "Dogs", value: dogs.toString(), tone: dogs > 0 ? "bad" : "good" },
        ],
      }
    },
  },
  {
    id: "customer-score",
    title: "Customer Score (CI-04)",
    icon: "Gauge",
    category: "customer",
    Detail: CustomerScoreDetail,
    summary: (data: ComputedData): ModuleSummary => {
      const scored = data.customers.filter(x => x.customerScore)
      const avg = scored.length > 0 ? Math.round(scored.reduce((s, x) => s + x.customerScore!.score, 0) / scored.length) : 0
      return {
        headline: `Portfolio composite health is ${avg}/100 across ${scored.length.toLocaleString(activeLocaleTag())} scored customers.`,
        severity: avg < 50 ? "high" : avg < 65 ? "medium" : "info",
        figures: [
          { label: "Avg score", value: `${avg}/100`, tone: avg >= 65 ? "good" : "bad" },
          { label: "Scored", value: scored.length.toLocaleString(activeLocaleTag()), tone: "neutral" },
        ],
      }
    },
  },
  {
    id: "regional-performance",
    title: "Regional Performance",
    icon: "Map",
    category: "customer",
    Detail: RegionalPerformanceDetail,
    summary: (data: ComputedData): ModuleSummary => {
      const sorted = [...data.regions].sort((a, b) => b.validated.avgMarginPct - a.validated.avgMarginPct)
      const best = sorted[0]
      const worst = sorted[sorted.length - 1]
      const spread = best && worst ? ((best.validated.avgMarginPct - worst.validated.avgMarginPct) * 100).toFixed(1) : "0"
      return {
        headline: best && worst
          ? `${regionLabels[best.region] ?? best.region} leads at ${fmtPct(best.validated.avgMarginPct)}; ${regionLabels[worst.region] ?? worst.region} trails at ${fmtPct(worst.validated.avgMarginPct)} — a ${spread}pt margin spread.`
          : "Regional performance is uniform.",
        severity: Number(spread) > 8 ? "high" : "info",
        figures: [
          { label: "Regions", value: data.regions.length.toString(), tone: "neutral" },
          { label: "Margin spread", value: `${spread}pt`, tone: Number(spread) > 8 ? "bad" : "neutral" },
        ],
      }
    },
  },
  {
    id: "untapped-revenue",
    title: "Untapped Revenue by Account",
    icon: "TrendingUp",
    category: "customer",
    Detail: UntappedRevenueDetail,
    sendToLoop: { label: "Send to Action Centre" },
    summary: (data: ComputedData): ModuleSummary => {
      const rollup = buildTamRollup(data.customers)
      return {
        headline: `${fmtUsd(rollup.whitespace)} of untapped revenue across the portfolio — we hold ${(rollup.sharePct * 100).toFixed(0)}% of addressable spend today.`,
        severity: "info",
        figures: [
          { label: "Untapped", value: fmtUsd(rollup.whitespace), tone: "good" },
          { label: "Captured", value: `${(rollup.sharePct * 100).toFixed(0)}%`, tone: "neutral" },
        ],
      }
    },
  },
]

function MacroView() {
  const { data } = useStore()
  const brief = useExecutiveBrief(data, "macro", data.customers, null, null, null, null)

  return (
    <div className="space-y-6">
      <ExecutiveBrief computed={brief} />
      <IntelBoard modules={CUSTOMER_MODULES} boardId="customer-intel" title={localizeActiveCopy("Customer Intel Apps")} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Scoped Tier Breakdown (reused in Region + City drills)             */
/* ------------------------------------------------------------------ */

function useTierAnalysis(customers: CustomerAggregate[]) {
  return React.useMemo(() => {
    const tierCounts: Record<Tier, number> = { Stars: 0, "Cash Cows": 0, "Question Marks": 0, Dogs: 0 }
    for (const c of customers) tierCounts[c.tier]++
    const totalMargin = customers.reduce((s, c) => s + c.validated.totalMargin, 0)

    const summaries = tiers.map(tier => {
      const group = customers.filter(c => c.tier === tier)
      const margin = group.reduce((s, c) => s + c.validated.totalMargin, 0)
      const revenue = group.reduce((s, c) => s + c.validated.totalRevenue, 0)
      const avgTicket = group.length > 0 ? group.reduce((s, c) => s + c.validated.avgTicket, 0) / group.length : 0
      const marginShare = totalMargin > 0 ? margin / totalMargin : 0
      const jtCounts: Record<string, number> = {}
      for (const c of group) for (const [jt, n] of Object.entries(c.jobTypeMix)) jtCounts[jt] = (jtCounts[jt] || 0) + n
      const topJobTypes = Object.entries(jtCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([type]) => type)
      return { tier, count: group.length, totalMargin: margin, totalRevenue: revenue, avgMarginPct: revenue > 0 ? margin / revenue : 0, avgTicket, marginShare, topJobTypes }
    })
    return { tierCounts, summaries }
  }, [customers])
}

function ScopedTierBreakdown({ customers, activeTier, onTierClick }: {
  customers: CustomerAggregate[]
  activeTier: string | null
  onTierClick: (tier: string) => void
}) {
  const { tierCounts, summaries } = useTierAnalysis(customers)

  return (
    <div className="space-y-4">
      <TierStrip tierCounts={tierCounts} onTierClick={onTierClick} activeTier={activeTier} />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {summaries.map(ts => (
          <Card key={ts.tier} className={`px-4 py-3.5 transition-all ${activeTier === ts.tier ? "ring-1 ring-foreground/20" : ""}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${tierColor[ts.tier]}`} />
              <span className="text-sm font-semibold">{ts.tier}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{ts.count}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">{localizeActiveCopy("Margin Share")}</span><span className={`font-mono ${ts.marginShare < 0 ? "text-red-500" : ""}`}>{fmtPct(ts.marginShare)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{localizeActiveCopy("Gross Margin")}</span><span className={`font-mono ${ts.avgMarginPct < 0 ? "text-red-500" : ""}`}>{fmtPct(ts.avgMarginPct)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{localizeActiveCopy("Avg Ticket")}</span><span className="font-mono">{fmtUsd(ts.avgTicket)}</span></div>
              {ts.topJobTypes.length > 0 && <div className="pt-1 text-[11px] text-muted-foreground truncate">{ts.topJobTypes.join(", ")}</div>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Delta Indicator                                                    */
/* ------------------------------------------------------------------ */

function DeltaPill({ value, baseline, label }: { value: number; baseline: number; label: string }) {
  const delta = value - baseline
  const pts = (delta * 100).toFixed(1)
  const isPositive = delta > 0.005
  const isNegative = delta < -0.005
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono ${isPositive ? "text-emerald-600 dark:text-emerald-400" : isNegative ? "text-red-500" : "text-muted-foreground"}`}>
      {isPositive ? "+" : ""}{pts}pts {localizeActiveCopy(label)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  City Tier Mini-Bar                                                 */
/* ------------------------------------------------------------------ */

function CityTierBar({ customers }: { customers: CustomerAggregate[] }) {
  const counts: Record<Tier, number> = { Stars: 0, "Cash Cows": 0, "Question Marks": 0, Dogs: 0 }
  for (const c of customers) counts[c.tier]++
  const total = customers.length
  if (total === 0) return null
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full">
      {tiers.map(tier => {
        const pct = (counts[tier] / total) * 100
        if (pct === 0) return null
        return <div key={tier} className={`${tierColor[tier]}`} style={{ width: `${pct}%` }} />
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero City Cards (top 3 by revenue)                                 */
/* ------------------------------------------------------------------ */

function HeroCityCards({ cities, regionMargin, portfolioMargin, onCityClick, allCustomers }: {
  cities: CityAggregate[]
  regionMargin: number
  portfolioMargin: number
  onCityClick: (city: string) => void
  allCustomers: CustomerAggregate[]
}) {
  const top3 = cities.slice(0, 3)
  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
      {top3.map(c => {
        const cityCustomers = allCustomers.filter(cust => cust.jobs.some(j => j.city === c.city))
        return (
          <Card key={c.city} onClick={() => onCityClick(c.city)}
            className="cursor-pointer px-4 py-4 transition-all hover:shadow-md border-l-2 border-l-transparent hover:border-l-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">{c.city}</h4>
              <span className="text-[10px] text-muted-foreground font-mono">{c.jobCount} {localizeActiveCopy("jobs")}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
              <div><span className="text-muted-foreground">{localizeActiveCopy("Revenue")}</span><span className="ml-1.5 font-mono">{fmtUsd(c.totalRevenue)}</span></div>
              <div><span className="text-muted-foreground">{localizeActiveCopy("Customers")}</span><span className="ml-1.5 font-mono">{c.customerCount}</span></div>
              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground">{localizeActiveCopy("Margin")}</span>
                <span className={`font-mono ${c.avgMarginPct < 0 ? "text-red-500" : ""}`}>{fmtPct(c.avgMarginPct)}</span>
              </div>
              <div><span className="text-muted-foreground">{localizeActiveCopy("Avg Ticket")}</span><span className="ml-1.5 font-mono">{fmtUsd(c.avgTicket)}</span></div>
            </div>
            <div className="space-y-1.5">
              <CityTierBar customers={cityCustomers} />
              <div className="flex gap-3">
                <DeltaPill value={c.avgMarginPct} baseline={regionMargin} label={localizeActiveCopy("vs region")} />
                <DeltaPill value={c.avgMarginPct} baseline={portfolioMargin} label={localizeActiveCopy("vs portfolio")} />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  City Table (remaining cities beyond top 3)                         */
/* ------------------------------------------------------------------ */

function CityTable({ cities, regionMargin, onCityClick }: {
  cities: CityAggregate[]
  regionMargin: number
  onCityClick: (city: string) => void
}) {
  const [sortKey, setSortKey] = React.useState<"revenue" | "margin" | "jobs">("revenue")
  const { flashKey, flash } = useRowFlash()
  const sorted = React.useMemo(() => {
    const copy = [...cities]
    if (sortKey === "margin") return copy.sort((a, b) => b.avgMarginPct - a.avgMarginPct)
    if (sortKey === "jobs") return copy.sort((a, b) => b.jobCount - a.jobCount)
    return copy.sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [cities, sortKey])

  if (sorted.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("All Cities")}</h3>
        <div className="flex gap-1 ml-auto">
          {(["revenue", "margin", "jobs"] as const).map(key => (
            <button key={key} onClick={() => setSortKey(key)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${sortKey === key ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {key === "revenue" ? "Revenue" : key === "margin" ? "Margin" : "Jobs"}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">{localizeActiveCopy("City")}</th>
              <th className="pb-2 pr-4 font-medium text-right">{localizeActiveCopy("Jobs")}</th>
              <th className="pb-2 pr-4 font-medium text-right">{localizeActiveCopy("Revenue")}</th>
              <th className="pb-2 pr-4 font-medium text-right">{localizeActiveCopy("Margin %")}</th>
              <th className="pb-2 pr-4 font-medium text-right">{localizeActiveCopy("vs Region")}</th>
              <th className="pb-2 font-medium text-right">{localizeActiveCopy("Customers")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => {
              const delta = c.avgMarginPct - regionMargin
              return (
                <tr
                  key={c.city}
                  onClick={() => flash(c.city, () => onCityClick(c.city))}
                  className={cn(
                    "border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/40",
                    flashKey === c.city && highlightFlashClass,
                  )}
                >
                  <td className="py-2 pr-4 font-medium">{c.city}</td>
                  <td className="py-2 pr-4 text-right font-mono">{c.jobCount}</td>
                  <td className="py-2 pr-4 text-right font-mono">{fmtUsd(c.totalRevenue)}</td>
                  <td className={`py-2 pr-4 text-right font-mono ${c.avgMarginPct < 0 ? "text-red-500" : ""}`}>{fmtPct(c.avgMarginPct)}</td>
                  <td className={`py-2 pr-4 text-right font-mono text-xs ${delta >0.005 ? "text-emerald-600 dark:text-emerald-400" : delta< -0.005 ? "text-red-500" : "text-muted-foreground"}`}>
                    {delta > 0.005 ? "+" : ""}{(delta * 100).toFixed(1)}pts
                  </td>
                  <td className="py-2 text-right font-mono">{c.customerCount}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Region Drill View — Concept C                                      */
/* ------------------------------------------------------------------ */

function RegionDrillView() {
  const { data, selectedRegion, filteredRegion, filteredCustomers, drillToCustomer, drillToCity, drillBack } = useStore()
  const shouldFallback = !selectedRegion || !filteredRegion
  React.useEffect(() => { if (shouldFallback) drillBack() }, [shouldFallback, drillBack])
  if (shouldFallback) return null
  const label = regionLabels[selectedRegion] ?? selectedRegion
  const portfolioMargin = data.portfolioSummary.validated.avgMarginPct
  const regionMargin = filteredRegion.validated.avgMarginPct
  const marginDelta = regionMargin - portfolioMargin

  const brief = useExecutiveBrief(data, "region", filteredCustomers, filteredRegion, null, selectedRegion, null)

  const [activeTier, setActiveTier] = React.useState<string | null>(null)
  const filteredByTier = React.useMemo(
    () => activeTier ? filteredCustomers.filter(c => c.tier === activeTier) : filteredCustomers,
    [filteredCustomers, activeTier]
  )

  const heroCities = filteredRegion.cities.slice(0, 3)
  const tailCities = filteredRegion.cities.slice(3)

  return (
    <div className="space-y-8">
      <BackButton onClick={drillBack} />

      <ExecutiveBrief computed={brief} />

      <div className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold">{localizeActiveCopy(label)}</h2>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{selectedRegion}</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <MetricPill label={localizeActiveCopy("Jobs")} value={filteredRegion.validated.jobCount.toLocaleString(activeLocaleTag())} />
          <MetricPill label={localizeActiveCopy("Revenue")} value={fmtUsd(filteredRegion.validated.totalRevenue)} />
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Margin %")}</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-medium">{fmtPct(regionMargin)} <TrendArrow direction={filteredRegion.trend?.direction} /></span>
              <span className={`text-[10px] font-mono ${marginDelta >0.005 ? "text-emerald-600 dark:text-emerald-400" : marginDelta< -0.005 ? "text-red-500" : "text-muted-foreground"}`}>
                {marginDelta > 0 ? "+" : ""}{(marginDelta * 100).toFixed(1)}pts vs portfolio
              </span>
            </div>
          </div>
          <MetricPill label={localizeActiveCopy("Avg Ticket")} value={fmtUsd(filteredRegion.validated.avgTicket)} />
          <MetricPill label={localizeActiveCopy("Customers")} value={filteredRegion.customerCount.toLocaleString(activeLocaleTag())} />
        </div>
      </div>

      <ScopedTierBreakdown
        customers={filteredCustomers}
        activeTier={activeTier}
        onTierClick={tier => setActiveTier(prev => prev === tier ? null : tier)}
      />

      {heroCities.length > 0 && (
        <>
          <Separator />
          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Top Markets")}</h3>
            <HeroCityCards
              cities={heroCities}
              regionMargin={regionMargin}
              portfolioMargin={portfolioMargin}
              onCityClick={drillToCity}
              allCustomers={filteredCustomers}
            />
          </section>
        </>
      )}

      {tailCities.length > 0 && (
        <>
          <Separator />
          <CityTable cities={tailCities} regionMargin={regionMargin} onCityClick={drillToCity} />
        </>
      )}

      <Separator />
      <section className="space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy(label)} · {localizeActiveCopy("Customers")}</h3>
        <CustomerTable customers={filteredByTier} onCustomerClick={drillToCustomer} limit={20} />
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  City Drill View — with Tier Breakdown                              */
/* ------------------------------------------------------------------ */

function CityDrillView() {
  const { data, selectedCity, selectedRegion, filteredCity, filteredRegion, filteredCityCustomers, drillToCustomer, drillBack } = useStore()
  const shouldFallback = !selectedCity || !filteredCity
  React.useEffect(() => { if (shouldFallback) drillBack() }, [shouldFallback, drillBack])
  if (shouldFallback) return null
  const regionLabel = selectedRegion ? (regionLabels[selectedRegion] ?? selectedRegion) : ""
  const portfolioMargin = data.portfolioSummary.validated.avgMarginPct
  const regionMargin = filteredRegion?.validated.avgMarginPct ?? portfolioMargin
  const cityMargin = filteredCity.avgMarginPct

  const brief = useExecutiveBrief(data, "city", filteredCityCustomers, filteredRegion, filteredCity, selectedRegion, selectedCity)

  const [activeTier, setActiveTier] = React.useState<string | null>(null)
  const filteredByTier = React.useMemo(
    () => activeTier ? filteredCityCustomers.filter(c => c.tier === activeTier) : filteredCityCustomers,
    [filteredCityCustomers, activeTier]
  )

  return (
    <div className="space-y-8">
      <BackButton onClick={drillBack} />

      <ExecutiveBrief computed={brief} />

      <div className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold">{selectedCity}</h2>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{regionLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <MetricPill label={localizeActiveCopy("Jobs")} value={filteredCity.jobCount.toLocaleString(activeLocaleTag())} />
          <MetricPill label={localizeActiveCopy("Revenue")} value={fmtUsd(filteredCity.totalRevenue)} />
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Margin %")}</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-medium">{fmtPct(cityMargin)}</span>
              <DeltaPill value={cityMargin} baseline={regionMargin} label={localizeActiveCopy("vs region")} />
              <DeltaPill value={cityMargin} baseline={portfolioMargin} label={localizeActiveCopy("vs portfolio")} />
            </div>
          </div>
          <MetricPill label={localizeActiveCopy("Avg Ticket")} value={fmtUsd(filteredCity.avgTicket)} />
          <MetricPill label={localizeActiveCopy("Customers")} value={filteredCity.customerCount.toLocaleString(activeLocaleTag())} />
        </div>
      </div>

      {filteredCityCustomers.length > 0 && (
        <ScopedTierBreakdown
          customers={filteredCityCustomers}
          activeTier={activeTier}
          onTierClick={tier => setActiveTier(prev => prev === tier ? null : tier)}
        />
      )}

      <Separator />
      <section className="space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{selectedCity} · {localizeActiveCopy("Customers")}</h3>
        <CustomerTable customers={filteredByTier} onCustomerClick={drillToCustomer} />
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Customer Score Breakdown (CI-04 factor decomposition)              */
/* ------------------------------------------------------------------ */

function ScoreBreakdown({ score }: { score: CustomerScore }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Customer Score (CI-04)")}</h3>
        <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">{localizeActiveCopy(score.businessType)} · {localizeActiveCopy("profile")}</span>
      </div>
      <Card><CardContent className="p-4">
        <div className="flex items-start gap-5">
          <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-muted/40 px-5 py-3">
            <span className={`font-mono text-3xl font-bold leading-none ${gradeText}`}>{score.score}</span>
            <span className={`mt-1 text-xs font-semibold ${gradeText}`}>{localizeActiveCopy("Grade")} {score.grade}</span>
            <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("of 100")}</span>
          </div>
          <div className="flex-1 space-y-2.5">
            {score.factors.map(f => (
              <div key={f.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold text-foreground">{f.key}</span>
                    <span className="text-muted-foreground">{localizeActiveCopy(f.label)}</span>
                    <span className="text-[10px] text-muted-foreground/50">×{f.weight.toFixed(2)}</span>
                    {f.mocked && (
                      <span className="rounded-sm bg-amber-500/15 px-1 py-0.5 text-[8px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400" title={localizeActiveCopy("Relies on assumed / missing-data fallback (weighting held at x1 per spec)")}>{localizeActiveCopy("assumed")}</span>
                    )}
                  </span>
                  <span className="font-mono text-muted-foreground">+{Math.round(f.weighted * 100)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                  <div className={`h-full rounded-full ${f.mocked ? "bg-amber-400/60" : "bg-indigo-500"}`} style={{ width: `${Math.round(f.normalized * 100)}%` }} />
                </div>
                <p className="text-[10px] leading-snug text-muted-foreground/80">{localizeActiveCopy(f.detail)}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 border-t border-border/30 pt-2 text-[10px] leading-snug text-muted-foreground/60">
          CS = [0.30(M) + 0.20(R) + 0.20(S) + 0.15(P) + 0.15(A)] × 100. Runs alongside BCG tiering; factors without source data hold their weighting at ×1 per the CI-04 spec.
        </p>
      </CardContent></Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Customer TAM / Whitespace                                          */
/* ------------------------------------------------------------------ */

const confColor: Record<Confidence, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-muted-foreground",
}

const intelSourceStyle: Record<IntelSignal["source"], { label: string; cls: string }> = {
  recon: { label: "RECON", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  osint: { label: "OSINT", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
  permit: { label: "PERMIT", cls: "bg-teal-500/15 text-teal-700 dark:text-teal-400" },
}

function WhitespaceLineBar({ line, max }: { line: ServiceLinePotential; max: number }) {
  const capturedPct = max > 0 ? (line.capturedAnnual / max) * 100 : 0
  const whitespacePct = max > 0 ? (line.whitespace / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">{line.line}</span>
          {!line.penetrated && (
            <span className="rounded-sm bg-muted px-1 py-0.5 text-[8px] font-medium uppercase tracking-wide text-muted-foreground">{localizeActiveCopy("untapped")}</span>
          )}
        </span>
        <span className="font-mono text-muted-foreground">
          {fmtUsd(line.capturedAnnual)}<span className="text-muted-foreground/40"> / {fmtUsd(line.potentialAnnual)}</span>
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted/40">
        <div className="h-full bg-blue-500" style={{ width: `${capturedPct}%` }} title={`Captured ${fmtUsd(line.capturedAnnual)}`} />
        <div className="h-full bg-amber-400/50" style={{ width: `${whitespacePct}%` }} title={`Whitespace ${fmtUsd(line.whitespace)}`} />
      </div>
    </div>
  )
}

function WhitespaceSection({ tam }: { tam: CustomerTam }) {
  const max = Math.max(...tam.lines.map(l => l.potentialAnnual), 1)
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Account Expansion — Untapped Revenue")}</h3>
        <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">{localizeActiveCopy(tam.businessType)} · {localizeActiveCopy("opportunity")}</span>
      </div>
      <Card><CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap gap-5">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Addressable")}</span>
            <span className="font-mono text-sm font-semibold">{fmtUsd(tam.totalAddressable)}<span className="text-[10px] font-normal text-muted-foreground">{localizeActiveCopy("/yr")}</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Current Wallet")}</span>
            <span className="font-mono text-sm font-semibold">{fmtUsd(tam.currentWallet)}<span className="text-[10px] font-normal text-muted-foreground">{localizeActiveCopy("/yr")}</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Untapped Revenue")}</span>
            <span className="font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">{fmtUsd(tam.whitespace)}<span className="text-[10px] font-normal text-muted-foreground">{localizeActiveCopy("/yr")}</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Wallet Share")}</span>
            <span className="font-mono text-sm font-semibold">{(tam.sharePct * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border/30 pt-3">
          {tam.lines.map(l => <WhitespaceLineBar key={l.line} line={l} max={max} />)}
          <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground/70">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-blue-500" />{localizeActiveCopy("Captured")}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-400/50" />{localizeActiveCopy("Untapped")}</span>
          </div>
        </div>

        {tam.intelPackage.length > 0 && (
          <div className="space-y-2 border-t border-border/30 pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">{localizeActiveCopy("Intelligence Package")}</p>
            <div className="space-y-1.5">
              {tam.intelPackage.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] leading-snug">
                  <span className={`mt-0.5 shrink-0 rounded-sm px-1 py-0.5 text-[8px] font-semibold tracking-wide ${intelSourceStyle[s.source].cls}`}>{intelSourceStyle[s.source].label}</span>
                  <span className="flex-1">
                    <span className="font-medium text-foreground">{localizeActiveCopy(s.label)}.</span>{" "}
                    <span className="text-muted-foreground">{localizeActiveCopy(s.detail)}</span>
                  </span>
                  <span className={`shrink-0 text-[9px] uppercase ${confColor[s.confidence]}`} title={localizeActiveCopy("Signal confidence")}>{s.confidence}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tam.recommendedActions.length > 0 && (
          <div className="space-y-2 border-t border-border/30 pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">{localizeActiveCopy("Recommended Actions")}</p>
            <div className="space-y-2">
              {tam.recommendedActions.map((p, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
                  <div className="flex-1 space-y-0.5">
                    <p className="text-xs font-medium text-foreground">{p.action}</p>
                    <p className="text-[10px] leading-snug text-muted-foreground">{p.how}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">+{fmtUsd(p.expectedAnnual)}/{localizeActiveCopy("yr")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="border-t border-border/30 pt-2 text-[10px] leading-snug text-muted-foreground/60">
          Recon + OSINT signals are simulated intelligence packages (each tagged by source + confidence). Untapped revenue = the share of this account&apos;s addressable spend we don&apos;t yet hold.
        </p>
      </CardContent></Card>
    </section>
  )
}

function WhitespaceRollup({ customers }: { customers: CustomerAggregate[] }) {
  const rollup = React.useMemo(() => buildTamRollup(customers), [customers])
  if (rollup.totalAddressable <= 0) return null
  const capturedPct = rollup.totalAddressable > 0 ? (rollup.currentWallet / rollup.totalAddressable) * 100 : 0
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Untapped Revenue by Account")}</h3>
      <Card><CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Addressable")}</span>
            <span className="font-mono text-base font-semibold">{fmtUsd(rollup.totalAddressable)}<span className="text-[10px] font-normal text-muted-foreground">{localizeActiveCopy("/yr")}</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Captured")}</span>
            <span className="font-mono text-base font-semibold">{(rollup.sharePct * 100).toFixed(0)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Untapped Revenue")}</span>
            <span className="font-mono text-base font-semibold text-teal-600 dark:text-teal-400">{fmtUsd(rollup.whitespace)}<span className="text-[10px] font-normal text-muted-foreground">{localizeActiveCopy("/yr")}</span></span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/40">
            <div className="h-full bg-zinc-400 dark:bg-zinc-600" style={{ width: `${capturedPct}%` }} />
            <div className="h-full bg-teal-500" style={{ width: `${100 - capturedPct}%` }} />
          </div>
          <div className="flex gap-x-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />{localizeActiveCopy("Captured wallet")}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-teal-500" />{localizeActiveCopy("Expansion opportunity")}</span>
          </div>
        </div>
        <div className="space-y-1.5 border-t border-border/30 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">{localizeActiveCopy("Top Expansion Targets")}</p>
          {rollup.topWhitespaceCustomers.slice(0, 5).map(t => (
            <div key={t.customerName} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 truncate">
                <span className="truncate font-medium text-foreground">{t.customerName}</span>
                <span className="text-[10px] text-muted-foreground/60">{t.businessType}</span>
              </span>
              <span className="shrink-0 font-mono text-teal-600 dark:text-teal-400">+{fmtUsd(t.whitespace)}/{localizeActiveCopy("yr")}</span>
            </div>
          ))}
        </div>
      </CardContent></Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Customer Drill View                                                */
/* ------------------------------------------------------------------ */

function CustomerDrillView() {
  const { selectedCustomerData, drillBack } = useStore()
  if (!selectedCustomerData) return null
  const c = selectedCustomerData
  const regionKeys = Object.keys(c.regionDistribution).filter(r => c.regionDistribution[r as keyof typeof c.regionDistribution] > 0)
  const isMultiRegion = regionKeys.length > 1

  const regionMargins = React.useMemo(() => {
    if (!isMultiRegion) return []
    const byRegion = new Map<string, { revenue: number; cost: number }>()
    for (const j of c.jobs) {
      const entry = byRegion.get(j.region) ?? { revenue: 0, cost: 0 }
      entry.revenue += j.totalAmount ?? 0
      entry.cost += j.actualCost ?? 0
      byRegion.set(j.region, entry)
    }
    return [...byRegion.entries()]
      .map(([region, { revenue, cost }]) => ({
        region,
        label: regionLabels[region as keyof typeof regionLabels] ?? region,
        margin: revenue - cost,
        marginPct: revenue > 0 ? (revenue - cost) / revenue : 0,
        jobs: c.regionDistribution[region as keyof typeof c.regionDistribution] ?? 0,
      }))
      .sort((a, b) => b.margin - a.margin)
  }, [c, isMultiRegion])

  return (
    <div className="space-y-8">
      <BackButton onClick={drillBack} />
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{c.customerName}</h2>
          <TierBadge tier={c.tier} />
        </div>
        <div className="flex flex-wrap gap-6">
          <MetricPill label={localizeActiveCopy("Jobs")} value={c.validated.jobCount.toLocaleString(activeLocaleTag())} />
          <MetricPill label={localizeActiveCopy("Revenue")} value={fmtUsd(c.validated.totalRevenue)} />
          <MetricPill label={localizeActiveCopy("Margin")} value={fmtUsd(c.validated.totalMargin)} />
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Margin %")}</span>
            <span className="font-mono text-sm font-medium">{fmtPct(c.validated.avgMarginPct)} <TrendArrow direction={c.trend?.direction} /></span>
          </div>
          <MetricPill label={localizeActiveCopy("Avg Ticket")} value={fmtUsd(c.validated.avgTicket)} />
          <MetricPill label={localizeActiveCopy("Negative Jobs")} value={c.negativeMarginJobCount.toLocaleString(activeLocaleTag())} />
        </div>
      </div>

      <Separator />

      {c.customerScore && <ScoreBreakdown score={c.customerScore} />}

      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Service Mix")}</h3>
        <ServiceMixBar mix={c.jobTypeMix} />
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Property Types")}</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(c.propertyTypeMix).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <Badge key={type} variant="secondary" className="text-xs font-normal">
              {type}<span className="ml-1.5 font-mono text-muted-foreground">{count}</span>
            </Badge>
          ))}
        </div>
      </section>

      {c.customerTam && (
        <>
          <Separator />
          <WhitespaceSection tam={c.customerTam} />
        </>
      )}

      {isMultiRegion && (
        <>
          <Separator />
          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Regional Variance")}</h3>
            <Card><CardContent className="p-4">
              <div className="space-y-3">
                {regionMargins.map(rm => (
                  <div key={rm.region} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{localizeActiveCopy(rm.label)}</span>
                      <span className="text-xs text-muted-foreground font-mono">{rm.jobs} {localizeActiveCopy("jobs")}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-mono ${rm.margin < 0 ? "text-red-500" : ""}`}>{fmtUsd(rm.margin)}</span>
                      <span className={`font-mono text-xs ${rm.marginPct < 0 ? "text-red-500" : "text-muted-foreground"}`}>{fmtPct(rm.marginPct)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </section>
        </>
      )}

      <Separator />

      <section className="space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Jobs")}</h3>
        <JobTable jobs={c.jobs} />
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Root                                                          */
/* ------------------------------------------------------------------ */

export function CustomerIntelPage() {
  const { drillLevel } = useStore()

  return (
    <div className="space-y-8">
      {drillLevel === "macro" && <MacroView />}
      {drillLevel === "region" && <RegionDrillView />}
      {drillLevel === "city" && <CityDrillView />}
      {(drillLevel === "customer" || drillLevel === "job") && <CustomerDrillView />}
    </div>
  )
}
