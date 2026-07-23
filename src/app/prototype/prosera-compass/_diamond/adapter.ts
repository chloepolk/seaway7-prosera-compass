/* ------------------------------------------------------------------ */
/*  Tender register → Action Centre adapter                             */
/*                                                                     */
/*  Promotes Meridian OWF procurement packages into generic 5-gate     */
/*  missions (Scoped → Specified → Approved → Issued → Awarded) so     */
/*  the Action Centre carries the live tender pipeline with owners,     */
/*  deadlines and savings targets.                                     */
/* ------------------------------------------------------------------ */

import type { MissionStage } from "./stages"
import { STAGE_META, STAGE_ORDER, stageIndex, statusForStage } from "./stages"
import type { ClosedRecord, DiamondMission, MissionHealth, MissionHorizon, MissionReasoningMeta, GateTask, GateTaskStatus } from "./types"
import { personForRole } from "./org"
import { agentFor, type MissionTheme } from "./agents"
import { TENDER_PACKAGES, CLOSED_PACKAGES, TODAY, PROJECT, type TenderPackage } from "../data/seaway7/_tenders"
import { componentById } from "../data/seaway7/_documents"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

/** Bucket a package by its remaining window onto the matrix rows:
 *  shock = <24h (immediate), near = 1-30 days, long = >30 days. */
function horizonFor(totalDays: number): MissionHorizon {
  if (totalDays <= 1) return "shock"
  if (totalDays <= 30) return "near"
  return "long"
}

function cadenceFor(totalDays: number): "days" | "weeks" | "quarter" {
  if (totalDays >= 60) return "quarter"
  if (totalDays >= 21) return "weeks"
  return "days"
}

/* ------------------------------------------------------------------ */
/*  Per-gate task synthesis (human vs. agent responsibility)           */
/* ------------------------------------------------------------------ */

function statusFor(stageIdxForTask: number, missionStageIdx: number, isFirst: boolean): GateTaskStatus {
  if (stageIdxForTask < missionStageIdx) return "done"
  if (stageIdxForTask > missionStageIdx) return "pending"
  return isFirst ? "in_progress" : "pending"
}

/** Plain-language "how to do it" steps for a human-owned gate task. */
function humanInstructions(stage: MissionStage, theme: MissionTheme, subject: string): string[] {
  if (stage === "understand") {
    if (theme === "charter") return [
      `Review the charter particulars and exposure summary assembled for ${subject}.`,
      "Confirm the vessel schedule against the installation programme.",
      "Flag any marine assurance constraints that change the commercial case.",
      "Sign off the scope so the approval gate can open.",
    ]
    return [
      `Open the extracted requirements pack for ${subject} — parameters, standards and terms.`,
      "Confirm the technical parameters against the latest controlled spec revision.",
      "Check the standards applicability with the Lead Quality Engineer.",
      "Sign off the requirements baseline so drafting can proceed.",
    ]
  }
  if (stage === "decide") return [
    "Review the draft ITT and the audit certificate against source documents.",
    "Resolve any flagged deviations from standard terms.",
    "Record approval and authorise issue via the SCM Portal.",
  ]
  if (stage === "execute") {
    if (theme === "charter") return [
      `Serve the option notice inside the contractual window for ${subject}.`,
      "Confirm hire, mobilisation and delivery particulars with the Owners.",
      "Log the executed amendment against the charter file.",
    ]
    return [
      `Answer bidder clarifications for ${subject} inside the 7-day window.`,
      "Review the normalised bid tabulation and technical conformity results.",
      "Prepare the award recommendation for approval.",
    ]
  }
  if (stage === "outcome_roi") return [
    `Confirm the savings booked for ${subject} with the Commercial Manager.`,
    "Brief the SCM Director and close the package.",
  ]
  // mission_created
  return [
    `Confirm the package objective, quantity and budget baseline for ${subject}.`,
    "Name the accountable owner and approver.",
  ]
}

