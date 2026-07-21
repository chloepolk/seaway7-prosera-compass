/* ------------------------------------------------------------------ */
/*  Compass Domain Contract                                            */
/*                                                                     */
/*  The reusable seam between the Compass ENGINE (agent pipeline,      */
/*  store, diamond, modular OS, what-if, BI) and the per-project       */
/*  DOMAIN pack (data, prompts, selectors, pages, knowledge base).     */
/*                                                                     */
/*  Starting a new Compass project = implement ONE DomainConfig.       */
/*  Nothing in here is coupled to Field Services or Transportation —   */
/*  it is the contract every domain fills in. See README.md.           */
/* ------------------------------------------------------------------ */

/* ================================================================== */
/*  1. Generic agent envelopes (domain-agnostic)                       */
/*     Same shapes the engine moves between specialists →              */
/*     orchestrator → verifier, parameterized by the domain's          */
/*     specialist + data-source unions.                                */
/* ================================================================== */

export type AgentPhase =
  | "idle"
  | "specialists"
  | "orchestrating"
  | "verifying"
  | "complete"

export interface SpecialistSignal {
  signal: string
  severity: "high" | "medium" | "low"
  evidence: string
}

export interface SpecialistMetric {
  key: string
  value: string
}

export interface SpecialistOutput<TSpecialistId extends string = string> {
  specialistId: TSpecialistId
  analysis: string
  keyMetrics: SpecialistMetric[]
  signals: SpecialistSignal[]
  confidence: number
}

export interface OrchestratorFinding<
  TSpecialistId extends string = string,
  TDataSource extends string = string,
> {
  id: string
  title: string
  narrative: string
  evidence: string[]
  recommendation: string
  category: string
  severity: string
  sourceSpecialists: TSpecialistId[]
  dataSources?: TDataSource[]
}

export interface ReasoningStep<TSpecialistId extends string = string> {
  step: number
  text: string
  sourceSpecialist?: TSpecialistId | null
}

export interface ExecutiveSummary {
  sentences: string[]
  bullets: string[]
}

export interface OrchestratorOutput<
  TSpecialistId extends string = string,
  TDataSource extends string = string,
> {
  headline: { title: string; narrative: string; severity: string }
  executiveSummary: ExecutiveSummary | null
  findings: OrchestratorFinding<TSpecialistId, TDataSource>[]
  reasoning: ReasoningStep<TSpecialistId>[]
  confidence: number
}

export interface VerifierCorrection {
  findingId: string
  field: string
  original: string
  corrected: string
  reason: string
}

export interface VerifierSuppression {
  findingId: string
  reason: string
}

export interface VerifierAnnotation {
  findingId: string
  note: string
}

export interface VerifierOutput {
  verified: boolean
  corrections: VerifierCorrection[]
  suppressions: VerifierSuppression[]
  annotations: VerifierAnnotation[]
  overallAssessment: string
}

/* ================================================================== */
/*  2. Drill state                                                     */
/*     The engine carries page + drill level + an open-ended set of    */
/*     hierarchical dimensions (region/city/customer, or               */
/*     network/region/dc/carrier, etc.). The domain declares which     */
/*     dimensions exist via DomainConfig.drillDimensions.              */
/* ================================================================== */

export interface DrillState {
  page: string
  drillLevel: string
  /** Selected value for each declared drill dimension, or null. */
  dimensions: Record<string, string | null>
}

export interface DrillDimensionDef {
  /** Stable key, e.g. "region" | "dc" | "carrier". */
  key: string
  /** Human label for UI. */
  label: string
  /** Parent dimension key for hierarchical drill, if any. */
  parent?: string
}

/* ================================================================== */
/*  3. Structured-output schema builders                               */
/*     The legacy schemas hardcode specialist / category / source      */
/*     enums. These builders parameterize them so each domain gets      */
/*     strict JSON schemas without editing the engine.                 */
/* ================================================================== */

export interface JsonSchemaEnvelope {
  name: string
  strict: true
  schema: Record<string, unknown>
}

