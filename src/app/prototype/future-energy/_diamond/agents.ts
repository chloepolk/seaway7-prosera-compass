import type { Locale } from "../_i18n/types"

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
const FR_AGENTS: Record<string, Pick<DiamondAgent, "name" | "capability">> = {
  scope: { name: "Agent de cadrage", capability: "Cadre le lot, la baseline budgétaire et le plan de recherche" },
  spec: { name: "Agent de spécification", capability: "Extrait les paramètres techniques des spécifications contrôlées" },
  quality: { name: "Agent qualité et normes", capability: "Cartographie les obligations DNV / NORSOK / ISO du manuel QA" },
  legal: { name: "Agent contrats et maritime", capability: "Assemble les clauses de responsabilité, d’indemnisation et de charte" },
  commercial: { name: "Agent commercial", capability: "Prépare les bordereaux de prix et normalise les offres" },
  audit: { name: "Agent d’audit", capability: "Vérifie contradictoirement chaque clause par rapport aux sources" },
  award: { name: "Agent attribution et économies", capability: "Rapproche la valeur attribuée du budget et comptabilise les économies" },
}

function localizedAgent(key: keyof typeof AGENTS, locale: Locale): DiamondAgent {
  return locale === "fr" ? { ...AGENTS[key], ...FR_AGENTS[key] } : AGENTS[key]
}

export function agentFor(stage: string, theme: MissionTheme, locale: Locale = "en"): DiamondAgent {
  if (stage === "mission_created") return localizedAgent("scope", locale)
  if (stage === "outcome_roi") return localizedAgent("award", locale)
  if (stage === "understand") {
    if (theme === "charter") return localizedAgent("legal", locale)
    return localizedAgent("spec", locale)
  }
  if (stage === "decide") {
    if (theme === "charter") return localizedAgent("commercial", locale)
    return localizedAgent("audit", locale)
  }
  // execute
  return localizedAgent("commercial", locale)
}