/** Short "what the agent does" steps for an automated gate task. */
function agentInstructions(stage: MissionStage, theme: MissionTheme, subject: string): string[] {
  if (stage === "mission_created") return [
    `Pull the budget baseline and controlled documents for ${subject}.`,
    "Draft the package brief and retrieval plan.",
    "Schedule the tender window against the installation programme.",
  ]
  if (stage === "understand") {
    if (theme === "charter") return [
      "Pull the executed charter particulars and rate benchmarks.",
      "Quantify the exposure across the option window.",
      "Assemble the commercial case with cited clauses.",
    ]
    return [
      "Retrieve the controlled engineering specification.",
      "Map the applicable DNV / NORSOK / ISO standards from the QA manual.",
      "Assemble commercial terms and any charter flow-downs, with citations.",
    ]
  }
  if (stage === "decide") return [
    "Assemble the full ITT draft from the extracted requirements.",
    "Run the adversarial audit pass against every source document.",
    "Queue the audited draft for approval.",
  ]
  if (stage === "execute") {
    if (theme === "charter") return [
      "Prepare the option notice and amendment paperwork.",
      "Track counterparty acknowledgement.",
      "Queue the executed documents for the charter file.",
    ]
    return [
      "Issue the ITT pack via the SCM Portal and log acknowledgements.",
      "Track clarification requests against the 7-day deadline.",
      "Normalise returned bids into the tabulation model.",
    ]
  }
  // outcome_roi
  return [
    `Reconcile awarded value against the ${subject} budget baseline.`,
    "Attribute the savings to this package.",
    "Post the result to the savings ledger.",
  ]
}

function buildTasksForMission(opts: {
  missionId: string
  theme: MissionTheme
  stage: MissionStage
  humanRole: string
  sponsorRole: string
  subject: string
  openedAt: string
  totalDays: number
}): Record<MissionStage, GateTask[]> {
  const { missionId, theme, stage, humanRole, sponsorRole, subject, openedAt, totalDays } = opts
  const missionIdx = stageIndex(stage)
  const human = personForRole(humanRole)
  const sponsor = personForRole(sponsorRole)
  const out = {} as Record<MissionStage, GateTask[]>

  const understandLabel =
    theme === "charter" ? `Assemble charter particulars & exposure case for ${subject}`
      : `Extract spec parameters, standards & terms for ${subject}`
  const executeLabel =
    theme === "charter" ? `Prepare option notice and amendment for ${subject}`
      : `Issue ITT via SCM Portal and tabulate bids for ${subject}`

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = STAGE_ORDER[i]
    const agent = agentFor(s, theme)
    const tasks: GateTask[] = []
    // Stagger a due date per gate across the tender window.
    const gateDue = addDays(openedAt, Math.round(totalDays * ((i + 1) / STAGE_ORDER.length)))

    const agentTask = (label: string, why: string, doneWhen: string, objective: string): GateTask => ({
      id: `${missionId}-${s}-a`,
      stage: s,
      label,
      ownerType: "agent",
      owner: agent.name,
      ownerRole: agent.capability,
      agentIcon: agent.icon,
      status: statusFor(i, missionIdx, tasks.length === 0),
      why,
      doneWhen,
      instructions: agentInstructions(s, theme, subject),
      dueAt: gateDue,
      agentObjective: objective,
    })
    const humanTask = (who: typeof human, label: string, why: string, doneWhen: string): GateTask => ({
      id: `${missionId}-${s}-h`,
      stage: s,
      label,
      ownerType: "human",
      owner: who.name,
      ownerRole: who.role,
      status: statusFor(i, missionIdx, tasks.length === 0),
      why,
      doneWhen,
      instructions: humanInstructions(s, theme, subject),
      dueAt: gateDue,
    })

    if (s === "mission_created") {
      tasks.push(agentTask(
        `Assemble package brief & retrieval plan for ${subject}`,
        "Frame the package with the right controlled documents before drafting begins.",
        "Brief approved and budget baseline captured.",
        `Compile the package brief for ${subject}: budget baseline, controlled document set, and tender window.`,
      ))
    } else if (s === "understand") {
      tasks.push(agentTask(
        understandLabel,
        "Every requirement must trace to a controlled document before it enters the ITT.",
        "Requirements extracted with document citations.",
        `Extract the complete requirements baseline for ${subject}, citing every source document and revision.`,
      ))
      tasks.push(humanTask(human, "Validate the requirements baseline", "Extraction is grounded, but scope judgement stays human.", "Owner signs off the requirements baseline."))
    } else if (s === "decide") {
      tasks.push(agentTask(
        "Assemble the draft ITT and run the audit pass",
        "The draft must survive adversarial verification before it reaches an approver.",
        "Audited draft queued with a clean certificate.",
        `Assemble the full ITT for ${subject} and verify every clause against the source documents.`,
      ))
      tasks.push(humanTask(sponsor, "Approve the ITT and authorise issue", "Approval authority and deviation acceptance stay human.", "Approval recorded; issue authorised."))
    } else if (s === "execute") {
      tasks.push(agentTask(
        executeLabel,
        "Turn the approved draft into a live tender with tracked returns.",
        "Bids tabulated and conformity checked.",
        `Run the live tender for ${subject}: issue, acknowledgements, clarifications and bid tabulation.`,
      ))
      tasks.push(humanTask(human, `Run clarifications and the award recommendation for ${subject}`, "Supplier negotiation and evaluation judgement stay human.", "Award recommendation submitted."))
    } else {
      tasks.push(agentTask(
        "Reconcile awarded value and book the savings",
        "Prove the tender created value and attribute it to the package.",
        "Savings booked to the ledger.",
        `Reconcile awarded value against budget for ${subject} and post the savings attribution.`,
      ))
    }

    out[s] = tasks
  }
  return out
}

