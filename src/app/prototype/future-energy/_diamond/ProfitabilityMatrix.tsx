"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import { formatCurrency } from "./stages"
import type { DiamondMission, MissionHorizon, MissionObjective } from "./types"
import { useT } from "../_i18n/use-t"
import { useStore } from "../_store"

/* ------------------------------------------------------------------ */
/*  Compass Profitability Matrix                                       */
/*  Every recommendation placed on two axes the CEO cares about:       */
/*  what it does to the euros (protect vs. create) and how fast      */
/*  (shock <24h / 1-30 days / >30 days), with the $ at a glance.       */
/* ------------------------------------------------------------------ */

const OBJECTIVES: { key: MissionObjective; label: string; blurb: string; accent: string; chip: string; bar: string }[] = [
  {
    key: "protection",
    label: "Value Protection",
    blurb: "Defend margin we already have",
    accent: "text-[var(--color-brand-strong)]",
    chip: "bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)] ring-[var(--color-brand-primary)]/30",
    bar: "bg-[var(--color-brand-primary)]",
  },
  {
    key: "creation",
    label: "Value Creation",
    blurb: "Grow new revenue and margin",
    accent: "text-[var(--color-accent-positive-text)]",
    chip: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)] ring-[var(--color-accent-positive)]/30",
    bar: "bg-[var(--color-accent-positive)]",
  },
]

const HORIZONS: { key: MissionHorizon; label: string; window: string; icon: string }[] = [
  { key: "shock", label: "Shock", window: "< 24 hours", icon: "Zap" },
  { key: "near", label: "Near-term", window: "1–30 days", icon: "CalendarClock" },
  { key: "long", label: "Long-term", window: "> 30 days", icon: "CalendarRange" },
]

function sumValue(missions: DiamondMission[]): number {
  return missions.reduce((acc, m) => acc + (m.realizedValue ?? m.projectedValue), 0)
}

function MatrixCell({
  missions,
  accentBar,
  selectedId,
  onSelect,
}: {
  missions: DiamondMission[]
  accentBar: string
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const t = useT()
  const { locale } = useStore()
  const total = sumValue(missions)
  const top = [...missions]
    .sort((a, b) => (b.realizedValue ?? b.projectedValue) - (a.realizedValue ?? a.projectedValue))
    .slice(0, 3)

  if (missions.length === 0) {
    return (
      <div className="flex min-h-[104px] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-center">
        <SafeIcon name="Minus" className="h-4 w-4 text-muted-foreground/40" />
        <span className="mt-1 text-[10px] font-medium text-muted-foreground/60">{t("diamond.noActions")}</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-[104px] flex-col rounded-lg border bg-card p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold tabular-nums text-foreground">{formatCurrency(total, locale)}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted-foreground">
          {t("diamond.actionsCount", { count: missions.length })}
        </span>
      </div>
      <div className="mt-1.5 space-y-1">
        {top.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/60",
              selectedId === m.id && "bg-muted",
            )}
          >
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", accentBar)} />
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">{m.name}</span>
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {formatCurrency(m.realizedValue ?? m.projectedValue, locale)}
            </span>
          </button>
        ))}
        {missions.length > top.length ? (
          <div className="px-1 text-[9px] text-muted-foreground/60">{t("diamond.more", { count: missions.length - top.length })}</div>
        ) : null}
      </div>
    </div>
  )
}

export function ProfitabilityMatrix({
  missions,
  selectedId,
  onSelect,
}: {
  missions: DiamondMission[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const t = useT()
  const { locale } = useStore()
  const grid = React.useMemo(() => {
    const map: Record<MissionObjective, Record<MissionHorizon, DiamondMission[]>> = {
      protection: { shock: [], near: [], long: [] },
      creation: { shock: [], near: [], long: [] },
    }
    for (const m of missions) map[m.valueType][m.horizon].push(m)
    return map
  }, [missions])

  const grandTotal = sumValue(missions)
  const objectiveTotals = OBJECTIVES.map(o => sumValue(HORIZONS.flatMap(h => grid[o.key][h.key])))

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("diamond.matrixTitle")}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("diamond.matrixBody")}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{t("diamond.totalAtStake")}</div>
          <div className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(grandTotal, locale)}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)] gap-2">
        {/* Header row: objective columns */}
        <div />
        {OBJECTIVES.map((o, i) => (
          <div key={o.key} className="rounded-lg bg-muted/40 px-2.5 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-[12px] font-semibold", o.accent)}>{t(o.key === "protection" ? "actionCentre.valueProtection" : "actionCentre.valueCreation")}</span>
              <span className="text-[12px] font-semibold tabular-nums text-foreground">{formatCurrency(objectiveTotals[i], locale)}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{t(o.key === "protection" ? "diamond.protectionBlurb" : "diamond.creationBlurb")}</div>
          </div>
        ))}

        {/* Horizon rows */}
        {HORIZONS.map(h => (
          <React.Fragment key={h.key}>
            <div className="flex flex-col items-center justify-center rounded-lg bg-muted/40 px-1 py-2 text-center">
              <SafeIcon name={h.icon} className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-foreground">{t(`diamond.${h.key === "shock" ? "shock" : h.key === "near" ? "near" : "long"}`)}</span>
              <span className="text-[9px] leading-tight text-muted-foreground">{t(`diamond.${h.key === "shock" ? "hours24" : h.key === "near" ? "days30" : "over30"}`)}</span>
            </div>
            {OBJECTIVES.map(o => (
              <MatrixCell
                key={`${o.key}-${h.key}`}
                missions={grid[o.key][h.key]}
                accentBar={o.bar}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
