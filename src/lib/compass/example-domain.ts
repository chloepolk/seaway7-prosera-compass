/* ------------------------------------------------------------------ */
/*  Example DomainConfig — neutral reference implementation            */
/*                                                                     */
/*  This is NOT a real domain. It is the smallest complete object that */
/*  satisfies the DomainConfig contract, so a new project can copy it  */
/*  field-by-field and replace each value with real domain content.    */
/*  Replace "Example Co" with your vertical (e.g. Transportation).     */
/* ------------------------------------------------------------------ */

import {
  buildOrchestratorSchema,
  buildSpecialistSchema,
  type DomainCatalog,
  type DomainConfig,
  type DrillState,
  type SpecialistDef,
} from "./domain-contract"

/* ---- The domain's specialist + data-source unions ---------------- */

type ExampleSpecialistId = "operations" | "finance"
type ExampleDataSource = "Internal" | "Market"

/* ---- The domain's computed dataset shape ------------------------- */
/*  In a real domain this is the output of data/_transform.compute(). */

interface ExampleComputed {
  totals: { revenue: number; units: number }
  byRegion: { region: string; revenue: number }[]
}

/* ---- Specialists ------------------------------------------------- */

const operationsSpecialist: SpecialistDef<ExampleSpecialistId, ExampleComputed> = {
  id: "operations",
  label: "Operations",
  systemPrompt:
    "You are the Operations Specialist for Example Co. Analyze throughput and " +
    "efficiency signals. Return raw analysis, key metrics, and severity-ranked signals.",
  buildContext: (data, drill) => ({
    scope: drill.drillLevel,
    units: data.totals.units,
    regions: data.byRegion.map((r) => r.region),
  }),
}

const financeSpecialist: SpecialistDef<ExampleSpecialistId, ExampleComputed> = {
  id: "finance",
  label: "Finance",
  systemPrompt:
    "You are the Finance Specialist for Example Co. Analyze revenue and margin " +
    "signals against benchmarks. Never call a mid-range value 'outperforming'.",
  buildContext: (data, drill) => ({
    scope: drill.drillLevel,
    revenue: data.totals.revenue,
  }),
}

/* ---- Modular-OS catalog ------------------------------------------ */

const catalog: DomainCatalog = {
  internalSelectors: [
    { selector: "totals", kind: "kpi", describe: "Top-line totals", fields: ["revenue", "units"] },
    { selector: "byRegion", kind: "series", describe: "Revenue by region", fields: ["region", "revenue"] },
  ],
  externalSources: [
    { id: "market-index", label: "Market index", provider: "Example Provider", summary: "Demand index by region.", wired: false },
  ],
  buildCatalogPromptContext() {
    const internal = this.internalSelectors
      .map((s) => `  - ${s.selector} (${s.kind}): ${s.describe}`)
      .join("\n")
    const external = this.externalSources
      .map((s) => `  - ${s.id} — ${s.label} (${s.provider}): ${s.summary}`)
      .join("\n")
    return ["INTERNAL DATA:", internal, "", "EXTERNAL SOURCES:", external].join("\n")
  },
}

/* ---- The DomainConfig -------------------------------------------- */

export const exampleDomain: DomainConfig<ExampleSpecialistId, ExampleDataSource, ExampleComputed> = {
  meta: {
    id: "example",
    name: "Prosera Compass",
    subtitle: "Example · Operating Cockpit",
  },

  specialists: [operationsSpecialist, financeSpecialist],

  categories: ["operations-signal", "finance-signal", "risk-flag"],

  dataSources: ["Internal", "Market"],

  drillDimensions: [
    { key: "region", label: "Region" },
    { key: "site", label: "Site", parent: "region" },
  ],

  pages: [
    { id: "operating-loop", label: "Operating Loop", icon: "Workflow" },
    { id: "operations", label: "Operations", icon: "Activity" },
    { id: "finance", label: "Finance", icon: "DollarSign" },
  ],

  data: {
    compute: (): ExampleComputed => ({
      totals: { revenue: 0, units: 0 },
      byRegion: [],
    }),
    buildChatBriefing: (data) =>
      `Example Co snapshot: revenue ${data.totals.revenue}, units ${data.totals.units}, ` +
      `${data.byRegion.length} regions.`,
  },

  prompts: {
    orchestrator:
      "You are BluePilot, the strategic orchestrator for Example Co. Synthesize the " +
      "specialist outputs into ranked findings with recommendations. You are an operating " +
      "partner, not a dashboard narrator.",
    verifier:
      "You are the Adversarial Verifier. Audit the orchestrator output against source data " +
      "and benchmarks. Catch errors; do not confirm correctness.",
    chat:
      "You are BluePilot for Example Co. Answer operating questions grounded in the dataset.",
    sandbox:
      "You are BluePilot's scenario strategist running a what-if board for Example Co.",
    agent:
      "You are an autonomous execution agent inside Example Co's Action Board. Complete one " +
      "task on one mission and report progress.",
    appArchitect:
      "You are the App Architect for Example Co. Given an intent, propose a ranked list of " +
      "analytical apps from the available data and external sources.",
    appComposer:
      "You are the App Composer for Example Co. Turn one chosen app idea into a single AppSpec " +
      "JSON object. Output ONLY the JSON.",
    rules: {
      plainLanguage: "Write for a busy operator, not a consultant. Lead with the number.",
    },
  },

  catalog,

  knowledgeBase: undefined,

  buildOrchestratorContext: (data, specialistOutputs, drill) => ({
    scope: drill.drillLevel,
    totals: data.totals,
    specialistCount: specialistOutputs.length,
  }),

  buildVerifierContext: (data, orchestratorOutput, drill) => ({
    scope: drill.drillLevel,
    revenue: data.totals.revenue,
    findingCount: orchestratorOutput.findings.length,
  }),
}

/* ---- Derived strict schemas (parameterized by the unions) -------- */

export const EXAMPLE_SPECIALIST_SCHEMA = buildSpecialistSchema(
  exampleDomain.specialists.map((s) => s.id),
)

export const EXAMPLE_ORCHESTRATOR_SCHEMA = buildOrchestratorSchema({
  specialistIds: exampleDomain.specialists.map((s) => s.id),
  categories: exampleDomain.categories,
  dataSources: exampleDomain.dataSources,
})

/* A blank drill state for the example domain. */
export const EXAMPLE_INITIAL_DRILL: DrillState = {
  page: "operating-loop",
  drillLevel: "macro",
  dimensions: { region: null, site: null },
}
