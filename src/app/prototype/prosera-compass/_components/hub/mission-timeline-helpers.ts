import type { DiamondMission, GateTask } from "../../_diamond/types"
import { STAGE_META, STAGE_ORDER, stageIndex, type MissionStage } from "../../_diamond/stages"
import { personForRole } from "../../_diamond/org"
import { employeeByName, employeeByRole, type Employee } from "../../data/_people"
import type { ActionTimelineEntry, AgentTimelineSubEntry, TimelineEntryStatus } from "./hub-types"
import { displayName, resolveAssigneeDisplayName } from "./active-user"

/** Resolve the employee directory entry for a timeline step assignee. */
export function employeeForTimelineEntry(entry: ActionTimelineEntry): Employee | undefined {
  const byName = employeeByName(resolveAssigneeDisplayName(entry.assignee))
  if (byName) return byName
  if (entry.assigneeRole) return employeeByRole(entry.assigneeRole)
  return undefined
}

/** Employee accountable for the mission's current timeline step, if any. */
export function employeeForCurrentTimelineStep(entries: ActionTimelineEntry[]): Employee | undefined {
  const current = entries.find((e) => e.status === "current")
  return current ? employeeForTimelineEntry(current) : undefined
}

function taskTimelineStatus(task: GateTask, stage: MissionStage, mission: DiamondMission): TimelineEntryStatus {
  if (isMissionComplete(mission) && stageIndex(stage) <= stageIndex(mission.stage)) return "done"
  if (task.status === "done" || task.status === "overridden") return "done"
  if (task.status === "in_progress") return "current"
  return "upcoming"
}

function isMissionComplete(mission: DiamondMission): boolean {
  return mission.stage === "outcome_roi"
}

/** Human confirmation is the gate — active whenever the mission is at that stage. */
function humanTimelineStatus(
  humanTask: GateTask,
  stage: MissionStage,
  mission: DiamondMission,
): TimelineEntryStatus {
  const missionIdx = stageIndex(mission.stage)
  const stageIdx = stageIndex(stage)

  if (stageIdx < missionIdx) return "done"
  if (stageIdx > missionIdx) return "upcoming"
  if (isMissionComplete(mission)) return "done"
  if (humanTask.status === "done" || humanTask.status === "overridden") return "done"
  return "current"
}

function agentSubEntry(
  task: GateTask,
  stage: MissionStage,
  mission: DiamondMission,
): AgentTimelineSubEntry {
  const status = taskTimelineStatus(task, stage, mission)
  return {
    id: task.id,
    label: task.label,
    assignee: displayName(task.owner),
    assigneeRole: task.ownerRole,
    status,
    completedAt:
      status === "done" ? mission.stageDates[stage] ?? task.dueAt ?? undefined : undefined,
    dueAt: status !== "done" ? task.dueAt : undefined,
  }
}

function outcomeHumanFallback() {
  const finance = personForRole("CFO")
  return {
    label: "Confirm realized value with Finance and close the loop",
    assignee: finance.name,
    assigneeRole: finance.role,
  }
}

/** Human-confirmation timeline with agent prep/verify nested per gate. */
export function buildFullTimeline(mission: DiamondMission): ActionTimelineEntry[] {
  const entries: ActionTimelineEntry[] = []
  const missionIdx = stageIndex(mission.stage)

  for (const stage of STAGE_ORDER) {
    const tasks = mission.tasksByStage[stage] ?? []
    const agents = tasks.filter((t) => t.ownerType === "agent")
    const humans = tasks.filter((t) => t.ownerType === "human")

    if (humans.length === 0) {
      // outcome_roi is agent-only in seed data — surface as human close with agent nested
      if (stage === "outcome_roi" && agents.length > 0) {
        const fallback = outcomeHumanFallback()
        const stageIdx = stageIndex(stage)
        let status: TimelineEntryStatus = "upcoming"
        if (stageIdx < missionIdx) status = "done"
        else if (stageIdx === missionIdx) status = isMissionComplete(mission) ? "done" : "current"

        entries.push({
          id: `${mission.id}-${stage}-human`,
          label: fallback.label,
          assignee: displayName(fallback.assignee),
          assigneeRole: fallback.assigneeRole,
          status,
          completedAt:
            status === "done"
              ? mission.completedAt ?? mission.stageDates[stage] ?? undefined
              : undefined,
          dueAt: status !== "done" ? agents[0]?.dueAt : undefined,
          stageLabel: STAGE_META[stage].title,
          agentSteps: agents.map((a) => agentSubEntry(a, stage, mission)),
        })
      }
      continue
    }

    for (const human of humans) {
      const status = humanTimelineStatus(human, stage, mission)
      entries.push({
        id: human.id,
        label: human.label,
        assignee: displayName(human.owner),
        assigneeRole: human.ownerRole,
        status,
        completedAt:
          status === "done"
            ? mission.stageDates[stage] ?? human.dueAt ?? mission.openedAt
            : undefined,
        dueAt: status !== "done" ? human.dueAt : undefined,
        stageLabel: STAGE_META[stage].title,
        agentSteps: agents.map((a) => agentSubEntry(a, stage, mission)),
      })
    }
  }

  return entries
}

/** @deprecated Use buildFullTimeline */
export function buildCompletedTimeline(mission: DiamondMission): ActionTimelineEntry[] {
  return buildFullTimeline(mission).filter((e) => e.status === "done")
}
