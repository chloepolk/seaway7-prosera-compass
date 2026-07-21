/* ------------------------------------------------------------------ */
/*  CI-04: Composite Customer Health Scoring                           */
/*                                                                     */
/*  Generates a holistic 0-100 Customer Score (CS) that runs ALONGSIDE */
/*  the existing BCG tiering (Stars/Cash Cows/Question Marks/Dogs).    */
/*  Tiering is intentionally left untouched.                           */
/*                                                                     */
/*  CS = [0.30(M) + 0.20(R) + 0.20(S) + 0.15(P) + 0.15(A)] x 100       */
/*                                                                     */
/*  M  Margin Resilience      customer margin / regional baseline      */
/*  R  Revenue Volume & Value annualized spend / target x predictab.   */
/*  S  Share of Wallet        service-lines-used proxy (no TAM data)    */
/*  P  Performance Trending   12-mo baseline margin + 90-day change     */
/*  A  AR Performance          DSO vs net target (simulated, see _ar.ts)*/
/*                                                                     */
/*  AR now uses a simulated per-customer DSO profile (_ar.ts) so the    */
/*  A-factor differentiates accounts. Any OTHER factor still lacking    */
/*  source data normalizes to 1.0 and is flagged `mocked`.             */
/* ------------------------------------------------------------------ */

import type { CustomerAggregate, RegionAggregate, DataScope } from "./_transform"
import type { Region } from "./_regions"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ScoreFactorKey = "M" | "R" | "S" | "P" | "A"

export interface CustomerScoreFactor {
  key: ScoreFactorKey
  label: string
  weight: number
  /** Normalized 0-1 factor value (the multiplier in the weighted sum). */
  normalized: number
  /** weight * normalized — this factor's contribution to the 0-100 score. */
  weighted: number
  /** Human-readable basis for the factor. */
  detail: string
  /** True when the factor relies on assumed / missing-data fallback. */
  mocked: boolean
}

export type ScoreGrade = "A" | "B" | "C" | "D" | "F"

export interface CustomerScore {
  /** 0-100 composite Customer Score. */
  score: number
  grade: ScoreGrade
  factors: CustomerScoreFactor[]
  /** Dominant property type used for the business profile assumptions. */
  businessType: string
}

/* ------------------------------------------------------------------ */
/*  Mocked Business-Type Catalog                                       */
/*                                                                     */
/*  No AR or true TAM data exists, so service-line breadth and target  */
/*  annual value are assumed per business type. A restaurant supports  */
/*  many service lines; a retail box supports few.                     */
/* ------------------------------------------------------------------ */

export interface BusinessProfile {
  label: string
  /** Count of service lines a healthy account of this type would use. */
  serviceLineCount: number
  /** Target annualized account spend used as the R-factor denominator. */
  targetAnnualValue: number
  /** Representative facility footprint (display only). */
  avgSquareFeet: number
}

const DEFAULT_PROFILE: BusinessProfile = {
  label: "General Commercial",
  serviceLineCount: 4,
  targetAnnualValue: 25_000,
  avgSquareFeet: 12_000,
}

/** Keyword-matched profiles. First match (in order) wins. */
const PROFILE_RULES: { test: RegExp; profile: BusinessProfile }[] = [
  { test: /restaurant|food|qsr|kitchen|cafe|dining/i, profile: { label: "Restaurant", serviceLineCount: 8, targetAnnualValue: 42_000, avgSquareFeet: 5_500 } },
  { test: /grocery|supermarket|market/i, profile: { label: "Grocery", serviceLineCount: 9, targetAnnualValue: 78_000, avgSquareFeet: 42_000 } },
  { test: /retail|store|shop|mall/i, profile: { label: "Retail", serviceLineCount: 4, targetAnnualValue: 20_000, avgSquareFeet: 18_000 } },
  { test: /grocery|cold|refriger|freezer/i, profile: { label: "Cold Storage", serviceLineCount: 7, targetAnnualValue: 65_000, avgSquareFeet: 30_000 } },
  { test: /multi.?family|apartment|residential|housing/i, profile: { label: "Multi-Family", serviceLineCount: 3, targetAnnualValue: 24_000, avgSquareFeet: 60_000 } },
  { test: /office|commercial|corporate|building/i, profile: { label: "Commercial Office", serviceLineCount: 5, targetAnnualValue: 32_000, avgSquareFeet: 45_000 } },
  { test: /medical|health|hospital|clinic|lab/i, profile: { label: "Healthcare", serviceLineCount: 7, targetAnnualValue: 58_000, avgSquareFeet: 35_000 } },
  { test: /warehouse|distribution|logistics|industrial/i, profile: { label: "Industrial", serviceLineCount: 5, targetAnnualValue: 36_000, avgSquareFeet: 90_000 } },
]

