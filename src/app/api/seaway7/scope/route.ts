import { getClient, getGeminiClient, callWithRetry, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { SCOPE_SCHEMA } from "@/app/prototype/prosera-compass/agents/_tender-types"
import { TENDER_SCOPE_PROMPT } from "@/app/prototype/prosera-compass/agents/_tender-prompts"
import { componentById, documentRegisterSummary } from "@/app/prototype/prosera-compass/data/seaway7/_documents"
import { PROJECT } from "@/app/prototype/prosera-compass/data/seaway7/_tenders"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const openai = getClient()
  const gemini = getGeminiClient()
  const client = openai || gemini
  if (!client) return fallbackResponse()

  try {
    const { componentId, quantity, prompt, officer } = await req.json()
    const spec = componentById(componentId)
    if (!spec) return errorResponse(new Error("Unknown component"))

    const userContent = `Drafting request from the procurement officer (${officer}):
"${prompt}"

Resolved component: ${spec.name} (${spec.docRef}) — ${spec.overview}
Quantity: ${quantity}
Programme: ${PROJECT.name} — ${PROJECT.scope}. Client: ${PROJECT.client}. Mobilisation port: ${PROJECT.mobilisationPort}.
Vessel operations involved: ${spec.involvesVessel ? "yes — charter flow-downs apply" : "no"}

Controlled document register available to the specialist agents:
${documentRegisterSummary()}

Applicable standards flagged for this component class: ${spec.applicableStandards.join(", ")}.

Produce the scope frame and retrieval plan.`

    const response = await callWithRetry(
      client,
      {
        model: openai ? MODELS.openai : MODELS.gemini,
        temperature: 0.2,
        messages: [
          { role: "system", content: TENDER_SCOPE_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_schema", json_schema: SCOPE_SCHEMA },
      },
      openai ? gemini : null,
      MODELS.gemini,
    )

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from scope agent"))

    return Response.json({ fallback: false, data: extractJson(content) })
  } catch (err) {
    return errorResponse(err)
  }
}
