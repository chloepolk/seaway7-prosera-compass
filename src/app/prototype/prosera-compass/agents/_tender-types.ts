/* ------------------------------------------------------------------ */
/*  Tender drafting pipeline — types & structured-output schemas        */
/*                                                                     */
/*  Domain agent (scope) → specialists (technical / quality / legal)   */
/*  → composer (ITT assembly) → adversarial audit.                     */
/* ------------------------------------------------------------------ */

export type TenderSpecialistId = "technical" | "quality" | "legal"

/* ------------------------------------------------------------------ */
/*  Domain agent (scope)                                               */
/* ------------------------------------------------------------------ */

export interface ScopeOutput {
  objective: string
  projectSummary: string[]
  retrievalPlan: { agent: string; document: string; task: string }[]
  considerations: string[]
}

export const SCOPE_SCHEMA = {
  name: "scope_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      objective: { type: "string" as const },
      projectSummary: { type: "array" as const, items: { type: "string" as const }, minItems: 2, maxItems: 2 },
      retrievalPlan: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            agent: { type: "string" as const },
            document: { type: "string" as const },
            task: { type: "string" as const },
          },
          required: ["agent", "document", "task"],
          additionalProperties: false,
        },
      },
      considerations: { type: "array" as const, items: { type: "string" as const }, minItems: 2, maxItems: 4 },
    },
    required: ["objective", "projectSummary", "retrievalPlan", "considerations"],
    additionalProperties: false,
  },
}

/* ------------------------------------------------------------------ */
/*  Technical specialist                                               */
/* ------------------------------------------------------------------ */

export interface TechnicalOutput {
  scopeIntro: string
  parameters: { parameter: string; requirement: string }[]
  notes: string[]
  citations: string[]
}

export const TECHNICAL_SCHEMA = {
  name: "technical_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      scopeIntro: { type: "string" as const },
      parameters: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            parameter: { type: "string" as const },
            requirement: { type: "string" as const },
          },
          required: ["parameter", "requirement"],
          additionalProperties: false,
        },
      },
      notes: { type: "array" as const, items: { type: "string" as const } },
      citations: { type: "array" as const, items: { type: "string" as const } },
    },
    required: ["scopeIntro", "parameters", "notes", "citations"],
    additionalProperties: false,
  },
}

/* ------------------------------------------------------------------ */
/*  Quality specialist                                                 */
/* ------------------------------------------------------------------ */

export interface QualityOutput {
  intro: string
  standards: { authority: string; ref: string; application: string }[]
  fatRequirements: string[]
  citations: string[]
}

export const QUALITY_SCHEMA = {
  name: "quality_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      intro: { type: "string" as const },
      standards: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            authority: { type: "string" as const },
            ref: { type: "string" as const },
            application: { type: "string" as const },
          },
          required: ["authority", "ref", "application"],
          additionalProperties: false,
        },
      },
      fatRequirements: { type: "array" as const, items: { type: "string" as const } },
      citations: { type: "array" as const, items: { type: "string" as const } },
    },
    required: ["intro", "standards", "fatRequirements", "citations"],
    additionalProperties: false,
  },
}

/* ------------------------------------------------------------------ */
/*  Legal / commercial specialist                                      */
/* ------------------------------------------------------------------ */

export interface LegalOutput {
  governingTerms: string
  clauses: { heading: string; text: string; source: string }[]
  citations: string[]
}

export const LEGAL_SCHEMA = {
  name: "legal_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      governingTerms: { type: "string" as const },
      clauses: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            heading: { type: "string" as const },
            text: { type: "string" as const },
            source: { type: "string" as const },
          },
          required: ["heading", "text", "source"],
          additionalProperties: false,
        },
      },
      citations: { type: "array" as const, items: { type: "string" as const } },
    },
    required: ["governingTerms", "clauses", "citations"],
    additionalProperties: false,
  },
}

/* ------------------------------------------------------------------ */
/*  Composed ITT document                                              */
/* ------------------------------------------------------------------ */

export interface IttDocument {
  ittRef: string
  title: string
  issueDate: string
  submissionDeadline: string
  procurementOfficer: string
  projectSummary: string[]
  submissionGuidelines: string[]
  technical: TechnicalOutput
  quality: QualityOutput
  legal: LegalOutput
  pricing: {
    intro: string
    items: { item: number; description: string; qty: string }[]
  }
}

/* ------------------------------------------------------------------ */
/*  Adversarial audit                                                  */
/* ------------------------------------------------------------------ */

export interface AuditCheck {
  section: string
  claim: string
  status: "pass" | "corrected" | "flagged"
  note: string
}

export interface TenderAuditOutput {
  verified: boolean
  checks: AuditCheck[]
  corrections: { section: string; original: string; corrected: string; reason: string }[]
  assessment: string
}

export const TENDER_AUDIT_SCHEMA = {
  name: "tender_audit_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      verified: { type: "boolean" as const },
      checks: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            section: { type: "string" as const },
            claim: { type: "string" as const },
            status: { type: "string" as const, enum: ["pass", "corrected", "flagged"] },
            note: { type: "string" as const },
          },
          required: ["section", "claim", "status", "note"],
          additionalProperties: false,
        },
      },
      corrections: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            section: { type: "string" as const },
            original: { type: "string" as const },
            corrected: { type: "string" as const },
            reason: { type: "string" as const },
          },
          required: ["section", "original", "corrected", "reason"],
          additionalProperties: false,
        },
      },
      assessment: { type: "string" as const },
    },
    required: ["verified", "checks", "corrections", "assessment"],
    additionalProperties: false,
  },
}
