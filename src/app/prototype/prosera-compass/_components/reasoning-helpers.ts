import type { BPFinding } from "../data/_insights"
import type { OrchestratorFinding } from "../agents/_types"
import type { DiamondMission } from "../_diamond/types"
import type { ExpansionAction, ExpansionPrescription } from "../data/_expansion"
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
/*  Finding-specific analysis chains (keyed by finding id)             */
/* ------------------------------------------------------------------ */

type FindingReasoningFactory = (f: BPFinding | OrchestratorFinding) => Partial<ReasoningContent>

const FINDING_REASONING: Record<string, FindingReasoningFactory> = {
  "portfolio-concentration": () => ({
    steps: [
      "Joined validated jobs from platform export and aggregated margin by customer",
      "Ranked customers by positive margin contribution (Pareto walk)",
      "Compared concentration to whale-curve benchmarks (Profitability Partners)",
      "Flagged single-customer revenue share against 15% concentration threshold",
    ],
    equations: [
      "margin = totalAmount − actualCost; marginPct = margin / totalAmount",
      "topMarginSharePct = cumulative positive margin until 60% of portfolio margin captured",
      "concentrationRisk = max(customerRevenue) / portfolioRevenue vs 15% threshold",
    ],
    sources: ["Internal — Platform job export (_raw.ts)", "Profitability Partners — Whale curve (_benchmarks.ts)"],
  }),
  "negative-margin-customers": () => ({
    steps: [
      "Filtered customers with margin below 0% or industry 40% floor",
      "Ran root-cause decomposition per account (_rootcause.ts)",
      "Summed estimatedRecovery from top drag drivers per customer",
    ],
    equations: [
      "estimatedRecovery = Σ|dollarImpact| for top drag drivers",
      "Prescription threshold: recovery > $2,000 × 0.87 (MONETARY_SCALE)",
    ],
    sources: ["Internal — Job cost lines (_costs.ts)", "Internal — Root cause engine (_rootcause.ts)"],
  }),
  "stars-dna": () => ({
    steps: [
      "Isolated Stars tier customers (margin ≥ 40%, ≥ 3 jobs, premium DNA)",
      "Profiled dominant job types and property types across Stars cohort",
      "Compared Stars margin profile to portfolio and industry HVAC range",
    ],
    equations: [
      "Stars: marginPct ≥ 0.40 AND jobCount ≥ 3 AND premium service DNA",
      "Industry HVAC gross margin benchmark: 35–55% (Profitability Partners)",
    ],
    sources: ["Internal — BCG tiering (_transform.ts)", "Profitability Partners — Trade margins (_benchmarks.ts)"],
  }),
  "pricing-ceilings": () => ({
    steps: [
      "Grouped quote outcomes by job type and price-band percentiles",
      "Computed win rate per band; identified ceiling where win rate < 40%",
      "Identified sweet spot bands with win rate ≥ 50%",
    ],
    equations: [
      "winRate(band) = approvedQuotes / totalQuotesWithOutcome",
      "ceiling = first band where winRate < 0.40",
      "sweetSpot = band with max winRate where winRate ≥ 0.50",
    ],
    sources: ["Internal — Salesforce quotes (_raw_quotes.ts)", "Internal — Quote analysis (_transform.ts)"],
  }),
  "at-risk-quotes": () => ({
    steps: [
      "Scored pending quotes: +3 above ceiling, +1 NTE exceed, +2 age > 7d (+1 if > 2d)",
      "Ranked by composite risk score for pricing intervention",
    ],
    equations: [
      "riskScore = ceilingFlag×3 + nteExceed×1 + age>7d×2 + age>2d×1",
    ],
    sources: ["Internal — Quote analysis (_transform.ts)", "Internal — NTE workflow (_dispatch.ts)"],
  }),
  "nte-escalations": () => ({
    steps: [
      "Identified jobs where totalAmount > amountNTE (NTE exceeded)",
      "Computed dispatch friction from re-authorization events",
      "Recommended NTE at P85 of job amounts per customer pattern",
    ],
    equations: [
      "nteUtilization = totalAmount / amountNTE",
      "savings = eliminatedEscalations × $50 truck roll × 40% return-trip rate",
    ],
    sources: ["Internal — Platform job export (_raw.ts)", "Internal — Dispatch auth (_dispatch.ts)"],
  }),
  "fuel-price-trend": () => ({
    steps: [
      "Pulled EIA weekly retail diesel/gas by PADD region",
      "Compared recent 4-week avg to baseline period",
      "Computed fleet exposure: gallons = roundTripMi / 15 MPG × visits",
    ],
    equations: [
      "fuelDeltaPct = (recentAvg − baselineAvg) / baselineAvg",
      "annualImpact = impactPerDime × annualGallons",
    ],
    sources: ["EIA — Weekly retail fuel (_eia.ts)", "Internal — Fleet card transactions (_atob.ts)", "Internal — Fuel exposure (_fuel.ts)"],
  }),
  "regional-margin-variance": () => ({
    steps: [
      "Aggregated validated margin by derived operating region",
      "Compared each region to portfolio baseline and BLS wage profile",
      "Flagged regions with > 10pt spread from portfolio median",
    ],
    equations: [
      "regionalMarginPct = Σ(revenue − cost) / Σ(revenue) per region",
      "wagePremium = regionalMeanWage / nationalBaseline − 1 (BLS OES SOC 49-9021)",
    ],
    sources: ["Internal — Job export (_raw.ts)", "BLS — OES HVAC wages (_labor.ts)"],
  }),
  "dispatch-friction-portfolio": () => ({
    steps: [
      "Tracked NTE re-authorization events and return-trip patterns",
      "Quantified truck-roll cost per escalation at $50/visit",
      "Ranked customers by escalation frequency × revenue impact",
    ],
    equations: [
      "frictionCost = escalations × $50 × returnTripRate (40%)",
    ],
    sources: ["Internal — Dispatch auth events (_dispatch.ts)"],
  }),
}

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
  const factory = FINDING_REASONING[f.id] ?? defaultFindingReasoning
  const specific = factory(f)
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

