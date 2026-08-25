"use client"

import { formatDateDMY } from "@/lib/compass/locale-display"
import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import { formatCurrency } from "./stages"
import type { PortfolioRoi } from "./adapter"
import { useT } from "../_i18n/use-t"
import { useStore } from "../_store"
import { localeTag } from "../_i18n"
import { formatMultiple } from "../_i18n/currency"
import { localizeRole } from "../_i18n/domain"

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 132
  const h = 34
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
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polygon points={area} fill="var(--color-accent-positive)" fillOpacity={0.1} />
      <polyline points={line} fill="none" stroke="var(--color-accent-positive)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {pts.length ? <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill="var(--color-accent-positive)" /> : null}
    </svg>
  )
}

function Metric({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string
  value: string
  sub?: string
  tone?: "default" | "green" | "blue" | "gold"
}) {
  const valueCls =
    tone === "green" ? "text-[var(--color-accent-positive-text)]" : tone === "blue" ? "text-[var(--color-brand-strong)]" : tone === "gold" ? "text-[var(--color-accent-warning-text)]" : "text-foreground"
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-lg font-semibold tabular-nums leading-none", valueCls)}>{value}</div>
      {sub ? <div className="mt-1 truncate text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

export function AccumulatedRoiStrip({ roi }: { roi: PortfolioRoi }) {
  const t = useT()
  const { locale } = useStore()
  const [open, setOpen] = React.useState(false)
  const avgMultiple = roi.ledger.length > 0
    ? roi.ledger.reduce((s, e) => s + e.roiMultiple, 0) / roi.ledger.length
    : 0

  return (
    <div className="rounded-2xl border border-[var(--color-accent-positive)]/25 bg-gradient-to-br from-[var(--color-accent-positive)]/[0.06] to-card shadow-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <div className="flex items-center gap-2 pr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-tint-positive)]">
            <SafeIcon name="TrendingUp" className="h-4 w-4 text-[var(--color-accent-positive-text)]" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-accent-positive-text)]">{t("diamond.portfolioValue")}</div>
            <div className="text-[10px] text-muted-foreground">{t("diamond.realizedAcross", { count: roi.missionsClosed })}</div>
          </div>
        </div>

        <Metric label={t("ledger.realized")} value={formatCurrency(roi.realizedToDate, locale)} tone="green" sub={t("diamond.investedSub", { amount: formatCurrency(roi.totalInvested, locale) })} />
        <Metric label={t("ledger.blendedRoi")} value={formatMultiple(roi.blendedRoi, locale)} tone="green" sub={t("diamond.portfolioReturn")} />
        <Metric label={t("diamond.inFlightPipeline")} value={formatCurrency(roi.inFlightProjected, locale)} tone="blue" sub={t("diamond.activeMissions", { count: roi.inFlightCount })} />
        <Metric label={t("ledger.avgMultiple")} value={formatMultiple(avgMultiple, locale)} tone="gold" sub={t("diamond.perClosedMission")} />

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block">
            <Sparkline values={roi.cumulative.map((c) => c.total)} />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <SafeIcon name="ReceiptText" className="h-3.5 w-3.5" />
            {t("diamond.ledger")}
            <SafeIcon name={open ? "ChevronUp" : "ChevronDown"} className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t px-4 py-3">
          <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span>{t("diamond.statement")}</span>
            <span className="text-right">{t("diamond.invested")}</span>
            <span className="text-right">{t("diamond.realized")}</span>
            <span className="text-right">{t("diamond.roi")}</span>
            <span className="text-right">{t("diamond.closed")}</span>
          </div>
          <div className="space-y-1">
            {roi.ledger.map((e) => (
              <div key={e.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-3 rounded-md px-1.5 py-1.5 text-[12px] hover:bg-muted/60">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{e.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{e.id} - {localizeRole(e.decisionMaker, locale)}</div>
                </div>
                <span className="text-right tabular-nums text-muted-foreground">{formatCurrency(e.cost, locale)}</span>
                <span className="text-right font-medium tabular-nums text-[var(--color-accent-positive-text)]">{formatCurrency(e.realizedValue, locale)}</span>
                <span className="text-right font-semibold tabular-nums text-[var(--color-accent-positive-text)]">{formatMultiple(e.roiMultiple, locale)}</span>
                <span className="text-right tabular-nums text-muted-foreground">{formatDateDMY(e.completionDate)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