/** Build entry dates for each reached gate; null for gates not yet reached. */
function buildStageDates(stage: MissionStage, openedAt: string, elapsedDays: number, completedAt?: string): Record<MissionStage, string | null> {
  const idx = stageIndex(stage)
  const dates = {} as Record<MissionStage, string | null>
  const spacing = idx > 0 ? Math.max(1, Math.floor(elapsedDays / idx)) : elapsedDays
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = STAGE_ORDER[i]
    if (i > idx) { dates[s] = null; continue }
    if (s === "outcome_roi" && completedAt) { dates[s] = completedAt; continue }
    dates[s] = addDays(openedAt, i * spacing)
  }
  return dates
}

/** Reached gates fully complete; current gate partial; future gates empty. */
function buildGateProgress(stage: MissionStage): Record<MissionStage, { done: number; total: number }> {
  const idx = stageIndex(stage)
  const out = {} as Record<MissionStage, { done: number; total: number }>
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = STAGE_ORDER[i]
    const total = STAGE_META[s].checklist.length
    if (i < idx) out[s] = { done: total, total }
    else if (i === idx) out[s] = { done: stage === "outcome_roi" && idx === 4 ? total : Math.max(1, Math.round(total * 0.5)), total }
    else out[s] = { done: 0, total }
  }
  return out
}

/* ------------------------------------------------------------------ */
/*  Tender packages → missions                                         */
/* ------------------------------------------------------------------ */

