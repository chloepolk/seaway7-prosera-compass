/* ------------------------------------------------------------------ */
/*  External Data: Regional Weather & Seasonality                      */
/*                                                                     */
/*  Static per-region climate data for the cohort window              */
/*  (Aug 2025 - Apr 2026), mirroring the _eia / _labor pattern.       */
/*  Heating/Cooling Degree Days (HDD/CDD) and extreme-weather events  */
/*  are demand drivers for HVAC / refrigeration field services.        */
/*                                                                     */
/*  Source framing: NOAA Climate Normals + Storm Events (static mock). */
/* ------------------------------------------------------------------ */

import type { Region } from "./_regions"
import { getEIAFuelSummaryForRegion } from "./_eia"
import { regionLabels } from "./_regions"

export interface WeatherMonth {
  /** YYYY-MM */
  month: string
  avgHighF: number
  avgLowF: number
  /** Heating Degree Days (base 65F) — winter heating demand. */
  hdd: number
  /** Cooling Degree Days (base 65F) — summer cooling demand. */
  cdd: number
}

export interface ExtremeEvent {
  /** YYYY-MM */
  month: string
  type: string
  /** Qualitative demand impact on field services. */
  demandImpact: string
}

export type PeakSeason = "summer" | "winter" | "shoulder"

export interface RegionWeatherProfile {
  region: Region
  climate: string
  peakDemandSeason: PeakSeason
  monthly: WeatherMonth[]
  extremeEvents: ExtremeEvent[]
  /** Narrative tying weather to demand for the agents. */
  demandNote: string
}

/* ------------------------------------------------------------------ */
/*  Per-region profiles (cohort window: 2025-08 .. 2026-04)            */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04",
]

function buildMonthly(
  highs: number[],
  lows: number[],
  hdds: number[],
  cdds: number[],
): WeatherMonth[] {
  return MONTHS.map((month, i) => ({
    month,
    avgHighF: highs[i],
    avgLowF: lows[i],
    hdd: hdds[i],
    cdd: cdds[i],
  }))
}

