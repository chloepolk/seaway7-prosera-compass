/* ------------------------------------------------------------------ */
/*  Bid evaluation scoring — ITT-MER-SCM-2101 model (0–100)            */
/*                                                                     */
/*  Price 35% · Tech 25% · QA/HSEQ 20% · Legal 20%                     */
/*  Hard gates run first; operational deviation penalty P is deferred. */
/* ------------------------------------------------------------------ */

import type { BidInput } from "./_bids"
import type { Locale } from "../../_i18n"

export const PRICE_MAX = 35
export const TECH_MAX = 25
export const QA_MAX = 20
export const LEGAL_MAX = 20

export const STANDARD_WARRANTY_MONTHS = 24
/** Warranty below this after a >25% cut from standard → high commercial risk. */
export const WARRANTY_RISK_THRESHOLD_MONTHS = STANDARD_WARRANTY_MONTHS * 0.75 // 18

export const FAT_STANDARD_DAYS = 30
export const FAT_DELAY_BLOCK_DAYS = 15
export const FAT_DELAY_PENALTY = 5

export const ISO_TRACEABILITY_MAX = 10
export const FAT_ALIGNMENT_MAX = 10
export const KFK_LEGAL_PTS = 10
export const WARRANTY_LEGAL_PTS = 10
export const WARRANTY_SHORTFALL_PENALTY = 15

export type GateId = "iso9001" | "knockForKnock" | "ddpRotterdam"

export const GATE_LABELS: Record<GateId, string> = {
  iso9001: "Valid ISO 9001",
  knockForKnock: "Mutual knock-for-knock",
  ddpRotterdam: "DDP Rotterdam",
}

const FR_GATE_LABELS: Record<GateId, string> = {
  iso9001: "ISO 9001 valide",
  knockForKnock: "Knock-for-knock mutuel",
  ddpRotterdam: "DDP Rotterdam",
}

export function gateLabels(locale: Locale): Record<GateId, string> {
  return locale === "fr" ? FR_GATE_LABELS : GATE_LABELS
}

export type GatingStatus = "Pass" | "Fail"

