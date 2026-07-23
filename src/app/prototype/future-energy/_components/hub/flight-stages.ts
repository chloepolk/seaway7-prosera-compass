import type { MissionStage } from "../../_diamond/stages"
import { stageIndex } from "../../_diamond/stages"
import type { FlightPathStep } from "@/components/ui/prosera/flight-path"

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

export function flightProgressLabel(stage: MissionStage): string {
  const idx = stageIndex(stage)
  const pct = Math.round((idx / 4) * 100)
  const label = FLIGHT_PATH_STEPS[idx]?.label ?? "Scoped"
  return `${label} · ${pct}%`
}