const PROFILES: Record<Region, RegionWeatherProfile> = {
  RW: {
    region: "RW",
    climate: "Coastal / Mediterranean — mild, narrow swing",
    peakDemandSeason: "summer",
    monthly: buildMonthly(
      [82, 81, 74, 66, 60, 59, 61, 64, 69],
      [62, 60, 55, 49, 44, 43, 45, 47, 51],
      [0, 0, 30, 110, 200, 230, 190, 150, 80],
      [320, 300, 150, 30, 5, 0, 0, 10, 60],
    ),
    extremeEvents: [
      { month: "2025-09", type: "Late-season heat wave", demandImpact: "Refrigeration + condenser failures spike; emergency HVAC calls up." },
      { month: "2026-03", type: "Atmospheric river / wind event", demandImpact: "Rooftop unit damage; access delays raise dispatch cost." },
    ],
    demandNote: "Peak CDD 230; peak HDD 320 in this Aug 2025–Apr 2026 series.",
  },
  RC: {
    region: "RC",
    climate: "Inland valley — hot summers, cool winters",
    peakDemandSeason: "summer",
    monthly: buildMonthly(
      [96, 93, 82, 68, 57, 54, 60, 68, 78],
      [66, 63, 54, 44, 37, 35, 39, 45, 52],
      [0, 0, 40, 180, 320, 360, 280, 180, 70],
      [520, 470, 220, 40, 0, 0, 5, 40, 150],
    ),
    extremeEvents: [
      { month: "2025-08", type: "Extended >100F heat", demandImpact: "Peak cooling load; compressor burnout drives premium emergency tickets." },
      { month: "2026-03", type: "Early heat onset", demandImpact: "Pulls PM/seasonal changeover demand forward into Q1." },
    ],
    demandNote: "Peak CDD 520 in Aug 2025. Peak HDD 360.",
  },
  RS: {
    region: "RS",
    climate: "Hot-humid — long cooling season",
    peakDemandSeason: "summer",
    monthly: buildMonthly(
      [94, 91, 84, 75, 68, 66, 69, 75, 82],
      [74, 72, 64, 55, 48, 46, 50, 56, 63],
      [0, 0, 10, 60, 130, 150, 110, 50, 10],
      [560, 510, 330, 150, 60, 40, 70, 180, 330],
    ),
    extremeEvents: [
      { month: "2025-09", type: "Tropical storm / humidity surge", demandImpact: "Latent-load failures; coil + drainage service calls climb." },
      { month: "2026-03", type: "Severe thunderstorm outbreak", demandImpact: "Power events damage rooftop units; surge of emergency dispatches." },
    ],
    demandNote: "Peak CDD 560 in Aug 2025. CDD stays at or above 40 in every month of this series.",
  },
  RE: {
    region: "RE",
    climate: "Humid continental — four-season swing",
    peakDemandSeason: "winter",
    monthly: buildMonthly(
      [84, 78, 66, 53, 42, 36, 39, 48, 61],
      [66, 60, 48, 38, 28, 22, 25, 33, 44],
      [0, 30, 150, 360, 620, 780, 690, 480, 180],
      [340, 230, 80, 5, 0, 0, 0, 0, 30],
    ),
    extremeEvents: [
      { month: "2026-01", type: "Arctic cold snap", demandImpact: "Heating-system failures; no-heat emergency calls peak." },
      { month: "2026-03", type: "Late-winter ice storm", demandImpact: "Access + safety delays inflate dispatch cost during the fuel-price spike." },
    ],
    demandNote: "Peak HDD 780. Peak CDD 340.",
  },
  RN: {
    region: "RN",
    climate: "Cold continental — severe winters",
    peakDemandSeason: "winter",
    monthly: buildMonthly(
      [78, 71, 58, 43, 30, 22, 27, 39, 54],
      [56, 49, 38, 27, 15, 6, 12, 23, 36],
      [10, 80, 290, 560, 920, 1180, 1010, 700, 320],
      [220, 120, 30, 0, 0, 0, 0, 0, 10],
    ),
    extremeEvents: [
      { month: "2025-12", type: "Blizzard / deep freeze", demandImpact: "Heating + frozen-line failures; multi-day emergency backlog." },
      { month: "2026-03", type: "Prolonged sub-zero stretch", demandImpact: "Sustained no-heat calls coincide with the regional fuel-cost spike." },
    ],
    demandNote: "Peak HDD 1,180, the highest in this set. Peak CDD 220.",
  },
  RM: {
    region: "RM",
    climate: "High-desert / mountain — wide diurnal swing",
    peakDemandSeason: "shoulder",
    monthly: buildMonthly(
      [88, 84, 72, 58, 46, 42, 47, 56, 67],
      [58, 54, 42, 31, 22, 18, 23, 31, 41],
      [0, 10, 120, 320, 540, 660, 540, 360, 160],
      [360, 300, 110, 15, 0, 0, 0, 10, 70],
    ),
    extremeEvents: [
      { month: "2025-10", type: "Early hard freeze", demandImpact: "Abrupt heat-changeover demand; PM compression into a short window." },
      { month: "2026-03", type: "Spring snow + thaw cycling", demandImpact: "Freeze-thaw stresses rooftop units; mixed heat/cool emergency mix." },
    ],
    demandNote: "Peak HDD 660 and peak CDD 360 in this series.",
  },
}

/* ------------------------------------------------------------------ */
/*  Public API (mirrors _eia helpers)                                  */
/* ------------------------------------------------------------------ */

export function getWeatherForRegion(region: Region): RegionWeatherProfile {
  return PROFILES[region]
}

export interface WeatherSummary {
  region: Region
  climate: string
  peakDemandSeason: PeakSeason
  totalHDD: number
  totalCDD: number
  /** Dominant degree-day load as a 0-1 cooling share (1 = all cooling). */
  coolingShare: number
  nextExtremeEvent: ExtremeEvent | null
  demandNote: string
}

