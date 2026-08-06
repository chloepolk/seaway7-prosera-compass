import { getClient, getGeminiClient, callWithRetry, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { TECHNICAL_SCHEMA } from "@/app/prototype/future-energy/agents/_tender-types"
import { TENDER_TECHNICAL_PROMPT, tenderLanguageInstruction } from "@/app/prototype/future-energy/agents/_tender-prompts"
import type { Locale } from "@/app/prototype/future-energy/_i18n/types"
import { componentById, documentById } from "@/app/prototype/future-energy/data/future-energy/_documents"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const openai = getClient()
  const gemini = getGeminiClient()
  const client = openai || gemini
  if (!client) return fallbackResponse()

  try {
    const { componentId, quantity, locale: requestedLocale } = await req.json()
    const locale: Locale = requestedLocale === "fr" ? "fr" : "en"
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
          { role: "system", content: `${TENDER_TECHNICAL_PROMPT}\n\n${tenderLanguageInstruction(locale)}` },
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
