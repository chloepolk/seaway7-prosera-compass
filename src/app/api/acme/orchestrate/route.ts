import { getClient, getGeminiClient, callWithRetry, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { ORCHESTRATOR_SCHEMA } from "@/app/prototype/prosera-compass/agents/_types"
import { ORCHESTRATOR_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"
import { outputLanguageInstruction } from "@/lib/compass/data-grounded-language"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const gemini = getGeminiClient()
  const openai = getClient()
  const client = gemini || openai
  if (!client) return fallbackResponse()

  // Flash, not Pro: the orchestrator blocks first paint of the Action Board
  // hero; Flash halves synthesis latency at this prompt size.
  const model = gemini ? MODELS.geminiFlash : MODELS.openai

  try {
    const { specialistOutputs, drillState, pageContext, orchestratorContext, locale } = await req.json()
    const languageInstruction = `\n${outputLanguageInstruction(locale)}\n`

    const availableSpecialists = (specialistOutputs || []).filter(Boolean)
    if (availableSpecialists.length === 0) {
      return errorResponse(new Error("No specialist outputs available for synthesis"))
    }

    const specialistSummary = availableSpecialists
      .map((s: { specialistId: string }) => s.specialistId)
      .join(", ")

    const knowledgeBaseSection = orchestratorContext?.knowledgeBase
      ? `\nKnowledge Base (Industry Benchmarks & Strategic Frameworks):\n${JSON.stringify(orchestratorContext.knowledgeBase, null, 1)}`
      : ""

    const rootCauseSection = orchestratorContext?.currentEntityRootCause
      ? `\n═══ ROOT CAUSE ANALYSIS FOR CURRENT ENTITY ═══
INSTRUCTIONS: The data below contains RAW NUMBERS (decimals for percentages, integers for dollars).
- "currentMarginPct": 0.557 means 55.7% margin
- "dollarImpact": 6200 means $6,200
- "estimatedRecoveryDollars": 12000 means $12,000

For each driver below, you MUST write a prescription that:
1. Names the customer (from "entity")
2. Names the root cause (from "driver" — e.g., "pricing gap", "labor cost variance")
3. Shows the MATH: take the dollarImpact, the detail, and the benchmarkComparison to compute a specific corrective action
4. States the dollar recovery from that corrective action

CRITICAL: Do NOT round "$6,200" to "$6k" — use exact figures. Do NOT say "address" or "optimize" — say exactly WHAT to change, by HOW MUCH, for WHICH customer.

Entity Root Cause Data:
${JSON.stringify(orchestratorContext.currentEntityRootCause, null, 1)}`
      : ""

    const externalDataSection = orchestratorContext?.regionExternalData
      ? `\nExternal Market Data for Current Region (use specific figures in recommendations, not generic references):
${JSON.stringify(orchestratorContext.regionExternalData, null, 1)}`
      : ""

    const topDragsSection = orchestratorContext?.topMarginDrags
      ? `\n═══ MARGIN DRAGS REQUIRING PRESCRIPTIVE ACTION ═══
INSTRUCTIONS: Each object below is a customer dragging portfolio margin. ALL values are RAW NUMBERS.
- "currentMarginPct": 0.25 → 25% margin; "gapToPortfolioPct": -0.30 → 30 points below portfolio
- "dollarImpact": 3500 → $3,500 impact from that driver
- "estimatedRecoveryDollars": 8000 → $8,000 total recoverable

For EACH drag below you MUST produce a separate bullet that:
1. Starts with the customer name from "entity"
2. Identifies the #1 driver from the "drivers" array (highest dollarImpact)
3. Quotes the exact dollarImpact in dollars (e.g., $3,500 — NOT $4k)
4. Reads the "detail" and "benchmarkComparison" fields and converts them into a specific action (change X from Y to Z)
5. Computes the recovery: corrective action × volume = dollars recovered

DO NOT combine multiple drags into one bullet like "address negative-margin accounts." Each drag = one bullet with one customer's specific prescription.

Margin Drag Data:
${JSON.stringify(orchestratorContext.topMarginDrags, null, 1)}`
      : ""

    const prescriptionsSection = orchestratorContext?.preComputedPrescriptions
      ? `\n═══ PRE-COMPUTED PRESCRIPTIONS (USE THESE — DO NOT INVENT YOUR OWN NUMBERS) ═══
The following prescriptions have been computed from actual job-level data. Each one is a specific, math-verified action.
Your job: incorporate these into your executive summary bullets and findings. You may rephrase for flow but MUST preserve the specific numbers, customer names, and corrective actions.

${JSON.stringify(orchestratorContext.preComputedPrescriptions, null, 1)}`
      : ""

    const expansionSection = orchestratorContext?.expansionStrategy
      ? `\n═══ EXPANSION STRATEGY BY REGION (pre-computed from BLS, Census, EIA data) ═══
Each region below has a computed strategy (invest/expand/defend/harvest/explore) based on external market data cross-referenced with ACME Field Services' current footprint.
When generating findings, include at least one market-position finding that references the expansion strategy.
Set dataSources on findings to indicate which external sources informed them (BLS, Census, EIA, Internal).
IMPORTANT: Do NOT say "per BLS data" or "according to Census" in the narrative — let the dataSources field handle attribution.
Instead, weave the external data into the strategic narrative naturally: "Metro Central-1's 16.5% HVAC wage growth creates acquisition leverage..." not "BLS data shows Metro Central-1 wages grew 16.5%."

${JSON.stringify(orchestratorContext.expansionStrategy, null, 1)}`
      : ""

    const pricingBandSection = orchestratorContext?.pricingBandIntelligence
      ? `\n═══ PRICING-BAND INTELLIGENCE (pre-computed win-rate inflection points) ═══
Each entry is a job type with its sweet spot, ceiling, win-rate drop above ceiling, pending quotes at risk, and projected uplift from correct future pricing.
On the Pricing Intel page, surface any job type with pending quotes priced above the ceiling as an immediate, dollar-quantified risk.

${JSON.stringify(orchestratorContext.pricingBandIntelligence, null, 1)}`
      : ""

    const salesPerformanceSection = orchestratorContext?.salesPerformance
      ? `\n═══ SALES PERFORMANCE (pre-computed rep conversion stats) ═══
Overall win rate, median/avg days-to-convert, conversion funnel, and top reps. Use for quoting-velocity and rep-variance findings on the Pricing Intel page.

${JSON.stringify(orchestratorContext.salesPerformance, null, 1)}`
      : ""

    const dispatchEfficiencySection = orchestratorContext?.dispatchEfficiency
      ? `\n═══ DISPATCH EFFICIENCY (pre-computed NTE escalation friction) ═══
Portfolio escalation rate, total friction cost, and per-customer escalation profiles with customer-set NTE vs. typical billed scope and projected workflow savings.
CRITICAL FRAMING: NTE is customer-controlled — ACME cannot change it. NTE overages are NOT lost revenue — re-authorized jobs still bill. The cost is OPERATIONAL FRICTION (return trips, tech idle, dispatch labor). Quantify friction cost and recommend internal workflow mitigations (expedited re-auth, scope pre-screening) — do NOT recommend NTE threshold changes.

${JSON.stringify(orchestratorContext.dispatchEfficiency, null, 1)}`
      : ""

    const fuelExposureSection = orchestratorContext?.fuelExposure
      ? `\n═══ FLEET FUEL EXPOSURE (fleet card actuals) ═══
Total fleet fuel cost, monthly burn, $0.10/gal sensitivity, division breakdown, and margin erosion factors.
On the Pricing Intel page, frame as aggregate exposure + contract fuel-escalation clauses tied to fleet card actuals. Do NOT compute per-trip surcharges.

${JSON.stringify(orchestratorContext.fuelExposure, null, 1)}`
      : ""

    const userContent = `${languageInstruction}Synthesize the following specialist analyses into a unified intelligence briefing.

Navigation Context: ${JSON.stringify(drillState)}
Active Page: ${pageContext}
Available Specialists: ${specialistSummary}
${availableSpecialists.length < 3 ? `\nNOTE: Only ${availableSpecialists.length} of 3 specialists returned data. Acknowledge any gaps in your reasoning.\n` : ""}
Specialist Outputs:
${JSON.stringify(availableSpecialists, null, 1)}${knowledgeBaseSection}${rootCauseSection}${externalDataSection}${topDragsSection}${prescriptionsSection}${expansionSection}${pricingBandSection}${salesPerformanceSection}${dispatchEfficiencySection}${fuelExposureSection}`

    const response = await callWithRetry(
      client,
      {
        model,
        temperature: 0.15,
        messages: [
          { role: "system", content: ORCHESTRATOR_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: ORCHESTRATOR_SCHEMA,
        },
      },
      gemini ? openai : null,
      MODELS.openai,
    )

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from orchestrator"))

    const parsed = extractJson(content)
    return Response.json({ fallback: false, data: parsed })
  } catch (err) {
    return errorResponse(err)
  }
}