export function getWeatherSummaryForRegion(region: Region): WeatherSummary {
  const p = PROFILES[region]
  const totalHDD = p.monthly.reduce((s, m) => s + m.hdd, 0)
  const totalCDD = p.monthly.reduce((s, m) => s + m.cdd, 0)
  const denom = totalHDD + totalCDD
  // Highlight the most recent / forward-looking extreme event in the window.
  const nextExtremeEvent = p.extremeEvents.length > 0
    ? [...p.extremeEvents].sort((a, b) => b.month.localeCompare(a.month))[0]
    : null
  return {
    region,
    climate: p.climate,
    peakDemandSeason: p.peakDemandSeason,
    totalHDD,
    totalCDD,
    coolingShare: denom > 0 ? totalCDD / denom : 0,
    nextExtremeEvent,
    demandNote: p.demandNote,
  }
}

/* ------------------------------------------------------------------ */
/*  Urgency / Pricing-Power Engine                                     */
/*                                                                     */
/*  Forecast severe weather drives a spike in emergency (urgency)      */
/*  field-service demand. When that demand spike coincides with a      */
/*  fuel / supply constraint, ACME holds pricing power — the window to */
/*  activate emergency surcharges and pre-position */
/*  crews for premium tickets. This is the March-2026 weather+fuel     */
/*  coincidence made actionable.                                       */
/* ------------------------------------------------------------------ */

export type PricingPower = "high" | "elevated" | "normal"

/** One prescriptive, owner-assigned move in a pricing-power market intelligence plan. */
export interface MarketIntelligenceStep {
  order: number
  /** Role string — resolves to a named person via _diamond/org.ts. */
  owner: string
  /** Exactly what to do, with the quantified target baked in. */
  action: string
  /** The mechanism / where the owner does it. */
  how: string
  /** A measurable done-state. */
  target: string
}

export interface UrgencyAlert {
  region: Region
  regionLabel: string
  /** YYYY-MM window the alert covers. */
  window: string
  eventType: string
  /** Estimated lift in emergency/urgency dispatch volume (0-1). */
  demandSpikePct: number
  /** Regional fleet fuel cost delta vs. baseline (supply-side constraint, 0-1). */
  fuelDeltaPct: number
  pricingPower: PricingPower
  rationale: string
  /** One-line summary (kept for mission recommendation/critical-task wiring). */
  recommendedAction: string
  /** Prescriptive, owner-assigned steps — the "exactly how" of the alert. */
  marketIntelligence: MarketIntelligenceStep[]
}

/** Heating- vs cooling-driven failure framing from the event text. */
function failureMode(event: ExtremeEvent, peak: PeakSeason): "no-heat" | "no-cool" {
  const t = `${event.type} ${event.demandImpact}`.toLowerCase()
  if (/arctic|blizzard|freeze|sub-?zero|ice|cold|snow|winter|heating/.test(t)) return "no-heat"
  if (/heat wave|>100|cooling|condenser|compressor|refrigeration|tropical|humidity/.test(t)) return "no-cool"
  return peak === "winter" ? "no-heat" : "no-cool"
}

/** Quantified sizing derived from demand spike + fuel constraint. */
interface AlertMetrics {
  surchargePct: number
  crews: number
  accounts: number
  estOverflowTickets: number
  responseTargetHrs: number
}

export function computeAlertMetrics(demandSpikePct: number): AlertMetrics {
  const surchargePct = Math.round(8 + demandSpikePct * 22)
  const crews = Math.max(2, Math.round(demandSpikePct * 8))
  const accounts = Math.max(5, Math.round(demandSpikePct * 18))
  const estOverflowTickets = Math.max(3, Math.round(demandSpikePct * 24))
  return { surchargePct, crews, accounts, estOverflowTickets, responseTargetHrs: 2 }
}

function ticketLabel(mode: "no-heat" | "no-cool"): string {
  return mode === "no-heat" ? "no-heat / heating-failure" : "no-cool / refrigeration-failure"
}