function missionFromPackage(pkg: TenderPackage, stageOverride?: MissionStage): DiamondMission {
  const stage = stageOverride ?? pkg.stage
  const idx = stageIndex(stage)
  const theme: MissionTheme = pkg.componentId ? "supply" : "charter"
  const spec = pkg.componentId ? componentById(pkg.componentId) : undefined

  const totalDays = daysBetween(pkg.openedAt, pkg.submissionDeadline)
  const elapsedDays = Math.min(totalDays, daysBetween(pkg.openedAt, TODAY))
  const remaining = totalDays - elapsedDays

  const projectedValue = pkg.targetSavings
  const realizedValue = stage === "outcome_roi" ? (pkg.realisedSavings ?? pkg.targetSavings) : undefined
  const roiMultiple = realizedValue ? Math.round((realizedValue / pkg.tenderCost) * 10) / 10 : undefined
  const completedAt = stage === "outcome_roi" ? pkg.submissionDeadline : undefined

  const health: MissionHealth =
    stage === "outcome_roi" ? "on_track"
      : remaining <= 3 && idx < 3 ? "overdue"
        : pkg.confidence >= 0.84 ? "on_track"
          : pkg.confidence >= 0.76 ? "at_risk"
            : "overdue"

  const subject = spec?.shortName ?? pkg.title

  const reasoningMeta: MissionReasoningMeta = {
    theme,
    steps: theme === "charter"
      ? [
        "Pulled executed charter particulars (hire rate, firm period, option window)",
        "Benchmarked the option rate against the assessed spot HLCV market",
        "Quantified the exposure avoided across the 30-day option window",
        "Sequenced the option notice inside the contractual deadline",
      ]
      : [
        `Retrieved the controlled specification ${spec?.docRef ?? ""} and locked the parameter baseline`,
        "Mapped applicable standards from the QA-MAN-2026-EPCI matrix to this component class",
        "Attached governing procurement terms (S7-SCM-TC-2026) and any charter flow-downs",
        "Sized the savings target from the budget baseline and bidder competition",
      ],
    equations: [
      `Budget baseline = $${pkg.budget.toLocaleString()} (${pkg.quantity})`,
      realizedValue
        ? `Savings booked = $${realizedValue.toLocaleString()} vs. target $${pkg.targetSavings.toLocaleString()}`
        : `Savings target = $${pkg.targetSavings.toLocaleString()} (${((pkg.targetSavings / pkg.budget) * 100).toFixed(1)}% of budget across ${pkg.bidders} bidders)`,
      `Tender cost = $${pkg.tenderCost.toLocaleString()} — return ${(projectedValue / pkg.tenderCost).toFixed(1)}× if target holds`,
      `Window: opened ${pkg.openedAt}, submissions close ${pkg.submissionDeadline} (${remaining > 0 ? `${remaining} days remaining` : "closed"})`,
    ],
    sources: theme === "charter"
      ? [
        "SUPPLYTIME 2026 — Executed charter party (Legal & Maritime)",
        "S7-SCM-TC-2026-v1.0 — Standard procurement terms",
        "Internal — Q3 2026 HLCV market assessment",
      ]
      : [
        `${spec?.docRef ?? "Engineering specification"} — ${spec?.name ?? pkg.title}`,
        "QA-MAN-2026-EPCI — Corporate QA manual, standards matrix §3",
        "S7-SCM-TC-2026-v1.0 — Standard procurement terms",
        ...(pkg.involvesVessel ? ["SUPPLYTIME 2026 — Charter flow-down clauses"] : []),
      ],
  }

  const critical = stage === "outcome_roi" ? null : {
    owner: pkg.ownerRole,
    label: STAGE_META[stage].checklist[Math.min(2, STAGE_META[stage].checklist.length - 1)],
    status: (health === "overdue" ? "blocked" : idx >= 1 ? "in_progress" : "pending") as "blocked" | "in_progress" | "pending",
  }

  const currentMetric = stage === "outcome_roi" ? realizedValue! : stage === "execute" ? Math.round(projectedValue * 0.45) : 0

  return {
    id: pkg.id,
    name: `${pkg.title} · ${pkg.quantity}`,
    objective: `Take ${pkg.packageRef} from scope to award for ${PROJECT.shortName} — ${pkg.quantity} against a $${(pkg.budget / 1_000_000).toFixed(1)}M budget, targeting $${Math.round(pkg.targetSavings / 1000)}k in negotiated savings.`,
    source: { page: "tender-studio", label: "Open in Tender Studio" },
    stage,
    status: statusForStage[stage],
    health,
    owner: pkg.ownerRole,
    sponsor: pkg.sponsorRole,
    cost: pkg.tenderCost,
    projectedValue,
    realizedValue,
    roiMultiple,
    confidence: pkg.confidence,
    recommendation: pkg.narrative,
    risk: pkg.risk,
    evidence: pkg.evidence,
    successMetric: {
      label: theme === "charter" ? "Charter exposure avoided" : "Negotiated savings vs. budget",
      baseline: 0,
      target: projectedValue,
      current: currentMetric,
      unit: "$",
      direction: "increase",
    },
    openedAt: pkg.openedAt,
    targetCompletionAt: pkg.submissionDeadline,
    completedAt,
    cadence: cadenceFor(totalDays),
    horizon: horizonFor(Math.max(1, remaining)),
    valueType: pkg.valueType,
    elapsedDays,
    totalDays,
    stageDates: buildStageDates(stage, pkg.openedAt, elapsedDays, completedAt),
    critical,
    gateProgress: buildGateProgress(stage),
    tasksByStage: buildTasksForMission({
      missionId: pkg.id,
      theme,
      stage,
      humanRole: pkg.ownerRole,
      sponsorRole: pkg.sponsorRole,
      subject,
      openedAt: pkg.openedAt,
      totalDays,
    }),
    reasoningMeta,
  }
}

