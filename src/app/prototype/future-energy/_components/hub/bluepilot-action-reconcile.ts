import type { DiamondMission } from "../../_diamond/types"
import type { MissionStage } from "../../_diamond/stages"
import { STAGE_ORDER, stageIndex } from "../../_diamond/stages"
import type { ReasoningContent } from "../reasoning-disclosure"
import { reasoningFromMission } from "../reasoning-helpers"
import type { ActionTimelineEntry } from "./hub-types"
import { buildFullTimeline } from "./mission-timeline-helpers"

export type MissionSessionPatch = {
  recommendation: string
  risk: string
  confidence: number
  reasoning: ReasoningContent
  timelineEntries: ActionTimelineEntry[]
  /** Advanced gate after owner confirmation. */
  stage?: MissionStage
  /** Role accountable for the new current timeline step. */
  ownerRole?: string
}

function nextStage(stage: MissionStage): MissionStage | undefined {
  const idx = stageIndex(stage)
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return undefined
  return STAGE_ORDER[idx + 1]
}

const RECONCILE_PHASES = [
  "Ingesting your edit…",
  "Re-scoring risk and confidence…",
  "Updating execution timeline…",
] as const

const COMPLETE_PHASES = [
  "Ingesting your confirmation…",
  "Advancing execution timeline…",
  "Updating mission status…",
] as const

const PHASE_MS = 520

function firstSentence(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^[^.!?\n]+[.!?]?/)
  return (match?.[0] ?? trimmed).trim()
}

function deriveRisk(mission: DiamondMission, newRecommendation: string): string {
  const lower = newRecommendation.toLowerCase()
  if (/urgent|immediate|asap|deadline|window/.test(lower)) {
    return "Owner tightened the plan — compressed timeline increases execution variance; monitor daily."
  }
  if (/pause|hold|delay|postpone/.test(lower)) {
    return "Owner deferred execution — value window may narrow if the change is not reversed soon."
  }
  if (/expand|additional|broader|more accounts/.test(lower)) {
    return "Scope expanded per owner direction — validate budget baseline and commercial guardrails before issue."
  }
  return "Owner-aligned adjustment — watch for drift between the revised recommendation and package execution."
}

function applyEditToTimeline(
  entries: ActionTimelineEntry[],
  newRecommendation: string,
): ActionTimelineEntry[] {
  const snippet = firstSentence(newRecommendation)
  const clipped = snippet.length > 72 ? `${snippet.slice(0, 72)}…` : snippet

  return entries.map((entry) => {
    if (entry.status !== "current") return entry
    return {
      ...entry,
      label: `Execute revised plan: ${clipped}`,
      agentSteps: entry.agentSteps?.map((a) =>
        a.status === "current" ? { ...a, label: `BluePilot prep aligned to edit: ${clipped}` } : a,
      ),
    }
  })
}

function applyCompletionToTimeline(
  entries: ActionTimelineEntry[],
  confirmedAction: string,
): ActionTimelineEntry[] {
  const snippet = firstSentence(confirmedAction)
  const clipped = snippet.length > 72 ? `${snippet.slice(0, 72)}…` : snippet
  const currentIdx = entries.findIndex((e) => e.status === "current")
  if (currentIdx === -1) return entries

  const today = new Date().toISOString().slice(0, 10)

  return entries.map((entry, i) => {
    if (i === currentIdx) {
      return {
        ...entry,
        status: "done" as const,
        completedAt: today,
        label: `Confirmed: ${clipped}`,
        agentSteps: entry.agentSteps?.map((a) =>
          a.status === "current" ? { ...a, status: "done" as const, completedAt: today } : a,
        ),
      }
    }
    if (i === currentIdx + 1 && entry.status === "upcoming") {
      return { ...entry, status: "current" as const }
    }
    return entry
  })
}

function buildCompletionPatch(mission: DiamondMission, confirmedAction: string): MissionSessionPatch {
  const confidence = Math.min(0.98, Math.round((mission.confidence + 0.05) * 100) / 100)
  const baseReasoning = reasoningFromMission(mission)
  const timelineEntries = applyCompletionToTimeline(buildFullTimeline(mission), confirmedAction)
  const advancedStage = nextStage(mission.stage)
  const nextOwner = timelineEntries.find((e) => e.status === "current")

  return {
    recommendation: confirmedAction,
    risk: "Owner confirmed execution — monitor downstream gates for value realisation.",
    confidence,
    reasoning: {
      ...baseReasoning,
      summary: `BluePilot ingested your confirmation for "${mission.name}".`,
      conclusion: `Owner action logged: ${firstSentence(confirmedAction)} Timeline advanced to the next gate.`,
      steps: [
        "Recorded owner confirmation and action details",
        "Marked current human gate complete on the timeline",
        "Advanced execution to the next accountable step",
      ],
    },
    timelineEntries,
    stage: advancedStage,
    ownerRole: nextOwner?.assigneeRole ?? mission.owner,
  }
}

function runPhasedReconcile(
  phases: readonly string[],
  onPhase: ((label: string) => void) | undefined,
  build: () => MissionSessionPatch,
): Promise<MissionSessionPatch> {
  return new Promise((resolve) => {
    let i = 0
    const tick = () => {
      if (i < phases.length) {
        onPhase?.(phases[i]!)
        i += 1
        setTimeout(tick, PHASE_MS)
      } else {
        resolve(build())
      }
    }
    tick()
  })
}
function buildEditPatch(mission: DiamondMission, newRecommendation: string): MissionSessionPatch {
  const confidence = Math.min(0.97, Math.round((mission.confidence + 0.03) * 100) / 100)
  const risk = deriveRisk(mission, newRecommendation)
  const baseReasoning = reasoningFromMission(mission)

  return {
    recommendation: newRecommendation,
    risk,
    confidence,
    reasoning: {
      ...baseReasoning,
      summary: `BluePilot re-ingested an owner edit to "${mission.name}".`,
      conclusion: `Updated recommendation: ${firstSentence(newRecommendation)} Confidence re-scored to ${Math.round(confidence * 100)}%.`,
      steps: [
        "Parsed manual changes to the recommended action",
        "Re-scored risk against the revised execution path",
        "Refreshed open timeline steps for the accountable owner",
      ],
    },
    timelineEntries: applyEditToTimeline(buildFullTimeline(mission), newRecommendation),
  }
}

/** Simulate BluePilot ingest after an owner edit. */
export function reconcileMissionAfterEdit(
  mission: DiamondMission,
  newRecommendation: string,
  onPhase?: (label: string) => void,
): Promise<MissionSessionPatch> {
  return runPhasedReconcile(RECONCILE_PHASES, onPhase, () => buildEditPatch(mission, newRecommendation))
}

/** Simulate BluePilot ingest after an owner confirms mission completion. */
export function reconcileMissionAfterComplete(
  mission: DiamondMission,
  confirmedAction: string,
  onPhase?: (label: string) => void,
): Promise<MissionSessionPatch> {
  return runPhasedReconcile(COMPLETE_PHASES, onPhase, () => buildCompletionPatch(mission, confirmedAction))
}