function buildRecommendedAction(
  alert: { regionLabel: string; window: string; eventType: string; demandSpikePct: number; fuelDeltaPct: number; pricingPower: PricingPower },
  mode: "no-heat" | "no-cool",
  m: AlertMetrics,
): string {
  const ticket = ticketLabel(mode)
  const spike = Math.round(alert.demandSpikePct * 100)
  const fuel = `${alert.fuelDeltaPct >= 0 ? "+" : ""}${(alert.fuelDeltaPct * 100).toFixed(0)}%`
  const monthLabel = alert.window

  if (alert.pricingPower === "high") {
    return `Dispatch Operations Lead: publish +${m.surchargePct}% after-hours surcharge on ${ticket} dispatches in ${alert.regionLabel} before ${monthLabel}; pre-position ${m.crews} on-call crews to hold <${m.responseTargetHrs}hr response on ~${spike}% demand lift and offset ${fuel} fleet fuel drag on margin.`
  }
  if (alert.pricingPower === "elevated") {
    return `Regional Pricing Manager: apply +${m.surchargePct}% after-hours premium on ${ticket} jobs in ${alert.regionLabel} for ${monthLabel}; VP Field Service stages ${m.crews} crews ahead of ${alert.eventType.toLowerCase()} to capture ${spike}% emergency volume before the window closes.`
  }
  return `Regional Operations Director: monitor ${alert.regionLabel} ${monthLabel} ${alert.eventType.toLowerCase()} — ~${spike}% demand lift does not justify surcharge; hold standard rates and track ticket backlog daily.`
}

/**
 * Quantified pricing-power market intelligence. Surcharge %, crew count, and
 * account-outreach count all scale off the demand spike + fuel constraint so
 * each region/event reads differently.
 */
function buildMarketIntelligence(
  alert: { regionLabel: string; window: string; eventType: string; demandSpikePct: number; fuelDeltaPct: number; pricingPower: PricingPower },
  mode: "no-heat" | "no-cool",
): MarketIntelligenceStep[] {
  if (alert.pricingPower === "normal") return []
  const { regionLabel, window, eventType, demandSpikePct, pricingPower, fuelDeltaPct } = alert
  const ev = eventType.toLowerCase()
  const m = computeAlertMetrics(demandSpikePct)
  const ticket = ticketLabel(mode)
  const spike = Math.round(demandSpikePct * 100)
  const fuel = `${fuelDeltaPct >= 0 ? "+" : ""}${(fuelDeltaPct * 100).toFixed(0)}%`
  const priceBookRule = `WX-${regionLabel.replace(/[^A-Za-z]/g, "")}`

  const steps: MarketIntelligenceStep[] = [
    {
      order: 1,
      owner: "Dispatch Operations Lead",
      action: pricingPower === "high"
        ? `Publish Price Book rule ${priceBookRule}: +${m.surchargePct}% after-hours surcharge on ${ticket} dispatches — covers ~${spike}% demand lift against ${fuel} fleet fuel.`
        : `Apply Price Book rule ${priceBookRule}: +${m.surchargePct}% after-hours premium on ${ticket} dispatches in ${regionLabel} for the ${window} window.`,
      how: `Enter rule in dispatch console; auto-flag ${window} tickets as priority and block standard-rate dispatch on ${ticket} after-hours calls.`,
      target: `Rule live and enforced before ${window} ${ev} window opens — zero standard-rate ${ticket} tickets after go-live.`,
    },
    {
      order: 2,
      owner: "Regional Pricing Manager",
      action: `Stand up single-queue re-auth for ~${m.estOverflowTickets} projected ${ticket} tickets that will exceed customer-set NTE caps during ${window}.`,
      how: `Pre-stage scope templates on the ${window} on-call schedule; assign one approver per overflow queue to cut tech → dispatch → approver loops to one pass.`,
      target: `Average re-auth cycle ≤ 45 min on ${regionLabel} overflow tickets through ${window} (vs. ad-hoc multi-loop baseline).`,
    },
    {
      order: 3,
      owner: "VP Field Service",
      action: `Pre-position ${m.crews} on-call crews in ${regionLabel}; convert low-priority PM visits to standby to absorb ~${spike}% emergency volume without overtime bleed.`,
      how: `Stage trucks and ${ticket} parts stock within service radius by ${window}; shift ${Math.max(1, m.crews - 1)} PM crews to emergency rota with fuel-cost coverage at ${fuel}.`,
      target: `<${m.responseTargetHrs}hr median response on priority ${ticket} tickets through ${window}; no margin loss from unbilled OT.`,
    },
  ]

  if (pricingPower === "high") {
    steps.push({
      order: 4,
      owner: "Sales Director",
      action: `Pre-authorize top ${m.accounts} ${regionLabel} accounts at +${m.surchargePct}% priority-response SLA before ${window} — locks premium volume ahead of ${ev}.`,
      how: `Send pre-auth + guaranteed <${m.responseTargetHrs}hr response offer to highest-revenue accounts; include surcharge disclosure and NTE overflow path.`,
      target: `${m.accounts} accounts signed pre-auth before window opens; ≥ 60% acceptance on sent offers.`,
    })
  }

  return steps
}

