import type { MissionStage, MissionStatus } from "./stages"
import type { Page } from "../_store"

export type MissionHealth = "on_track" | "at_risk" | "overdue"

/** Execution horizon, bucketed off mission duration (totalDays), shared with
 *  the Compass Profitability Matrix rows.
 *  shock = <24h (immediate) · near = 1-30 days · long = >30 days. */
export type MissionHorizon = "shock" | "near" | "long"

/** Whether an action protects existing value (defend margin) or creates new
 *  value (grow revenue). Drives the Compass Profitability Matrix columns. */
export type MissionObjective = "protection" | "creation"

export interface DiamondSuccessMetric {
  label: string
  baseline: number
  target: number
  current: number
  unit: string
  direction: "increase" | "decrease"
}

export interface CriticalTask {
  owner: string
  label: string
  status: "blocked" | "in_progress" | "pending"
}

export type TaskOwnerType = "agent" | "human"
export type GateTaskStatus = "pending" | "in_progress" | "blocked" | "done" | "overridden" | "postponed"

/** A concrete unit of work at a gate, owned by a person or an automated agent. */
export interface GateTask {
  id: string
  stage: MissionStage
  label: string
  ownerType: TaskOwnerType
  /** Person name (human) or agent name (agent). */
  owner: string
  /** Role/title (human) or capability (agent). */
  ownerRole: string
  /** Lucide icon for agent tasks. */
  agentIcon?: string
  status: GateTaskStatus
  why: string
  doneWhen: string
  /** Plain-language steps so the owner can execute with minimal training. */
  instructions?: string[]
  /** Target date for the task (drives overdue chips). */
  dueAt?: string
  /** Objective handed to the spawned agent (agent tasks only). */
  agentObjective?: string
}

/**
 * Slim, self-contained mission shape that the generic diamond renders.
 * Synthesized from ACME prescriptions/expansion prescriptions by the adapter
 * — no RACI/audit/signal coupling from the source prototype.
 */
export interface DiamondMission {
  id: string
  name: string
  objective: string
  /** Provenance back into ACME intelligence pages. */
  source: { page: Page; label: string }
  stage: MissionStage
  status: MissionStatus
  health: MissionHealth
  owner: string
  sponsor: string
  cost: number
  projectedValue: number
  realizedValue?: number
  roiMultiple?: number
  confidence: number
  recommendation: string
  risk: string
  evidence: string[]
  successMetric: DiamondSuccessMetric
  openedAt: string
  targetCompletionAt: string
  completedAt?: string
  cadence: "days" | "weeks" | "quarter"
  /** Shock / Near / Long — derived from totalDays (see horizonFor). */
  horizon: MissionHorizon
  /** Value Protection vs. Value Creation — Profitability Matrix column. */
  valueType: MissionObjective
  elapsedDays: number
  totalDays: number
  /** Entry date per stage (null when not yet reached) — drives the gate timeline. */
  stageDates: Record<MissionStage, string | null>
  critical: CriticalTask | null
  /** Synthesized checklist completion per gate. */
  gateProgress: Record<MissionStage, { done: number; total: number }>
  /** Per-gate tasks with explicit human/agent ownership. */
  tasksByStage: Record<MissionStage, GateTask[]>
  /** Calculation chain, equations, and source tags for BluePilot reasoning. */
  reasoningMeta?: MissionReasoningMeta
}

/** Structured calculation chain attached to a mission for BluePilot disclosure. */
export interface MissionReasoningMeta {
  theme: "supply" | "charter"
  /** Ordered analysis steps (data join → scoring → action). */
  steps: string[]
  /** Explicit formulas with substituted values. */
  equations: string[]
  /** External and internal data sources cited. */
  sources: string[]
  /** Domain data modules consumed (for audit traceability). */
  dataFiles?: string[]
}

/** A previously closed mission for the portfolio ROI ledger. */
export interface ClosedRecord {
  id: string
  name: string
  source: string
  cost: number
  realizedValue: number
  roiMultiple: number
  completionDate: string
  decisionMaker: string
}
