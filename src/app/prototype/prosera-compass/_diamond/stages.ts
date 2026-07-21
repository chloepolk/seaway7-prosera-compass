/* ------------------------------------------------------------------ */
/*  Mission-to-ROI Action Board — 5-gate geometry (generic)            */
/*                                                                     */
/*  Ported from the agentic-diamond prototype. Pure constants/helpers  */
/*  with no external data coupling, reused by the ACME diamond.        */
/* ------------------------------------------------------------------ */

export type MissionStage =
  | "mission_created"
  | "understand"
  | "decide"
  | "execute"
  | "outcome_roi"

export type MissionStatus =
  | "Created"
  | "Understanding"
  | "Decision Gate"
  | "Executing"
  | "Scored"

export const STAGE_ORDER: MissionStage[] = [
  "mission_created",
  "understand",
  "decide",
  "execute",
  "outcome_roi",
]

export const stageIndex = (s: MissionStage): number => STAGE_ORDER.indexOf(s)

export const statusForStage: Record<MissionStage, MissionStatus> = {
  mission_created: "Created",
  understand: "Understanding",
  decide: "Decision Gate",
  execute: "Executing",
  outcome_roi: "Scored",
}

export type StageMeta = {
  stage: MissionStage
  baseLabel: string
  title: string
  tagline: string
  meaning: string
  checklist: string[]
  icon: string
}

export const STAGE_META: Record<MissionStage, StageMeta> = {
  mission_created: {
    stage: "mission_created",
    baseLabel: "Origin",
    title: "Package Scoped",
    tagline: "The package objective, budget and ownership are set.",
    icon: "Flag",
    meaning:
      "A procurement package opens with a defined scope, a budget baseline, an accountable owner and an approver, and a tender window scheduled against the installation programme. This is the start of the loop — the same origin node where savings are later booked.",
    checklist: [
      "Package objective set",
      "Budget baseline captured",
      "Owner and approver named",
      "Bidder list drafted",
      "Tender window scheduled",
    ],
  },
  understand: {
    stage: "understand",
    baseLabel: "Gate 1",
    title: "Specify",
    tagline: "Agents extract every requirement from controlled documents.",
    icon: "Search",
    meaning:
      "Agents retrieve the controlled engineering specification, map the applicable DNV / NORSOK / ISO standards from the QA manual, and attach governing commercial terms — every requirement cited to its source revision. The package owner validates the baseline.",
    checklist: [
      "Engineering specification retrieved",
      "Standards mapped from QA manual",
      "Commercial terms attached",
      "Charter flow-downs checked",
      "Requirements baseline signed off",
    ],
  },
  decide: {
    stage: "decide",
    baseLabel: "Gate 2",
    title: "Approve",
    tagline: "The audited draft ITT is approved by a human.",
    icon: "Scale",
    meaning:
      "The draft ITT is assembled from the extracted requirements and passed through an adversarial audit against every source document. The approver reviews the audit certificate, resolves deviations, and records explicit approval. No silent automation.",
    checklist: [
      "Draft ITT assembled",
      "Audit pass complete",
      "Deviations resolved",
      "Approval recorded",
      "Issue authorised",
    ],
  },
  execute: {
    stage: "execute",
    baseLabel: "Gate 3",
    title: "Issue & Evaluate",
    tagline: "The tender goes live with tracked returns.",
    icon: "ListChecks",
    meaning:
      "The ITT is issued via the SCM Portal, bidder acknowledgements are logged, clarifications are answered inside the 7-day window, and returned bids are normalised into the tabulation model with technical conformity checks.",
    checklist: [
      "ITT issued via SCM Portal",
      "Bidder acknowledgements logged",
      "Clarifications answered",
      "Bids tabulated",
      "Technical conformity checked",
    ],
  },
  outcome_roi: {
    stage: "outcome_roi",
    baseLabel: "Origin",
    title: "Award",
    tagline: "The loop closes when savings are booked.",
    icon: "Trophy",
    meaning:
      "The award recommendation is approved, the purchase order issues, and awarded value is reconciled against the budget baseline. Savings are booked to the ledger and the loop closes back at the origin.",
    checklist: [
      "Award recommendation approved",
      "Purchase order issued",
      "Savings reconciled vs. budget",
      "Ledger updated",
      "Loop closed",
    ],
  },
}

// Loop geometry on a 400x400 viewBox: four gate nodes on a rhombus, balanced
// on its point. Origin (gate 0) and Outcome share the bottom node — the loop
// starts and closes at the same point.
export const BASE_POS: Record<MissionStage, { x: number; y: number }> = {
  mission_created: { x: 200, y: 352 },
  understand: { x: 348, y: 200 },
  decide: { x: 200, y: 48 },
  execute: { x: 52, y: 200 },
  outcome_roi: { x: 200, y: 352 },
}

export const PATH_SEGMENTS: { from: MissionStage; to: MissionStage }[] = [
  { from: "mission_created", to: "understand" },
  { from: "understand", to: "decide" },
  { from: "decide", to: "execute" },
  { from: "execute", to: "outcome_roi" },
]

export const isSegmentComplete = (current: MissionStage, segIndex: number): boolean =>
  stageIndex(current) >= segIndex + 1

export function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  }
  return `$${Math.round(n / 1000)}k`
}

export function getInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z ]/g, "").trim().split(/\s+/)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export const HEALTH_STYLE: Record<"on_track" | "at_risk" | "overdue", { label: string; cls: string; flow: string }> = {
  on_track: { label: "On track", cls: "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-strong)] ring-[var(--color-brand-primary)]/25", flow: "var(--color-brand-primary)" },
  at_risk: { label: "At risk", cls: "bg-[var(--color-accent-warning)]/10 text-[var(--color-accent-warning-text)] ring-[var(--color-accent-warning)]/30", flow: "var(--color-accent-warning)" },
  overdue: { label: "Overdue", cls: "bg-[var(--color-accent-critical)]/10 text-[var(--color-accent-critical-text)] ring-[var(--color-accent-critical)]/30", flow: "var(--color-accent-critical)" },
}
