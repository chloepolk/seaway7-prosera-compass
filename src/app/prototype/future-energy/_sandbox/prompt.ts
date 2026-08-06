import type { ScenarioState, ScenarioProjection, LeverCategory } from "./types";
import type { Locale } from "../_i18n";
import {formatActiveUsd, formatActiveEurUnit } from "../_i18n/legacy";

const usd = (n: number) => formatActiveUsd(n, false);
const pts = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1) + " pts";
const bps = (n: number) => (n >= 0 ? "+" : "") + Math.round(n) + " bps";

interface PromptInput {
  lever: LeverCategory;
  state: ScenarioState;
  projection: ScenarioProjection;
  portfolioContext: Record<string, unknown>;
  locale: Locale;
}

function impactBlock(p: ScenarioProjection): string {
  return [
    `Revenue delta: ${usd(p.revenueDelta)}`,
    `Margin delta: ${usd(p.marginDelta)} (${pts(p.marginPtsDelta)})`,
    `EBITDA impact: ${bps(p.ebitdaDeltaBps)}`,
    `Freed truck rolls: ${p.freedTruckRolls}`,
    `Affected customers: ${p.affectedCustomers.length > 0 ? p.affectedCustomers.join(", ") : "n/a"}`,
    `Affected jobs: ${p.affectedJobs}`,
  ].join("\n");
}

function customerMixPrompt(state: ScenarioState, projection: ScenarioProjection, ctx: Record<string, unknown>): string {
  const { exitDogs, addStars } = state.customerMix;
  return `SCENARIO: Customer mix adjustment — Exit ${exitDogs} Dogs account(s), add ${addStars} Stars-profile acquisition(s).

PROJECTED IMPACT:
${impactBlock(projection)}

CONTEXT:
${JSON.stringify(ctx, null, 1)}

INSTRUCTIONS:
1. Name each Dogs account being exited and explain why it is the right pruning target (margin %, root cause, trend).
2. Quantify the freed capacity (truck rolls, tech hours) and what it enables.
3. For Stars additions, describe the DNA profile (avg margin, job types, regions) and where to find acquisitions matching it.
4. Reference PE Portfolio Co's pruning-for-density framework and how this move aligns.
5. Call out any second-order risks (customer concentration increase, geographic coverage gaps).
6. State your confidence level in the projection and what limits it.`;
}

function pricingPrompt(state: ScenarioState, projection: ScenarioProjection, ctx: Record<string, unknown>): string {
  const { laborMultiplier, materialMarkupPct } = state.pricing;
  return `SCENARIO: Pricing adjustment — Labor billing multiplier to ${laborMultiplier.toFixed(1)}x, material markup target to ${materialMarkupPct}%.

PROJECTED IMPACT:
${impactBlock(projection)}

CONTEXT:
${JSON.stringify(ctx, null, 1)}

INSTRUCTIONS:
1. Break down how much of the uplift comes from labor rate adjustment vs. material markup.
2. Reference BLS wage benchmarks to justify the labor multiplier (are we above or below market rates?).
3. Use win rate by price band data to assess elasticity risk — will this price increase push us into ceiling bands?
4. Identify which job types and customers are most affected.
5. Recommend sequencing: which rate changes to implement first, which customers to grandfather.
6. Reference competitive positioning — are we pricing to win or pricing to margin? Where on the elasticity curve?`;
}

function fuelPrompt(state: ScenarioState, projection: ScenarioProjection, ctx: Record<string, unknown>): string {
  const { pricePerGal } = state.fuel;
  return `SCENARIO: Fuel price sensitivity analysis — modeling unleaded at ${formatActiveEurUnit(pricePerGal)}/gal.

PROJECTED IMPACT:
${impactBlock(projection)}

CONTEXT:
${JSON.stringify(ctx, null, 1)}

INSTRUCTIONS:
1. Frame this as fleet-wide exposure, not per-trip surcharge math. Reference the "every €0.09/gal = $X/yr" sensitivity metric.
2. Compare the modeled price against fleet card baseline and current actuals.
3. If the price represents an increase, quantify the margin erosion and which divisions absorb the most impact.
4. Recommend the contract fuel clause strategy: escalation clauses pegged to fleet card actuals with quarterly review.
5. Do NOT recommend per-trip surcharges — they are immaterial at this portfolio scale.
6. Reference industry practice: how do top PE-backed field services companies handle fuel exposure in their contracts?`;
}

function ntePrompt(state: ScenarioState, projection: ScenarioProjection, ctx: Record<string, unknown>): string {
  const { thresholdMultiplier } = state.nte;
  return `SCENARIO: NTE escalation friction sensitivity — counterfactual modeling if customer-set NTE caps were ${thresholdMultiplier.toFixed(1)}x current levels (external-only; NOT a recommended action).

PROJECTED IMPACT:
${impactBlock(projection)}

CONTEXT:
${JSON.stringify(ctx, null, 1)}

INSTRUCTIONS:
1. Name the top friction customers with the highest escalation rates and quantify their current re-auth overhead.
2. Explain the re-auth loop (tech → dispatch → approver → customer) and how it drives return trips and dispatch labor cost.
3. Quantify truck roll savings and dispatch overhead from reduced escalations — frame as the cost of friction, not recoverable margin.
4. CRITICAL: NTE is customer-controlled via the FM platform — ACME cannot change it. Do NOT recommend raising, lowering, or renegotiating NTE thresholds. Instead recommend internal workflow mitigations (expedited re-auth queues, pre-dispatch scope screening).
5. If the multiplier is >1.0, treat it as a counterfactual sensitivity showing what friction would drop if customers set higher caps — not an action ACME can take.
6. Call out which customers generate the most escalation friction regardless of threshold level.`;
}

export function buildSandboxPrompt(input: PromptInput): string {
  const language = input.locale === "fr"
    ? "LANGUE OBLIGATOIRE : répondez exclusivement en français. Conservez inchangés les noms propres, marques, normes, identifiants et références.\n\n"
    : "";
  let prompt: string;
  switch (input.lever) {
    case "customer-mix":
      prompt = customerMixPrompt(input.state, input.projection, input.portfolioContext);
      break;
    case "pricing":
      prompt = pricingPrompt(input.state, input.projection, input.portfolioContext);
      break;
    case "fuel":
      prompt = fuelPrompt(input.state, input.projection, input.portfolioContext);
      break;
    case "nte":
      prompt = ntePrompt(input.state, input.projection, input.portfolioContext);
      break;
  }
  return language + prompt;
}
