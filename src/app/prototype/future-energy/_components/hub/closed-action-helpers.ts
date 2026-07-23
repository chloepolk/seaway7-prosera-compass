import type { ClosedRecord } from "../../_diamond/types"
import type { MissionObjective } from "../../_diamond/types"
import { AGENTS } from "../../_diamond/agents"
import { personForRole } from "../../_diamond/org"
import { formatCurrency } from "../../_diamond/stages"
import type { ActionTimelineEntry, AgentTimelineSubEntry } from "./hub-types"

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function doneAgent(
  id: string,
  label: string,
  agent: (typeof AGENTS)[keyof typeof AGENTS],
  completedAt: string,
): AgentTimelineSubEntry {
  return {
    id,
    label,
    assignee: agent.name,
    assigneeRole: agent.capability,
    status: "done",
    completedAt,
  }
}

function buildClosedTimeline(record: ClosedRecord): ActionTimelineEntry[] {
  const decisionMaker = personForRole(record.decisionMaker)
  const commercial = personForRole("Commercial Manager")
  const analyst = personForRole("Cost & Estimating Analyst")
  const closed = record.completionDate

  return [
    {
      id: `${record.id}-approve`,
      label: "Approved ITT release and evaluation criteria",
      assignee: decisionMaker.name,
      assigneeRole: decisionMaker.role,
      status: "done",
      completedAt: addDays(closed, -34),
      stageLabel: "Approve",
      agentSteps: [
        doneAgent(
          `${record.id}-agent-audit`,
          `Audited draft ITT for ${record.name} against controlled documents`,
          AGENTS.audit,
          addDays(closed, -35),
        ),
        doneAgent(
          `${record.id}-agent-spec`,
          `Compiled technical and quality requirements for ${record.name}`,
          AGENTS.spec,
          addDays(closed, -38),
        ),
      ],
    },
    {
      id: `${record.id}-evaluate`,
      label: "Ran the tender window and evaluated bids",
      assignee: commercial.name,
      assigneeRole: commercial.role,
      status: "done",
      completedAt: addDays(closed, -8),
      stageLabel: "Issue & Evaluate",
      agentSteps: [
        doneAgent(
          `${record.id}-agent-commercial`,
          `Normalised bid tabulation and commercial comparison for ${record.name}`,
          AGENTS.commercial,
          addDays(closed, -10),
        ),
      ],
    },
    {
      id: `${record.id}-verify`,
      label: "Confirmed negotiated savings against budget baseline",
      assignee: analyst.name,
      assigneeRole: analyst.role,
      status: "done",
      completedAt: addDays(closed, -2),
      stageLabel: "Award",
      agentSteps: [
        doneAgent(
          `${record.id}-agent-award`,
          `Verified ${formatCurrency(record.realizedValue)} savings vs. budget baseline`,
          AGENTS.award,
          addDays(closed, -3),
        ),
      ],
    },
    {
      id: `${record.id}-book`,
      label: "Purchase order issued and savings booked to the project ledger",
      assignee: decisionMaker.name,
      assigneeRole: decisionMaker.role,
      status: "done",
      completedAt: closed,
      stageLabel: "Award",
    },
  ]
}

export type ClosedActionCardData = {
  id: string
  title: string
  narrative: string
  valueChip: string
  valueType: MissionObjective
  owner: string
  ownerRole: string
  cost: number
  realizedValue: number
  confidence: number
  risk: string
  timelineEntries: ActionTimelineEntry[]
  completionDate: string
}

export function closedRecordToCardData(record: ClosedRecord): ClosedActionCardData {
  const decisionMaker = personForRole(record.decisionMaker)
  const valueType: MissionObjective = "creation"

  return {
    id: record.id,
    title: record.name,
    narrative: `Awarded package. Delivered ${formatCurrency(record.realizedValue)} in negotiated savings against the budget baseline for ${formatCurrency(record.cost)} of tender process cost.`,
    valueChip: formatCurrency(record.realizedValue),
    valueType,
    owner: decisionMaker.name,
    ownerRole: decisionMaker.role,
    cost: record.cost,
    realizedValue: record.realizedValue,
    confidence: 0.92,
    risk: "Awarded — package closed.",
    timelineEntries: buildClosedTimeline(record),
    completionDate: record.completionDate,
  }
}
