import { getClient, getGeminiClient, callWithRetry, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { QUALITY_SCHEMA } from "@/app/prototype/future-energy/agents/_tender-types"
import { TENDER_QUALITY_PROMPT } from "@/app/prototype/future-energy/agents/_tender-prompts"
import { componentById, documentById } from "@/app/prototype/future-energy/data/future-energy/_documents"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const openai = getClient()
  const gemini = getGeminiClient()
  const client = openai || gemini
  if (!client) return fallbackResponse()

  try {
    const { componentId } = await req.json()
    const spec = componentById(componentId)
    if (!spec) return errorResponse(new Error("Unknown component"))
    const qaManual = documentById("qa-man-2026-epci")

    const userContent = `Component class: ${spec.name} (${spec.docRef}) — ${spec.overview}

Applicable standard references for this component class: ${spec.applicableStandards.join(", ")}.

CORPORATE QA MANUAL (source of truth):
${qaManual?.fullText ?? ""}

Assemble Section 3.0 Quality Assurance & HSEQ Requirements.`

    const response = await callWithRetry(
      client,
      {
        model: openai ? MODELS.openai : MODELS.gemini,
        temperature: 0.1,
        messages: [
          { role: "system", content: TENDER_QUALITY_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_schema", json_schema: QUALITY_SCHEMA },
      },
      openai ? gemini : null,
      MODELS.gemini,
    )

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from quality agent"))

    return Response.json({ fallback: false, data: extractJson(content) })
  } catch (err) {
    return errorResponse(err)
  }
}
