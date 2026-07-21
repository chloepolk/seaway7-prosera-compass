/* ------------------------------------------------------------------ */
/*  Eval harness — invariants                                          */
/*                                                                     */
/*  Domain-agnostic checks that any orchestrator output must satisfy.  */
/*  These encode the platform's quality contract: findings stay in the */
/*  declared taxonomy, cite real specialists/sources, carry evidence,  */
/*  and avoid banned filler. Domains add cases; the rules are shared.  */
/* ------------------------------------------------------------------ */

import type { OrchestratorOutput } from "../domain-contract"
import type { EvalContext, EvalExpectation, EvalViolation } from "./types"

function gatherText(output: OrchestratorOutput): string {
  const parts: string[] = [output.headline.title, output.headline.narrative]
  if (output.executiveSummary) {
    parts.push(...output.executiveSummary.sentences, ...output.executiveSummary.bullets)
  }
  for (const f of output.findings) {
    parts.push(f.title, f.narrative, f.recommendation, ...f.evidence)
  }
  for (const r of output.reasoning) parts.push(r.text)
  return parts.join(" \n ")
}

export function checkOrchestratorOutput(
  output: OrchestratorOutput,
  ctx: EvalContext,
  expect: EvalExpectation = {},
): EvalViolation[] {
  const v: EvalViolation[] = []
  const categories = new Set(ctx.categories)
  const specialists = new Set(ctx.specialistIds)
  const sources = new Set(ctx.dataSources)

  // Confidence bounds.
  if (output.confidence < 0 || output.confidence > 1) {
    v.push({ rule: "confidence-range", detail: `confidence ${output.confidence} outside [0,1]` })
  }

  // Per-finding contract membership + evidence.
  for (const f of output.findings) {
    if (!categories.has(f.category)) {
      v.push({ rule: "category-taxonomy", detail: `finding "${f.id}" category "${f.category}" not in domain taxonomy` })
    }
    for (const s of f.sourceSpecialists) {
      if (!specialists.has(s)) {
        v.push({ rule: "specialist-ref", detail: `finding "${f.id}" cites unknown specialist "${s}"` })
      }
    }
    for (const d of f.dataSources ?? []) {
      if (!sources.has(d)) {
        v.push({ rule: "datasource-ref", detail: `finding "${f.id}" cites unknown data source "${d}"` })
      }
    }
    if (expect.requireEvidence && f.evidence.length === 0) {
      v.push({ rule: "evidence-required", detail: `finding "${f.id}" has no evidence` })
    }
  }

  // Reasoning specialist refs.
  for (const r of output.reasoning) {
    if (r.sourceSpecialist != null && !specialists.has(r.sourceSpecialist)) {
      v.push({ rule: "reasoning-ref", detail: `reasoning step ${r.step} cites unknown specialist "${r.sourceSpecialist}"` })
    }
  }

  // Banned phrases.
  const haystack = gatherText(output).toLowerCase()
  for (const phrase of ctx.bannedPhrases) {
    const needle = phrase.trim().toLowerCase()
    if (needle && haystack.includes(needle)) {
      v.push({ rule: "banned-phrase", detail: `output contains banned phrase "${phrase}"` })
    }
  }

  // Per-case expectations.
  if (expect.minFindings != null && output.findings.length < expect.minFindings) {
    v.push({ rule: "min-findings", detail: `expected >= ${expect.minFindings} findings, got ${output.findings.length}` })
  }
  if (expect.requireExecutiveSummary && !output.executiveSummary) {
    v.push({ rule: "executive-summary-required", detail: "executiveSummary is null" })
  }
  if (expect.minConfidence != null && output.confidence < expect.minConfidence) {
    v.push({ rule: "min-confidence", detail: `confidence ${output.confidence} < ${expect.minConfidence}` })
  }

  return v
}
