/* ------------------------------------------------------------------ */
/*  Agent System Types — BluePilot v2                                  */
/* ------------------------------------------------------------------ */

export type SpecialistId = "portfolio" | "pricing" | "market"
export type AgentPhase = "idle" | "specialists" | "orchestrating" | "verifying" | "complete"

/* ------------------------------------------------------------------ */
/*  Drill State (passed to all agents for context)                     */
/* ------------------------------------------------------------------ */

export interface DrillState {
  page: string
  drillLevel: string
  selectedRegion: string | null
  selectedCity: string | null
  selectedCustomer: string | null
  selectedJobType: string | null
}

/* ------------------------------------------------------------------ */
/*  Specialist Output (raw analysis, NOT user-facing)                  */
/* ------------------------------------------------------------------ */

export interface SpecialistSignal {
  signal: string
  severity: "high" | "medium" | "low"
  evidence: string
}

export interface SpecialistMetric {
  key: string
  value: string
}

export interface SpecialistOutput {
  specialistId: SpecialistId
  analysis: string
  keyMetrics: SpecialistMetric[]
  signals: SpecialistSignal[]
  confidence: number
}

/* ------------------------------------------------------------------ */
/*  Orchestrator Output (user-facing, synthesized)                     */
/* ------------------------------------------------------------------ */

export type DataSource = "Spec" | "QA" | "Terms" | "Charter" | "Internal"

export interface OrchestratorFinding {
  id: string
  title: string
  narrative: string
  evidence: string[]
  recommendation: string
  category: string
  severity: string
  sourceSpecialists: SpecialistId[]
  dataSources?: DataSource[]
}

export interface ReasoningStep {
  step: number
  text: string
  sourceSpecialist?: SpecialistId
}

export interface ExecutiveSummary {
  sentences: string[]
  bullets: string[]
}

export interface OrchestratorOutput {
  headline: { title: string; narrative: string; severity: string }
  executiveSummary: ExecutiveSummary | null
  findings: OrchestratorFinding[]
  reasoning: ReasoningStep[]
  confidence: number
}

/* ------------------------------------------------------------------ */
/*  Verifier Output                                                    */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  API Request/Response shapes                                        */
/* ------------------------------------------------------------------ */

export interface SpecialistRequest {
  context: Record<string, unknown>
  drillState: DrillState
}

export interface OrchestratorRequest {
  specialistOutputs: SpecialistOutput[]
  drillState: DrillState
  pageContext: string
}

export interface VerifierRequest {
  orchestratorOutput: OrchestratorOutput
  sourceData: Record<string, unknown>
  drillState: DrillState
}

export interface AgentApiResponse<T> {
  fallback: boolean
  data?: T
  error?: string
}

/* ------------------------------------------------------------------ */
/*  JSON Schemas for Structured Outputs                                */
/* ------------------------------------------------------------------ */

export const SPECIALIST_SCHEMA = {
  name: "specialist_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      specialistId: { type: "string" as const, enum: ["portfolio", "pricing", "market"] },
      analysis: { type: "string" as const },
      keyMetrics: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            key: { type: "string" as const },
            value: { type: "string" as const },
          },
          required: ["key", "value"],
          additionalProperties: false,
        },
      },
      signals: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            signal: { type: "string" as const },
            severity: { type: "string" as const, enum: ["high", "medium", "low"] },
            evidence: { type: "string" as const },
          },
          required: ["signal", "severity", "evidence"],
          additionalProperties: false,
        },
      },
      confidence: { type: "number" as const },
    },
    required: ["specialistId", "analysis", "keyMetrics", "signals", "confidence"],
    additionalProperties: false,
  },
}

export const ORCHESTRATOR_SCHEMA = {
  name: "orchestrator_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      headline: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          narrative: { type: "string" as const },
          severity: { type: "string" as const, enum: ["critical", "high", "medium", "info"] },
        },
        required: ["title", "narrative", "severity"],
        additionalProperties: false,
      },
      executiveSummary: {
        type: "object" as const,
        properties: {
          sentences: { type: "array" as const, items: { type: "string" as const }, minItems: 3, maxItems: 5 },
          bullets: { type: "array" as const, items: { type: "string" as const }, minItems: 5, maxItems: 9 },
        },
        required: ["sentences", "bullets"],
        additionalProperties: false,
      },
      findings: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            id: { type: "string" as const },
            title: { type: "string" as const },
            narrative: { type: "string" as const },
            evidence: { type: "array" as const, items: { type: "string" as const } },
            recommendation: { type: "string" as const },
            category: { type: "string" as const, enum: ["pipeline-health", "deadline-risk", "savings-signal", "compliance-flag", "charter-interface", "supplier-signal"] },
            severity: { type: "string" as const, enum: ["critical", "high", "medium", "info"] },
            sourceSpecialists: { type: "array" as const, items: { type: "string" as const, enum: ["portfolio", "pricing", "market"] } },
            dataSources: { type: "array" as const, items: { type: "string" as const, enum: ["Spec", "QA", "Terms", "Charter", "Internal"] } },
          },
          required: ["id", "title", "narrative", "evidence", "recommendation", "category", "severity", "sourceSpecialists", "dataSources"],
          additionalProperties: false,
        },
      },
      reasoning: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            step: { type: "number" as const },
            text: { type: "string" as const },
            sourceSpecialist: { type: ["string", "null"] as const, enum: ["portfolio", "pricing", "market", null] },
          },
          required: ["step", "text", "sourceSpecialist"],
          additionalProperties: false,
        },
      },
      confidence: { type: "number" as const },
    },
    required: ["headline", "executiveSummary", "findings", "reasoning", "confidence"],
    additionalProperties: false,
  },
}

export const VERIFIER_SCHEMA = {
  name: "verifier_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      verified: { type: "boolean" as const },
      corrections: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            findingId: { type: "string" as const },
            field: { type: "string" as const },
            original: { type: "string" as const },
            corrected: { type: "string" as const },
            reason: { type: "string" as const },
          },
          required: ["findingId", "field", "original", "corrected", "reason"],
          additionalProperties: false,
        },
      },
      suppressions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            findingId: { type: "string" as const },
            reason: { type: "string" as const },
          },
          required: ["findingId", "reason"],
          additionalProperties: false,
        },
      },
      annotations: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            findingId: { type: "string" as const },
            note: { type: "string" as const },
          },
          required: ["findingId", "note"],
          additionalProperties: false,
        },
      },
      overallAssessment: { type: "string" as const },
    },
    required: ["verified", "corrections", "suppressions", "annotations", "overallAssessment"],
    additionalProperties: false,
  },
}
