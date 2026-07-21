/* ------------------------------------------------------------------ */
/*  Eval harness — types                                               */
/*                                                                     */
/*  A domain-agnostic golden-set harness. Cases pair a scenario with   */
/*  an OrchestratorOutput (fixture today, model-generated later) and    */
/*  the harness checks contract + quality invariants against the        */
/*  domain's allowed categories/specialists/sources + banned phrases.   */
/* ------------------------------------------------------------------ */

import type { OrchestratorOutput } from "../domain-contract"

/** The domain envelope an output is validated against. */
export interface EvalContext {
  categories: readonly string[]
  specialistIds: readonly string[]
  dataSources: readonly string[]
  /** Phrases the output must never contain (case-insensitive). */
  bannedPhrases: readonly string[]
}

/** Per-case expectations layered on top of the universal invariants. */
export interface EvalExpectation {
  minFindings?: number
  requireExecutiveSummary?: boolean
  requireEvidence?: boolean
  minConfidence?: number
}

export interface EvalCase {
  id: string
  description: string
  /** The output under test (a fixture, or captured from a live run). */
  output: OrchestratorOutput
  expect?: EvalExpectation
}

export interface EvalViolation {
  rule: string
  detail: string
}

export interface EvalResult {
  caseId: string
  passed: boolean
  violations: EvalViolation[]
}

export interface EvalSuiteResult {
  suite: string
  total: number
  passed: number
  failed: number
  results: EvalResult[]
}
