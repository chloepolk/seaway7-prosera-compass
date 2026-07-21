/* ------------------------------------------------------------------ */
/*  Eval harness — runner                                              */
/*                                                                     */
/*  Applies the shared invariants to a suite of golden cases and       */
/*  returns a structured pass/fail report. Pure + synchronous so it    */
/*  runs in CI without API keys; live generation can populate          */
/*  `case.output` upstream before calling in.                          */
/* ------------------------------------------------------------------ */

import { checkOrchestratorOutput } from "./invariants"
import type { EvalCase, EvalContext, EvalResult, EvalSuiteResult } from "./types"

export function runEvalSuite(
  suite: string,
  ctx: EvalContext,
  cases: EvalCase[],
): EvalSuiteResult {
  const results: EvalResult[] = cases.map((c) => {
    const violations = checkOrchestratorOutput(c.output, ctx, c.expect)
    return { caseId: c.id, passed: violations.length === 0, violations }
  })
  const passed = results.filter((r) => r.passed).length
  return {
    suite,
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  }
}

export function formatSuiteResult(r: EvalSuiteResult): string {
  const lines: string[] = [`${r.suite}: ${r.passed}/${r.total} passed`]
  for (const res of r.results) {
    lines.push(`  ${res.passed ? "PASS" : "FAIL"}  ${res.caseId}`)
    for (const v of res.violations) lines.push(`        - [${v.rule}] ${v.detail}`)
  }
  return lines.join("\n")
}