/** Estimate the emergency-demand lift implied by an extreme event. */
function demandSpikeFor(event: ExtremeEvent, peak: PeakSeason): number {
  const t = `${event.type} ${event.demandImpact}`.toLowerCase()
  let base = 0.15
  if (/blizzard|arctic|deep freeze|sub-?zero|deep-freeze/.test(t)) base = 0.45
  else if (/heat wave|>100|extended.*heat|extreme heat|peak cooling/.test(t)) base = 0.38
  else if (/ice storm|severe thunderstorm|tropical|outbreak/.test(t)) base = 0.30
  else if (/atmospheric river|wind|freeze|snow|thaw/.test(t)) base = 0.22
  if (/emergency|spike|peak|surge|backlog|burnout/.test(t)) base += 0.05
  // Seasonal alignment: a winter event in a heating-led region (etc.) hits harder.
  const month = Number(event.month.slice(5))
  const isWinter = month <= 2 || month >= 11
  const isSummer = month >= 6 && month <= 9
  if ((peak === "winter" && isWinter) || (peak === "summer" && isSummer)) base += 0.05
  return Math.min(0.6, Math.round(base * 100) / 100)
}

function classifyPricingPower(demandSpikePct: number, fuelDeltaPct: number): PricingPower {
  if (demandSpikePct >= 0.30 && fuelDeltaPct > 0.02) return "high"
  if (demandSpikePct >= 0.25 || fuelDeltaPct > 0.06) return "elevated"
  return "normal"
}

/** Compose a fully-formed alert from a (possibly re-estimated) demand spike. */
function composeAlert(
  region: Region,
  window: string,
  eventType: string,
  demandSpikePct: number,
  fuelDeltaPct: number,
  mode: "no-heat" | "no-cool",
): UrgencyAlert {
  const pricingPower = classifyPricingPower(demandSpikePct, fuelDeltaPct)
  const fuelStr = `${fuelDeltaPct >= 0 ? "+" : ""}${(fuelDeltaPct * 100).toFixed(0)}% fleet fuel`
  const metrics = computeAlertMetrics(demandSpikePct)
  const rationale = pricingPower === "high"
    ? `Forecast ${eventType.toLowerCase()} lifts emergency demand ~${Math.round(demandSpikePct * 100)}% while fuel runs ${fuelStr} — demand spike + supply constraint supports +${metrics.surchargePct}% surcharge and ${metrics.crews}-crew staging.`
    : pricingPower === "elevated"
      ? `Forecast ${eventType.toLowerCase()} lifts emergency demand ~${Math.round(demandSpikePct * 100)}%; +${metrics.surchargePct}% after-hours premium and ${metrics.crews} staged crews capture volume before competitors react.`
      : `${eventType} adds ~${Math.round(demandSpikePct * 100)}% emergency demand in ${regionLabels[region]} — hold standard pricing; margin impact minimal.`
  const baseAlert = { regionLabel: regionLabels[region], window, eventType, demandSpikePct, fuelDeltaPct, pricingPower }
  const recommendedAction = buildRecommendedAction(baseAlert, mode, metrics)
  const base = {
    region,
    regionLabel: regionLabels[region],
    window,
    eventType,
    demandSpikePct,
    fuelDeltaPct,
    pricingPower,
    rationale,
    recommendedAction,
  }
  return { ...base, marketIntelligence: buildMarketIntelligence(base, mode) }
}

