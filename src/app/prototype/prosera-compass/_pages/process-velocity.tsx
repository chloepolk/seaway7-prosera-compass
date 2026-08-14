"use client"

import * as React from "react"
import { Badge } from "@/components/ui/prosera/badge"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { regionLabels, type Region } from "../data/_regions"
import type { Job, ComputedData } from "../data/_transform"
import { WeatherCapacityCallout } from "../_components/weather-strip"
import { IntelModuleOverlay } from "../_components/intel-board"
import { AgenticFocusHero } from "../_components/agentic-hero"
import { KpiStrip } from "../_components/hub/kpi-strip"
import { PriorityCard } from "../_components/hub/priority-card"
import { AppTileGrid, type AppTileItem } from "../_components/hub/app-tile-grid"
import { AddTileModal } from "../_components/hub/add-tile-modal"
import { CreateAppModal } from "../_components/create-app-modal"
import { ControlButton } from "../_components/hub/control-button"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { SpecRenderer, summarizeSpec } from "../_components/spec-renderer"
import { toastMotion } from "../_components/motion"
import { KPI_REASONING, reasoningFromKpi } from "../_components/reasoning-helpers"
import { getPortfolioWeatherSummary } from "../data/_weather"
import type { IntelModule, ModuleSummary } from "../_modules/types"

const BOARD_ID = "process-velocity"

const DEFAULT_TILE_ORDER = [
  "lag-aging",
  "invoice-alerts",
  "velocity-region",
  "slowest-customers",
  "weather-capacity",
]

/** Fixed cohort reference date (data is historical) — avoids impure Date.now() in render. */
const COHORT_NOW_MS = new Date("2026-06-03T00:00:00Z").getTime()

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