/* ------------------------------------------------------------------ */
/*  Expansion prescriptions & actions                                  */
/* ------------------------------------------------------------------ */

const COMPOSITE_EQUATION =
  "Composite = constructionGrowth×0.25 + wageFavorability×0.15 + laborSupply×0.10 + currentMargin×0.20 + footprintStrength×0.15 + fuelExposure×0.15"

export function reasoningFromExpansionPrescription(rx: ExpansionPrescription): ReasoningContent {
  const sc = rx.scorecard
  return {
    summary: rx.strategyRationale,
    steps: [
      "Scored each region on 6 market signals (BLS wages, Census permits, EIA fuel, internal footprint)",
      `Derived composite score → assigned ${rx.strategy.toUpperCase()} strategy`,
      "Generated lever-specific actions with per-action impact math",
    ],
    equations: [
      COMPOSITE_EQUATION,
      `= ${sc.constructionGrowth}×0.25 + ${sc.wageFavorability}×0.15 + ${sc.laborSupply}×0.10 + ${sc.currentMargin}×0.20 + ${sc.footprintStrength}×0.15 + ${sc.fuelExposure}×0.15`,
      `= ${rx.compositeScore}`,
      rx.actions[0]?.math ?? "",
    ].filter(Boolean),
    evidence: rx.marketSignals.slice(0, 4).map((s) => `${s.source} — ${s.metric}: ${s.value}`),
    conclusion: rx.actions[0]?.action ?? `Implement the ${rx.strategy} strategy in ${rx.regionName}.`,
    sources: [...new Set(rx.marketSignals.map((s) => s.source))].map((s) =>
      s === "Internal" ? "Internal — Platform job export" : `${s} — External data`,
    ),
  }
}

export function reasoningFromExpansionAction(a: ExpansionAction): ReasoningContent {
  return {
    summary: a.rationale,
    equations: a.math ? [a.math] : undefined,
    conclusion: `Expected impact: ${a.expectedImpact}. Confidence: ${a.confidence}.`,
    sources: a.sources.map((s) =>
      s === "Internal" ? "Internal — Platform job export" : `${s} — External benchmark`,
    ),
  }
}

/* ------------------------------------------------------------------ */
/*  KPI reasoning with explicit formulas                               */
/* ------------------------------------------------------------------ */

export interface KpiReasoningOpts {
  steps?: string[]
  equations?: string[]
  sources?: string[]
}

export function reasoningFromKpi(label: string, explanation: string, opts?: KpiReasoningOpts): ReasoningContent {
  return {
    summary: explanation,
    steps: opts?.steps,
    equations: opts?.equations,
    sources: opts?.sources,
  }
}

