"use client"

import { activeLocaleTag, formatActivePercent, formatActiveUsd, localizeActiveCopy } from "../_i18n/legacy"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { useStore } from "../_store"
import { buildWeatherIntelligence, reconcileAlerts, type WeatherIntelligence } from "../data/_weather_demand"
import { getUrgencyAlerts } from "../data/_weather"
import { WeatherMarketIntelligenceList } from "./weather-strip"
import { STRIPA_BRAND as BRAND, ConfidenceBadge, StageTag, Stat, StripaCard } from "./stripa-scaffold"

function fmtUsd(n: number): string {
  return formatActiveUsd(n)
}

function pct(n: number, digits = 0): string {
  return `${n >= 0 ? "+" : ""}${formatActivePercent(Math.abs(n), digits)}`
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number)
  return new Intl.DateTimeFormat(activeLocaleTag(), { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)))
}

export function WeatherStripaPanel() {
  const { data, locale } = useStore()
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
        <h3 className="text-xs font-medium uppercase tracking-wider text-foreground">{localizeActiveCopy("Weather → Demand Intelligence")}</h3>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">{localizeActiveCopy("STRIPA · NOAA history × ACME jobs")}</span>
        {highPowerCount > 0 && (
          <span className="rounded-sm bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
            {highPowerCount} {localizeActiveCopy("high pricing-power")}
          </span>
        )}
        <ConfidenceBadge confidence={confidence} />
      </div>

      <StripaCard>
          {/* S + TR */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Surface */}
            <div className="space-y-2.5">
              <StageTag tag="S" label={localizeActiveCopy("Surface")} />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {locale === "fr"
                  ? `${series.length} mois-régions de météo ont été rapprochés de l’historique des interventions ACME. Les mois les plus sévères montrent la coévolution de la demande :`
                  : `Indexed ${series.length} region-months of weather against ACME job history. Highest-severity months show the demand co-movement:`}
              </p>
              <div className="space-y-1">
                {topEvidence.map(p => (
                  <div key={`${p.region}-${p.month}`} className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 shrink-0 font-medium text-foreground">{p.regionLabel.replace("Region ", "")}</span>
                    <span className="w-12 shrink-0 text-muted-foreground">{monthLabel(p.month)}</span>
                    <span className="flex h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      <span className="h-full rounded-full" style={{ width: `${p.weatherIndex}%`, backgroundColor: BRAND }} />
                    </span>
                    <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">{localizeActiveCopy("index")} {p.weatherIndex}</span>
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
              <StageTag tag="TR" label={localizeActiveCopy("Trend")} />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {locale === "fr" ? (
                  <>Élasticité mutualisée des degrés-jours sur toutes les régions. Chaque <strong className="font-semibold text-foreground">point de gravité supplémentaire</strong> fait évoluer la demande de dispatch :</>
                ) : (
                  <>Pooled degree-day elasticity across all regions. Each <strong className="font-semibold text-foreground">+1 severity point</strong> moves dispatch demand:</>
                )}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Stat value={pct(slopePerPt, 1)} label={localizeActiveCopy("demand / pt")} />
                <Stat value={fit.r2.toFixed(2)} label={localizeActiveCopy("r²")} />
                <Stat value={`${fit.n}`} label={localizeActiveCopy("obs")} />
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {locale === "fr" ? (
                  <>Les mois de forte gravité comptent aussi{" "}
                    <strong className="font-semibold text-foreground">{inference.emergencyDeltaPts >= 0 ? "+" : ""}{inference.emergencyDeltaPts.toFixed(0)} pts</strong>{" "}
                    de plus d’interventions urgentes à rotation rapide (≤ 2 jours) — le mix propice à une tarification majorée.</>
                ) : (
                  <>High-severity months also run{" "}
                    <strong className="font-semibold text-foreground">{inference.emergencyDeltaPts >= 0 ? "+" : ""}{inference.emergencyDeltaPts.toFixed(0)} pts</strong>{" "}
                    more fast-turn (≤2-day) emergency tickets — the premium-pricing mix.</>
                )}
              </p>
            </div>
          </div>

          {/* Infer */}
          <div className="space-y-2.5 border-t border-border/40 pt-4">
            <StageTag tag="I" label={localizeActiveCopy("Infer")} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">{localizeActiveCopy("Emergency-led lines")}</p>
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
                  <p className="text-[11px] text-muted-foreground/70">{localizeActiveCopy("No line shows a dominant emergency mix.")}</p>
                )}
                <p className="mt-1 text-[9px] text-muted-foreground/60">{localizeActiveCopy("fast-turn (≤2d) share — surge-price target")}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">{localizeActiveCopy("Margin during spikes")}</p>
                <p className="text-[13px] font-semibold capitalize text-foreground">{inference.marginVerdict}</p>
                <p className="text-[11px] text-muted-foreground">
                  {inference.marginDeltaPts >= 0 ? "+" : ""}{inference.marginDeltaPts.toFixed(1)} pts
                  {" "}({(inference.marginHighIdx * 100).toFixed(0)}% vs {(inference.marginLowIdx * 100).toFixed(0)}%)
                </p>
              </div>
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">{localizeActiveCopy("Strongest signal")}</p>
                {inference.topRegion ? (
                  <>
                    <p className="text-[13px] font-semibold text-foreground">{inference.topRegion.regionLabel}</p>
                    <p className="text-[11px] text-muted-foreground">{localizeActiveCopy("regional fit")} r² {inference.topRegion.r2.toFixed(2)}</p>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70">{localizeActiveCopy("Signal is portfolio-wide, not region-specific.")}</p>
                )}
              </div>
            </div>
          </div>

          {/* Predict */}
          <div className="space-y-2.5 border-t border-border/40 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StageTag tag="P" label={localizeActiveCopy("Predict")} />
              <p className="text-[12px] text-muted-foreground">
                {locale === "fr" ? `Sur les ${horizonMonths} prochains mois : ` : `Next ${horizonMonths} mo: `}
                <strong className="font-semibold text-foreground">{fmtUsd(forecastLow)}–{fmtUsd(forecastHigh)}</strong>{" "}
                {locale === "fr" ? "de potentiel de marge lié à la météo" : "weather-driven margin opportunity"}
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-muted/40 text-left text-[9px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-1.5 font-medium">{localizeActiveCopy("Month")}</th>
                    <th className="px-3 py-1.5 text-right font-medium">{localizeActiveCopy("Severity idx")}</th>
                    <th className="px-3 py-1.5 text-right font-medium">{localizeActiveCopy("Demand lift")}</th>
                    <th className="px-3 py-1.5 text-right font-medium">{localizeActiveCopy("Margin opp. (range)")}</th>
                    <th className="px-3 py-1.5 font-medium">{localizeActiveCopy("Lead region")}</th>
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
              {locale === "fr"
                ? "Prévision = climatologie saisonnière × élasticité ajustée × panier/marge régionale. La plage s’élargit avec l’incertitude de l’ajustement."
                : "Forecast = seasonal climatology × fitted elasticity × region ticket/margin. Range widens with fit uncertainty."}
            </p>
          </div>

          {/* Act */}
          <div className="space-y-3 border-t border-border/40 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StageTag tag="A" label={localizeActiveCopy("Act")} />
              <p className="text-[11px] text-muted-foreground">{localizeActiveCopy("Role-assigned actions · send any window to the Action Centre")}</p>
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              {locale === "fr" ? (
                <>Chaque fenêtre de prévision est évaluée selon le même indice de gravité ; sa hausse de demande correspond à <strong className="font-semibold text-foreground">l’estimation du modèle ajusté</strong> (avec un plancher fondé sur la gravité lorsque l’ajustement mutualisé est limité), qui détermine ci-dessous la majoration et le dimensionnement des équipes. Recalibrez après chaque fenêtre à mesure que les résultats arrivent.</>
              ) : (
                <>Each forecast window is scored on the same severity index; its demand lift is the <strong className="font-semibold text-foreground">fitted model&apos;s estimate</strong> (floored by severity where the pooled fit is thin), which drives the surcharge and crew-staging sizing below. Recalibrate after each window as outcomes land.</>
              )}
            </p>
            <WeatherMarketIntelligenceList alerts={alerts} max={2} />
          </div>
      </StripaCard>
    </section>
  )
}
