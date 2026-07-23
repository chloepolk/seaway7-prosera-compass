"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { useStore } from "../_store"
import { buildWeatherIntelligence, reconcileAlerts, type WeatherIntelligence } from "../data/_weather_demand"
import { getUrgencyAlerts } from "../data/_weather"
import { WeatherMarketIntelligenceList } from "./weather-strip"
import { STRIPA_BRAND as BRAND, ConfidenceBadge, StageTag, Stat, StripaCard } from "./stripa-scaffold"

function fmtUsd(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

function pct(n: number, digits = 0): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${names[m - 1]} '${String(y).slice(2)}`
}

export function WeatherStripaPanel() {
  const { data } = useStore()
  const wi: WeatherIntelligence = React.useMemo(() => buildWeatherIntelligence(data.jobs), [data.jobs])
  const alerts = React.useMemo(() => reconcileAlerts(getUrgencyAlerts(), wi), [wi])

  const { series, fit, inference, forecast, forecastLow, forecastHigh, horizonMonths, confidence } = wi

  if (series.length < 4 || fit.n < 4) {
    return null
  }

  const topEvidence = series.slice(0, 4)
  const slopePerPt = fit.slope
  const highPowerCount = alerts.filter(a => a.pricingPower === "high").length

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SafeIcon name="Activity" className="h-3.5 w-3.5 text-[var(--color-brand-strong)]" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-foreground">Weather → Demand Intelligence</h3>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">STRIPA · NOAA history × ACME jobs</span>
        {highPowerCount > 0 && (
          <span className="rounded-sm bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
            {highPowerCount} high pricing-power
          </span>
        )}
        <ConfidenceBadge confidence={confidence} />
      </div>

      <StripaCard>
          {/* S + TR */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Surface */}
            <div className="space-y-2.5">
              <StageTag tag="S" label="Surface" />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Indexed {series.length} region-months of weather against ACME job history. Highest-severity months show the demand co-movement:
              </p>
              <div className="space-y-1">
                {topEvidence.map(p => (
                  <div key={`${p.region}-${p.month}`} className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 shrink-0 font-medium text-foreground">{p.regionLabel.replace("Region ", "")}</span>
                    <span className="w-12 shrink-0 text-muted-foreground">{monthLabel(p.month)}</span>
                    <span className="flex h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      <span className="h-full rounded-full" style={{ width: `${p.weatherIndex}%`, backgroundColor: BRAND }} />
                    </span>
                    <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">idx {p.weatherIndex}</span>
                    <span className={`w-12 shrink-0 text-right font-semibold tabular-nums ${p.demandLiftPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {pct(p.demandLiftPct)}
                    </span>
                    {p.hasEvent && <SafeIcon name="Zap" className="h-3 w-3 shrink-0 text-amber-500" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Trend */}
            <div className="space-y-2.5">
              <StageTag tag="TR" label="Trend" />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Pooled degree-day elasticity across all regions. Each <strong className="font-semibold text-foreground">+1 severity point</strong> moves dispatch demand:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Stat value={pct(slopePerPt, 1)} label="demand / pt" />
                <Stat value={fit.r2.toFixed(2)} label="r²" />
                <Stat value={`${fit.n}`} label="obs" />
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                High-severity months also run{" "}
                <strong className="font-semibold text-foreground">{inference.emergencyDeltaPts >= 0 ? "+" : ""}{inference.emergencyDeltaPts.toFixed(0)} pts</strong>{" "}
                more fast-turn (≤2-day) emergency tickets — the premium-pricing mix.
              </p>
            </div>
          </div>

          {/* Infer */}
          <div className="space-y-2.5 border-t border-border/40 pt-4">
            <StageTag tag="I" label="Infer" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">Emergency-led lines</p>
                {inference.sensitiveLines.length > 0 ? (
                  <ul className="space-y-0.5">
                    {inference.sensitiveLines.map(l => (
                      <li key={l.jobType} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-foreground">{l.jobType}</span>
                        <span className="shrink-0 font-semibold tabular-nums" style={{ color: BRAND }}>{(l.emergencyShare * 100).toFixed(0)}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70">No line shows a dominant emergency mix.</p>
                )}
                <p className="mt-1 text-[9px] text-muted-foreground/60">fast-turn (≤2d) share — surge-price target</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">Margin during spikes</p>
                <p className="text-[13px] font-semibold capitalize text-foreground">{inference.marginVerdict}</p>
                <p className="text-[11px] text-muted-foreground">
                  {inference.marginDeltaPts >= 0 ? "+" : ""}{inference.marginDeltaPts.toFixed(1)} pts
                  {" "}({(inference.marginHighIdx * 100).toFixed(0)}% vs {(inference.marginLowIdx * 100).toFixed(0)}%)
                </p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">Strongest signal</p>
                {inference.topRegion ? (
                  <>
                    <p className="text-[13px] font-semibold text-foreground">{inference.topRegion.regionLabel}</p>
                    <p className="text-[11px] text-muted-foreground">region fit r² {inference.topRegion.r2.toFixed(2)}</p>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70">Signal is portfolio-wide, not region-specific.</p>
                )}
              </div>
            </div>
          </div>

          {/* Predict */}
          <div className="space-y-2.5 border-t border-border/40 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StageTag tag="P" label="Predict" />
              <p className="text-[12px] text-muted-foreground">
                Next {horizonMonths} mo:{" "}
                <strong className="font-semibold text-foreground">{fmtUsd(forecastLow)}–{fmtUsd(forecastHigh)}</strong>{" "}
                weather-driven margin opportunity
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-muted/40 text-left text-[9px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-1.5 font-medium">Month</th>
                    <th className="px-3 py-1.5 text-right font-medium">Severity idx</th>
                    <th className="px-3 py-1.5 text-right font-medium">Demand lift</th>
                    <th className="px-3 py-1.5 text-right font-medium">Margin opp. (range)</th>
                    <th className="px-3 py-1.5 font-medium">Lead region</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((f, i) => (
                    <tr key={f.month} className={i % 2 ? "bg-muted/15" : undefined}>
                      <td className="px-3 py-1.5 font-medium text-foreground">{monthLabel(f.month)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{f.predictedIndex}</td>
                      <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${f.predictedLiftPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {pct(f.predictedLiftPct)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-foreground">
                        {fmtUsd(f.opportunity)}
                        <span className="text-muted-foreground/60"> ({fmtUsd(f.low)}–{fmtUsd(f.high)})</span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{f.topRegion ? f.topRegion.regionLabel.replace("Region ", "") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Forecast = seasonal climatology × fitted elasticity × region ticket/margin. Range widens with fit uncertainty.
            </p>
          </div>

          {/* Act */}
          <div className="space-y-3 border-t border-border/40 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StageTag tag="A" label="Act" />
              <p className="text-[11px] text-muted-foreground">Role-assigned actions · send any window to the Action Centre</p>
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Each forecast window is scored on the same severity index; its demand lift is the <strong className="font-semibold text-foreground">fitted model&apos;s estimate</strong> (floored by severity where the pooled fit is thin), which drives the surcharge and crew-staging sizing below. Recalibrate after each window as outcomes land.
            </p>
            <WeatherMarketIntelligenceList alerts={alerts} max={2} />
          </div>
      </StripaCard>
    </section>
  )
}
