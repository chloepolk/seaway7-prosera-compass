import { getClient, getGeminiClient, callWithRetry, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { APP_ARCHITECT_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"
import { buildCatalogPromptContext } from "@/app/prototype/prosera-compass/_modules/catalog"

export const runtime = "nodejs"
export const maxDuration = 60

const ARCHITECT_SCHEMA = {
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

export async function POST(req: Request) {
  const gemini = getGeminiClient()
  const openai = getClient()
  const client = gemini || openai
  if (!client) return fallbackResponse()

  const model = gemini ? MODELS.gemini : MODELS.openai

  try {
    const { intent } = await req.json()
    const userMsg = [
      typeof intent === "string" && intent.trim()
        ? `User intent: ${intent.trim()}`
        : "The user has no specific intent — surface the highest-value apps for this commercial field-services business.",
      "",
      buildCatalogPromptContext(),
    ].join("\n")

    const response = await callWithRetry(
      client,
      {
        model,
        temperature: 0.5,
        messages: [
          { role: "system", content: APP_ARCHITECT_PROMPT },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_schema", json_schema: ARCHITECT_SCHEMA },
      },
      gemini ? openai : null,
      MODELS.openai,
    )

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from architect"))

    return Response.json({ fallback: false, data: extractJson(content) })
  } catch (err) {
    return errorResponse(err)
  }
}
