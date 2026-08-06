import type { ClosedRecord } from "../../_diamond/types"
import type { MissionObjective } from "../../_diamond/types"
import { AGENTS, agentFor } from "../../_diamond/agents"
import { personForRole } from "../../_diamond/org"
import { formatCurrency } from "../../_diamond/stages"
import type { ActionTimelineEntry, AgentTimelineSubEntry } from "./hub-types"
import type { Locale } from "../../_i18n/types"

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

function buildClosedTimeline(record: ClosedRecord, locale: Locale): ActionTimelineEntry[] {
  const fr = locale === "fr"
  const decisionMaker = personForRole(record.decisionMaker, locale)
  const commercial = personForRole("Commercial Manager", locale)
  const analyst = personForRole("Cost & Estimating Analyst", locale)
  const auditAgent = agentFor("decide", "supply", locale)
  const specAgent = agentFor("understand", "supply", locale)
  const commercialAgent = agentFor("execute", "supply", locale)
  const awardAgent = agentFor("outcome_roi", "supply", locale)
  const closed = record.completionDate

  return [
    {
      id: `${record.id}-approve`,
      label: fr ? "Approbation de l’émission de l’AO et des critères d’évaluation" : "Approved ITT release and evaluation criteria",
      assignee: decisionMaker.name,
      assigneeRole: decisionMaker.role,
      status: "done",
      completedAt: addDays(closed, -34),
      stageLabel: fr ? "Approuver" : "Approve",
      agentSteps: [
        doneAgent(
          `${record.id}-agent-audit`,
          fr ? `Audit du projet d’AO ${record.name} par rapport aux documents contrôlés` : `Audited draft ITT for ${record.name} against controlled documents`,
          auditAgent,
          addDays(closed, -35),
        ),
        doneAgent(
          `${record.id}-agent-spec`,
          fr ? `Compilation des exigences techniques et qualité pour ${record.name}` : `Compiled technical and quality requirements for ${record.name}`,
          specAgent,
          addDays(closed, -38),
        ),
      ],
    },
    {
      id: `${record.id}-evaluate`,
      label: fr ? "Gestion de la fenêtre d’AO et évaluation des offres" : "Ran the tender window and evaluated bids",
      assignee: commercial.name,
      assigneeRole: commercial.role,
      status: "done",
      completedAt: addDays(closed, -8),
      stageLabel: fr ? "Émettre & évaluer" : "Issue & Evaluate",
      agentSteps: [
        doneAgent(
          `${record.id}-agent-commercial`,
          fr ? `Normalisation du dépouillement et comparaison commerciale pour ${record.name}` : `Normalised bid tabulation and commercial comparison for ${record.name}`,
          commercialAgent,
          addDays(closed, -10),
        ),
      ],
    },
    {
      id: `${record.id}-verify`,
      label: fr ? "Confirmation des économies négociées par rapport à la baseline budgétaire" : "Confirmed negotiated savings against budget baseline",
      assignee: analyst.name,
      assigneeRole: analyst.role,
      status: "done",
      completedAt: addDays(closed, -2),
      stageLabel: fr ? "Attribution" : "Award",
      agentSteps: [
        doneAgent(
          `${record.id}-agent-award`,
          fr ? `Vérification de ${formatCurrency(record.realizedValue, locale)} d’économies vs baseline budgétaire` : `Verified ${formatCurrency(record.realizedValue, locale)} savings vs. budget baseline`,
          awardAgent,
          addDays(closed, -3),
        ),
      ],
    },
    {
      id: `${record.id}-book`,
      label: fr ? "Bon de commande émis et économies comptabilisées dans le ledger projet" : "Purchase order issued and savings booked to the project ledger",
      assignee: decisionMaker.name,
      assigneeRole: decisionMaker.role,
      status: "done",
      completedAt: closed,
      stageLabel: fr ? "Attribution" : "Award",
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

export function closedRecordToCardData(record: ClosedRecord, locale: Locale = "en"): ClosedActionCardData {
  const decisionMaker = personForRole(record.decisionMaker, locale)
  const fr = locale === "fr"
  const valueType: MissionObjective = "creation"

  return {
    id: record.id,
    title: record.name,
    narrative: fr
      ? `Lot attribué. ${formatCurrency(record.realizedValue, locale)} d’économies négociées réalisées par rapport à la baseline budgétaire, pour ${formatCurrency(record.cost, locale)} de coût de procédure.`
      : `Awarded package. Delivered ${formatCurrency(record.realizedValue, locale)} in negotiated savings against the budget baseline for ${formatCurrency(record.cost, locale)} of tender process cost.`,
    valueChip: formatCurrency(record.realizedValue, locale),
    valueType,
    owner: decisionMaker.name,
    ownerRole: decisionMaker.role,
    cost: record.cost,
    realizedValue: record.realizedValue,
    confidence: 0.92,
    risk: fr ? "Attribué — lot clôturé." : "Awarded — package closed.",
    timelineEntries: buildClosedTimeline(record, locale),
    completionDate: record.completionDate,
  }
}