export function buildSpecialistSchema(
  specialistIds: readonly string[],
): JsonSchemaEnvelope {
  return {
    name: "specialist_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        specialistId: { type: "string", enum: [...specialistIds] },
        analysis: { type: "string" },
        keyMetrics: {
          type: "array",
          items: {
            type: "object",
            properties: { key: { type: "string" }, value: { type: "string" } },
            required: ["key", "value"],
            additionalProperties: false,
          },
        },
        signals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              signal: { type: "string" },
              severity: { type: "string", enum: ["high", "medium", "low"] },
              evidence: { type: "string" },
            },
            required: ["signal", "severity", "evidence"],
            additionalProperties: false,
          },
        },
        confidence: { type: "number" },
      },
      required: ["specialistId", "analysis", "keyMetrics", "signals", "confidence"],
      additionalProperties: false,
    },
  }
}

export function buildOrchestratorSchema(opts: {
  specialistIds: readonly string[]
  categories: readonly string[]
  dataSources: readonly string[]
  severities?: readonly string[]
}): JsonSchemaEnvelope {
  const severities = opts.severities ?? ["critical", "high", "medium", "info"]
  return {
    name: "orchestrator_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        headline: {
          type: "object",
          properties: {
            title: { type: "string" },
            narrative: { type: "string" },
            severity: { type: "string", enum: [...severities] },
          },
          required: ["title", "narrative", "severity"],
          additionalProperties: false,
        },
        executiveSummary: {
          type: "object",
          properties: {
            sentences: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
            bullets: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 9 },
          },
          required: ["sentences", "bullets"],
          additionalProperties: false,
        },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              narrative: { type: "string" },
              evidence: { type: "array", items: { type: "string" } },
              recommendation: { type: "string" },
              category: { type: "string", enum: [...opts.categories] },
              severity: { type: "string", enum: [...severities] },
              sourceSpecialists: { type: "array", items: { type: "string", enum: [...opts.specialistIds] } },
              dataSources: { type: "array", items: { type: "string", enum: [...opts.dataSources] } },
            },
            required: [
              "id", "title", "narrative", "evidence", "recommendation",
              "category", "severity", "sourceSpecialists", "dataSources",
            ],
            additionalProperties: false,
          },
        },
        reasoning: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "number" },
              text: { type: "string" },
              sourceSpecialist: { type: ["string", "null"], enum: [...opts.specialistIds, null] },
            },
            required: ["step", "text", "sourceSpecialist"],
            additionalProperties: false,
          },
        },
        confidence: { type: "number" },
      },
      required: ["headline", "executiveSummary", "findings", "reasoning", "confidence"],
      additionalProperties: false,
    },
  }
}

/** Verifier schema is fully domain-agnostic — exported as a constant. */
export const VERIFIER_SCHEMA: JsonSchemaEnvelope = {
  name: "verifier_output",
  strict: true,
  schema: {
    type: "object",
    properties: {
      verified: { type: "boolean" },
      corrections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            findingId: { type: "string" },
            field: { type: "string" },
            original: { type: "string" },
            corrected: { type: "string" },
            reason: { type: "string" },
          },
          required: ["findingId", "field", "original", "corrected", "reason"],
          additionalProperties: false,
        },
      },
      suppressions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            findingId: { type: "string" },
            reason: { type: "string" },
          },
          required: ["findingId", "reason"],
          additionalProperties: false,
        },
      },
      annotations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            findingId: { type: "string" },
            note: { type: "string" },
          },
          required: ["findingId", "note"],
          additionalProperties: false,
        },
      },
      overallAssessment: { type: "string" },
    },
    required: ["verified", "corrections", "suppressions", "annotations", "overallAssessment"],
    additionalProperties: false,
  },
}

/* ================================================================== */
/*  4. Modular OS catalog descriptors                                  */
/*     What the app-architect / app-composer agents are allowed to     */
/*     see. INTERNAL selectors are hard bindings into ComputedData;    */
/*     EXTERNAL sources are the discoverable provenance palette.       */
/* ================================================================== */

export interface SelectorDescriptor {
  selector: string
  kind: "kpi" | "series" | "table"
  describe: string
  fields?: string[]
}

