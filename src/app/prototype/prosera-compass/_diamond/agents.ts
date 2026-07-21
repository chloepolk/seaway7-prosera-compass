/* ------------------------------------------------------------------ */
/*  Agent registry — automated workers that can be spawned to execute  */
/*  specific gate tasks on procurement packages. Each agent is a       */
/*  focused capability; the adapter assigns one to a task and the      */
/*  board can "spawn" it to stream a working log.                      */
/* ------------------------------------------------------------------ */

export type MissionTheme = "supply" | "charter"

export interface DiamondAgent {
  id: string
  name: string
  /** Short capability domain. */
  capability: string
  /** Lucide icon name. */
  icon: string
}

export const AGENTS: Record<string, DiamondAgent> = {
  scope: { id: "agt-scope", name: "Scope Agent", capability: "Frames the package, budget baseline and retrieval plan", icon: "FileText" },
  spec: { id: "agt-spec", name: "Specification Agent", capability: "Extracts engineering parameters from controlled tech specs", icon: "Ruler" },
  quality: { id: "agt-quality", name: "Quality & Standards Agent", capability: "Maps DNV / NORSOK / ISO obligations from the QA manual", icon: "ShieldCheck" },
  legal: { id: "agt-legal", name: "Contracts & Maritime Agent", capability: "Assembles liability, indemnity and charter flow-down clauses", icon: "Scale" },
  commercial: { id: "agt-commercial", name: "Commercial Agent", capability: "Builds pricing schedules and normalises bid tabulations", icon: "Coins" },
  audit: { id: "agt-audit", name: "Audit Agent", capability: "Adversarial verification of every clause against source documents", icon: "SearchCheck" },
  award: { id: "agt-award", name: "Award & Savings Agent", capability: "Reconciles awarded value against budget and books savings", icon: "BadgeCheck" },
}

/** Pick the most relevant agent for a stage + package theme. */
export function agentFor(stage: string, theme: MissionTheme): DiamondAgent {
  if (stage === "mission_created") return AGENTS.scope
  if (stage === "outcome_roi") return AGENTS.award
  if (stage === "understand") {
    if (theme === "charter") return AGENTS.legal
    return AGENTS.spec
  }
  if (stage === "decide") {
    if (theme === "charter") return AGENTS.commercial
    return AGENTS.audit
  }
  // execute
  return AGENTS.commercial
}