/* ------------------------------------------------------------------ */
/*  Closed ledger (awarded package history)                            */
/* ------------------------------------------------------------------ */

const CLOSED_HISTORY: ClosedRecord[] = CLOSED_PACKAGES.map(c => ({
  id: c.id,
  name: c.name,
  source: "tender-studio",
  cost: c.cost,
  realizedValue: c.realisedSavings,
  roiMultiple: Math.round((c.realisedSavings / c.cost) * 10) / 10,
  completionDate: c.completionDate,
  decisionMaker: c.decisionMaker,
}))

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface DiamondData {
  missions: DiamondMission[]
  closed: ClosedRecord[]
}

/**
 * Build the Action Centre from the tender register.
 * `stageOverrides` carries session progress (e.g. an ITT drafted in
 * Tender Studio advances its package to the approval gate).
 */
export function buildDiamondMissions(stageOverrides?: Record<string, MissionStage>): DiamondData {
  const missions = TENDER_PACKAGES.map(pkg => missionFromPackage(pkg, stageOverrides?.[pkg.id]))

  // Stable display order: furthest-progressed active work first, awarded last.
  missions.sort((a, b) => stageIndex(b.stage) - stageIndex(a.stage))

  return { missions, closed: CLOSED_HISTORY }
}

/* ------------------------------------------------------------------ */
/*  Portfolio savings roll-up (for the accumulated strip)              */
/* ------------------------------------------------------------------ */

export interface PortfolioRoi {
  missionsClosed: number
  realizedToDate: number
  totalInvested: number
  blendedRoi: number
  inFlightProjected: number
  inFlightCount: number
  cumulative: { label: string; total: number }[]
  ledger: ClosedRecord[]
}

export function buildPortfolioRoi(missions: DiamondMission[], closed: ClosedRecord[]): PortfolioRoi {
  const closedMissions = missions.filter(m => m.stage === "outcome_roi" && m.realizedValue)
  const closedRealized = closedMissions.reduce((s, m) => s + (m.realizedValue ?? 0), 0)
  const closedCost = closedMissions.reduce((s, m) => s + m.cost, 0)

  const historyRealized = closed.reduce((s, c) => s + c.realizedValue, 0)
  const historyCost = closed.reduce((s, c) => s + c.cost, 0)

  const realizedToDate = closedRealized + historyRealized
  const totalInvested = closedCost + historyCost
  const inFlight = missions.filter(m => m.stage !== "outcome_roi")

  const ledger: ClosedRecord[] = [
    ...closedMissions.map(m => ({
      id: m.id,
      name: m.name,
      source: m.source.page,
      cost: m.cost,
      realizedValue: m.realizedValue ?? 0,
      roiMultiple: m.roiMultiple ?? 0,
      completionDate: m.completedAt ?? m.targetCompletionAt,
      decisionMaker: m.owner,
    })),
    ...closed,
  ].sort((a, b) => a.completionDate.localeCompare(b.completionDate))

  let running = 0
  const cumulative = ledger.map(e => {
    running += e.realizedValue
    return { label: e.completionDate, total: running }
  })

  return {
    missionsClosed: ledger.length,
    realizedToDate,
    totalInvested,
    blendedRoi: totalInvested > 0 ? realizedToDate / totalInvested : 0,
    inFlightProjected: inFlight.reduce((s, m) => s + m.projectedValue, 0),
    inFlightCount: inFlight.length,
    cumulative,
    ledger,
  }
}
