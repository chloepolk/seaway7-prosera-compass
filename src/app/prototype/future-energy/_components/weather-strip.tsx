"use client"

import { localizeActiveCopy } from "../_i18n/legacy"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/prosera/card"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import type { Region } from "../data/_regions"
import {
  getUrgencyAlerts,
  getUrgencyAlertsForRegion,
  getWeatherSummaryForRegion,
  getPortfolioWeatherSummary,
  type UrgencyAlert,
  type PricingPower,
} from "../data/_weather"
import { personForRole } from "../_diamond/org"
import { getInitials } from "../_diamond/stages"
import { useStore } from "../_store"

const powerStyle: Record<PricingPower, { label: string; chip: string; dot: string }> = {
  high: { label: "HIGH PRICING POWER", chip: "bg-red-500/15 text-red-700 dark:text-red-400", dot: "bg-red-500" },
  elevated: { label: "ELEVATED", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  normal: { label: "NORMAL", chip: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
}

function AlertRow({ a }: { a: UrgencyAlert }) {
  const s = powerStyle[a.pricingPower]

  return (
    <div className="flex items-start gap-3 rounded-md bg-muted/30 px-3 py-2">
      <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{a.regionLabel}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{a.window}</span>
          <span className="text-[11px] text-muted-foreground">{a.eventType}</span>
          <span className={`rounded-sm px-1.5 py-0.5 text-[8px] font-semibold tracking-wide ${s.chip}`}>{localizeActiveCopy(s.label)}</span>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">{localizeActiveCopy(a.rationale)}</p>

        {a.marketIntelligence.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">{localizeActiveCopy("Assigned actions by role")}</p>
            <ol className="space-y-1.5">
              {a.marketIntelligence.map((step) => {
                const person = personForRole(step.owner)
                return (
                  <li key={step.order} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-foreground/10 text-[9px] font-bold tabular-nums text-foreground">{step.order}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium leading-snug text-foreground">{step.action}</p>
                      <p className="text-[10px] leading-snug text-muted-foreground">{step.how}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-accent-positive)] text-[7px] font-bold text-white">{getInitials(person.name)}</span>
                          {person.name} · {person.role}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{localizeActiveCopy("Complete when:")} {localizeActiveCopy(step.target)}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-mono text-xs font-semibold text-foreground">+{Math.round(a.demandSpikePct * 100)}%</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("demand")}</span>
      </div>
    </div>
  )
}

/**
 * Owner-assigned pricing-power market intelligence for a set of alerts. Shared by the
 * legacy strip and the unified STRIPA card (where it is the "Act" stage).
 * Collapses to `max` windows with a show-all toggle.
 */
export function WeatherMarketIntelligenceList({ alerts, max = 2 }: { alerts: UrgencyAlert[]; max?: number }) {
  const [showAll, setShowAll] = React.useState(false)
  if (alerts.length === 0) {
    return <p className="text-[11px] text-muted-foreground">{localizeActiveCopy("No forecast urgency windows in the current horizon.")}</p>
  }
  const visible = showAll ? alerts : alerts.slice(0, max)
  return (
    <div className="space-y-2">
      {visible.map((a, i) => <AlertRow key={`${a.region}-${a.window}-${i}`} a={a} />)}
      {alerts.length > max && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-brand-strong)] transition-colors hover:underline"
        >
          {showAll ? "Show fewer windows" : `Show all ${alerts.length} windows`}
          <SafeIcon name={showAll ? "ChevronUp" : "ChevronDown"} className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

/**
 * Weather-driven demand + pricing-power strip.
 * - `region` scopes to a single region; omit for a portfolio roll-up.
 * - `variant` tweaks the framing copy for the host page.
 */
export function WeatherDemandStrip({
  region,
  variant = "market",
  max = 4,
  featured = false,
}: {
  region?: Region
  variant?: "velocity" | "pricing" | "market"
  max?: number
  featured?: boolean
}) {
  const alerts = React.useMemo(
    () => (region ? getUrgencyAlertsForRegion(region) : getUrgencyAlerts()),
    [region],
  )
  const visible = alerts.slice(0, max)
  const highCount = alerts.filter(a => a.pricingPower === "high").length

  const summary = React.useMemo(() => {
    if (region) {
      const w = getWeatherSummaryForRegion(region)
      return `${w.climate} · ${w.peakDemandSeason}-peak · ${w.coolingShare >= 0.5 ? "cooling-led" : "heating-led"}`
    }
    const roll = getPortfolioWeatherSummary()
    return `${roll.coolingDominantRegions.length} cooling-led · ${roll.heatingDominantRegions.length} heating-led regions`
  }, [region])

  const blurb =
    variant === "velocity"
      ? "Forecast severe weather pulls emergency demand forward — match invoicing/crew capacity to these windows to avoid lag on premium tickets."
      : variant === "pricing"
        ? "When demand spike meets fuel constraint, each window assigns a role-specific surcharge %, crew count, and re-auth path — sized from STRIPA elasticity, not generic estimates."
        : "Each window below lists owner-assigned steps with quantified surcharge %, crew staging, and account outreach — derived from demand spike and fuel exposure."

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <SafeIcon name="CloudLightning" className={`h-3.5 w-3.5 ${featured ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
        <h3 className={`text-xs font-medium uppercase tracking-wider ${featured ? "text-foreground" : "text-muted-foreground"}`}>
          Weather Demand &amp; Pricing Power
        </h3>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">{localizeActiveCopy("NOAA · EIA")}</span>
        {featured && (
          <span className="rounded-sm bg-[var(--color-tint-brand)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[var(--color-brand-strong)]">{localizeActiveCopy("Live external signal")}</span>
        )}
        {highCount > 0 && (
          <span className="rounded-sm bg-red-500/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
            {highCount} high-power window{highCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <Card className={featured ? "border-l-[3px] border-l-amber-500/70 shadow-sm" : undefined}><CardContent className="p-4 space-y-2.5">
        <p className="text-[11px] leading-snug text-muted-foreground/80">{blurb}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">{summary}</p>
        <div className="space-y-2 border-t border-border/30 pt-2.5">
          {visible.length > 0 ? (
            visible.map((a, i) => <AlertRow key={`${a.region}-${a.window}-${i}`} a={a} />)
          ) : (
            <p className="text-[11px] text-muted-foreground">{localizeActiveCopy("No forecast urgency windows in the current horizon.")}</p>
          )}
        </div>
      </CardContent></Card>
    </section>
  )
}

/**
 * Lightweight, linked weather callout for pages where the full strip would
 * duplicate the canonical (featured) version on Pricing Intel.
 */
export function WeatherCapacityCallout() {
  const { setPage } = useStore()
  const alerts = React.useMemo(() => getUrgencyAlerts(), [])
  const windowCount = alerts.length
  const highCount = alerts.filter(a => a.pricingPower === "high").length
  if (windowCount === 0) return null

  return (
    <button
      type="button"
      onClick={() => setPage("pricing-intel")}
      className="group flex w-full items-center gap-3 rounded-lg border border-l-[3px] border-l-amber-500/70 bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/40"
    >
      <SafeIcon name="CloudLightning" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] leading-snug text-foreground">
          <span className="font-semibold">{windowCount} {localizeActiveCopy(windowCount > 1 ? "forecast demand windows ahead" : "forecast demand window ahead")}</span>
          {highCount > 0 && <span className="text-muted-foreground"> ({highCount} {localizeActiveCopy("high pricing-power")})</span>}
          <span className="text-muted-foreground">{localizeActiveCopy("— stage invoicing &amp; crew capacity ahead of the surge.")}</span>
        </p>
      </div>
      <span className="shrink-0 text-[11px] font-medium text-[var(--color-brand-strong)] group-hover:underline">
        Weather pricing actions →
      </span>
    </button>
  )
}
