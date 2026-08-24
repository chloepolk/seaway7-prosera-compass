"use client"

import {activeLocaleTag, formatActivePercent, formatActiveUsd, localizeActiveCopy, formatActiveFuelUnit, formatActiveFuelVolume, formatActiveFuelSensitivityStep, formatActiveFuelEconomy } from "../_i18n/legacy"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Card, CardContent } from "@/components/ui/prosera/card"
import { Badge } from "@/components/ui/prosera/badge"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import type { PortfolioFuelExposure, FuelSensitivityAnalysis, FuelSensitivityScenario, MarginErosionFactor } from "../data/_fuel"
import type { DivisionFuelSummary, CombinedFuelMonth } from "../data/_atob"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
} from "recharts"

const SERVICE_VAN_MPG_LABEL = 15

function fmtUsd(n: number): string {
  return formatActiveUsd(n)
}

function fmtUsdExact(n: number): string {
  return formatActiveUsd(n, false)
}

function fmtPct(n: number): string {
  return formatActivePercent(n)
}

const DIVISION_COLORS: Record<string, string> = {
  "DIV-A": "#3b82f6",
  "DIV-B": "#f59e0b",
  "DIV-C": "#ef4444",
}

const PADD_COLORS = {
  gulfCoast: "#94a3b8",
  rockyMountain: "#cbd5e1",
  westCoast: "#64748b",
}

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({ label, value, sublabel, severity }: {
  label: string
  value: string
  sublabel?: string
  severity?: "critical" | "warning" | "info"
}) {
  const accent = severity === "critical" ? "border-red-500/50" : severity === "warning" ? "border-amber-500/50" : "border-blue-500/30"
  const textColor = severity === "critical" ? "text-red-600 dark:text-red-400" : severity === "warning" ? "text-amber-600 dark:text-amber-400" : "text-foreground"

  return (
    <Card className={cn("border-l-4", accent)}>
      <CardContent className="p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{localizeActiveCopy(label)}</p>
        <p className={cn("text-2xl font-bold font-mono mt-1", textColor)}>{value}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Monthly Fleet Spend Chart                                           */
/* ------------------------------------------------------------------ */

function FleetSpendChart({ data, spikeMonth }: { data: CombinedFuelMonth[]; spikeMonth: string }) {
  const formatted = data.map(d => ({
    label: `${d.month.slice(0, 3)} ${String(d.year).slice(2)}`,
    fullLabel: `${d.month} ${d.year}`,
    totalSpend: d.totalSpend,
    unleadedPPG: d.unleadedPricePerGal ?? 0,
    dieselPPG: d.dieselPricePerGal ?? 0,
    spikeImpact: d.spikeImpactVsPrior ?? 0,
    isSpike: `${d.month} ${d.year}` === spikeMonth,
  }))

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">{localizeActiveCopy("Monthly Fleet Fuel Spend")}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Fleet card transactions — 15-month series with unleaded price/L overlay
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-sm bg-blue-500/60" />
              Monthly spend
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-6 bg-red-500" />
              Unleaded €/L
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={formatted} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis
              yAxisId="spend"
              tick={{ fontSize: 9 }}
              tickFormatter={(v: number) => fmtUsd(v)}
              width={52}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              tick={{ fontSize: 9 }}
              tickFormatter={(v: number) => `${formatActiveFuelUnit(v)}`}
              domain={[2.5, 6]}
              width={44}
            />
            <RechartsTooltip
              content={(props) => {
                const { active, payload } = props as { active?: boolean; payload?: readonly { value: number; dataKey: string; payload: typeof formatted[0] }[] }
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload
                return (
                  <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-[11px] space-y-1">
                    <p className="font-medium text-foreground">{d?.fullLabel}</p>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{localizeActiveCopy("Total spend")}</span>
                      <span className="font-mono font-medium">{fmtUsdExact(d?.totalSpend ?? 0)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{localizeActiveCopy("Unleaded €/L")}</span>
                      <span className="font-mono font-medium">${(d?.unleadedPPG ?? 0).toFixed(2)}</span>
                    </div>
                    {(d?.spikeImpact ?? 0) !== 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">{localizeActiveCopy("Price impact vs prior")}</span>
                        <span className={cn("font-mono font-medium", (d?.spikeImpact ?? 0) > 0 ? "text-red-600" : "text-emerald-600")}>
                          {(d?.spikeImpact ?? 0) > 0 ? "+" : ""}{fmtUsd(d?.spikeImpact ?? 0)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              }}
            />
            <Bar yAxisId="spend" dataKey="totalSpend" fill="url(#gradSpend)" radius={[4, 4, 0, 0]}>
              {formatted.map((d, i) => (
                <Cell key={i} fill={d.isSpike ? "#ef4444" : "#3b82f6"} fillOpacity={d.isSpike ? 0.8 : 0.5} />
              ))}
            </Bar>
            <Line yAxisId="price" type="monotone" dataKey="unleadedPPG" stroke="#ef4444" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-[8px]">{localizeActiveCopy("Source: Fleet Card Transactions")}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  EIA Reference Chart (secondary)                                    */
/* ------------------------------------------------------------------ */

function EiaReferenceChart({ data, spikeWeek }: { data: PortfolioFuelExposure["weeklyTrend"]; spikeWeek: string }) {
  const formatted = data.map(d => ({
    ...d,
    weekLabel: d.week.slice(5),
  }))

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground">{localizeActiveCopy("EIA Fuel Price Reference (PADD Regions)")}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{localizeActiveCopy("Macro energy cost benchmark — fleet is 97% unleaded gasoline per fleet card actuals")}</p>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: PADD_COLORS.gulfCoast }} />{localizeActiveCopy("Gulf Coast")}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: PADD_COLORS.rockyMountain }} />{localizeActiveCopy("Rocky Mtn")}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: PADD_COLORS.westCoast }} />{localizeActiveCopy("West Coast")}</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={formatted} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="2 4" strokeOpacity={0.1} vertical={false} />
            <XAxis dataKey="weekLabel" tick={{ fontSize: 8 }} interval={6} />
            <YAxis tick={{ fontSize: 8 }} tickFormatter={(v: number) => `${formatActiveFuelUnit(v)}`} domain={["auto", "auto"]} width={36} />
            <Area type="monotone" dataKey="gulfCoast" stroke={PADD_COLORS.gulfCoast} fill="transparent" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="rockyMountain" stroke={PADD_COLORS.rockyMountain} fill="transparent" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="westCoast" stroke={PADD_COLORS.westCoast} fill="transparent" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <Badge variant="outline" className="text-[8px] mt-2">{localizeActiveCopy("Source: EIA Weekly Retail Fuel Prices (PADD benchmark)")}</Badge>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Division Breakdown Card                                            */
/* ------------------------------------------------------------------ */

function DivisionCard({ div }: { div: DivisionFuelSummary }) {
  const color = DIVISION_COLORS[div.division] ?? "#64748b"
  const isLargest = div.pctOfFleet > 0.4

  return (
    <Card className={cn("overflow-hidden", isLargest && "ring-1 ring-red-500/30")}>
      <CardContent className="p-0">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-1 rounded-full" style={{ background: color }} />
              <div>
                <h4 className="text-sm font-semibold">{div.division}</h4>
                <p className="text-[10px] text-muted-foreground">{localizeActiveCopy(div.label)}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={isLargest ? "destructive" : "outline"} className="text-[9px]">
                {(div.pctOfFleet * 100).toFixed(0)}% of fleet
              </Badge>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Annual spend")}</p>
            <p className="font-mono text-xs font-medium">{fmtUsd(div.totalAnnualSpend)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Monthly avg")}</p>
            <p className="font-mono text-xs font-medium">{fmtUsd(div.avgMonthlySpend)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Total litres")}</p>
            <p className="font-mono text-xs font-medium">{formatActiveFuelVolume(div.totalAnnualGallons)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{localizeActiveCopy("Unleaded €/L trend")}</p>
            <p className="font-mono text-xs font-medium">
              ${div.baselineAvgPricePerGal.toFixed(2)} → <span className={div.priceDeltaPct > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                ${div.currentAvgPricePerGal.toFixed(2)}
              </span>
              <span className="text-[9px] text-muted-foreground ml-1">({div.priceDeltaPct > 0 ? "+" : ""}{(div.priceDeltaPct * 100).toFixed(1)}%)</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


/* ------------------------------------------------------------------ */
/*  Fuel Price Sensitivity Analysis                                    */
/* ------------------------------------------------------------------ */

function FuelSensitivityCard({ sensitivity }: { sensitivity: FuelSensitivityAnalysis }) {
  const scenarioStyle = (s: FuelSensitivityScenario) =>
    s.name === "return-to-baseline" ? "border-emerald-500/25"
    : s.name === "hold-current" ? "border-amber-500/25"
    : "border-red-500/25"

  const deltaColor = (d: number) =>
    d === 0 ? "text-emerald-600 dark:text-emerald-400"
    : d > 0 ? "text-red-600 dark:text-red-400"
    : "text-emerald-600 dark:text-emerald-400"

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{localizeActiveCopy("Fuel Price Sensitivity")}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {localizeActiveCopy("Fleet burns")} {formatActiveFuelVolume(sensitivity.annualGallons)}/yr — {formatActiveFuelSensitivityStep()} = {fmtUsd(sensitivity.impactPerDime)}/{localizeActiveCopy("yr impact")}
          </p>
        </div>

        <div className="rounded-xl border bg-gradient-to-r from-amber-50/30 to-red-50/30 dark:from-amber-950/10 dark:to-red-950/10 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">{localizeActiveCopy("Key sensitivity metric")}</span>
            <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-700 dark:text-amber-400">{localizeActiveCopy("Fleet Card Data")}</Badge>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-foreground">{fmtUsd(sensitivity.impactPerDime)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{localizeActiveCopy("annual fleet cost impact per $0.10/gal price move").replace("$0.10/gal", formatActiveFuelSensitivityStep())}</p>
          </div>
          <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
            <span>{formatActiveFuelVolume(sensitivity.annualGallons)}/yr</span>
            <span>{formatActiveFuelUnit(sensitivity.baselinePricePerGal)} {localizeActiveCopy("baseline")} → {formatActiveFuelUnit(sensitivity.currentPricePerGal)} {localizeActiveCopy("current")}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {sensitivity.scenarios.map(s => (
            <div key={s.name} className={cn("rounded-xl border p-3 space-y-2", scenarioStyle(s))}>
              <p className="text-[10px] font-medium leading-tight">{localizeActiveCopy(s.label)}</p>
              <div>
                <p className="font-mono text-sm font-bold">{fmtUsd(s.annualFleetCost)}/{localizeActiveCopy("yr")}</p>
                <p className={cn("font-mono text-xs font-medium", deltaColor(s.deltaVsBaseline))}>
                  {s.deltaVsBaseline === 0 ? "—" : `${s.deltaVsBaseline > 0 ? "+" : ""}${fmtUsd(s.deltaVsBaseline)} vs. baseline`}
                </p>
              </div>
              {s.deltaPct !== 0 && (
                <p className="text-[9px] text-muted-foreground">+{(s.deltaPct * 100).toFixed(0)} % {localizeActiveCopy("from baseline")}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border bg-blue-50/30 dark:bg-blue-950/10 p-4">
          <div className="flex items-start gap-3">
            <SafeIcon name="FileText" className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">{localizeActiveCopy("Contract fuel clause recommendation")}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Embed fuel escalation clauses in all new and renewing service contracts, pegged to fleet card actuals.
                Current exposure: {fmtUsd(sensitivity.currentVsBaselineDelta)}/yr above baseline.
                Quarterly price reviews tied to actual fleet card data provide a defensible, transparent pass-through mechanism that protects margin without arbitrary surcharge line items.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Margin Erosion Waterfall                                           */
/* ------------------------------------------------------------------ */

function MarginErosionWaterfall({ factors, totalRevenue, currentMarginPct }: {
  factors: MarginErosionFactor[]
  totalRevenue: number
  currentMarginPct: number
}) {
  const baselineMarginPct = currentMarginPct + factors.reduce((s, f) => s + f.marginPtsImpact, 0) / 100

  const waterfallData = [
    { name: "Baseline margin", value: baselineMarginPct * 100, fill: "#3b82f6", type: "start" as const },
    ...factors
      .filter(f => f.dollarImpact > 0)
      .map(f => ({
        name: f.factor,
        value: -f.marginPtsImpact,
        fill: "#ef4444",
        type: "loss" as const,
        source: f.source,
        dollars: f.dollarImpact,
      })),
    { name: "Current margin", value: currentMarginPct * 100, fill: "#f59e0b", type: "current" as const },
  ]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">{localizeActiveCopy("Margin Erosion Attribution")}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{localizeActiveCopy("How fuel, labor, and materials are compressing portfolio margin from baseline")}</p>
        </div>

        <div className={cn("grid gap-3 mb-4", waterfallData.length <= 4 ? "grid-cols-3" : "grid-cols-4")}>
          {waterfallData.map(d => (
            <div key={d.name} className="text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{d.name}</p>
              <p className={cn(
                "font-mono text-lg font-bold mt-0.5",
                d.type === "loss" ? "text-red-600 dark:text-red-400" :
                d.type === "current" ? "text-amber-600 dark:text-amber-400" :
                "text-blue-600 dark:text-blue-400"
              )}>
                {d.type === "loss" ? `${d.value.toFixed(2)} pts` : `${(typeof d.value === "number" ? d.value : 0).toFixed(1)}%`}
              </p>
              {(d as { source?: string; dollars?: number }).source && (
                <Badge variant="outline" className="text-[8px] mt-0.5">
                  {(d as { source: string }).source} · {fmtUsd((d as { dollars: number }).dollars)}
                </Badge>
              )}
            </div>
          ))}
        </div>

        <div className="h-12 rounded-lg overflow-hidden flex items-stretch border">
          <div className="bg-blue-500/80 flex items-center justify-center" style={{ width: `${baselineMarginPct * 100 / (baselineMarginPct * 100 + 10) * 100}%` }}>
            <span className="text-[9px] text-white font-medium">{(baselineMarginPct * 100).toFixed(1)}%</span>
          </div>
          {factors.filter(f => f.dollarImpact > 0).map(f => (
            <div
              key={f.factor}
              className="bg-red-500/70 flex items-center justify-center border-l border-white/20"
              style={{ width: `${f.marginPtsImpact / (baselineMarginPct * 100 + 10) * 100}%` }}
              title={`${f.factor}: -${f.marginPtsImpact.toFixed(2)} pts (${fmtUsd(f.dollarImpact)})`}
            >
              <span className="text-[8px] text-white font-medium truncate px-0.5">-{f.marginPtsImpact.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-blue-500/80" />{localizeActiveCopy("Baseline")}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-500/70" />{localizeActiveCopy("Erosion")}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-500/80" />{localizeActiveCopy("Current")}</span>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Embeddable Fuel Section (folded into Pricing Intel)                */
/* ------------------------------------------------------------------ */

export function FuelIntegritySection() {
  const { data } = useStore()
  const fuel = data.fuelExposure

  if (!fuel) {
    return (
      <div className="flex items-center justify-center px-6 py-16">
        <p className="text-sm text-muted-foreground">{localizeActiveCopy("Loading fuel analysis…")}</p>
      </div>
    )
  }

  const act = fuel.actuals

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SafeIcon name="Fuel" className="h-4 w-4 text-red-600 dark:text-red-400" />
        <h3 className="text-sm font-semibold">{localizeActiveCopy("Fuel &amp; Fleet Cost Intelligence")}</h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {fmtUsd(act.totalAnnualSpend)} annual fleet fuel · {(act.unleadedPctOfVolume * 100).toFixed(0)}% unleaded · {formatActiveFuelSensitivityStep()} = {fmtUsd(fuel.sensitivity.impactPerDime)}/{localizeActiveCopy("yr")}
        </span>
      </div>

      {/* Section 1: KPI Header */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label={localizeActiveCopy("Total Fleet Fuel")}
          value={fmtUsd(act.totalAnnualSpend)}
          sublabel="15-month fleet card total"
          severity="info"
        />
        <KpiCard
          label={localizeActiveCopy("Monthly Burn Rate")}
          value={fmtUsd(act.latestMonthSpend)}
          sublabel={act.latestMonthLabel}
          severity="warning"
        />
        <KpiCard
          label={localizeActiveCopy("Spike Impact")}
          value={`+${fmtUsd(act.spikeImpactDollars)}`}
          sublabel={`${act.spikeMonthLabel} incremental vs. prior month price`}
          severity="critical"
        />
        <KpiCard
          label={localizeActiveCopy("Fleet Fuel Mix")}
          value={`${(act.unleadedPctOfVolume * 100).toFixed(0)}% unleaded`}
          sublabel={`${(100 - act.unleadedPctOfVolume * 100).toFixed(0)}% other (incl. diesel) · ${formatActiveFuelEconomy(SERVICE_VAN_MPG_LABEL)} avg`}
          severity="info"
        />
      </div>

      {/* Section 2: Monthly Spend Chart */}
      <FleetSpendChart data={act.combinedMonthly} spikeMonth={act.spikeMonthLabel} />

      {/* Section 2b: EIA Reference */}
      <EiaReferenceChart data={fuel.weeklyTrend} spikeWeek={fuel.spikeStartWeek} />

      {/* Section 3: Division Breakdown */}
      <div>
        <h3 className="text-sm font-semibold mb-2">{localizeActiveCopy("Division Fuel Breakdown")}</h3>
        <p className="text-[11px] text-muted-foreground mb-3">{localizeActiveCopy("Three service-line divisions — volume, spend, and price trends from fleet card data")}</p>
        <div className="grid grid-cols-3 gap-3">
          {fuel.divisionSummaries.map(d => <DivisionCard key={d.division} div={d} />)}
        </div>
      </div>

      {/* Section 4: Fuel Sensitivity Analysis */}
      <FuelSensitivityCard sensitivity={fuel.sensitivity} />

      {/* Section 5: Margin Erosion Waterfall */}
      <MarginErosionWaterfall
        factors={fuel.marginErosion}
        totalRevenue={fuel.totalPortfolioRevenue}
        currentMarginPct={data.portfolioSummary.avgMarginPct}
      />
    </div>
  )
}