export interface BidEvaluationResult {
  bidId: string
  supplier: string
  pdfPath: string | null
  totalPrice: number
  gatingStatus: GatingStatus
  gateFailures: GateId[]
  priceScore: number | null
  techScore: number | null
  qaScore: number | null
  legalScore: number | null
  compositeScore: number | null
  finalRank: number | null
  highCommercialRisk: boolean
  warrantyMonths: number
  fatNoticeDays: number
  insight: string
  recommendation: string
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function evaluateGates(bid: BidInput): GateId[] {
  const failures: GateId[] = []
  if (!bid.hasValidIso9001) failures.push("iso9001")
  if (!bid.acceptsKfk) failures.push("knockForKnock")
  if (!bid.acceptsDdpRotterdam) failures.push("ddpRotterdam")
  return failures
}

function scoreTech(bid: BidInput): number {
  if (bid.techCompliancePts >= TECH_MAX) return TECH_MAX
  return Math.max(0, Math.min(20, bid.techCompliancePts))
}

function scoreQa(bid: BidInput): number {
  const iso = Math.max(0, Math.min(ISO_TRACEABILITY_MAX, bid.isoTraceabilityPts))
  let fat = FAT_ALIGNMENT_MAX
  if (bid.fatNoticeDays > FAT_STANDARD_DAYS) {
    const extra = bid.fatNoticeDays - FAT_STANDARD_DAYS
    const blocks = Math.floor(extra / FAT_DELAY_BLOCK_DAYS)
    fat = Math.max(0, FAT_ALIGNMENT_MAX - blocks * FAT_DELAY_PENALTY)
  } else if (bid.fatNoticeDays < FAT_STANDARD_DAYS) {
    // Short of the required notice — treat as non-aligned (0 FAT points).
    fat = 0
  }
  return Math.min(QA_MAX, iso + fat)
}

function scoreLegal(bid: BidInput): number {
  // Eligible bids already passed the KFK gate, so indemnity acceptance scores full.
  const kfk = bid.acceptsKfk ? KFK_LEGAL_PTS : 0
  const warranty =
    bid.warrantyMonths >= STANDARD_WARRANTY_MONTHS ? WARRANTY_LEGAL_PTS : 0
  let total = kfk + warranty
  if (bid.warrantyMonths < STANDARD_WARRANTY_MONTHS) {
    total = Math.max(0, total - WARRANTY_SHORTFALL_PENALTY)
  }
  return Math.min(LEGAL_MAX, total)
}

function buildRecommendation(
  bid: BidInput,
  result: Pick<
    BidEvaluationResult,
    "gatingStatus" | "gateFailures" | "compositeScore" | "finalRank" | "highCommercialRisk" | "priceScore"
  >,
  locale: Locale,
): string {
  const labelsForLocale = gateLabels(locale)
  if (result.gatingStatus === "Fail") {
    const labels = result.gateFailures.map((g) => labelsForLocale[g]).join("; ")
    if (locale === "fr") {
      return `Disqualifié — échec aux portes éliminatoires : ${labels}. Ne pas faire progresser vers une recommandation d’attribution commerciale.`
    }
    return `Disqualified — failed hard gate(s): ${labels}. Do not progress to commercial award recommendation.`
  }
  if (result.highCommercialRisk) {
    if (locale === "fr") {
      return `Rang n°${result.finalRank}, score composite ${result.compositeScore}. Risque commercial élevé : garantie réduite de plus de 25 % sous la norme Future Energy de 24 mois. Privilégier un soumissionnaire conforme mieux classé, sauf acceptation formelle du risque.`
    }
    return `Rank #${result.finalRank} with composite ${result.compositeScore}. High commercial risk: warranty reduced more than 25% below the 24-month Future Energy standard. Prefer a higher-ranked compliant bidder unless risk is formally accepted.`
  }
  if (result.finalRank === 1) {
    if (locale === "fr") {
      return `Candidat recommandé pour l’attribution — rang n°1, score composite ${result.compositeScore}. ${bid.insight}`
    }
    return `Recommended award candidate — Rank #1, composite ${result.compositeScore}. ${bid.insight}`
  }
  if (locale === "fr") {
    return `Rang n°${result.finalRank}, score composite ${result.compositeScore}. ${bid.insight}`
  }
  return `Rank #${result.finalRank}, composite ${result.compositeScore}. ${bid.insight}`
}

/**
 * Evaluate a set of bids. Price normalisation uses P_min among **eligible**
 * (gate-passing) bids only. Disqualified bids keep null scores and no rank.
 */
export function evaluateBids(bids: BidInput[], locale: Locale = "en"): BidEvaluationResult[] {
  const gated = bids.map((bid) => {
    const gateFailures = evaluateGates(bid)
    return { bid, gateFailures, pass: gateFailures.length === 0 }
  })

  const eligible = gated.filter((g) => g.pass)
  const pMin = eligible.length > 0 ? Math.min(...eligible.map((g) => g.bid.totalPrice)) : 0

  const scored = gated.map(({ bid, gateFailures, pass }) => {
    if (!pass) {
      const base: BidEvaluationResult = {
        bidId: bid.id,
        supplier: bid.supplier,
        pdfPath: bid.pdfPath,
        totalPrice: bid.totalPrice,
        gatingStatus: "Fail",
        gateFailures,
        priceScore: null,
        techScore: null,
        qaScore: null,
        legalScore: null,
        compositeScore: null,
        finalRank: null,
        highCommercialRisk: false,
        warrantyMonths: bid.warrantyMonths,
        fatNoticeDays: bid.fatNoticeDays,
        insight: bid.insight,
        recommendation: "",
      }
      base.recommendation = buildRecommendation(bid, base, locale)
      return base
    }

    const priceScore = round1(PRICE_MAX * (pMin / bid.totalPrice))
    const techScore = round1(scoreTech(bid))
    const qaScore = round1(scoreQa(bid))
    const legalScore = round1(scoreLegal(bid))
    const compositeScore = round1(priceScore + techScore + qaScore + legalScore)
    const highCommercialRisk = bid.warrantyMonths < WARRANTY_RISK_THRESHOLD_MONTHS

    return {
      bidId: bid.id,
      supplier: bid.supplier,
      pdfPath: bid.pdfPath,
      totalPrice: bid.totalPrice,
      gatingStatus: "Pass" as const,
      gateFailures,
      priceScore,
      techScore,
      qaScore,
      legalScore,
      compositeScore,
      finalRank: null as number | null,
      highCommercialRisk,
      warrantyMonths: bid.warrantyMonths,
      fatNoticeDays: bid.fatNoticeDays,
      insight: bid.insight,
      recommendation: "",
    }
  })

  const ranked = scored
    .filter((r) => r.gatingStatus === "Pass" && r.compositeScore != null)
    .sort((a, b) => {
      const cs = (b.compositeScore ?? 0) - (a.compositeScore ?? 0)
      if (cs !== 0) return cs
      if (a.totalPrice !== b.totalPrice) return a.totalPrice - b.totalPrice
      return a.supplier.localeCompare(b.supplier)
    })

  ranked.forEach((r, i) => {
    r.finalRank = i + 1
  })

  return scored.map((r) => {
    const bid = bids.find((b) => b.id === r.bidId)!
    return {
      ...r,
      recommendation: buildRecommendation(bid, r, locale),
    }
  })
}

/** Stable display order: ranked eligible first, then disqualified by supplier name. */
export function sortEvaluationForDisplay(results: BidEvaluationResult[]): BidEvaluationResult[] {
  return [...results].sort((a, b) => {
    if (a.finalRank != null && b.finalRank != null) return a.finalRank - b.finalRank
    if (a.finalRank != null) return -1
    if (b.finalRank != null) return 1
    return a.supplier.localeCompare(b.supplier)
  })
}

/*
 * Expected demo outcomes (smoke):
 * - Prysmatic: Fail (ddpRotterdam), no composite / rank
 * - P_min among eligible = NexCore 2,150,000
 * - Viking: Pass, highCommercialRisk true (12 mo warranty), Legal floored after −15
 * - J-Tech vs NexCore: J-Tech typically ranks #1 on tech/QA despite higher price
 */
