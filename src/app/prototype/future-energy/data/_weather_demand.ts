/* ------------------------------------------------------------------ */
/*  STRIPA: Weather -> Demand Intelligence                             */
/*                                                                     */
/*  Runs the STRIPA pipeline over external weather + internal job      */
/*  history:                                                           */
/*    S  (Surface)  index historic weather and surface co-movement     */
/*                  with ACME job volume / emergency mix per region.    */
/*    TR (TRend)    fit a pooled degree-day elasticity (lift per index  */
/*                  point) with an r2 / sample-size confidence read.    */
/*    I  (Infer)    rank weather-sensitive service lines + read margin  */
/*                  behavior during high-severity months.               */
/*    P  (Predict)  project the next two quarters via seasonal          */
/*                  climatology x elasticity -> dollarized opportunity. */
/*    A  (Act)      handed to the pricing-power market intelligence + Operating    */
/*                  Loop (see _weather.getUrgencyAlerts).               */
/*                                                                     */
/*  Static weather is treated as the indexed history; the seam at      */
/*  getWeatherForRegion() can later be swapped for live NOAA pulls      */
/*  without touching the join / fit / forecast below.                  */
/* ------------------------------------------------------------------ */

import type { Job } from "./_transform"
import type { Region } from "./_regions"
import { regionLabels } from "./_regions"
import { getWeatherForRegion, reforecastAlert, type UrgencyAlert } from "./_weather"

/* ------------------------------ types ----------------------------- */

export type Confidence = "high" | "moderate" | "indicative"

/** S — one joined region x month observation. */
export interface WeatherDemandPoint {
  region: Region
  regionLabel: string
  /** YYYY-MM */
  month: string
  calMonth: number
  hdd: number
  cdd: number
  thermalLoad: number
  /** 0-100, region-normalized thermal load + extreme-event bump. */
  weatherIndex: number
  hasEvent: boolean
  jobCount: number
  revenue: number
  avgTicket: number
  marginPct: number
  /** Share of jobs turned in <= 2 days — emergency / urgency proxy. */
  emergencyShare: number
  baselineJobs: number
  /** (jobCount - baseline) / baseline. */
  demandLiftPct: number
}

export interface ElasticityFit {
  /** Demand lift (% of region baseline) per +1 weather-index point. */
  slope: number
  intercept: number
  r2: number
  n: number
  confidence: Confidence
}

export interface WeatherInference {
  /** Emergency-led service lines (highest fast-turn share) — the surge-priceable mix. */
  sensitiveLines: { jobType: string; emergencyShare: number; volume: number }[]
  /** Mean margin pct in high- vs low-severity months. */
  marginHighIdx: number
  marginLowIdx: number
  marginDeltaPts: number
  marginVerdict: "expands" | "holds" | "compresses"
  /** Emergency-mix lift (pts) from low- to high-severity months. */
  emergencyDeltaPts: number
  topRegion: { region: Region; regionLabel: string; r2: number } | null
}

export interface WeatherForecastPoint {
  /** YYYY-MM */
  month: string
  calMonth: number
  predictedIndex: number
  predictedLiftPct: number
  incrementalJobs: number
  /** Incremental margin dollars (point estimate). */
  opportunity: number
  low: number
  high: number
  /** Region contributing the most opportunity that month. */
  topRegion: { region: Region; regionLabel: string; opportunity: number } | null
}

export interface WeatherIntelligence {
  series: WeatherDemandPoint[]
  fit: ElasticityFit
  emergencyFit: ElasticityFit
  inference: WeatherInference
  forecast: WeatherForecastPoint[]
  /** Sum of forecast point-estimate opportunity over the horizon. */
  forecastTotal: number
  forecastLow: number
  forecastHigh: number
  horizonMonths: number
  confidence: Confidence
  regions: Region[]
}

/* ----------------------------- helpers ---------------------------- */

const EMERGENCY_MAX_DAYS = 2
const EVENT_INDEX_BUMP = 15

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function calMonthOf(month: string): number {
  return Number(month.slice(5))
}

function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number)
  const idx = (y * 12 + (m - 1)) + n
  const ny = Math.floor(idx / 12)
  const nm = (idx % 12) + 1
  return `${ny}-${String(nm).padStart(2, "0")}`
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)))
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

interface OLS { slope: number; intercept: number; r2: number; n: number }

