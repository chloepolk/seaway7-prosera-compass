"use client"

import { activeLocaleTag, formatActivePercent, formatActiveUsd, localizeActiveCopy } from "../_i18n/legacy"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/prosera/card"
import { Badge } from "@/components/ui/prosera/badge"
import { Separator } from "@/components/ui/prosera/separator"
import { useStore } from "../_store"
import { regionLabels } from "../data/_regions"
import type { PriceBand, ComputedData } from "../data/_transform"
import { FuelIntegritySection } from "./fuel-integrity"
import { WeatherStripaPanel } from "../_components/weather-stripa"
import { BluePilotSummary, BluePilotSkeleton } from "../_components/bluepilot-summary"
import { IntelBoard } from "../_components/intel-board"
import { SpecRenderer, summarizeSpec } from "../_components/spec-renderer"
import type { IntelModule, ModuleSummary } from "../_modules/types"
import { buildWeatherIntelligence, reconcileAlerts } from "../data/_weather_demand"
import { getUrgencyAlerts } from "../data/_weather"
import type { SavedScenario } from "../_sandbox/types"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts"

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

function fmtUsd(n: number): string {
  return formatActiveUsd(n)
}

function fmtPct(n: number): string {
  return formatActivePercent(n)
}

/* ------------------------------------------------------------------ */
/*  Win Rate Gradient                                                  */
/* ------------------------------------------------------------------ */

function WinRateGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
        <stop offset="40%" stopColor="#eab308" stopOpacity={0.4} />
        <stop offset="60%" stopColor="#22c55e" stopOpacity={0.5} />
        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.7} />
      </linearGradient>
    </defs>
  )
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip for Price Band Chart                                */
/* ------------------------------------------------------------------ */

interface BandDataPoint {
  label: string
  winRate: number
  quotes: number
  wins: number
  losses: number
  pending: number
  zone: "sweet-spot" | "caution" | "above-ceiling"
  totalAllQuotes: number
}

function PriceBandTooltip({ active, payload }: { active?: boolean; payload?: { payload: BandDataPoint }[] }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload

  const zoneLabel = d.zone === "sweet-spot" ? "Sweet Spot" : d.zone === "above-ceiling" ? "Above Ceiling" : "Caution Zone"
  const zoneColor = d.zone === "sweet-spot" ? "#22c55e" : d.zone === "above-ceiling" ? "#ef4444" : "#eab308"
  const winColor = d.winRate >= 60 ? "#22c55e" : d.winRate >= 40 ? "#eab308" : "#ef4444"

  return (
    <div style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", minWidth: 180 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, fontSize: 13 }}>{localizeActiveCopy(d.label)}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, color: zoneColor, background: `${zoneColor}15`, padding: "2px 6px", borderRadius: 4 }}>
          <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: zoneColor }} />
          {zoneLabel}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: winColor, flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: 18, color: winColor }}>{d.winRate}%</span>
        <span style={{ color: "var(--color-muted-foreground)", fontSize: 11 }}>{localizeActiveCopy("win rate")}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 6 }}>
        <div style={{ textAlign: "center", padding: "3px 0" }}>
          <div style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, color: "#22c55e" }}>{d.wins}</div>
          <div style={{ fontSize: 9, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{localizeActiveCopy("Won")}</div>
        </div>
        <div style={{ textAlign: "center", padding: "3px 0" }}>
          <div style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, color: "#ef4444" }}>{d.losses}</div>
          <div style={{ fontSize: 9, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{localizeActiveCopy("Lost")}</div>
        </div>
        <div style={{ textAlign: "center", padding: "3px 0" }}>
          <div style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600, color: "var(--color-muted-foreground)" }}>{d.pending}</div>
          <div style={{ fontSize: 9, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{localizeActiveCopy("Pending")}</div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 5, fontSize: 10, color: "var(--color-muted-foreground)" }}>
        {d.quotes} of {d.totalAllQuotes} total quotes in this band
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Win Rate Chart                                                     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Zone Ruler — horizontal bar above chart showing lateral limits      */
/* ------------------------------------------------------------------ */

