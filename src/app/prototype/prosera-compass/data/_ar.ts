/* ------------------------------------------------------------------ */
/*  AR / DSO Performance — simulated collections signal                */
/*                                                                     */
/*  The source job export carries no accounts-receivable data, so the  */
/*  CI-04 scorecard's A-factor (AR Performance) previously held its     */
/*  weighting at x1 for every account. This module simulates a         */
/*  deterministic, per-customer AR profile (Days Sales Outstanding +    */
/*  aging buckets) so the A-factor varies and differentiates accounts. */
/*                                                                     */
/*  Values are STATICALLY simulated (stable per customer name) and      */
/*  skewed by tier + margin so collections behavior correlates with     */
/*  account health: Stars collect near terms, Dogs drift delinquent.    */
/*  `_ar.ts` is the single seam to swap in a real AR/ERP feed later.    */
/* ------------------------------------------------------------------ */

import type { CustomerAggregate, Tier } from "./_transform"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ArRisk = "current" | "watch" | "delinquent"

export interface ArProfile {
  /** Days Sales Outstanding — avg days to collect on billed work. */
  dso: number
  /** Net terms + grace target (lower is better). */
  targetDso: number
  /** Share of AR balance that is current (not past due), 0-1. */
  currentPct: number
  /** Past-due aging buckets (0-1, sum with currentPct ≈ 1). */
  d30Pct: number
  d60Pct: number
  d90Pct: number
  /** 0-1 AR-performance factor for the scorecard (higher = healthier). */
  normalized: number
  risk: ArRisk
}

/* ------------------------------------------------------------------ */
/*  Deterministic pseudo-randomness (stable per customer name)         */
/* ------------------------------------------------------------------ */

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function clamp01(n: number): number {
  if (!isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/* ------------------------------------------------------------------ */
/*  Simulation                                                         */
/* ------------------------------------------------------------------ */

const TARGET_DSO = 45 // Net-30 + collection grace

/** Tier nudges DSO: healthy accounts pay closer to terms, Dogs drift. */
const TIER_DSO_SHIFT: Record<Tier, number> = {
  "Stars": -9,
  "Cash Cows": -3,
  "Question Marks": +7,
  "Dogs": +19,
}

export function buildArProfile(c: CustomerAggregate): ArProfile {
  const seed = hashSeed(`${c.customerName}|ar`)
  const margin = c.validated.avgMarginPct

  // Base DSO from seed (28-72d), then skew by tier and margin health.
  let dso = 28 + seed * 44
  dso += TIER_DSO_SHIFT[c.tier] ?? 0
  if (margin < 0) dso += 16
  else if (margin > 0.5) dso -= 5
  dso = Math.round(clamp(dso, 22, 96))

  const r = dso / TARGET_DSO

  // Aging mix: more current when DSO is low; 90d+ only emerges over target.
  const currentPct = clamp(1.15 - 0.55 * r, 0.18, 0.88)
  const remaining = 1 - currentPct
  const d90Pct = remaining * clamp01((r - 1) * 0.65)
  const d60Pct = remaining * 0.28
  const d30Pct = Math.max(0, remaining - d60Pct - d90Pct)

  // Performance factor: full credit at ~0.7x target, zero at ~2x target.
  const normalized = clamp01((TARGET_DSO * 2 - dso) / (TARGET_DSO * 2 - TARGET_DSO * 0.7))

  const risk: ArRisk = dso <= TARGET_DSO ? "current" : dso <= TARGET_DSO * 1.4 ? "watch" : "delinquent"

  return {
    dso,
    targetDso: TARGET_DSO,
    currentPct,
    d30Pct,
    d60Pct,
    d90Pct,
    normalized,
    risk,
  }
}

export function buildCustomerAr(customers: CustomerAggregate[]): Map<string, ArProfile> {
  const map = new Map<string, ArProfile>()
  for (const c of customers) map.set(c.customerName, buildArProfile(c))
  return map
}
