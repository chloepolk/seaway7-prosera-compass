import { getClient, getGeminiClient, callWithRetry, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { TECHNICAL_SCHEMA } from "@/app/prototype/prosera-compass/agents/_tender-types"
import { TENDER_TECHNICAL_PROMPT } from "@/app/prototype/prosera-compass/agents/_tender-prompts"
import { componentById, documentById } from "@/app/prototype/prosera-compass/data/seaway7/_documents"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const openai = getClient()
  const gemini = getGeminiClient()
  const client = openai || gemini
  if (!client) return fallbackResponse()

  try {
    const { componentId, quantity } = await req.json()
    const spec = componentById(componentId)
    if (!spec) return errorResponse(new Error("Unknown component"))
    const doc = documentById(spec.docId)

    const userContent = `Component to tender: ${spec.name} — quantity ${quantity}.

CONTROLLED SPECIFICATION (source of truth):
${doc?.fullText ?? ""}

Extract Section 2.0 Technical Scope of Supply.`

    const response = await callWithRetry(
      client,
      {
        model: openai ? MODELS.openai : MODELS.gemini,
        temperature: 0.1,
        messages: [
          { role: "system", content: TENDER_TECHNICAL_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_schema", json_schema: TECHNICAL_SCHEMA },
      },
      openai ? gemini : null,
      MODELS.gemini,
    )

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from technical agent"))

    return Response.json({ fallback: false, data: extractJson(content) })
  } catch (err) {
    return errorResponse(err)
  }
}