export function getBusinessProfile(propertyType: string): BusinessProfile {
  for (const rule of PROFILE_RULES) {
    if (rule.test.test(propertyType)) return rule.profile
  }
  return DEFAULT_PROFILE
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function clamp01(n: number): number {
  if (!isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function dominantKey(mix: Record<string, number>): string {
  let best = ""
  let bestN = -1
  for (const [k, n] of Object.entries(mix)) {
    if (n > bestN) { bestN = n; best = k }
  }
  return best
}

function gradeFor(score: number): ScoreGrade {
  if (score >= 85) return "A"
  if (score >= 70) return "B"
  if (score >= 55) return "C"
  if (score >= 40) return "D"
  return "F"
}

/** Predictability factor (0.5-1.0) derived from trend coverage + direction. */
function predictabilityFactor(c: CustomerAggregate): number {
  const t = c.trend
  if (!t) return 0.5
  const coverage = Math.min(t.monthCount, 6) / 6 // up to +0.3
  const dirBonus = t.direction === "improving" ? 0.2 : t.direction === "stable" ? 0.1 : 0
  return Math.max(0.5, Math.min(1.0, 0.5 + coverage * 0.3 + dirBonus))
}

/* ------------------------------------------------------------------ */
/*  Factor Computation                                                 */
/* ------------------------------------------------------------------ */

const WEIGHTS: Record<ScoreFactorKey, number> = { M: 0.30, R: 0.20, S: 0.20, P: 0.15, A: 0.15 }

const HVAC_MARGIN_CEILING = 0.60 // upper end of HVAC-Commercial gross margin benchmark

interface ScoreContext {
  regionBaselineMargin: Record<Region, number>
  portfolioAvgMargin: number
  windowDays: number
}

function computeFactors(c: CustomerAggregate, ctx: ScoreContext): CustomerScoreFactor[] {
  const profile = getBusinessProfile(dominantKey(c.propertyTypeMix))
  const homeRegion = dominantKey(c.regionDistribution) as Region
  const margin = c.validated.avgMarginPct

  // M — Margin Resilience: customer margin / regional baseline
  let baseline = ctx.regionBaselineMargin[homeRegion]
  if (!baseline || baseline <= 0) baseline = ctx.portfolioAvgMargin
  const mMocked = !baseline || baseline <= 0
  const mNorm = mMocked ? 1 : clamp01(margin / baseline)
  const M: CustomerScoreFactor = {
    key: "M", label: "Margin Resilience", weight: WEIGHTS.M, normalized: mNorm,
    weighted: WEIGHTS.M * mNorm,
    detail: mMocked
      ? "No positive regional baseline — weighting held at x1"
      : `${(margin * 100).toFixed(1)}% margin vs. ${(baseline * 100).toFixed(1)}% ${homeRegion} baseline`,
    mocked: mMocked,
  }

  // R — Revenue Volume & Value: annualized spend / target x predictability
  const annualized = ctx.windowDays > 0 ? c.validated.totalRevenue * (365 / ctx.windowDays) : c.validated.totalRevenue
  const predictability = predictabilityFactor(c)
  const rNorm = clamp01((annualized / profile.targetAnnualValue) * predictability)
  const R: CustomerScoreFactor = {
    key: "R", label: "Revenue Volume & Value", weight: WEIGHTS.R, normalized: rNorm,
    weighted: WEIGHTS.R * rNorm,
    detail: `~$${Math.round(annualized).toLocaleString()}/yr vs. $${profile.targetAnnualValue.toLocaleString()} ${profile.label} target x ${predictability.toFixed(2)} predictability`,
    mocked: false,
  }

  // S — Share of Wallet & Growth: real TAM penetration when available.
  let sNorm: number
  let sDetail: string
  if (c.customerTam && c.customerTam.totalAddressable > 0) {
    sNorm = clamp01(c.customerTam.sharePct)
    sDetail = `${(c.customerTam.sharePct * 100).toFixed(0)}% of $${Math.round(c.customerTam.totalAddressable / 1000)}k addressable wallet captured ($${Math.round(c.customerTam.whitespace / 1000)}k whitespace)`
  } else {
    const usedLines = Object.keys(c.jobTypeMix).filter(Boolean).length
    sNorm = clamp01(usedLines / profile.serviceLineCount)
    sDetail = `${usedLines} of ${profile.serviceLineCount} ${profile.label} service lines used (TAM proxy)`
  }
  const S: CustomerScoreFactor = {
    key: "S", label: "Share of Wallet & Growth", weight: WEIGHTS.S, normalized: sNorm,
    weighted: WEIGHTS.S * sNorm,
    detail: sDetail,
    mocked: !(c.customerTam && c.customerTam.totalAddressable > 0),
  }

  // P — Performance Trending: 12-mo baseline margin + 90-day change
  let pNorm: number
  let pMocked: boolean
  let pDetail: string
  if (c.trend) {
    const pValue = c.trend.priorMonthlyMargin + c.trend.delta // = recent margin (baseline + 90d change)
    pNorm = clamp01(pValue / HVAC_MARGIN_CEILING)
    pMocked = false
    pDetail = `${(c.trend.priorMonthlyMargin * 100).toFixed(1)}% baseline ${c.trend.delta >= 0 ? "+" : ""}${(c.trend.delta * 100).toFixed(1)}pts (90d)`
  } else {
    pNorm = 1
    pMocked = true
    pDetail = "Insufficient trend history — weighting held at x1"
  }
  const P: CustomerScoreFactor = {
    key: "P", label: "Performance Trending", weight: WEIGHTS.P, normalized: pNorm,
    weighted: WEIGHTS.P * pNorm, detail: pDetail, mocked: pMocked,
  }

  // A — AR Performance: DSO vs net target, from the simulated AR profile.
  let A: CustomerScoreFactor
  if (c.arProfile) {
    const ar = c.arProfile
    const aNorm = clamp01(ar.normalized)
    A = {
      key: "A", label: "AR Performance", weight: WEIGHTS.A, normalized: aNorm,
      weighted: WEIGHTS.A * aNorm,
      detail: `${ar.dso}d DSO vs. ${ar.targetDso}d net target — ${(ar.currentPct * 100).toFixed(0)}% current, ${(ar.d90Pct * 100).toFixed(0)}% 90d+ (${ar.risk})`,
      mocked: false,
    }
  } else {
    A = {
      key: "A", label: "AR Performance", weight: WEIGHTS.A, normalized: 1,
      weighted: WEIGHTS.A * 1,
      detail: "No AR / DSO data available — weighting held at x1",
      mocked: true,
    }
  }

  return [M, R, S, P, A]
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function computeCustomerScore(c: CustomerAggregate, ctx: ScoreContext): CustomerScore {
  const factors = computeFactors(c, ctx)
  const score = Math.round(factors.reduce((s, f) => s + f.weighted, 0) * 100)
  return {
    score,
    grade: gradeFor(score),
    factors,
    businessType: getBusinessProfile(dominantKey(c.propertyTypeMix)).label,
  }
}

/**
 * Build a per-customer score map. Scores are customer-level (scope-independent):
 * the M factor uses the customer's dominant region baseline, so the same score
 * applies in macro, region, and city drill views.
 */
export function buildCustomerScores(
  customers: CustomerAggregate[],
  regions: RegionAggregate[],
  portfolioAvgMargin: number,
  dataScope: DataScope,
): Map<string, CustomerScore> {
  const regionBaselineMargin = {} as Record<Region, number>
  for (const r of regions) regionBaselineMargin[r.region] = r.validated.avgMarginPct

  const windowDays = Math.max(
    1,
    Math.round((dataScope.createdTo.getTime() - dataScope.createdFrom.getTime()) / (1000 * 60 * 60 * 24)),
  )

  const ctx: ScoreContext = { regionBaselineMargin, portfolioAvgMargin, windowDays }

  const map = new Map<string, CustomerScore>()
  for (const c of customers) map.set(c.customerName, computeCustomerScore(c, ctx))
  return map
}

/* ------------------------------------------------------------------ */
/*  Portfolio Roll-up (for headline / context)                         */
/* ------------------------------------------------------------------ */

export interface ScoreDistribution {
  avgScore: number
  gradeCounts: Record<ScoreGrade, number>
  topScorers: { customerName: string; score: number }[]
  bottomScorers: { customerName: string; score: number }[]
}

export function buildScoreDistribution(scores: Map<string, CustomerScore>): ScoreDistribution {
  const entries = [...scores.entries()]
  const gradeCounts: Record<ScoreGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  let total = 0
  for (const [, s] of entries) {
    gradeCounts[s.grade]++
    total += s.score
  }
  const sorted = [...entries].sort((a, b) => b[1].score - a[1].score)
  return {
    avgScore: entries.length > 0 ? Math.round(total / entries.length) : 0,
    gradeCounts,
    topScorers: sorted.slice(0, 5).map(([customerName, s]) => ({ customerName, score: s.score })),
    bottomScorers: sorted.slice(-5).reverse().map(([customerName, s]) => ({ customerName, score: s.score })),
  }
}