function ols(points: { x: number; y: number }[]): OLS {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: n === 1 ? points[0].y : 0, r2: 0, n }
  const mx = mean(points.map(p => p.x))
  const my = mean(points.map(p => p.y))
  let sxx = 0, sxy = 0, syy = 0
  for (const p of points) {
    sxx += (p.x - mx) ** 2
    sxy += (p.x - mx) * (p.y - my)
    syy += (p.y - my) ** 2
  }
  const slope = sxx > 0 ? sxy / sxx : 0
  const intercept = my - slope * mx
  const r2 = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0
  return { slope, intercept, r2, n }
}

function rateConfidence(n: number, r2: number): Confidence {
  if (n >= 30 && r2 >= 0.3) return "high"
  if (n >= 18 && r2 >= 0.15) return "moderate"
  return "indicative"
}

/**
 * 12-month thermal climatology (hdd + cdd by calendar month) for a region.
 * Profiles cover Aug-Apr; the May/Jun/Jul cooling ramp is interpolated
 * between April and August so the forward forecast has a full year.
 */
function climatology(region: Region): Map<number, number> {
  const p = getWeatherForRegion(region)
  const known = new Map<number, number>()
  for (const m of p.monthly) known.set(calMonthOf(m.month), m.hdd + m.cdd)
  const apr = known.get(4) ?? 0
  const aug = known.get(8) ?? 0
  for (const cm of [5, 6, 7]) {
    const t = (cm - 4) / 4
    known.set(cm, Math.round(apr + (aug - apr) * t))
  }
  return known
}

interface RegionStats {
  mean: number
  sd: number
  baselineJobs: number
  avgTicket: number
  avgMarginPct: number
  emergencyShare: number
}

/** Surcharge fraction an elevated severity window can support (caps at 18%). */
function premiumPctFor(index: number): number {
  return clamp((index - 50) / 50, 0, 1) * 0.18
}

/* --------------------------- the pipeline ------------------------- */

/**
 * S + TR + I + P. Build the joined series, fit elasticity, infer
 * sensitivity / margin behavior, and forecast the next two quarters.
 */
