/* ------------------------------------------------------------------ */
/*  Compass engine schemas — modular-OS structured outputs            */
/*                                                                     */
/*  Domain-agnostic JSON schemas owned by the engine (not the domain). */
/*  The app-architect output shape is identical across projects.      */
/* ------------------------------------------------------------------ */

export const ARCHITECT_SCHEMA = {
  name: "app_architect_output",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      logs: { type: "array" as const, items: { type: "string" as const }, minItems: 4, maxItems: 8 },
      ideas: {
        type: "array" as const,
        minItems: 3,
        maxItems: 6,
        items: {
          type: "object" as const,
          properties: {
            id: { type: "string" as const },
            title: { type: "string" as const },
            icon: { type: "string" as const },
            rationale: { type: "string" as const },
            internalBindings: { type: "array" as const, items: { type: "string" as const } },
            sources: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  id: { type: "string" as const },
                  label: { type: "string" as const },
                  external: { type: "boolean" as const },
                  provenance: { type: "string" as const, enum: ["live", "benchmark", "modeled"] },
                  confidence: { type: "string" as const, enum: ["high", "moderate", "indicative"] },
                  method: { type: "string" as const },
                },
                required: ["id", "label", "external", "provenance", "confidence", "method"],
                additionalProperties: false,
              },
            },
            features: {
              type: "object" as const,
              properties: {
                visuals: { type: "boolean" as const },
                stripa: { type: "boolean" as const },
                explainability: { type: "boolean" as const },
                marketIntelligence: { type: "boolean" as const },
              },
              required: ["visuals", "stripa", "explainability", "marketIntelligence"],
              additionalProperties: false,
            },
          },
          required: ["id", "title", "icon", "rationale", "internalBindings", "sources", "features"],
          additionalProperties: false,
        },
      },
    },
    required: ["logs", "ideas"],
    additionalProperties: false,
  },
}