function ZoneRuler({ bands, sweetSpot, ceilingAmount }: { bands: PriceBand[]; sweetSpot: { min: number; max: number } | null; ceilingAmount: number | null }) {
  if (bands.length === 0) return null

  const zones: { zone: "sweet-spot" | "caution" | "above-ceiling"; span: number }[] = []
  for (const b of bands) {
    let z: "sweet-spot" | "caution" | "above-ceiling" = "caution"
    if (sweetSpot && b.min >= sweetSpot.min && b.max<= sweetSpot.max) z = "sweet-spot"
    if (ceilingAmount && b.min >= ceilingAmount) z = "above-ceiling"
    const last = zones[zones.length - 1]
    if (last && last.zone === z) {
      last.span++
    } else {
      zones.push({ zone: z, span: 1 })
    }
  }

  const zoneColor = { "sweet-spot": "#22c55e", caution: "#eab308", "above-ceiling": "#ef4444" }
  const zoneBg = { "sweet-spot": "rgba(34,197,94,0.18)", caution: "rgba(234,179,8,0.12)", "above-ceiling": "rgba(239,68,68,0.15)" }
  const zoneLabel = { "sweet-spot": "Sweet Spot", caution: "", "above-ceiling": "Ceiling" }

  return (
    <div className="flex w-full gap-px rounded-md overflow-hidden mb-1.5" style={{ height: 10, marginLeft: 28, marginRight: 12 }}>
      {zones.map((seg, i) => (
        <div
          key={i}
          className="relative flex items-center justify-center transition-all"
          style={{
            flex: seg.span,
            background: zoneBg[seg.zone],
            borderBottom: `2px solid ${zoneColor[seg.zone]}`,
          }}
          title={seg.zone === "sweet-spot" ? "Sweet Spot" : seg.zone === "above-ceiling" ? "Above Ceiling" : "Caution Zone"}
        >
          {zoneLabel[seg.zone] && seg.span >= 2 && (
            <span style={{ fontSize: 7, fontWeight: 700, color: zoneColor[seg.zone], textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
              {zoneLabel[seg.zone]}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Win Rate Chart                                                     */
/* ------------------------------------------------------------------ */

function WinRateChart({ bands, ceilingAmount, sweetSpot, jobType }: { bands: PriceBand[]; ceilingAmount: number | null; sweetSpot: { min: number; max: number } | null; jobType: string }) {
  const gradientId = `wr-grad-${jobType.replace(/\s+/g, "-")}`

  const ceilingBandLabel = ceilingAmount
    ? bands.find(b =>b.min<= ceilingAmount && b.max > ceilingAmount)?.label ?? bands.find(b => b.min === ceilingAmount)?.label
    : null

  const sweetSpotStartLabel = sweetSpot ? bands.find(b => b.min >= sweetSpot.min && b.min<= sweetSpot.max)?.label : null
  const sweetSpotEndLabel = sweetSpot ? [...bands].reverse().find(b => b.min >= sweetSpot.min && b.min<= sweetSpot.max)?.label ?? sweetSpotStartLabel : null
  const lastBandLabel = bands.length > 0 ? bands[bands.length - 1].label : null

  const totalAllQuotes = bands.reduce((s, b) => s + b.totalQuotes, 0)

  const chartData: BandDataPoint[] = bands.map(b => {
    let zone: BandDataPoint["zone"] = "caution"
    if (sweetSpot && b.min >= sweetSpot.min && b.max<= sweetSpot.max) zone = "sweet-spot"
    if (ceilingAmount && b.min >= ceilingAmount) zone = "above-ceiling"
    return {
      label: b.label,
      winRate: Math.round(b.winRate * 100),
      quotes: b.totalQuotes,
      wins: b.wins,
      losses: b.losses,
      pending: b.pending,
      zone,
      totalAllQuotes,
    }
  })

  return (
    <div>
      <ZoneRuler bands={bands} sweetSpot={sweetSpot} ceilingAmount={ceilingAmount} />
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 12, left: -20, bottom: 30 }}>
          <WinRateGradient id={gradientId} />

          {sweetSpotStartLabel && sweetSpotEndLabel && (
            <ReferenceArea x1={sweetSpotStartLabel} x2={sweetSpotEndLabel} fill="#22c55e" fillOpacity={0.07} />
          )}
          {ceilingBandLabel && lastBandLabel && (
            <ReferenceArea x1={ceilingBandLabel} x2={lastBandLabel} fill="#ef4444" fillOpacity={0.06} />
          )}

          {/* Vertical boundary lines — sweet spot left/right edges */}
          {sweetSpotStartLabel && (
            <ReferenceLine x={sweetSpotStartLabel} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="6 3" label={{ value: "▸", position: "top", fontSize: 10, fill: "#22c55e" }} />
          )}
          {sweetSpotEndLabel && sweetSpotEndLabel !== sweetSpotStartLabel && (
            <ReferenceLine x={sweetSpotEndLabel} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="6 3" label={{ value: "◂", position: "top", fontSize: 10, fill: "#22c55e" }} />
          )}

          {/* Ceiling vertical line */}
          {ceilingBandLabel && (
            <ReferenceLine x={ceilingBandLabel} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" label={{ value: "Ceiling", position: "top", fontSize: 9, fill: "#ef4444", fontWeight: 600 }} />
          )}

          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip content={<PriceBandTooltip />} cursor={{ stroke: "var(--color-border)", strokeDasharray: "3 3" }} />
          <Area type="monotone" dataKey="winRate" stroke="#3b82f6" strokeWidth={2} fill={`url(#${gradientId})`} activeDot={{ r: 5, strokeWidth: 2, fill: "white", stroke: "#3b82f6" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Risk Dot                                                           */
/* ------------------------------------------------------------------ */

function RiskDot({ score }: { score: number }) {
  const color = score >= 3 ? "bg-red-500" : score >= 1 ? "bg-amber-500" : "bg-emerald-500"
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
}

/* ------------------------------------------------------------------ */
/*  Win Rate Bar                                                       */
/* ------------------------------------------------------------------ */

function WinRateBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100)
  const color = rate >= 0.6 ? "bg-emerald-500" : rate >= 0.4 ? "bg-amber-400" : "bg-red-400"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  BP Headline                                                        */
/* ------------------------------------------------------------------ */

function HeadlineSkeleton() {
  const { agentPhase } = useStore()
  const phaseText = agentPhase === "orchestrating" || agentPhase === "verifying"
    ? "Synthesizing findings…"
    : "BluePilot is analyzing…"

  return <BluePilotSkeleton label={phaseText} />
}

function BPHeadline({ title, narrative, severity }: { title: string; narrative: string; severity?: string }) {
  const { bpHeadline, isAgentLoading, useStaticFallback, bpReasoning } = useStore()

  if (isAgentLoading) return <HeadlineSkeleton />

  const displayTitle = useStaticFallback ? title : (bpHeadline?.title ?? title)
  const displayNarrative = useStaticFallback ? narrative : (bpHeadline?.narrative ?? narrative)
  const displaySeverity = useStaticFallback ? severity : (bpHeadline?.severity ?? severity)

  return (
    <BluePilotSummary
      headline={displayTitle}
      sentences={[displayNarrative]}
      severity={displaySeverity}
      eyebrow="Pricing Intelligence"
      reasoning={
        useStaticFallback
          ? {
              summary: "Computed from quote outcomes, dynamic price bands, and win-rate curves by job type.",
              steps: [
                "Grouped quotes by job type and price band",
                "Identified ceiling bands where win rate drops below 40%",
                "Scored pending quotes by ceiling, NTE, and age risk",
              ],
            }
          : bpReasoning.length > 0
            ? { summary: "BluePilot pricing analysis chain.", steps: bpReasoning.map((s) => s.text) }
            : undefined
      }
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Macro View                                                         */
/* ------------------------------------------------------------------ */

function PricingBandInsightCard({ insight }: { insight: { jobType: string; sweetSpotWinRate: number; aboveCeilingWinRate: number; winRateDropPts: number; pendingAboveCeiling: number; expectedLossAboveCeiling: number; repricingOpportunityValue: number; recommendation: string; ceilingAmount: number | null; sweetSpot: { min: number; max: number } | null; pendingInSweetSpot: number; pendingInSweetSpotValue: number } }) {
  const hasRiskAction = insight.pendingAboveCeiling > 0 && insight.winRateDropPts >= 10
  const hasCeiling = insight.ceilingAmount != null && insight.winRateDropPts >= 10

  return (
    <div className={`mt-3 rounded-lg px-4 py-3 text-xs ${hasRiskAction ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30" : "bg-muted/40"}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 inline-block h-2 w-2 rounded-full shrink-0 ${hasRiskAction ? "bg-amber-500" : "bg-blue-500"}`} />
        <div className="min-w-0">
          {hasCeiling && (
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">{Math.round(insight.sweetSpotWinRate * 100)}%</span>
                <span className="text-muted-foreground">{localizeActiveCopy("sweet spot")}</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex items-center gap-1.5">
                <span className="text-red-500 font-mono font-semibold">{Math.round(insight.aboveCeilingWinRate * 100)}%</span>
                <span className="text-muted-foreground">{localizeActiveCopy("above ceiling")}</span>
              </div>
              <Badge variant="outline" className="text-[10px] border-red-300 text-red-500">−{Math.round(insight.winRateDropPts)} {localizeActiveCopy("pts")}</Badge>
            </div>
          )}
          <p className="text-muted-foreground leading-relaxed">{localizeActiveCopy(insight.recommendation)}</p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Win Rate Section (module: win-rate)                                */
/* ------------------------------------------------------------------ */

function WinRateSection() {
  const { data, drillToJobType } = useStore()
  const { byJobType } = data.quoteAnalysis
  const { pricingBandInsights } = data

  const insightsByType = React.useMemo(() => {
    const map = new Map<string, typeof pricingBandInsights[0]>()
    for (const pb of pricingBandInsights) map.set(pb.jobType, pb)
    return map
  }, [pricingBandInsights])

  const majorTypes = byJobType.filter(jt => jt.totalQuotes >= 5)
  const totalValueAtRisk = pricingBandInsights.reduce((s, pb) => s + pb.expectedLossAboveCeiling, 0)
  const totalRepricingOpportunity = pricingBandInsights.reduce((s, pb) => s + pb.repricingOpportunityValue, 0)
  const totalPendingAboveCeiling = pricingBandInsights.reduce((s, pb) => s + pb.pendingAboveCeiling, 0)

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{localizeActiveCopy("Win Rate by Price Band")}</h3>
        {totalPendingAboveCeiling > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{totalPendingAboveCeiling} {localizeActiveCopy("above ceiling")}</span>
            <span className="font-mono text-red-500">{fmtUsd(totalValueAtRisk)} {localizeActiveCopy("at risk")}</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">{fmtUsd(totalRepricingOpportunity)} {localizeActiveCopy("projected uplift")}</span>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        Based on {data.quotingProfile.quotedJobs} formally quoted jobs ({fmtPct(data.quotingProfile.quotedPct)} of portfolio) at a {fmtPct(data.quotingProfile.quoteWinRate)} win rate.
        The remaining {fmtPct(data.quotingProfile.dispatchPct)} enters via NTE-authorized dispatch without competitive quoting — see the NTE Escalation Friction app.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {majorTypes.map(jt => {
          const insight = insightsByType.get(jt.jobType)
          return (
            <Card key={jt.jobType} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => drillToJobType(jt.jobType)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{jt.jobType}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{jt.totalQuotes} {localizeActiveCopy("quotes")}</span>
                    <Badge variant="secondary" className="text-xs">{fmtPct(jt.overallWinRate)} {localizeActiveCopy("win")}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <WinRateChart bands={jt.priceBands} ceilingAmount={jt.ceilingAmount} sweetSpot={jt.sweetSpot} jobType={jt.jobType} />
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  {jt.sweetSpot && <span>{localizeActiveCopy("Sweet spot:")} <span className="font-mono text-foreground">{fmtUsd(jt.sweetSpot.min)}–{fmtUsd(jt.sweetSpot.max)}</span></span>}
                  {jt.ceilingAmount && <span>{localizeActiveCopy("Ceiling:")} <span className="font-mono text-foreground">{fmtUsd(jt.ceilingAmount)}</span></span>}
                </div>
                {insight && <PricingBandInsightCard insight={insight} />}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  At-Risk Quotes Section (module: at-risk)                           */
/* ------------------------------------------------------------------ */

function AtRiskSection() {
  const { data } = useStore()
  const { atRiskQuotes } = data.quoteAnalysis
  const [showAll, setShowAll] = React.useState(false)
  const PREVIEW_ROWS = 8
  const visible = showAll ? atRiskQuotes.slice(0, 25) : atRiskQuotes.slice(0, PREVIEW_ROWS)

  if (atRiskQuotes.length === 0) {
    return <p className="text-sm text-muted-foreground">{localizeActiveCopy("No at-risk quotes in the current pipeline.")}</p>
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{localizeActiveCopy("At-Risk Quotes")}</h3>
        <Badge variant="destructive" className="text-xs">{atRiskQuotes.length}</Badge>
      </div>
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">{localizeActiveCopy("Job #")}</th>
                <th className="px-4 py-3 font-medium">{localizeActiveCopy("Customer")}</th>
                <th className="px-4 py-3 font-medium">{localizeActiveCopy("Type")}</th>
                <th className="px-4 py-3 font-medium">{localizeActiveCopy("Region")}</th>
                <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("Amount")}</th>
                <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("NTE")}</th>
                <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("Age")}</th>
                <th className="px-4 py-3 font-medium text-center">{localizeActiveCopy("Risk")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(q => (
                <tr key={q.jobNumber} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs">{q.jobNumber}</td>
                  <td className="px-4 py-2.5 max-w-[180px] truncate">{q.customerName}</td>
                  <td className="px-4 py-2.5 text-xs">{q.jobType}</td>
                  <td className="px-4 py-2.5 text-xs">{regionLabels[q.region] ?? q.region}</td>
                  <td className={`px-4 py-2.5 text-right font-mono text-xs ${q.aboveCeiling ? "text-red-500" : ""}`}>{fmtUsd(q.totalAmountQuoted)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {q.amountNTE ? fmtUsd(q.amountNTE) : "—"}
                    {q.exceedsNteAuth && <Badge variant="outline" className="ml-1.5 text-[10px] border-amber-400 text-amber-500">{localizeActiveCopy("Requires Auth")}</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{q.quoteAgeDays} {localizeActiveCopy("days short")}</td>
                  <td className="px-4 py-2.5 text-center"><RiskDot score={q.riskScore} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {atRiskQuotes.length > PREVIEW_ROWS && (
          <button
            type="button"
            onClick={() => setShowAll(v => !v)}
            className="w-full border-t py-2 text-center text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAll ? "Show less" : `Show all ${Math.min(atRiskQuotes.length, 25)} at-risk quotes`}
          </button>
        )}
      </CardContent></Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  NTE Escalation Friction Section (module: nte)                         */
/* ------------------------------------------------------------------ */

function NteSection() {
  const { data } = useStore()
  const highNte = data.dispatchAuthEvents.filter(e => e.revenueToNteRatio > 0.85)
  const [showAll, setShowAll] = React.useState(false)
  const PREVIEW_ROWS = 8
  const visible = showAll ? highNte.slice(0, 25) : highNte.slice(0, PREVIEW_ROWS)

  if (highNte.length === 0) {
    return <p className="text-sm text-muted-foreground">{localizeActiveCopy("No jobs are running near their customer-set NTE cap.")}</p>
  }

  return (
    <section>
      <Card>
        <CardHeader><CardTitle className="text-sm">{localizeActiveCopy("NTE Escalation Friction")}</CardTitle></CardHeader>
        <CardContent className="p-0 pb-2">
          <p className="px-4 pb-3 text-[11px] text-muted-foreground">
            NTE is a cap the customer sets before dispatch — ACME cannot change it. Overages aren&apos;t lost margin; they trigger extra trips and approval loops between tech, dispatch, approver, and customer. The cost is wasted cycle time, not revenue.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{localizeActiveCopy("Job #")}</th>
                  <th className="px-4 py-3 font-medium">{localizeActiveCopy("Customer")}</th>
                  <th className="px-4 py-3 font-medium">{localizeActiveCopy("Type")}</th>
                  <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("Billed")}</th>
                  <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("Customer NTE")}</th>
                  <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("Revenue / NTE")}</th>
                  <th className="px-4 py-3 font-medium text-center">{localizeActiveCopy("Visits")}</th>
                  <th className="px-4 py-3 font-medium">{localizeActiveCopy("Workflow")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(e => (
                  <tr key={e.jobNumber} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{e.jobNumber}</td>
                    <td className="px-4 py-2.5 max-w-[180px] truncate">{e.customerName}</td>
                    <td className="px-4 py-2.5 text-xs">{e.jobType}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtUsd(e.totalAmount)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtUsd(e.amountNTE)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono text-xs ${e.workflowOutcome === "approved-overage" ? "text-amber-500" : ""}`}>{fmtPct(e.revenueToNteRatio)}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-xs">{e.visitCount}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <Badge variant="outline" className={`text-[10px] ${e.workflowOutcome === "within-scope" ? "border-emerald-400 text-emerald-500" : e.workflowOutcome === "quote-converted" ? "border-blue-400 text-blue-500" : "border-amber-400 text-amber-500"}`}>
                        {e.workflowOutcome === "within-scope" ? "Within scope" : e.workflowOutcome === "quote-converted" ? "Quote converted" : "Approved overage"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {highNte.length > PREVIEW_ROWS && (
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              className="w-full border-t py-2 text-center text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showAll ? "Show less" : `Show all ${Math.min(highNte.length, 25)} escalations`}
            </button>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Scenario "app" Detail (module: scenario:<id>)                      */
/* ------------------------------------------------------------------ */

function ScenarioDetail({ scenario, onOpenSandbox }: { scenario: SavedScenario; onOpenSandbox: () => void }) {
  const p = scenario.projection
  const stat = (label: string, value: string, tone?: "good" | "bad") => (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      <div className={`text-lg font-semibold tabular-nums ${tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{localizeActiveCopy(label)}</div>
    </div>
  )
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Revenue Δ", fmtUsd(p.revenueDelta), p.revenueDelta >= 0 ? "good" : "bad")}
        {stat("Margin Δ", fmtUsd(p.marginDelta), p.marginDelta >= 0 ? "good" : "bad")}
        {stat("Margin pts", `${p.marginPtsDelta >= 0 ? "+" : ""}${p.marginPtsDelta.toFixed(1)}`, p.marginPtsDelta >= 0 ? "good" : "bad")}
        {stat("Freed truck rolls", `${p.freedTruckRolls}`, "good")}
      </div>
      {scenario.agentExplanation && (
        <div className="rounded-lg bg-muted/40 px-4 py-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{scenario.agentExplanation}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{p.affectedJobs} jobs · {p.affectedCustomers.length} customers affected · saved {new Date(scenario.timestamp).toLocaleDateString(activeLocaleTag())}</span>
        <button
          type="button"
          onClick={onOpenSandbox}
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 font-medium text-foreground hover:bg-muted/50"
        >
          <SafeIcon name="SlidersHorizontal" className="h-3 w-3" /> Open in Sandbox
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Module summaries (lean BLUF for each tile)                         */
/* ------------------------------------------------------------------ */

function fmtSignedPct(n: number, digits = 1): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`
}

function weatherSummary(data: ComputedData): ModuleSummary {
  const wi = buildWeatherIntelligence(data.jobs)
  if (wi.series.length < 4 || wi.fit.n < 4) {
    return {
      headline: "Indexing NOAA weather history against ACME jobs — not enough overlap yet for a fitted forecast.",
      severity: "info",
      figures: [],
    }
  }
  const alerts = reconcileAlerts(getUrgencyAlerts(), wi)
  const highPower = alerts.filter(a => a.pricingPower === "high").length
  const headline = highPower > 0
    ? `Weather turns in our favor: ${highPower} high pricing-power window${highPower !== 1 ? "s" : ""} ahead — ${fmtUsd(wi.forecastLow)}–${fmtUsd(wi.forecastHigh)} weather-driven margin over the next ${wi.horizonMonths} mo.`
    : `${alerts.length} forecast urgency window${alerts.length !== 1 ? "s" : ""} mapped to demand — ${fmtUsd(wi.forecastLow)}–${fmtUsd(wi.forecastHigh)} margin opportunity over ${wi.horizonMonths} mo.`
  return {
    headline,
    severity: highPower > 0 ? "high" : "medium",
    figures: [
      { value: `${highPower}`, label: "high-power", tone: highPower > 0 ? "good" : "neutral" },
      { value: fmtSignedPct(wi.fit.slope), label: "demand / pt", tone: "neutral" },
      { value: fmtUsd(wi.forecastHigh), label: "margin opp", tone: "good" },
    ],
  }
}

function winRateSummary(data: ComputedData): ModuleSummary {
  const { byJobType } = data.quoteAnalysis
  const insights = data.pricingBandInsights
  const majorTypes = byJobType.filter(jt => jt.totalQuotes >= 5)
  const avgWin = majorTypes.length ? majorTypes.reduce((s, jt) => s + jt.overallWinRate, 0) / majorTypes.length : 0
  const pendingAbove = insights.reduce((s, pb) => s + pb.pendingAboveCeiling, 0)
  const atRisk = insights.reduce((s, pb) => s + pb.expectedLossAboveCeiling, 0)
  const reprice = insights.reduce((s, pb) => s + pb.repricingOpportunityValue, 0)
  const headline = pendingAbove > 0
    ? `${pendingAbove} pending quote${pendingAbove !== 1 ? "s" : ""} priced above ceiling — ${fmtUsd(atRisk)} conversion at risk; repricing into sweet spots recovers ${fmtUsd(reprice)}.`
    : `Average win rate ${fmtPct(avgWin)} across ${majorTypes.length} job types. Price new quotes into the sweet spots to hold conversion.`
  return {
    headline,
    severity: pendingAbove > 0 ? "high" : "medium",
    figures: [
      { value: fmtPct(avgWin), label: "avg win", tone: avgWin >= 0.5 ? "good" : "neutral" },
      { value: `${pendingAbove}`, label: "above ceiling", tone: pendingAbove > 0 ? "bad" : "neutral" },
      { value: fmtUsd(reprice), label: "reprice opp", tone: "good" },
    ],
  }
}

function atRiskSummary(data: ComputedData): ModuleSummary {
  const q = data.quoteAnalysis.atRiskQuotes
  const aboveCeiling = q.filter(x => x.aboveCeiling).length
  const exposure = q.reduce((s, x) => s + (x.totalAmountQuoted ?? 0), 0)
  const oldest = q.reduce((m, x) => Math.max(m, x.quoteAgeDays ?? 0), 0)
  const headline = q.length === 0
    ? "No at-risk quotes in the pipeline."
    : `${q.length} quote${q.length !== 1 ? "s" : ""} flagged at risk${aboveCeiling ? `, ${aboveCeiling} above ceiling` : ""}. Oldest has been sitting ${oldest}d.`
  return {
    headline,
    severity: q.length === 0 ? "info" : aboveCeiling > 0 ? "high" : "medium",
    figures: [
      { value: `${q.length}`, label: "at risk", tone: q.length > 0 ? "bad" : "good" },
      { value: `${aboveCeiling}`, label: "above ceiling", tone: aboveCeiling > 0 ? "bad" : "neutral" },
      { value: fmtUsd(exposure), label: "exposure", tone: "neutral" },
    ],
  }
}

function nteSummary(data: ComputedData): ModuleSummary {
  const highNte = data.dispatchAuthEvents.filter(e => e.revenueToNteRatio > 0.85)
  const overage = highNte.filter(e => e.workflowOutcome === "approved-overage").length
  const headline = highNte.length === 0
    ? "No jobs running near their customer-set NTE cap."
    : `${highNte.length} job${highNte.length !== 1 ? "s" : ""} near or over the customer-set NTE cap${overage ? `, ${overage} approved overage${overage !== 1 ? "s" : ""}` : ""} — extra trips and approval loops, not lost margin.`
  return {
    headline,
    severity: highNte.length === 0 ? "info" : "medium",
    figures: [
      { value: `${highNte.length}`, label: "near cap", tone: highNte.length > 0 ? "bad" : "good" },
      { value: `${overage}`, label: "overages", tone: overage > 0 ? "bad" : "neutral" },
      { value: `${highNte.reduce((s, e) => s + e.visitCount, 0)}`, label: "total visits", tone: "neutral" },
    ],
  }
}

function salesSummary(data: ComputedData): ModuleSummary {
  const sp = data.salesPerformance
  const lostExpired = sp.conversionFunnel.cancelled + sp.conversionFunnel.rejected + sp.conversionFunnel.expired
  return {
    headline: `${sp.totalQuotes} quotes at ${Math.round(sp.overallWinRate * 100)}% win rate; median close ${sp.medianDaysToConvert}d across the rep leaderboard.`,
    severity: sp.overallWinRate >= 0.5 ? "medium" : "high",
    figures: [
      { value: `${Math.round(sp.overallWinRate * 100)}%`, label: "win rate", tone: sp.overallWinRate >= 0.5 ? "good" : "bad" },
      { value: `${sp.totalQuotes}`, label: "quotes", tone: "neutral" },
      { value: `${lostExpired}`, label: "lost / expired", tone: "neutral" },
    ],
  }
}

function fuelSummary(data: ComputedData): ModuleSummary {
  const fuel = data.fuelExposure
  if (!fuel) {
    return { headline: "Fleet fuel analysis loading.", severity: "info", figures: [] }
  }
  const act = fuel.actuals
  return {
    headline: `${fmtUsd(act.totalAnnualSpend)} annual fleet fuel with a ${fmtUsd(act.spikeImpactDollars)} spike month. Every $0.10/gal moves ${fmtUsd(fuel.sensitivity.impactPerDime)}/yr.`,
    severity: "high",
    figures: [
      { value: fmtUsd(act.totalAnnualSpend), label: "annual fuel", tone: "neutral" },
      { value: `+${fmtUsd(act.spikeImpactDollars)}`, label: "spike impact", tone: "bad" },
      { value: fmtUsd(fuel.sensitivity.impactPerDime), label: "per $0.10/gal", tone: "neutral" },
    ],
  }
}

function scenarioSummary(sc: SavedScenario): ModuleSummary {
  const p = sc.projection
  const headline = sc.agentExplanation
    ? sc.agentExplanation.length > 150 ? `${sc.agentExplanation.slice(0, 150)}…` : sc.agentExplanation
    : `Saved What-If scenario projecting ${fmtUsd(p.marginDelta)} margin Δ across ${p.affectedJobs} jobs.`
  return {
    headline,
    severity: p.marginDelta >= 0 ? "info" : "high",
    figures: [
      { value: fmtUsd(p.revenueDelta), label: "revenue Δ", tone: p.revenueDelta >= 0 ? "good" : "bad" },
      { value: fmtUsd(p.marginDelta), label: "margin Δ", tone: p.marginDelta >= 0 ? "good" : "bad" },
      { value: `${p.freedTruckRolls}`, label: "freed rolls", tone: "good" },
    ],
  }
}

/* ------------------------------------------------------------------ */
/*  Module registry                                                    */
/* ------------------------------------------------------------------ */

function usePricingModules(): IntelModule[] {
  const { savedScenarios, setSandboxOpen, customApps } = useStore()
  return React.useMemo(() => {
    const builtins: IntelModule[] = [
      { id: "weather", title: "Weather → Demand", icon: "CloudLightning", category: "weather", summary: weatherSummary, Detail: WeatherStripaPanel, sendToLoop: { label: "Send to Action Centre" } },
      { id: "win-rate", title: "Win Rate by Price Band", icon: "TrendingUp", category: "pricing", summary: winRateSummary, Detail: WinRateSection, sendToLoop: { label: "Send to Action Centre" } },
      { id: "at-risk", title: "At-Risk Quotes", icon: "AlertTriangle", category: "pricing", summary: atRiskSummary, Detail: AtRiskSection, sendToLoop: { label: "Send to Action Centre" } },
      { id: "nte", title: "NTE Escalation Friction", icon: "Gauge", category: "pricing", summary: nteSummary, Detail: NteSection },
      { id: "sales", title: "Sales Performance", icon: "Users", category: "sales", summary: salesSummary, Detail: SalesPerformanceSection },
      { id: "fuel", title: "Fuel & Fleet Cost", icon: "Fuel", category: "cost", summary: fuelSummary, Detail: FuelIntegritySection },
    ]
    const scenarios: IntelModule[] = savedScenarios.map(sc => ({
      id: `scenario:${sc.id}`,
      title: sc.name,
      icon: "FlaskConical",
      category: "scenario",
      removable: true,
      summary: () => scenarioSummary(sc),
      Detail: () => <ScenarioDetail scenario={sc} onOpenSandbox={() => setSandboxOpen(true)} />,
      sendToLoop: { label: "Send to Action Centre" },
    }))
    const custom: IntelModule[] = customApps.map(spec => ({
      id: `app:${spec.id}`,
      title: spec.title,
      icon: spec.icon,
      category: "custom",
      removable: true,
      summary: (data) => summarizeSpec(spec, data),
      Detail: () => <SpecRenderer spec={spec} />,
      sendToLoop: spec.sendToLoop ?? { label: "Send to Action Centre" },
    }))
    return [...builtins, ...scenarios, ...custom]
  }, [savedScenarios, setSandboxOpen, customApps])
}

/* ------------------------------------------------------------------ */
/*  Macro View                                                         */
/* ------------------------------------------------------------------ */

function MacroView() {
  const { data } = useStore()
  const { byJobType, atRiskQuotes } = data.quoteAnalysis
  const { pricingBandInsights } = data
  const modules = usePricingModules()

  const majorTypes = byJobType.filter(jt => jt.totalQuotes >= 5)
  const totalValueAtRisk = pricingBandInsights.reduce((s, pb) => s + pb.expectedLossAboveCeiling, 0)
  const totalRepricingOpportunity = pricingBandInsights.reduce((s, pb) => s + pb.repricingOpportunityValue, 0)
  const totalPendingAboveCeiling = pricingBandInsights.reduce((s, pb) => s + pb.pendingAboveCeiling, 0)
  const totalPending = pricingBandInsights.reduce((s, pb) => s + pb.pendingInSweetSpot + pb.pendingAboveCeiling, 0)
  const totalPendingValue = pricingBandInsights.reduce((s, pb) => s + pb.pendingInSweetSpotValue + pb.pendingAboveCeilingValue, 0)

  const headlineTitle = React.useMemo(() => {
    if (totalPendingAboveCeiling > 0 && totalValueAtRisk > 0) {
      return `${totalPendingAboveCeiling} pending quote${totalPendingAboveCeiling !== 1 ? "s" : ""} priced above ceiling with ${fmtUsd(totalValueAtRisk)} in expected conversion loss. Repricing into sweet spots recovers ${fmtUsd(totalRepricingOpportunity)} in expected value.`
    }
    if (pricingBandInsights.length > 0 && totalPending > 0) {
      const avgSweet = pricingBandInsights.reduce((s, pb) => s + pb.sweetSpotWinRate, 0) / pricingBandInsights.length
      return `${totalPending} pending quotes worth ${fmtUsd(totalPendingValue)} in pipeline across ${pricingBandInsights.length} job types. Sweet-spot conversion rate averaging ${Math.round(avgSweet * 100)}%.`
    }
    if (pricingBandInsights.length > 0) {
      const topInsight = pricingBandInsights[0]
      return `${topInsight.jobType} sweet spot (${fmtUsd(topInsight.sweetSpot?.min ?? 0)}–${fmtUsd(topInsight.sweetSpot?.max ?? 0)}) converts at ${Math.round(topInsight.sweetSpotWinRate * 100)}%. ${pricingBandInsights.length} job types analyzed with pricing intelligence.`
    }
    return `${atRiskQuotes.length} quote${atRiskQuotes.length !== 1 ? "s" : ""} in pipeline. Price band analysis across ${majorTypes.length} job types.`
  }, [pricingBandInsights, atRiskQuotes.length, totalPendingAboveCeiling, totalValueAtRisk, totalRepricingOpportunity, totalPending, totalPendingValue, majorTypes.length])

  const headlineNarrative = React.useMemo(() => {
    const avgWin = majorTypes.length > 0 ? majorTypes.reduce((s, jt) => s + jt.overallWinRate, 0) / majorTypes.length : 0
    if (pricingBandInsights.length > 0 && pricingBandInsights[0].winRateDropPts >= 10) {
      const topInsight = pricingBandInsights[0]
      return `Across ${majorTypes.length} job types with sufficient quote history, average win rate is ${fmtPct(avgWin)}. ${topInsight.jobType} shows the steepest drop: ${Math.round(topInsight.sweetSpotWinRate * 100)}% in the sweet spot vs. ${Math.round(topInsight.aboveCeilingWinRate * 100)}% above ceiling — a ${Math.round(topInsight.winRateDropPts)}-point collapse.`
    }
    if (pricingBandInsights.length > 0) {
      const topInsight = pricingBandInsights[0]
      return `Across ${majorTypes.length} job types, average win rate is ${fmtPct(avgWin)}. ${topInsight.jobType} leads at ${Math.round(topInsight.sweetSpotWinRate * 100)}% win rate in its ${fmtUsd(topInsight.sweetSpot?.min ?? 0)}–${fmtUsd(topInsight.sweetSpot?.max ?? 0)} sweet spot. Price new quotes within these bands to maximize conversion probability.`
    }
    return `Across ${majorTypes.length} job types with sufficient quote history, average win rate is ${fmtPct(avgWin)}.`
  }, [majorTypes, pricingBandInsights])

  return (
    <div className="space-y-6">
      <BPHeadline title={headlineTitle} narrative={headlineNarrative} severity={totalPendingAboveCeiling > 0 ? "critical" : "high"} />
      <IntelBoard modules={modules} boardId="pricing" title={localizeActiveCopy("Pricing Apps")} allowCreate />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sales Performance Section                                          */
/* ------------------------------------------------------------------ */

function SalesPerformanceSection() {
  const { data, locale } = useStore()
  const sp = data.salesPerformance
  const [showAll, setShowAll] = React.useState(false)

  const displayReps = showAll ? sp.repProfiles : sp.repProfiles.slice(0, 10)
  const hasMore = sp.repProfiles.length > 10

  const qualifiedReps = sp.repProfiles.filter(r => r.totalQuotes >= 3 && r.name !== "Unassigned")
  const bestRep = qualifiedReps.length > 0 ? qualifiedReps.reduce((a, b) => a.winRate > b.winRate ? a : b) : null
  const worstRep = qualifiedReps.length > 1 ? qualifiedReps.reduce((a, b) =>a.winRate< b.winRate ? a : b) : null

  const avgQuoteValue = sp.totalConverted > 0
    ? data.portfolioSummary.totalRevenue / sp.totalConverted
    : 0
  const marginGap = bestRep && worstRep && bestRep.name !== worstRep.name
    ? (bestRep.winRate - worstRep.winRate) * avgQuoteValue * worstRep.totalQuotes
    : 0

  const lostExpired = sp.conversionFunnel.cancelled + sp.conversionFunnel.rejected + sp.conversionFunnel.expired

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{localizeActiveCopy("Sales Performance")}</h3>
        <Badge variant="secondary" className="text-xs">{sp.totalQuotes} {localizeActiveCopy("quotes")}</Badge>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Conversion Funnel — stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <div className="font-mono text-2xl font-semibold">{sp.totalQuotes}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{localizeActiveCopy("Total Quotes")}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <div className={`font-mono text-2xl font-semibold ${sp.overallWinRate >= 0.6 ? "text-emerald-600 dark:text-emerald-400" : sp.overallWinRate >= 0.4 ? "text-amber-500" : "text-red-500"}`}>
                {Math.round(sp.overallWinRate * 100)}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{localizeActiveCopy("Win Rate")}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/40">
              <div className="font-mono text-2xl font-semibold">{sp.medianDaysToConvert} {localizeActiveCopy("days short")}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{localizeActiveCopy("Median Close")}</div>
            </div>
            <div className="relative group text-center p-3 rounded-lg bg-muted/40">
              <div className="font-mono text-2xl font-semibold text-muted-foreground">{lostExpired}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{localizeActiveCopy("Lost / Expired")}</div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-xs whitespace-nowrap">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />
                    <span>{localizeActiveCopy("Cancelled")}: {sp.conversionFunnel.cancelled}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                    <span>{localizeActiveCopy("Rejected")}: {sp.conversionFunnel.rejected}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 inline-block" />
                    <span>{localizeActiveCopy("Expired")}: {sp.conversionFunnel.expired}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion funnel bar */}
          <div>
            <div className="flex w-full rounded-md overflow-hidden" style={{ height: 8 }}>
              <div className="bg-emerald-500 transition-all" style={{ width: `${(sp.conversionFunnel.converted / sp.totalQuotes) * 100}%` }} title={`Converted: ${sp.conversionFunnel.converted}`} />
              <div className="bg-red-400 transition-all" style={{ width: `${(sp.conversionFunnel.cancelled / sp.totalQuotes) * 100}%` }} title={`Cancelled: ${sp.conversionFunnel.cancelled}`} />
              <div className="bg-amber-400 transition-all" style={{ width: `${(sp.conversionFunnel.rejected / sp.totalQuotes) * 100}%` }} title={`Rejected: ${sp.conversionFunnel.rejected}`} />
              <div className="bg-zinc-300 dark:bg-zinc-600 transition-all" style={{ width: `${(sp.conversionFunnel.expired / sp.totalQuotes) * 100}%` }} title={`Expired: ${sp.conversionFunnel.expired}`} />
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> {localizeActiveCopy("Converted")} ({sp.conversionFunnel.converted})</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" /> {localizeActiveCopy("Cancelled")} ({sp.conversionFunnel.cancelled})</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" /> {localizeActiveCopy("Rejected")} ({sp.conversionFunnel.rejected})</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 inline-block" /> {localizeActiveCopy("Expired")} ({sp.conversionFunnel.expired})</span>
            </div>
          </div>

          <Separator />

          {/* Rep Leaderboard */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{localizeActiveCopy("Rep Leaderboard")}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">{localizeActiveCopy("Rep")}</th>
                    <th className="px-4 py-2.5 font-medium text-right">{localizeActiveCopy("Quotes")}</th>
                    <th className="px-4 py-2.5 font-medium">{localizeActiveCopy("Win Rate")}</th>
                    <th className="px-4 py-2.5 font-medium text-right">{localizeActiveCopy("Avg Days")}</th>
                    <th className="px-4 py-2.5 font-medium">{localizeActiveCopy("Top Customer")}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayReps.map(rep => (
                    <tr
                      key={rep.name}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${rep.winRate < 0.5 && rep.name !== "Unassigned" ? "border-l-2 border-l-amber-400" : ""}`}
                    >
                      <td className={`px-4 py-2.5 text-xs font-medium ${rep.name === "Unassigned" ? "text-muted-foreground italic" : ""}`}>
                        {rep.name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{rep.totalQuotes}</td>
                      <td className="px-4 py-2.5"><WinRateBar rate={rep.winRate} /></td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {rep.avgDaysToConvert != null ? `${rep.avgDaysToConvert.toFixed(1)}d` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs max-w-[180px] truncate text-muted-foreground">
                        {rep.topCustomers[0] ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="mt-2 w-full text-center text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline py-1.5"
              >
                {showAll ? "Show top 10" : `Show all ${sp.repProfiles.length} reps`}
              </button>
            )}
          </div>

          {/* BP Insight Card */}
          {bestRep && worstRep && bestRep.name !== worstRep.name && marginGap > 0 && (
            <>
              <Separator />
              <div className="rounded-lg px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">{bestRep.name}</span> {locale === "fr" ? "convertit" : "converts"}{" "}
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{Math.round(bestRep.winRate * 100)}%</span>
                    {locale === "fr" ? " des devis, contre " : " vs. "}<span className="font-medium text-foreground">{worstRep.name}</span> {locale === "fr" ? "à" : "at"}{" "}
                    <span className="font-mono font-semibold text-red-500">{Math.round(worstRep.winRate * 100)}%</span>.
                    {locale === "fr" ? ` Réduire l’écart sur les ${worstRep.totalQuotes} devis de ${worstRep.name} permettrait de récupérer environ ` : ` Closing the gap on ${worstRep.name}'s ${worstRep.totalQuotes} quotes alone would recover `}
                    <span className="font-mono font-semibold text-foreground">~{fmtUsd(marginGap)}</span>{locale === "fr" ? " de chiffre d’affaires annuel." : " in annual revenue."}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Job Type Drill View                                                */
/* ------------------------------------------------------------------ */

function JobTypeDrillView() {
  const { data, selectedJobType, drillBack } = useStore()
  const analysis = data.quoteAnalysis.byJobType.find(jt => jt.jobType === selectedJobType)

  if (!analysis) {
    return (
      <div className="space-y-4">
        <button onClick={drillBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <SafeIcon name="ArrowLeft" className="h-4 w-4" /> {localizeActiveCopy("Back")}
        </button>
        <p className="text-sm text-muted-foreground">{localizeActiveCopy("No quote analysis available for this job type.")}</p>
      </div>
    )
  }

  const aboveCeilingIdx = analysis.ceilingAmount ? analysis.priceBands.findIndex(b => b.min >= analysis.ceilingAmount!) : -1

  return (
    <div className="space-y-8">
      <button onClick={drillBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <SafeIcon name="ArrowLeft" className="h-4 w-4" /> {localizeActiveCopy("Back to overview")}
      </button>

      <div>
        <h2 className="text-lg font-medium">{analysis.jobType}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-mono text-foreground">{analysis.totalQuotes}</span> {localizeActiveCopy("quotes")}</span>
          <span>{localizeActiveCopy("Win rate:")} <span className="font-mono text-foreground">{fmtPct(analysis.overallWinRate)}</span></span>
          {analysis.ceilingAmount && <span>{localizeActiveCopy("Ceiling:")} <span className="font-mono text-foreground">{fmtUsd(analysis.ceilingAmount)}</span></span>}
          {analysis.sweetSpot && <span>{localizeActiveCopy("Sweet spot:")} <span className="font-mono text-foreground">{fmtUsd(analysis.sweetSpot.min)}–{fmtUsd(analysis.sweetSpot.max)}</span></span>}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">{localizeActiveCopy("Quoted work only")} — {fmtPct(data.quotingProfile.dispatchPct)} {localizeActiveCopy("of portfolio enters via NTE dispatch.")}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">{localizeActiveCopy("Price Bands")}</CardTitle></CardHeader>
        <CardContent className="p-0 pb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{localizeActiveCopy("Band")}</th>
                  <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("Quotes")}</th>
                  <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("Wins")}</th>
                  <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("Losses")}</th>
                  <th className="px-4 py-3 font-medium text-right">{localizeActiveCopy("Pending")}</th>
                  <th className="px-4 py-3 font-medium">{localizeActiveCopy("Win Rate")}</th>
                </tr>
              </thead>
              <tbody>
                {analysis.priceBands.map((band, i) => {
                  const isAboveCeiling = aboveCeilingIdx >= 0 && i >= aboveCeilingIdx
                  return (
                    <tr key={localizeActiveCopy(band.label)} className={`border-b last:border-0 transition-colors ${isAboveCeiling ? "bg-red-50 dark:bg-red-950/20" : "hover:bg-muted/30"}`}>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {localizeActiveCopy(band.label)}
                        {isAboveCeiling && i === aboveCeilingIdx && <Badge variant="outline" className="ml-2 text-[10px] border-red-300 text-red-500">{localizeActiveCopy("Above ceiling")}</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{band.totalQuotes}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{band.wins}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{band.losses}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{band.pending}</td>
                      <td className="px-4 py-2.5"><WinRateBar rate={band.winRate} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {(() => {
        const insight = data.pricingBandInsights.find(pb => pb.jobType === analysis.jobType)
        if (insight) {
          return (
            <Card className={`border-dashed ${insight.pendingAboveCeiling > 0 ? "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/30" : "bg-muted/30"}`}>
              <CardContent className="py-5 px-6">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 inline-block h-2 w-2 rounded-full shrink-0 ${insight.pendingAboveCeiling > 0 ? "bg-amber-500" : "bg-blue-500"}`} />
                  <div className="space-y-3 w-full">
                    <p className="text-sm font-medium">{localizeActiveCopy("BluePilot Analysis")}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center p-2 rounded-md bg-background/50">
                        <div className="font-mono text-lg font-semibold text-emerald-600 dark:text-emerald-400">{Math.round(insight.sweetSpotWinRate * 100)}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{localizeActiveCopy("Sweet spot win")}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-background/50">
                        <div className="font-mono text-lg font-semibold text-red-500">{Math.round(insight.aboveCeilingWinRate * 100)}%</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{localizeActiveCopy("Above ceiling win")}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-background/50">
                        <div className="font-mono text-lg font-semibold text-red-500">{fmtUsd(insight.expectedLossAboveCeiling)}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{localizeActiveCopy("At risk")}</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-background/50">
                        <div className="font-mono text-lg font-semibold text-emerald-600 dark:text-emerald-400">{fmtUsd(insight.repricingOpportunityValue)}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{localizeActiveCopy("Projected uplift")}</div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{localizeActiveCopy(insight.recommendation)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        }
        if (analysis.sweetSpot) {
          return (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-5 px-6">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{localizeActiveCopy("BluePilot Recommendation")}</p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {localizeActiveCopy("For")} {analysis.jobType}, {localizeActiveCopy("your sweet spot is")} <span className="font-mono text-foreground">{fmtUsd(analysis.sweetSpot.min)}–{fmtUsd(analysis.sweetSpot.max)}</span>.
                      {analysis.ceilingAmount && <>{localizeActiveCopy("Above")} <span className="font-mono text-foreground">{fmtUsd(analysis.ceilingAmount)}</span>{localizeActiveCopy(", win rate drops below 40%.")}</>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        }
        return null
      })()}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Root                                                          */
/* ------------------------------------------------------------------ */

export function PricingIntelPage() {
  const { drillLevel, selectedJobType } = useStore()
  const isDrill = drillLevel === "region" && selectedJobType
  return (
    <div className="space-y-8">
      {isDrill ? <JobTypeDrillView /> : <MacroView />}
    </div>
  )
}