export const KPI_REASONING = {
  revenue: (totalRevenue: number, jobCount: number): ReasoningContent =>
    reasoningFromKpi(
      "Revenue",
      "Sum of validated job revenue across the portfolio export.",
      {
        steps: ["Filtered jobs with totalAmount > 0 and not excluded by data quality rules", "Summed totalAmount across validated cohort"],
        equations: [`Revenue = Σ(totalAmount) = $${Math.round(totalRevenue).toLocaleString()} across ${jobCount.toLocaleString()} jobs`],
        sources: ["Internal — Platform job export (_raw.ts)"],
      },
    ),
  grossMargin: (avgMarginPct: number): ReasoningContent =>
    reasoningFromKpi(
      "Gross margin",
      "Portfolio-weighted average realized margin per job.",
      {
        steps: ["Computed per-job margin = totalAmount − actualCost", "Aggregated as portfolio-weighted average"],
        equations: [
          "marginPct = (totalAmount − actualCost) / totalAmount",
          `Portfolio avg = ${(avgMarginPct * 100).toFixed(1)}%`,
        ],
        sources: ["Internal — Job export + cost lines (_raw.ts, _costs.ts)", "Profitability Partners — HVAC benchmark 35–55% (_benchmarks.ts)"],
      },
    ),
  customers: (count: number): ReasoningContent =>
    reasoningFromKpi(
      "Customers",
      "Distinct customer accounts with at least one validated job.",
      {
        steps: ["Joined jobs on customer key", "Counted distinct customers in validated cohort"],
        equations: [`Customers = COUNT(DISTINCT customerName) = ${count.toLocaleString()}`],
        sources: ["Internal — Platform job export (_raw.ts)"],
      },
    ),
  portfolioHealth: (avgScore: number): ReasoningContent =>
    reasoningFromKpi(
      "Portfolio health",
      "Average CI-04 composite customer score across the book.",
      {
        steps: [
          "Computed 5-factor customer score per account",
          "Averaged scores across all customers with validated jobs",
        ],
        equations: [
          "CS = [0.30(M) + 0.20(R) + 0.15(P) + 0.15(A) + 0.20(S)] × 100",
          "M = margin / regional baseline; R = annualized revenue / target × predictability",
          "S = TAM share or service-line breadth; P = margin trend; A = DSO vs 45d target (simulated)",
          `Portfolio avg CS = ${avgScore}/100`,
        ],
        sources: ["Internal — Customer scorecard (_scorecard.ts)", "Internal — Simulated AR/DSO (_ar.ts)"],
      },
    ),
  medianInvoiceLag: (medianLag: number, invoicedCount: number): ReasoningContent =>
    reasoningFromKpi(
      "Median days-to-invoice",
      "Median days from job completion to first invoice creation.",
      {
        steps: [
          "Filtered completed jobs with firstInvoiceCreated timestamp",
          "Computed invoiceLagDays = firstInvoiceCreated − completedDate",
          "Took median of lag distribution",
        ],
        equations: [
          "invoiceLagDays = days(firstInvoiceCreated − completedDate)",
          `Median = ${medianLag.toFixed(1)} days across ${invoicedCount.toLocaleString()} invoiced jobs`,
          "Target ≤ 2 days (48-hour billing SLA)",
        ],
        sources: ["Internal — Platform job export (_raw.ts)"],
      },
    ),
  withinTargetPct: (pct: number, target: number): ReasoningContent =>
    reasoningFromKpi(
      "Within target",
      `Share of invoiced jobs billed within the ${target}-day target.`,
      {
        equations: [
          `withinTargetPct = COUNT(lag ≤ ${target}d) / COUNT(invoiced) = ${(pct * 100).toFixed(1)}%`,
        ],
        sources: ["Internal — Platform job export (_raw.ts)"],
      },
    ),
  cashTiedUp: (amount: number, count: number): ReasoningContent =>
    reasoningFromKpi(
      "Cash tied up",
      "Revenue on completed jobs not yet invoiced (working capital at risk).",
      {
        steps: ["Identified completed jobs with no firstInvoiceCreated", "Summed totalAmount on uninvoiced backlog"],
        equations: [
          `cashTiedUp = Σ(totalAmount) where completed AND NOT invoiced = $${Math.round(amount).toLocaleString()}`,
          `${count.toLocaleString()} jobs in backlog`,
        ],
        sources: ["Internal — Platform job export (_raw.ts)"],
      },
    ),
  weatherDemandSlope: (slope: number, r2: number, n: number): ReasoningContent =>
    reasoningFromKpi(
      "Weather → Demand",
      "STRIPA pooled elasticity: demand lift per weather-index point.",
      {
        steps: [
          "S — Joined NOAA-style weather index to monthly job volume per region",
          "TR — Fitted OLS elasticity: demandLiftPct ~ weatherIndex",
          "I/P — Inferred margin behavior and forecast next 2 quarters",
        ],
        equations: [
          "demandLiftPct = intercept + slope × (weatherIndex − 50)",
          `slope = ${slope.toFixed(2)}%/pt (r² = ${r2.toFixed(2)}, n = ${n})`,
        ],
        sources: ["NOAA — Climate normals (_weather.ts, static)", "Internal — Job volume (_raw.ts)", "STRIPA pipeline (_weather_demand.ts)"],
      },
    ),
} as const
