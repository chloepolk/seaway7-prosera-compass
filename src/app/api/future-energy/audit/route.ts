import { getClient, getGeminiClient, callWithRetry, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { TENDER_AUDIT_SCHEMA } from "@/app/prototype/future-energy/agents/_tender-types"
import { TENDER_AUDIT_PROMPT } from "@/app/prototype/future-energy/agents/_tender-prompts"
import { componentById, documentById } from "@/app/prototype/future-energy/data/future-energy/_documents"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const openai = getClient()
  const gemini = getGeminiClient()
  const client = openai || gemini
  if (!client) return fallbackResponse()

  try {
    const { componentId, itt } = await req.json()
    const spec = componentById(componentId)
    if (!spec) return errorResponse(new Error("Unknown component"))

    const specDoc = documentById(spec.docId)
    const qaManual = documentById("qa-man-2026-epci")
    const terms = documentById("s7-scm-tc-2026")
    const charter = documentById("supplytime-2026-charter")

    const userContent = `DRAFT ITT TO AUDIT:
${JSON.stringify(itt, null, 1)}

SOURCE DOCUMENTS (ground truth):

[1] ${specDoc?.docRef}:
${specDoc?.fullText ?? ""}

[2] ${qaManual?.docRef}:
${qaManual?.fullText ?? ""}

[3] ${terms?.docRef}:
${terms?.fullText ?? ""}
${spec.involvesVessel ? `\n[4] ${charter?.docRef}:\n${charter?.fullText ?? ""}` : ""}

Component class under tender: ${spec.name}. Applicable standards for this class: ${spec.applicableStandards.join(", ")}.

Audit the draft section by section and return the structured verification.`

    const response = await callWithRetry(
      client,
      {
        model: openai ? MODELS.openai : MODELS.gemini,
        temperature: 0.1,
        messages: [
          { role: "system", content: TENDER_AUDIT_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_schema", json_schema: TENDER_AUDIT_SCHEMA },
      },
      openai ? gemini : null,
      MODELS.gemini,
    )

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from audit agent"))

    return Response.json({ fallback: false, data: extractJson(content) })
  } catch (err) {
    return errorResponse(err)
  }
}