function fmtUsd(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

function fmtDays(n: number): string {
  return `${n.toFixed(n < 10 ? 1 : 0)} days`
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

/* ------------------------------------------------------------------ */
/*  CI-05 Computation — Invoice Lag Monitoring                         */
/* ------------------------------------------------------------------ */

const TARGET_LAG_DAYS = 2 // 48-hour target from completion to first invoice

interface LagBucket {
  label: string
  count: number
  color: string
  tone: "good" | "warn" | "bad"
}

interface RegionLag {
  region: Region
  invoicedCount: number
  medianLag: number
  uninvoicedCount: number
}

interface CustomerLag {
  customerName: string
  region: Region
  invoicedCount: number
  avgLag: number
  uninvoicedCount: number
  cashTiedUp: number
}

interface AlertRow {
  jobNumber: number
  customerName: string
  region: Region
  jobType: string
  completedDate: Date
  ageDays: number
  status: "uninvoiced" | "late"
  lagDays: number | null
  amount: number
}

interface CI05 {
  completedCount: number
  invoicedCount: number
  /** All completed jobs with no first invoice yet */
  uninvoicedCount: number
  /** Completed jobs with no first invoice after 48+ hours — the open unbilled backlog */
  uninvoiced48hrCount: number
  /** Revenue on jobs in the 48hr+ unbilled backlog */
  uninvoiced48hrCash: number
  /** Already-invoiced jobs that took more than a week to bill */
  lateInvoiceCount: number
  medianLag: number
  p75Lag: number
  avgLag: number
  withinTargetPct: number
  cashTiedUp: number
  buckets: LagBucket[]
  byRegion: RegionLag[]
  worstCustomers: CustomerLag[]
  alerts: AlertRow[]
}

function completionAgeDays(completedDate: Date, nowMs: number): number {
  return (nowMs - completedDate.getTime()) / (1000 * 60 * 60 * 24)
}

function computeCI05(jobs: Job[]): CI05 {
  {
    // Reference "now" = latest completion in the cohort (data is historical).
    let latest = 0
    for (const j of jobs) {
      if (j.completedDate) latest = Math.max(latest, j.completedDate.getTime())
    }
    const nowMs = latest || COHORT_NOW_MS

    const completed = jobs.filter(j => !j.excluded && j.completedDate)
    const invoiced = completed.filter(j => j.firstInvoiceCreated && j.invoiceLagDays != null)
    const uninvoiced = completed.filter(j => !j.firstInvoiceCreated)
    const uninvoiced48hr = uninvoiced.filter(j => completionAgeDays(j.completedDate!, nowMs) > TARGET_LAG_DAYS)
    const lateInvoiced = invoiced.filter(j => (j.invoiceLagDays ?? 0) > 7)

    const lags = invoiced.map(j => Math.max(0, j.invoiceLagDays!)).sort((a, b) => a - b)
    const med = median(lags)
    const p75 = percentile(lags, 75)
    const avg = lags.length > 0 ? lags.reduce((s, d) => s + d, 0) / lags.length : 0
    const withinTarget = lags.filter(d => d <= TARGET_LAG_DAYS).length
    const withinTargetPct = lags.length > 0 ? withinTarget / lags.length : 0

    const cashTiedUp = uninvoiced.reduce((s, j) => s + (j.totalAmount ?? j.totalAmountQuoted ?? 0), 0)
    const uninvoiced48hrCash = uninvoiced48hr.reduce((s, j) => s + (j.totalAmount ?? j.totalAmountQuoted ?? 0), 0)

    // Aging buckets on invoiced lag
    const b0 = lags.filter(d => d <= 2).length
    const b1 = lags.filter(d => d > 2 && d <= 7).length
    const b2 = lags.filter(d => d > 7 && d <= 14).length
    const b3 = lags.filter(d => d > 14 && d <= 30).length
    const b4 = lags.filter(d => d > 30).length
    const buckets: LagBucket[] = [
      { label: "≤2d (target)", count: b0, color: "bg-emerald-500", tone: "good" },
      { label: "3–7d", count: b1, color: "bg-yellow-500", tone: "warn" },
      { label: "8–14d", count: b2, color: "bg-amber-500", tone: "warn" },
      { label: "15–30d", count: b3, color: "bg-orange-500", tone: "bad" },
      { label: "30d+", count: b4, color: "bg-red-500", tone: "bad" },
    ]

    // By region
    const regionMap = new Map<Region, { lags: number[]; uninvoiced: number }>()
    for (const j of invoiced) {
      const e = regionMap.get(j.region) ?? { lags: [], uninvoiced: 0 }
      e.lags.push(Math.max(0, j.invoiceLagDays!))
      regionMap.set(j.region, e)
    }
    for (const j of uninvoiced48hr) {
      const e = regionMap.get(j.region) ?? { lags: [], uninvoiced: 0 }
      e.uninvoiced++
      regionMap.set(j.region, e)
    }
    const byRegion: RegionLag[] = [...regionMap.entries()]
      .map(([region, e]) => ({
        region,
        invoicedCount: e.lags.length,
        medianLag: median([...e.lags].sort((a, b) => a - b)),
        uninvoicedCount: e.uninvoiced,
      }))
      .sort((a, b) => b.medianLag - a.medianLag)

    // Worst customers by average lag (min 2 invoiced jobs)
    const custMap = new Map<string, { region: Region; lags: number[]; uninvoiced: number; cash: number }>()
    for (const j of invoiced) {
      const e = custMap.get(j.customerName) ?? { region: j.region, lags: [], uninvoiced: 0, cash: 0 }
      e.lags.push(Math.max(0, j.invoiceLagDays!))
      custMap.set(j.customerName, e)
    }
    for (const j of uninvoiced) {
      const e = custMap.get(j.customerName) ?? { region: j.region, lags: [], uninvoiced: 0, cash: 0 }
      e.uninvoiced++
      e.cash += j.totalAmount ?? j.totalAmountQuoted ?? 0
      custMap.set(j.customerName, e)
    }
    const worstCustomers: CustomerLag[] = [...custMap.entries()]
      .map(([customerName, e]) => ({
        customerName,
        region: e.region,
        invoicedCount: e.lags.length,
        avgLag: e.lags.length > 0 ? e.lags.reduce((s, d) => s + d, 0) / e.lags.length : 0,
        uninvoicedCount: e.uninvoiced,
        cashTiedUp: e.cash,
      }))
      .filter(c => c.invoicedCount >= 2 || c.uninvoicedCount > 0)
      .sort((a, b) => (b.avgLag + b.uninvoicedCount * 5) - (a.avgLag + a.uninvoicedCount * 5))
      .slice(0, 10)

    // Alerts: 48hr+ uninvoiced completions + late invoiced (>7d)
    const alerts: AlertRow[] = [
      ...uninvoiced48hr.map(j => ({
        jobNumber: j.jobNumber,
        customerName: j.customerName,
        region: j.region,
        jobType: j.jobType,
        completedDate: j.completedDate!,
        ageDays: completionAgeDays(j.completedDate!, nowMs),
        status: "uninvoiced" as const,
        lagDays: null,
        amount: j.totalAmount ?? j.totalAmountQuoted ?? 0,
      })),
      ...lateInvoiced.map(j => ({
        jobNumber: j.jobNumber,
        customerName: j.customerName,
        region: j.region,
        jobType: j.jobType,
        completedDate: j.completedDate!,
        ageDays: Math.max(0, j.invoiceLagDays!),
        status: "late" as const,
        lagDays: Math.max(0, j.invoiceLagDays!),
        amount: j.totalAmount ?? 0,
      })),
    ]
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, 20)

    return {
      completedCount: completed.length,
      invoicedCount: invoiced.length,
      uninvoicedCount: uninvoiced.length,
      uninvoiced48hrCount: uninvoiced48hr.length,
      uninvoiced48hrCash,
      lateInvoiceCount: lateInvoiced.length,
      medianLag: med,
      p75Lag: p75,
      avgLag: avg,
      withinTargetPct,
      cashTiedUp,
      buckets,
      byRegion,
      worstCustomers,
      alerts,
    }
  }
}

function useCI05(jobs: Job[]): CI05 {
  return React.useMemo(() => computeCI05(jobs), [jobs])
}

/* ------------------------------------------------------------------ */
/*  Aging Distribution                                                 */
/* ------------------------------------------------------------------ */

function AgingDistribution({ buckets }: { buckets: LagBucket[] }) {
  const total = buckets.reduce((s, b) => s + b.count, 0)
  if (total === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex h-10 overflow-hidden rounded-lg">
        {buckets.map(b => {
          if (b.count === 0) return null
          const pct = (b.count / total) * 100
          return (
            <div key={b.label} className={`${b.color} flex items-center justify-center text-[10px] font-medium text-white`}
              style={{ width: `${pct}%`, minWidth: b.count > 0 ? 44 : 0 }} title={`${b.label}: ${b.count} jobs`}>
              <span className="truncate px-1">{b.count}</span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {buckets.map(b => (
          <span key={b.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`inline-block h-2 w-2 rounded-full ${b.color}`} />
            {b.label}<span className="font-mono">{b.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Modular app sections                                               */
/* ------------------------------------------------------------------ */

function usePvData(): CI05 {
  const { data } = useStore()
  return React.useMemo(() => computeCI05(data.jobs), [data.jobs])
}

function LagAgingDetail() {
  const ci05 = usePvData()
  return (
    <div className="space-y-6">
      <KpiStrip
        variant="unified"
        items={[
          {
            label: "Median days-to-invoice",
            value: fmtDays(ci05.medianLag),
            tone: ci05.medianLag <= TARGET_LAG_DAYS ? "positive" : ci05.medianLag <= 7 ? "warning" : "critical",
            reasoning: KPI_REASONING.medianInvoiceLag(ci05.medianLag, ci05.invoicedCount),
          },
          {
            label: "48hr target rate",
            value: `${(ci05.withinTargetPct * 100).toFixed(0)}%`,
            sublabel: "historical · already invoiced",
            tone: ci05.withinTargetPct >= 0.6 ? "positive" : ci05.withinTargetPct >= 0.4 ? "warning" : "critical",
            reasoning: KPI_REASONING.withinTargetPct(ci05.withinTargetPct, TARGET_LAG_DAYS),
          },
          {
            label: "Unbilled backlog",
            value: ci05.uninvoiced48hrCount.toLocaleString(),
            sublabel: "open · 48hr+ since completion",
            tone: ci05.uninvoiced48hrCount > 0 ? "critical" : "positive",
            reasoning: reasoningFromKpi(
              "Unbilled backlog",
              "Completed jobs with no first invoice after 48+ hours — live open count.",
              {
                equations: [`uninvoiced48hr = COUNT(completed AND NOT invoiced AND age > ${TARGET_LAG_DAYS}d) = ${ci05.uninvoiced48hrCount}`],
                sources: ["Internal — Platform job export (_raw.ts)"],
              },
            ),
          },
          {
            label: "Cash tied up",
            value: fmtUsd(ci05.uninvoiced48hrCash),
            tone: "warning",
            reasoning: KPI_REASONING.cashTiedUp(ci05.uninvoiced48hrCash, ci05.uninvoiced48hrCount),
          },
        ]}
      />
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Invoice lag aging</h3>
          <span className="text-[10px] text-[var(--color-text-muted)]/70">days from completion to first invoice</span>
        </div>
        <AgingDistribution buckets={ci05.buckets} />
      </section>
    </div>
  )
}

function VelocityByRegionDetail() {
  const ci05 = usePvData()
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium text-right">Invoiced jobs</th>
              <th className="px-4 py-3 font-medium text-right">Median lag</th>
              <th className="px-4 py-3 font-medium text-right">Uninvoiced 48hr+</th>
            </tr>
          </thead>
          <tbody>
            {ci05.byRegion.map(r => (
              <tr key={r.region} className="border-b border-[var(--color-border-default)]/60 last:border-0">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{regionLabels[r.region] ?? r.region}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--color-text-secondary)]">{r.invoicedCount.toLocaleString()}</td>
                <td className={cn(
                  "px-4 py-2.5 text-right font-mono tabular-nums",
                  r.medianLag > 7 ? "text-[var(--color-accent-critical)]" : r.medianLag > TARGET_LAG_DAYS ? "text-[var(--color-accent-warning)]" : "text-[var(--color-accent-positive)]",
                )}>{fmtDays(r.medianLag)}</td>
                <td className={cn(
                  "px-4 py-2.5 text-right font-mono tabular-nums",
                  r.uninvoicedCount > 0 ? "text-[var(--color-accent-critical)]" : "text-[var(--color-text-muted)]",
                )}>{r.uninvoicedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SlowestCustomersDetail() {
  const ci05 = usePvData()
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium text-right">Invoiced jobs</th>
              <th className="px-4 py-3 font-medium text-right">Avg lag</th>
              <th className="px-4 py-3 font-medium text-right">Uninvoiced</th>
              <th className="px-4 py-3 font-medium text-right">Cash tied up</th>
            </tr>
          </thead>
          <tbody>
            {ci05.worstCustomers.map(c => (
              <tr key={c.customerName} className="border-b border-[var(--color-border-default)]/60 last:border-0">
                <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{c.customerName}</td>
                <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">{c.region}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--color-text-secondary)]">{c.invoicedCount}</td>
                <td className={cn(
                  "px-4 py-2.5 text-right font-mono tabular-nums",
                  c.avgLag > 7 ? "text-[var(--color-accent-critical)]" : c.avgLag > TARGET_LAG_DAYS ? "text-[var(--color-accent-warning)]" : "text-[var(--color-text-primary)]",
                )}>{fmtDays(c.avgLag)}</td>
                <td className={cn(
                  "px-4 py-2.5 text-right font-mono tabular-nums",
                  c.uninvoicedCount > 0 ? "text-[var(--color-accent-critical)]" : "text-[var(--color-text-muted)]",
                )}>{c.uninvoicedCount}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--color-text-secondary)]">{c.cashTiedUp > 0 ? fmtUsd(c.cashTiedUp) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InvoiceAlertsDetail() {
  const ci05 = usePvData()
  if (ci05.alerts.length === 0) {
    return (
      <p className="rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        No invoicing alerts — every completed job is billed within target.
      </p>
    )
  }
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-left text-xs text-[var(--color-text-muted)]">
              <th className="px-4 py-3 font-medium">Job #</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium text-right">Age / lag</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {ci05.alerts.map(a => (
              <tr key={`${a.jobNumber}-${a.status}`} className="border-b border-[var(--color-border-default)]/60 transition-colors last:border-0 hover:bg-[var(--color-bg-subtle)]">
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-secondary)]">{a.jobNumber}</td>
                <td className="max-w-[180px] truncate px-4 py-2.5 text-[var(--color-text-primary)]">{a.customerName}</td>
                <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">{a.jobType}</td>
                <td className="px-4 py-2.5 text-xs text-[var(--color-text-secondary)]">{regionLabels[a.region] ?? a.region}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">{fmtDays(a.ageDays)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">{a.amount > 0 ? fmtUsd(a.amount) : "—"}</td>
                <td className="px-4 py-2.5 text-center">
                  <Badge variant="outline" className={cn("text-[10px]", a.status === "uninvoiced" ? "border-red-400 text-red-500" : "border-amber-400 text-amber-500")}>
                    {a.status === "uninvoiced" ? "Uninvoiced" : "Late invoice"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WeatherCapacityDetail() {
  return <WeatherCapacityCallout />
}

/* ------------------------------------------------------------------ */
/*  Module registry                                                    */
/* ------------------------------------------------------------------ */

const PROCESS_MODULES: IntelModule[] = [
  {
    id: "lag-aging",
    title: "Invoice Lag & Aging",
    icon: "Timer",
    category: "process",
    Detail: LagAgingDetail,
    sendToLoop: { label: "Send to Action Centre" },
    summary: (data: ComputedData): ModuleSummary => {
      const ci = computeCI05(data.jobs)
      return {
        headline: `Historical review: median ${fmtDays(ci.medianLag)} to first invoice — ${(ci.withinTargetPct * 100).toFixed(0)}% of invoiced jobs hit the 48-hour target.`,
        severity: ci.medianLag > 7 ? "high" : ci.medianLag > TARGET_LAG_DAYS ? "medium" : "info",
        figures: [
          { label: "Median lag", value: fmtDays(ci.medianLag), tone: ci.medianLag <= TARGET_LAG_DAYS ? "good" : "bad" },
          { label: "48hr target rate", value: `${(ci.withinTargetPct * 100).toFixed(0)}%`, tone: ci.withinTargetPct >= 0.6 ? "good" : "bad" },
          { label: "Cash tied up", value: fmtUsd(ci.cashTiedUp), tone: "bad" },
        ],
      }
    },
  },
  {
    id: "velocity-region",
    title: "Invoicing Velocity by Region",
    icon: "Map",
    category: "process",
    Detail: VelocityByRegionDetail,
    sendToLoop: { label: "Send to Action Centre" },
    summary: (data: ComputedData): ModuleSummary => {
      const ci = computeCI05(data.jobs)
      const worst = ci.byRegion[0]
      return {
        headline: worst
          ? `${regionLabels[worst.region] ?? worst.region} is the slowest region at ${fmtDays(worst.medianLag)} median invoice lag.`
          : "Invoice lag is even across regions.",
        severity: worst && worst.medianLag > 7 ? "high" : "info",
        figures: [
          { label: "Regions", value: ci.byRegion.length.toString(), tone: "neutral" },
          { label: "Slowest median", value: worst ? fmtDays(worst.medianLag) : "—", tone: worst && worst.medianLag > 7 ? "bad" : "neutral" },
          { label: "Unbilled backlog", value: ci.uninvoiced48hrCount.toString(), tone: ci.uninvoiced48hrCount > 0 ? "bad" : "good" },
        ],
      }
    },
  },
  {
    id: "slowest-customers",
    title: "Slowest-to-Invoice Customers",
    icon: "Users",
    category: "process",
    Detail: SlowestCustomersDetail,
    sendToLoop: { label: "Send to Action Centre" },
    summary: (data: ComputedData): ModuleSummary => {
      const ci = computeCI05(data.jobs)
      const top = ci.worstCustomers[0]
      return {
        headline: top
          ? `${top.customerName} averages ${fmtDays(top.avgLag)} to invoice${top.cashTiedUp > 0 ? ` with ${fmtUsd(top.cashTiedUp)} unbilled` : ""}.`
          : "No customers are lagging on invoicing.",
        severity: top && top.avgLag > 7 ? "high" : "medium",
        figures: [
          { label: "Customers flagged", value: ci.worstCustomers.length.toString(), tone: "neutral" },
          { label: "Worst avg lag", value: top ? fmtDays(top.avgLag) : "—", tone: top && top.avgLag > 7 ? "bad" : "neutral" },
        ],
      }
    },
  },
  {
    id: "invoice-alerts",
    title: "Billing Alerts",
    icon: "TriangleAlert",
    category: "process",
    Detail: InvoiceAlertsDetail,
    sendToLoop: { label: "Send to Action Centre" },
    summary: (data: ComputedData): ModuleSummary => {
      const ci = computeCI05(data.jobs)
      return {
        headline: ci.alerts.length > 0
          ? `${ci.uninvoiced48hrCount} unbilled backlog job${ci.uninvoiced48hrCount !== 1 ? "s" : ""}${ci.lateInvoiceCount > 0 ? ` plus ${ci.lateInvoiceCount} late-invoice job${ci.lateInvoiceCount !== 1 ? "s" : ""}` : ""} need billing attention.`
          : "No billing alerts — every completed job is billed within target.",
        severity: ci.alerts.length > 0 ? "critical" : "info",
        figures: [
          { label: "Unbilled backlog", value: ci.uninvoiced48hrCount.toString(), tone: ci.uninvoiced48hrCount > 0 ? "bad" : "good" },
          { label: "Late invoices", value: ci.lateInvoiceCount.toString(), tone: ci.lateInvoiceCount > 0 ? "bad" : "good" },
          { label: "Backlog cash", value: fmtUsd(ci.uninvoiced48hrCash), tone: ci.uninvoiced48hrCash > 0 ? "bad" : "good" },
        ],
      }
    },
  },
  {
    id: "weather-capacity",
    title: "Weather → Capacity",
    icon: "CloudLightning",
    category: "weather",
    Detail: WeatherCapacityDetail,
    summary: (): ModuleSummary => ({
      headline: "Forecast demand that could slow the completion-to-invoice handoff if crew capacity is already tight.",
      severity: "info",
      figures: [{ label: "Signal", value: "Weather", tone: "neutral" }],
    }),
  },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function ProcessVelocityPage() {
  const {
    data,
    setPage,
    setFocusMission,
    openModule,
    customApps,
    getBoard,
    setBoardOrder,
    setModuleHidden,
    deleteCustomApp,
    restoreCustomApp,
  } = useStore()
  const ci05 = useCI05(data.jobs)
  const weather = React.useMemo(() => getPortfolioWeatherSummary(), [])

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [loadingTileId, setLoadingTileId] = React.useState<string | null>(null)
  const [openCustomSpecId, setOpenCustomSpecId] = React.useState<string | null>(null)
  const [undoState, setUndoState] = React.useState<{ title: string; fn: () => void } | null>(null)

  React.useEffect(() => {
    if (!undoState) return
    const t = setTimeout(() => setUndoState(null), 9000)
    return () => clearTimeout(t)
  }, [undoState])

  const slowest = ci05.byRegion[0]
  const heroBody = `On average it takes ${fmtDays(ci05.medianLag)} to send the first invoice after a job — only ${(ci05.withinTargetPct * 100).toFixed(0)}% of already-invoiced jobs met the two-day target${slowest ? `, and ${regionLabels[slowest.region] ?? slowest.region} is slowest at ${fmtDays(slowest.medianLag)}` : ""}. Separately, ${ci05.uninvoiced48hrCount.toLocaleString()} completed job${ci05.uninvoiced48hrCount !== 1 ? "s" : ""} remain${ci05.uninvoiced48hrCount === 1 ? "s" : ""} in the open unbilled backlog (48hr+ with no invoice). Speeding up the hand-off from finished job to invoice is the quickest way to free up cash.`

  const goActionBoard = () => {
    setFocusMission(null)
    setPage("operating-loop")
  }

  const builtinTiles: AppTileItem[] = React.useMemo(
    () =>
      PROCESS_MODULES.map((m) => {
        const summary = m.summary(data)
        return {
          id: m.id,
          label: m.title,
          metric: summary.figures[0]?.value ?? "—",
          icon: m.icon,
          onClick: () => openModule(m.id),
        }
      }),
    [data, openModule],
  )

  const customTiles: AppTileItem[] = React.useMemo(
    () =>
      customApps.map((spec) => ({
        id: `app:${spec.id}`,
        label: spec.title,
        metric: summarizeSpec(spec, data).figures[0]?.value ?? "—",
        icon: spec.icon,
        onClick: () => setOpenCustomSpecId(spec.id),
      })),
    [customApps, data],
  )

  const allTiles = React.useMemo(() => [...builtinTiles, ...customTiles], [builtinTiles, customTiles])
  const tileById = React.useMemo(() => new Map(allTiles.map((t) => [t.id, t])), [allTiles])

  const board = getBoard(BOARD_ID)

  const fullOrder = React.useMemo(() => {
    const ids = new Set(allTiles.map((t) => t.id))
    const known =
      board.order.length > 0
        ? board.order.filter((id) => ids.has(id))
        : DEFAULT_TILE_ORDER.filter((id) => ids.has(id))
    const missing = allTiles.map((t) => t.id).filter((id) => !known.includes(id))
    return [...known, ...missing]
  }, [board.order, allTiles])

  const visibleIds = React.useMemo(
    () => fullOrder.filter((id) => !board.hidden.includes(id)).slice(0, 6),
    [fullOrder, board.hidden],
  )

  const visibleTiles = React.useMemo(
    () => visibleIds.map((id) => tileById.get(id)!).filter(Boolean),
    [visibleIds, tileById],
  )

  const availableTiles = React.useMemo(
    () => allTiles.filter((t) => !visibleIds.includes(t.id)),
    [allTiles, visibleIds],
  )

  const handleReorder = React.useCallback(
    (reorderedVisibleIds: string[]) => {
      const notVisible = fullOrder.filter((id) => !visibleIds.includes(id))
      setBoardOrder(BOARD_ID, [...reorderedVisibleIds, ...notVisible])
    },
    [fullOrder, visibleIds, setBoardOrder],
  )

  const handleAddTile = React.useCallback(
    (id: string) => {
      if (board.hidden.includes(id)) setModuleHidden(BOARD_ID, id, false)
      setBoardOrder(BOARD_ID, [id, ...fullOrder.filter((x) => x !== id)])
      setLibraryOpen(false)
    },
    [board.hidden, fullOrder, setBoardOrder, setModuleHidden],
  )

  const handleRemove = React.useCallback(
    (id: string) => {
      const tile = tileById.get(id)
      if (!tile) return

      if (id.startsWith("app:")) {
        const rawId = id.replace(/^app:/, "")
        deleteCustomApp(rawId)
        setUndoState({
          title: tile.label,
          fn: () => restoreCustomApp(rawId),
        })
      } else {
        setModuleHidden(BOARD_ID, id, true)
        setUndoState({
          title: tile.label,
          fn: () => setModuleHidden(BOARD_ID, id, false),
        })
      }
    },
    [tileById, deleteCustomApp, restoreCustomApp, setModuleHidden],
  )

  const handleCustomAppCreated = React.useCallback(
    (id: string) => {
      const tileId = `app:${id}`
      const prevVisible = fullOrder.filter((x) => !board.hidden.includes(x)).slice(0, 6)
      const prevSixth = prevVisible[5]

      const next = [tileId, ...fullOrder.filter((x) => x !== tileId)]
      setBoardOrder(BOARD_ID, next)

      const newVisible = next.filter((x) => !board.hidden.includes(x))
      if (newVisible.length > 6 && prevSixth) {
        setModuleHidden(BOARD_ID, prevSixth, true)
      }

      setLoadingTileId(tileId)
      setTimeout(() => setLoadingTileId(null), 700)
      setCreateOpen(false)
    },
    [fullOrder, board.hidden, setBoardOrder, setModuleHidden],
  )

  const openCustomSpec = openCustomSpecId ? customApps.find((s) => s.id === openCustomSpecId) : null

  return (
    <div className="space-y-7">
      <AgenticFocusHero
        eyebrow="Operations focus · from BluePilot"
        staticHeadline={`${(ci05.withinTargetPct * 100).toFixed(0)}% of invoiced jobs hit the two-day first-invoice target.`}
        staticBody={heroBody}
        staticReasoning={{
          summary: "Invoice lag computed from completion-to-first-invoice timestamps across all validated jobs.",
          evidence: [
            `Historical 48hr target rate: ${(ci05.withinTargetPct * 100).toFixed(0)}% of ${ci05.invoicedCount.toLocaleString()} invoiced jobs`,
            `Open unbilled backlog: ${ci05.uninvoiced48hrCount.toLocaleString()} jobs 48hr+ since completion · ${fmtUsd(ci05.uninvoiced48hrCash)} tied up`,
            ci05.lateInvoiceCount > 0
              ? `${ci05.lateInvoiceCount.toLocaleString()} additional late-invoice alert${ci05.lateInvoiceCount !== 1 ? "s" : ""} (already billed, but took >7 days)`
              : null,
          ].filter(Boolean) as string[],
          conclusion: "Accelerating the job-to-invoice handoff is the fastest path to cash recovery.",
        }}
        agentReasoningSummary="BluePilot analyzed invoice lag, aging buckets, and unbilled backlog across the portfolio."
        ctaLabel="Fix invoicing lag"
        onCta={goActionBoard}
        stats={[
          { value: fmtDays(ci05.medianLag), label: "median lag" },
          { value: fmtUsd(ci05.uninvoiced48hrCash), label: "tied up" },
        ]}
      />

      <KpiStrip
        variant="unified"
        items={[
          {
            label: "Median lag",
            value: fmtDays(ci05.medianLag),
            tone: ci05.medianLag > 7 ? "warning" : "neutral",
            reasoning: KPI_REASONING.medianInvoiceLag(ci05.medianLag, ci05.invoicedCount),
          },
          {
            label: "48hr target rate",
            value: `${(ci05.withinTargetPct * 100).toFixed(0)}%`,
            sublabel: "historical · already invoiced",
            tone: ci05.withinTargetPct >= 0.5 ? "positive" : "warning",
            reasoning: KPI_REASONING.withinTargetPct(ci05.withinTargetPct, TARGET_LAG_DAYS),
          },
          {
            label: "Unbilled backlog",
            value: String(ci05.uninvoiced48hrCount),
            sublabel: "open · 48hr+ since completion",
            tone: ci05.uninvoiced48hrCount > 0 ? "critical" : "positive",
            reasoning: reasoningFromKpi(
              "Unbilled backlog",
              "Completed jobs with no first invoice after 48+ hours — live open count.",
              {
                equations: [`uninvoiced48hr = COUNT(completed AND NOT invoiced AND age > ${TARGET_LAG_DAYS}d) = ${ci05.uninvoiced48hrCount}`],
                sources: ["Internal — Platform job export (_raw.ts)"],
              },
            ),
          },
          {
            label: "Cash tied up",
            value: fmtUsd(ci05.uninvoiced48hrCash),
            tone: "warning",
            reasoning: KPI_REASONING.cashTiedUp(ci05.uninvoiced48hrCash, ci05.uninvoiced48hrCount),
          },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <PriorityCard
          title="Invoice Lag & Aging"
          tag="Historical review"
          tagTone="process"
          headline={`${(ci05.withinTargetPct * 100).toFixed(0)}%`}
          headlineSub="of invoiced jobs met the 48-hr target"
          detail={`Historical cohort review across ${ci05.invoicedCount.toLocaleString()} completed jobs that already have invoices — only ${(ci05.withinTargetPct * 100).toFixed(0)}% were billed within two days. Median lag is ${fmtDays(ci05.medianLag)}. This measures past billing speed, not open unbilled jobs.`}
          figureValue={`${(ci05.withinTargetPct * 100).toFixed(0)}%`}
          figureTone="bad"
          reasoning={{
            summary: "Historical review of days-to-invoice on jobs that already have a first invoice.",
            evidence: [
              `${ci05.invoicedCount.toLocaleString()} invoiced jobs in cohort`,
              `Median lag: ${fmtDays(ci05.medianLag)}`,
            ],
            conclusion: "Tighten dispatch-to-billing handoff to improve the historical target rate on future jobs.",
          }}
        />
        <PriorityCard
          title="Unbilled Backlog"
          tag="Open now"
          tagTone="watch"
          headline={String(ci05.uninvoiced48hrCount)}
          headlineSub="awaiting first invoice · 48hr+ since completion"
          detail={[
            `${ci05.uninvoiced48hrCount.toLocaleString()} completed job${ci05.uninvoiced48hrCount !== 1 ? "s" : ""} still ha${ci05.uninvoiced48hrCount === 1 ? "s" : "ve"} no first invoice after 48+ hours — ${fmtUsd(ci05.uninvoiced48hrCash)} waiting to be collected.`,
            ci05.lateInvoiceCount > 0
              ? `Separately, ${ci05.lateInvoiceCount.toLocaleString()} already-invoiced job${ci05.lateInvoiceCount !== 1 ? "s" : ""} took more than a week to bill (see Billing Alerts tile).`
              : null,
            "This is the live backlog, separate from the historical target-rate percentage.",
          ].filter(Boolean).join(" ")}
          figureValue={String(ci05.uninvoiced48hrCount)}
          reasoning={{
            summary: "Open unbilled backlog: completed jobs with no first invoice after 48+ hours.",
            evidence: [
              `${ci05.uninvoiced48hrCount.toLocaleString()} jobs awaiting first invoice`,
              `${fmtUsd(ci05.uninvoiced48hrCash)} in unbilled revenue`,
              ...(ci05.lateInvoiceCount > 0
                ? [`${ci05.lateInvoiceCount.toLocaleString()} late-invoice alerts (already billed, >7 day lag) are tracked separately`]
                : []),
            ],
            conclusion: "Bill backlog jobs immediately to release tied-up cash.",
          }}
        />
        <PriorityCard
          title="Velocity by Region"
          tag="Process"
          tagTone="process"
          headline={slowest ? fmtDays(slowest.medianLag) : "—"}
          headlineSub={slowest ? `slowest — ${regionLabels[slowest.region] ?? slowest.region}` : "slowest region"}
          detail={slowest ? `${regionLabels[slowest.region] ?? slowest.region} lags the network; copy the fastest region's handoff.` : "Invoice lag is even across regions."}
          reasoning={
            slowest
              ? {
                  summary: "Regional median invoice lag ranked across operating regions.",
                  evidence: [
                    `Slowest: ${regionLabels[slowest.region] ?? slowest.region} at ${fmtDays(slowest.medianLag)}`,
                    `${slowest.uninvoicedCount} unbilled backlog job${slowest.uninvoicedCount !== 1 ? "s" : ""} (48hr+) in that region`,
                  ],
                  conclusion: "Replicate the fastest region's billing workflow in the lagging market.",
                }
              : undefined
          }
        />
      </div>

      {weather.activeExtremeEvents.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-5 py-4 shadow-[0_6px_16px_rgba(26,38,64,0.05)]">
          <span className="size-2 shrink-0 rounded-full bg-[var(--color-accent-warning)]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">Weather → Capacity signal</p>
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              {weather.activeExtremeEvents.length} forecast demand window{weather.activeExtremeEvents.length !== 1 ? "s" : ""} ahead — stage invoicing and crew capacity before the surge slows your handoff.
            </p>
          </div>
          <ControlButton onClick={() => openModule("weather-capacity")}>
            View forecast →
          </ControlButton>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">All apps</h2>
          <div className="flex gap-2">
            <ControlButton onClick={() => setCreateOpen(true)}>
              Create app
            </ControlButton>
            {!editing ? (
              <ControlButton icon="LayoutGrid" onClick={() => setEditing(true)}>
                Customize
              </ControlButton>
            ) : (
              <>
                <ControlButton icon="Plus" onClick={() => setLibraryOpen(true)}>
                  Add New
                </ControlButton>
                <ControlButton active icon="Check" onClick={() => setEditing(false)}>
                  Save
                </ControlButton>
              </>
            )}
          </div>
        </div>

        <AppTileGrid
          items={visibleTiles}
          editing={editing}
          loadingTileId={loadingTileId}
          onReorder={handleReorder}
          onRemove={handleRemove}
        />

        {editing && (
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Drag to reorder · × remove · layout saves automatically.
          </p>
        )}
      </div>

      {createOpen && (
        <CreateAppModal onClose={() => setCreateOpen(false)} onCreated={handleCustomAppCreated} />
      )}

      {libraryOpen && (
        <AddTileModal
          available={availableTiles}
          onAdd={handleAddTile}
          onClose={() => setLibraryOpen(false)}
        />
      )}

      {openCustomSpec && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpenCustomSpecId(null)}
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-5 py-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{openCustomSpec.title}</h3>
              <button
                type="button"
                onClick={() => setOpenCustomSpecId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--color-bg-subtle)]"
              >
                <SafeIcon name="X" className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <SpecRenderer spec={openCustomSpec} />
            </div>
          </div>
        </div>
      )}

      {undoState && (
        <div
          className={cn(
            toastMotion().className,
            "fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-2.5 shadow-2xl",
          )}
        >
          <SafeIcon name="Trash2" className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          <span className="text-[12px] text-[var(--color-text-primary)]">
            Removed <span className="font-medium">{undoState.title}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              undoState.fn()
              setUndoState(null)
            }}
            className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[12px] font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--color-tint-brand)]"
          >
            <SafeIcon name="Undo2" className="h-3.5 w-3.5" /> Undo
          </button>
        </div>
      )}

      <IntelModuleOverlay modules={PROCESS_MODULES} />
    </div>
  )
}