/** Heating- vs cooling-failure framing from an event-type string alone. */
function failureModeFromEventType(eventType: string): "no-heat" | "no-cool" {
  const t = eventType.toLowerCase()
  if (/arctic|blizzard|freeze|sub-?zero|ice|cold|snow|winter|heating/.test(t)) return "no-heat"
  return "no-cool"
}

/** Build pricing-power urgency alerts for a region (forward window: Jan 2026+). */
export function getUrgencyAlertsForRegion(region: Region, fromMonth = "2026-01"): UrgencyAlert[] {
  const p = PROFILES[region]
  const fuelDeltaPct = getEIAFuelSummaryForRegion(region).deltaPct
  return p.extremeEvents
    .filter(e => e.month >= fromMonth)
    .map(event => composeAlert(
      region,
      event.month,
      event.type,
      demandSpikeFor(event, p.peakDemandSeason),
      fuelDeltaPct,
      failureMode(event, p.peakDemandSeason),
    ))
}

/**
 * Re-estimate an alert from a model-derived demand spike (the STRIPA fit),
 * holding region/window/event/fuel fixed but recomputing pricing power,
 * rationale, and the prescriptive market intelligence. Lets the data-fit elasticity —
 * not the standalone heuristic — drive the surcharge/crew sizing.
 */
export function reforecastAlert(alert: UrgencyAlert, demandSpikePct: number): UrgencyAlert {
  return composeAlert(
    alert.region,
    alert.window,
    alert.eventType,
    demandSpikePct,
    alert.fuelDeltaPct,
    failureModeFromEventType(alert.eventType),
  )
}

/** Stable, addressable Operating Loop mission id for a weather alert. */
export function urgencyMissionId(a: { region: Region; window: string }): string {
  return `ACME-WX-${a.region}-${a.window}`
}

const POWER_RANK: Record<PricingPower, number> = { high: 0, elevated: 1, normal: 2 }

/** Portfolio-wide pricing-power alerts, highest urgency first. */
export function getUrgencyAlerts(fromMonth = "2026-01"): UrgencyAlert[] {
  const regions = Object.keys(PROFILES) as Region[]
  return regions
    .flatMap(r => getUrgencyAlertsForRegion(r, fromMonth))
    .sort((a, b) => POWER_RANK[a.pricingPower] - POWER_RANK[b.pricingPower] || b.demandSpikePct - a.demandSpikePct)
}

/** All-region roll-up for portfolio-level (macro) context. */
export function getPortfolioWeatherSummary(): {
  byRegion: WeatherSummary[]
  coolingDominantRegions: Region[]
  heatingDominantRegions: Region[]
  activeExtremeEvents: { region: Region; event: ExtremeEvent }[]
} {
  const regions = Object.keys(PROFILES) as Region[]
  const byRegion = regions.map(getWeatherSummaryForRegion)
  return {
    byRegion,
    coolingDominantRegions: byRegion.filter(s => s.coolingShare >= 0.5).map(s => s.region),
    heatingDominantRegions: byRegion.filter(s => s.coolingShare < 0.5).map(s => s.region),
    activeExtremeEvents: regions.flatMap(r =>
      PROFILES[r].extremeEvents
        .filter(e => e.month >= "2026-01")
        .map(event => ({ region: r, event })),
    ),
  }
}
