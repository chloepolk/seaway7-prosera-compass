import type { FlightPathStep } from "@/components/ui/prosera/flight-path"
import type { MissionStage } from "../../_diamond/stages"
import { stageIndex } from "../../_diamond/stages"
import type { TranslateFn } from "../../_i18n"

const FLIGHT_IDS = ["scoped", "specified", "approved", "issued", "awarded"] as const

export function translatedFlightPathSteps(t: TranslateFn): FlightPathStep[] {
  return FLIGHT_IDS.map((id) => ({ id, label: t(`flight.${id}`) }))
}

/** @deprecated Prefer translatedFlightPathSteps(t) so labels follow locale. */
export const FLIGHT_PATH_STEPS: FlightPathStep[] = [
  { id: "scoped", label: "Scoped" },
  { id: "specified", label: "Specified" },
  { id: "approved", label: "Approved" },
  { id: "issued", label: "Issued" },
  { id: "awarded", label: "Awarded" },
]

const STAGE_TO_FLIGHT_ID: Record<MissionStage, string> = {
  mission_created: "scoped",
  understand: "specified",
  decide: "approved",
  execute: "issued",
  outcome_roi: "awarded",
}

export function flightStepIdForStage(stage: MissionStage): string {
  return STAGE_TO_FLIGHT_ID[stage]
}

export function flightProgressLabel(stage: MissionStage, t?: TranslateFn): string {
  const idx = stageIndex(stage)
  const pct = Math.round((idx / 4) * 100)
  const id = FLIGHT_IDS[idx] ?? "scoped"
  const label = t ? t(`flight.${id}`) : (FLIGHT_PATH_STEPS[idx]?.label ?? "Scoped")
  if (t) return t("flight.progress", { label, pct })
  return `${label} · ${pct}%`
}