export function buildWeatherIntelligence(
  allJobs: Job[],
  opts: { horizonMonths?: number } = {},
): WeatherIntelligence {
  const horizonMonths = opts.horizonMonths ?? 6
  const jobs = allJobs.filter(j => !j.excluded && j.completedDate && j.totalAmount != null && j.totalAmount > 0)

  const regions = [...new Set(jobs.map(j => j.region))] as Region[]

  // Region thermal stats from the 12-month climatology (stable normalization).
  const regionStats = new Map<Region, RegionStats>()
  for (const region of regions) {
    const climo = climatology(region)
    const loads = [...climo.values()]
    const rjobs = jobs.filter(j => j.region === region)
    const tickets = rjobs.map(j => j.totalAmount as number)
    const margins = rjobs.map(j => j.marginPct).filter((x): x is number => x != null)
    const fast = rjobs.filter(j => j.timeToCompleteDays != null && j.timeToCompleteDays <= EMERGENCY_MAX_DAYS).length
    regionStats.set(region, {
      mean: mean(loads),
      sd: stdev(loads) || 1,
      baselineJobs: 0,
      avgTicket: mean(tickets),
      avgMarginPct: mean(margins),
      emergencyShare: rjobs.length ? fast / rjobs.length : 0,
    })
  }

  // ----- S: join weather index to monthly job buckets per region -----
  const eventMonths = new Map<Region, Set<string>>()
  for (const region of regions) {
    eventMonths.set(region, new Set(getWeatherForRegion(region).extremeEvents.map(e => e.month)))
  }

  function weatherIndex(region: Region, thermalLoad: number, month: string): number {
    const s = regionStats.get(region)!
    const z = (thermalLoad - s.mean) / s.sd
    let idx = 50 + z * 20
    if (eventMonths.get(region)!.has(month)) idx += EVENT_INDEX_BUMP
    return Math.round(clamp(idx, 0, 100))
  }

  const series: WeatherDemandPoint[] = []
  for (const region of regions) {
    const profile = getWeatherForRegion(region)
    const thermalByMonth = new Map<string, number>()
    for (const m of profile.monthly) thermalByMonth.set(m.month, m.hdd + m.cdd)

    const rjobs = jobs.filter(j => j.region === region)
    const byMonth = new Map<string, Job[]>()
    for (const j of rjobs) {
      const key = ym(j.completedDate as Date)
      if (!thermalByMonth.has(key)) continue
      const arr = byMonth.get(key) ?? []
      arr.push(j)
      byMonth.set(key, arr)
    }
    if (byMonth.size === 0) continue

    const counts = [...byMonth.values()].map(a => a.length)
    const baselineJobs = mean(counts)
    regionStats.get(region)!.baselineJobs = baselineJobs

    for (const [month, monthJobs] of byMonth) {
      const thermalLoad = thermalByMonth.get(month) as number
      const revenue = monthJobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0)
      const margins = monthJobs.map(j => j.marginPct).filter((x): x is number => x != null)
      const fast = monthJobs.filter(j => j.timeToCompleteDays != null && j.timeToCompleteDays <= EMERGENCY_MAX_DAYS).length
      series.push({
        region,
        regionLabel: regionLabels[region],
        month,
        calMonth: calMonthOf(month),
        hdd: profile.monthly.find(m => m.month === month)?.hdd ?? 0,
        cdd: profile.monthly.find(m => m.month === month)?.cdd ?? 0,
        thermalLoad,
        weatherIndex: weatherIndex(region, thermalLoad, month),
        hasEvent: eventMonths.get(region)!.has(month),
        jobCount: monthJobs.length,
        revenue,
        avgTicket: monthJobs.length ? revenue / monthJobs.length : 0,
        marginPct: mean(margins),
        emergencyShare: monthJobs.length ? fast / monthJobs.length : 0,
        baselineJobs,
        demandLiftPct: baselineJobs > 0 ? (monthJobs.length - baselineJobs) / baselineJobs : 0,
      })
    }
  }
  series.sort((a, b) => b.weatherIndex - a.weatherIndex)

  // ----- TR: pooled elasticity (demand lift & emergency mix vs index) -----
  const fitRaw = ols(series.map(p => ({ x: p.weatherIndex - 50, y: p.demandLiftPct })))
  const fit: ElasticityFit = { ...fitRaw, confidence: rateConfidence(fitRaw.n, fitRaw.r2) }

  const emgRaw = ols(series.map(p => ({ x: p.weatherIndex - 50, y: p.emergencyShare })))
  const emergencyFit: ElasticityFit = { ...emgRaw, confidence: rateConfidence(emgRaw.n, emgRaw.r2) }

  // ----- I: inference (sensitive lines, margin behavior, top region) -----
  const HIGH = 60
  const LOW = 40
  const highMonths = series.filter(p => p.weatherIndex >= HIGH)
  const lowMonths = series.filter(p => p.weatherIndex <= LOW)

  const lineSensitivity = (() => {
    // Emergency intensity per line: the fast-turn (<= 2-day) share is the
    // urgency mix weather windows amplify and surge pricing targets. This is
    // a stable, intuitive signal (cooling lines never reach their summer peak
    // inside the Aug-Apr cohort, so raw severe-month concentration is noisy).
    const agg = new Map<string, { fast: number; total: number }>()
    for (const j of jobs) {
      if (!j.completedDate) continue
      const a = agg.get(j.jobType) ?? { fast: 0, total: 0 }
      a.total++
      if (j.timeToCompleteDays != null && j.timeToCompleteDays <= EMERGENCY_MAX_DAYS) a.fast++
      agg.set(j.jobType, a)
    }
    return [...agg.entries()]
      .map(([jobType, a]) => ({ jobType, emergencyShare: a.total > 0 ? a.fast / a.total : 0, volume: a.total }))
      .filter(o => o.volume >= 15 && o.emergencyShare > 0)
      .sort((a, b) => b.emergencyShare - a.emergencyShare)
      .slice(0, 3)
  })()

  const marginHighIdx = mean(highMonths.map(p => p.marginPct).filter(x => x > 0))
  const marginLowIdx = mean(lowMonths.map(p => p.marginPct).filter(x => x > 0))
  const marginDeltaPts = (marginHighIdx - marginLowIdx) * 100
  const marginVerdict: WeatherInference["marginVerdict"] =
    marginDeltaPts > 1.5 ? "expands" : marginDeltaPts < -1.5 ? "compresses" : "holds"
  const emergencyDeltaPts = (mean(highMonths.map(p => p.emergencyShare)) - mean(lowMonths.map(p => p.emergencyShare))) * 100

  let topRegion: WeatherInference["topRegion"] = null
  for (const region of regions) {
    const pts = series.filter(p => p.region === region)
    if (pts.length < 4) continue
    const f = ols(pts.map(p => ({ x: p.weatherIndex - 50, y: p.demandLiftPct })))
    if (f.slope > 0 && (!topRegion || f.r2 > topRegion.r2)) {
      topRegion = { region, regionLabel: regionLabels[region], r2: f.r2 }
    }
  }

  const inference: WeatherInference = {
    sensitiveLines: lineSensitivity,
    marginHighIdx,
    marginLowIdx,
    marginDeltaPts,
    marginVerdict,
    emergencyDeltaPts,
    topRegion,
  }

  // ----- P: forward forecast via climatology x elasticity -----
  const latestMonth = series.reduce((mx, p) => (p.month > mx ? p.month : mx), series[0]?.month ?? "2026-04")
  const forecast: WeatherForecastPoint[] = []
  // Damp the slope by fit quality so a weak fit produces conservative calls.
  const effSlope = fit.slope * clamp(fit.r2 + 0.25, 0.25, 1)
  const band = clamp(1 - fit.r2, 0.3, 0.75)

  for (let h = 1; h <= horizonMonths; h++) {
    const month = addMonths(latestMonth, h)
    const cm = calMonthOf(month)
    let incrementalJobs = 0
    let opportunity = 0
    let predIdxSum = 0
    let regionContrib: { region: Region; regionLabel: string; opportunity: number } | null = null

    for (const region of regions) {
      const s = regionStats.get(region)!
      if (s.baselineJobs <= 0) continue
      const load = climatology(region).get(cm) ?? s.mean
      const idx = weatherIndex(region, load, month)
      const lift = clamp(fit.intercept + effSlope * (idx - 50), -0.2, 0.8)
      const incJobs = s.baselineJobs * lift
      // Pricing-power premium: surcharge-able margin on the (lifted) emergency
      // mix during the elevated window — the actual weather value on a pricing page.
      const emergencyBase = s.baselineJobs * s.emergencyShare
      const liftedEmergency = emergencyBase * (1 + Math.max(0, lift))
      const premium = liftedEmergency * s.avgTicket * premiumPctFor(idx)
      // Plus base margin on any incremental (non-emergency) demand.
      const incMargin = Math.max(0, incJobs) * s.avgTicket * Math.max(0, s.avgMarginPct)
      const opp = premium + incMargin
      incrementalJobs += incJobs
      opportunity += opp
      predIdxSum += idx
      if (opp > 0 && (!regionContrib || opp > regionContrib.opportunity)) {
        regionContrib = { region, regionLabel: regionLabels[region], opportunity: opp }
      }
    }

    const predictedIndex = regions.length ? Math.round(predIdxSum / regions.length) : 50
    forecast.push({
      month,
      calMonth: cm,
      predictedIndex,
      predictedLiftPct: incrementalJobs !== 0 && opportunity !== 0
        ? clamp(fit.intercept + effSlope * (predictedIndex - 50), -0.2, 0.8)
        : 0,
      incrementalJobs,
      opportunity,
      low: opportunity * (1 - band),
      high: opportunity * (1 + band),
      topRegion: regionContrib,
    })
  }

  const forecastTotal = forecast.reduce((s, f) => s + f.opportunity, 0)
  const forecastLow = forecast.reduce((s, f) => s + f.low, 0)
  const forecastHigh = forecast.reduce((s, f) => s + f.high, 0)

  return {
    series,
    fit,
    emergencyFit,
    inference,
    forecast,
    forecastTotal,
    forecastLow,
    forecastHigh,
    horizonMonths,
    confidence: fit.confidence,
    regions,
  }
}

/**
 * A — Act. Reconcile the heuristic urgency alerts with the fitted elasticity:
 * each window's demand lift is re-estimated from the model evaluated at that
 * region-month's severity index, floored by severity where the pooled fit is
 * thin (low r²). This makes the market intelligence spike % a single, data-grounded source
 * of truth instead of a standalone heuristic. Windows with no overlapping job
 * history fall back to the original alert.
 */
export function reconcileAlerts(alerts: UrgencyAlert[], wi: WeatherIntelligence): UrgencyAlert[] {
  return alerts.map(a => {
    const pt = wi.series.find(p => p.region === a.region && p.month === a.window)
    if (!pt) return a
    const fitLift = wi.fit.intercept + wi.fit.slope * (pt.weatherIndex - 50)
    const severityFloor = clamp((pt.weatherIndex - 50) / 100, 0, 0.4)
    const spike = Math.round(clamp(Math.max(fitLift, severityFloor), 0.1, 0.6) * 100) / 100
    return reforecastAlert(a, spike)
  })
}
