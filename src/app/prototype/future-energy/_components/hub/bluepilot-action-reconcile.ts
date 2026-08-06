import type { DiamondMission } from "../../_diamond/types"
import type { MissionStage } from "../../_diamond/stages"
import { STAGE_ORDER, stageIndex } from "../../_diamond/stages"
import type { ReasoningContent } from "../reasoning-disclosure"
import { reasoningFromMission } from "../reasoning-helpers"
import type { ActionTimelineEntry } from "./hub-types"
import { buildFullTimeline } from "./mission-timeline-helpers"
import type { Locale } from "../../_i18n/types"

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

function deriveRisk(mission: DiamondMission, newRecommendation: string, locale: Locale): string {
  const lower = newRecommendation.toLowerCase()
  if (/urgent|immediate|asap|deadline|window/.test(lower)) {
    return locale === "fr" ? "Le responsable a resserré le plan — le calendrier comprimé augmente la variabilité d’exécution ; suivi quotidien requis." : "Owner tightened the plan — compressed timeline increases execution variance; monitor daily."
  }
  if (/pause|hold|delay|postpone/.test(lower)) {
    return locale === "fr" ? "Le responsable a reporté l’exécution — la fenêtre de valeur peut se réduire si la décision n’est pas rapidement annulée." : "Owner deferred execution — value window may narrow if the change is not reversed soon."
  }
  if (/expand|additional|broader|more accounts/.test(lower)) {
    return locale === "fr" ? "Périmètre élargi sur instruction du responsable — valider la baseline budgétaire et les garde-fous commerciaux avant émission." : "Scope expanded per owner direction — validate budget baseline and commercial guardrails before issue."
  }
  return locale === "fr" ? "Ajustement aligné avec le responsable — surveiller tout écart entre la recommandation révisée et l’exécution du lot." : "Owner-aligned adjustment — watch for drift between the revised recommendation and package execution."
}

function applyEditToTimeline(
  entries: ActionTimelineEntry[],
  newRecommendation: string,
  locale: Locale,
): ActionTimelineEntry[] {
  const snippet = firstSentence(newRecommendation)
  const clipped = snippet.length > 72 ? `${snippet.slice(0, 72)}…` : snippet

  return entries.map((entry) => {
    if (entry.status !== "current") return entry
    return {
      ...entry,
      label: locale === "fr" ? `Exécuter le plan révisé : ${clipped}` : `Execute revised plan: ${clipped}`,
      agentSteps: entry.agentSteps?.map((a) =>
        a.status === "current" ? { ...a, label: locale === "fr" ? `Préparation BluePilot alignée sur la modification : ${clipped}` : `BluePilot prep aligned to edit: ${clipped}` } : a,
      ),
    }
  })
}

function applyCompletionToTimeline(
  entries: ActionTimelineEntry[],
  confirmedAction: string,
  locale: Locale,
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
        label: locale === "fr" ? `Confirmé : ${clipped}` : `Confirmed: ${clipped}`,
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

function buildCompletionPatch(mission: DiamondMission, confirmedAction: string, locale: Locale): MissionSessionPatch {
  const confidence = Math.min(0.98, Math.round((mission.confidence + 0.05) * 100) / 100)
  const baseReasoning = reasoningFromMission(mission, locale)
  const timelineEntries = applyCompletionToTimeline(buildFullTimeline(mission, locale), confirmedAction, locale)
  const advancedStage = nextStage(mission.stage)
  const nextOwner = timelineEntries.find((e) => e.status === "current")

  return {
    recommendation: confirmedAction,
    risk: locale === "fr" ? "Exécution confirmée par le responsable — surveiller les étapes aval pour la réalisation de valeur." : "Owner confirmed execution — monitor downstream gates for value realisation.",
    confidence,
    reasoning: {
      ...baseReasoning,
      summary: locale === "fr" ? `BluePilot a intégré votre confirmation pour « ${mission.name} ».` : `BluePilot ingested your confirmation for "${mission.name}".`,
      conclusion: locale === "fr" ? `Action du responsable enregistrée : ${firstSentence(confirmedAction)} La timeline est passée à la porte suivante.` : `Owner action logged: ${firstSentence(confirmedAction)} Timeline advanced to the next gate.`,
      steps: locale === "fr" ? [
        "Enregistrement de la confirmation et du détail de l’action",
        "Marquage de la porte humaine actuelle comme terminée",
        "Passage à la prochaine étape responsable",
      ] : [
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
function buildEditPatch(mission: DiamondMission, newRecommendation: string, locale: Locale): MissionSessionPatch {
  const confidence = Math.min(0.97, Math.round((mission.confidence + 0.03) * 100) / 100)
  const risk = deriveRisk(mission, newRecommendation, locale)
  const baseReasoning = reasoningFromMission(mission, locale)

  return {
    recommendation: newRecommendation,
    risk,
    confidence,
    reasoning: {
      ...baseReasoning,
      summary: locale === "fr" ? `BluePilot a réintégré une modification du responsable pour « ${mission.name} ».` : `BluePilot re-ingested an owner edit to "${mission.name}".`,
      conclusion: locale === "fr" ? `Recommandation mise à jour : ${firstSentence(newRecommendation)} Confiance recalculée à ${Math.round(confidence * 100)} %.` : `Updated recommendation: ${firstSentence(newRecommendation)} Confidence re-scored to ${Math.round(confidence * 100)}%.`,
      steps: locale === "fr" ? [
        "Analyse des modifications manuelles apportées à l’action recommandée",
        "Réévaluation du risque selon le parcours d’exécution révisé",
        "Actualisation des étapes ouvertes pour le responsable",
      ] : [
        "Parsed manual changes to the recommended action",
        "Re-scored risk against the revised execution path",
        "Refreshed open timeline steps for the accountable owner",
      ],
    },
    timelineEntries: applyEditToTimeline(buildFullTimeline(mission, locale), newRecommendation, locale),
  }
}

/** Simulate BluePilot ingest after an owner edit. */
export function reconcileMissionAfterEdit(
  mission: DiamondMission,
  newRecommendation: string,
  onPhase?: (label: string) => void,
  locale: Locale = "en",
): Promise<MissionSessionPatch> {
  const phases = locale === "fr"
    ? ["Prise en compte de votre modification…", "Réévaluation du risque et de la confiance…", "Mise à jour de la timeline d’exécution…"]
    : RECONCILE_PHASES
  return runPhasedReconcile(phases, onPhase, () => buildEditPatch(mission, newRecommendation, locale))
}

/** Simulate BluePilot ingest after an owner confirms mission completion. */
export function reconcileMissionAfterComplete(
  mission: DiamondMission,
  confirmedAction: string,
  onPhase?: (label: string) => void,
  locale: Locale = "en",
): Promise<MissionSessionPatch> {
  const phases = locale === "fr"
    ? ["Prise en compte de votre confirmation…", "Avancement de la timeline d’exécution…", "Mise à jour du statut de la mission…"]
    : COMPLETE_PHASES
  return runPhasedReconcile(phases, onPhase, () => buildCompletionPatch(mission, confirmedAction, locale))
}
