import type { BPFinding } from "../data/_insights"
import type { OrchestratorFinding } from "../agents/_types"
import type { DiamondMission } from "../_diamond/types"
import type { ReasoningContent } from "./reasoning-disclosure"
import { aggregateCitationsFromMissions, citationFromLabel, mergeCitations } from "./source-citations"

export function isReasoningEmpty(r?: ReasoningContent | null): boolean {
  if (!r) return true
  return !(
    r.summary?.trim() ||
    r.steps?.some((s) => s.trim()) ||
    r.equations?.some((s) => s.trim()) ||
    r.evidence?.some((s) => s.trim()) ||
    r.conclusion?.trim() ||
    r.sources?.some((s) => s.trim()) ||
    r.citations?.length
  )
}

/* ------------------------------------------------------------------ */
/*  Finding analysis chains                                            */
/* ------------------------------------------------------------------ */

function defaultFindingReasoning(f: BPFinding | OrchestratorFinding): Partial<ReasoningContent> {
  const orch = f as OrchestratorFinding
  const sourceLabel: Record<string, string> = {
    Spec: "Engineering specification (controlled register)",
    QA: "QA-MAN-2026-EPCI — Corporate QA Manual",
    Terms: "S7-SCM-TC-2026-v1.0 — Procurement Terms",
    Charter: "SUPPLYTIME 2026 — Executed charter party",
    Internal: "Internal — Tender register & savings ledger",
  }
  const sources: string[] = []
  if (orch.dataSources?.length) {
    for (const s of orch.dataSources) {
      sources.push(sourceLabel[s] ?? s)
    }
  }
  return {
    steps: [
      `Classified as ${f.category} at ${f.severity} severity`,
      "Cross-referenced the tender register against controlled documents and deadlines",
      "Generated an evidence-backed recommendation with cited sources",
    ],
    sources: sources.length > 0 ? sources : ["Internal — Tender register & savings ledger"],
  }
}

export function reasoningFromFinding(f: BPFinding | OrchestratorFinding): ReasoningContent {
  const specific = defaultFindingReasoning(f)
  const orch = f as OrchestratorFinding

  return {
    summary: f.narrative.split(".").slice(0, 2).join(".") + ".",
    steps: specific.steps,
    equations: specific.equations,
    evidence: f.evidence,
    conclusion: f.recommendation,
    sources: specific.sources ?? (orch.dataSources?.map((s) =>
      s === "Internal" ? "Internal — Tender register" : s,
    )),
  }
}

/* ------------------------------------------------------------------ */
/*  Mission reasoning (margin / expansion / weather actions)           */
/* ------------------------------------------------------------------ */

export function reasoningFromMission(m: DiamondMission): ReasoningContent {
  const meta = m.reasoningMeta
  if (meta) {
    const citations = aggregateCitationsFromMissions([m])
    return {
      summary: m.objective,
      steps: meta.steps,
      equations: meta.equations,
      evidence: m.evidence,
      conclusion: `${m.recommendation} Recommended with ${Math.round(m.confidence * 100)}% confidence. Risk: ${m.risk}`,
      sources: meta.sources,
      citations,
    }
  }

  return {
    summary: m.objective,
    evidence: m.evidence,
    conclusion: `Recommended with ${Math.round(m.confidence * 100)}% confidence. Risk: ${m.risk}`,
    sources: [m.source.label],
    citations: [citationFromLabel(m.source.label, m.source.page)],
  }
}

/* ------------------------------------------------------------------ */
/*  Action Centre hero — traceable BluePilot synthesis                  */
/* ------------------------------------------------------------------ */

export function buildActionBoardHeroReasoning(
  missions: DiamondMission[],
  options: {
    agentSteps?: string[]
    useAgentSteps: boolean
  },
): ReasoningContent {
  const active = missions.filter((m) => m.stage !== "outcome_roi")

  const steps =
    options.useAgentSteps && options.agentSteps?.length
      ? options.agentSteps
      : [
          "Loaded the Meridian tender register and applied session progress per package",
          "Computed days remaining against each 21-day tender window and clarification cutoff",
          "Mapped each package to its controlled documents, standards and charter interfaces",
          "Ranked by submission deadline, savings target and installation critical path",
        ]

  const evidence = active.slice(0, 5).map(
    (m) =>
      `${m.name}: $${m.projectedValue.toLocaleString()} projected · ${Math.round(m.confidence * 100)}% confidence`,
  )

  const citations = mergeCitations(
    [citationFromLabel("BluePilot operating-loop orchestrator — specialist → synthesize → verify pipeline", "operating-loop")],
    aggregateCitationsFromMissions(active),
  )

  return {
    summary: options.useAgentSteps
      ? "BluePilot prioritised the tender pipeline from procurement portfolio, commercial and supply market specialist outputs."
      : "BluePilot ranked packages by submission deadline, savings target and installation critical path.",
    steps,
    evidence,
    conclusion: `${active.length} packages are live on this board. Follow the view sources links to inspect each underlying document or workspace.`,
    citations,
  }
}

export function reasoningFromExpansionAction(a: {
  rationale: string
  math?: string
  expectedImpact: string
  confidence: string
  sources: string[]
}): ReasoningContent {
  return {
    summary: a.rationale,
    equations: a.math ? [a.math] : undefined,
    conclusion: `Expected impact: ${a.expectedImpact}. Confidence: ${a.confidence}.`,
    sources: a.sources.map((s) =>
      s === "Internal" ? "Internal — Tender register" : `${s} — External benchmark`,
    ),
  }
}