export interface ExternalSourceDescriptor {
  id: string
  label: string
  provider: string
  summary: string
  /** Whether the figures are wired into the prototype today. */
  wired: boolean
}

export interface DomainCatalog {
  internalSelectors: SelectorDescriptor[]
  externalSources: ExternalSourceDescriptor[]
  /** Compact description injected into architect/composer prompts. */
  buildCatalogPromptContext: () => string
}

/* ================================================================== */
/*  5. Domain data adapter                                             */
/*     The engine is agnostic to the shape of ComputedData; it only    */
/*     needs to compute it once and ask the domain to brief the chat.  */
/* ================================================================== */

export interface DomainDataAdapter<TComputed> {
  /** Build the fully computed dataset the pages + agents read from. */
  compute: () => TComputed
  /** A compact natural-language briefing for the chat system prompt. */
  buildChatBriefing: (data: TComputed) => string
}

/* ================================================================== */
/*  6. Specialists                                                     */
/*     One per domain analytical lens. Each owns its system prompt     */
/*     and the context slice it feeds the model.                       */
/* ================================================================== */

export interface SpecialistDef<TSpecialistId extends string, TComputed> {
  id: TSpecialistId
  label: string
  systemPrompt: string
  buildContext: (data: TComputed, drill: DrillState) => Record<string, unknown>
}

/* ================================================================== */
/*  7. Prompt set                                                      */
/*     Every model touchpoint the engine drives. Specialist prompts    */
/*     live on each SpecialistDef; these are the shared/global ones.   */
/* ================================================================== */

export interface PromptSet {
  orchestrator: string
  verifier: string
  chat: string
  sandbox: string
  agent: string
  appArchitect: string
  appComposer: string
  /** Optional reusable rule blocks shared across prompts. */
  rules?: Record<string, string>
}

/* ================================================================== */
/*  8. Pages / navigation                                              */
/* ================================================================== */

export interface PageDef {
  id: string
  label: string
  icon: string
}

/* ================================================================== */
/*  9. The DomainConfig — the single object a new project implements   */
/* ================================================================== */

export interface DomainMeta {
  /** Route slug + registry id, e.g. "transportation". */
  id: string
  /** Display name, e.g. "Prosera Compass". */
  name: string
  /** Cockpit subtitle, e.g. "Transportation · Operating Cockpit". */
  subtitle: string
  /** Optional brand token overrides; falls back to Prosera defaults. */
  brand?: { primary?: string; border?: string }
}

export interface DomainConfig<
  TSpecialistId extends string = string,
  TDataSource extends string = string,
  TComputed = unknown,
> {
  meta: DomainMeta

  /** Analytical lenses (the specialists in the pipeline). */
  specialists: SpecialistDef<TSpecialistId, TComputed>[]

  /** Allowed orchestrator finding categories (drives the schema enum). */
  categories: readonly string[]

  /** Allowed provenance data sources (drives the schema enum). */
  dataSources: readonly TDataSource[]

  /** Hierarchical drill dimensions the UI + agents navigate. */
  drillDimensions: DrillDimensionDef[]

  /** Pages shown in the left nav. */
  pages: PageDef[]

  /** Data layer: compute the dataset + brief the chat. */
  data: DomainDataAdapter<TComputed>

  /** Global prompts (specialist prompts live on each SpecialistDef). */
  prompts: PromptSet

  /** Modular-OS data catalog (what app-architect/composer may surface). */
  catalog: DomainCatalog

  /** Cited benchmark library injected as orchestrator/verifier knowledge. */
  knowledgeBase?: unknown

  /** Synthesis context for the orchestrator. */
  buildOrchestratorContext: (
    data: TComputed,
    specialistOutputs: SpecialistOutput<TSpecialistId>[],
    drill: DrillState,
  ) => Record<string, unknown>

  /** Fact-check context for the verifier. */
  buildVerifierContext: (
    data: TComputed,
    orchestratorOutput: OrchestratorOutput<TSpecialistId, TDataSource>,
    drill: DrillState,
  ) => Record<string, unknown>
}
