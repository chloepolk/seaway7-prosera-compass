import { hasAnyProvider, callWithFallback, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { SPECIALIST_SCHEMA as SPECIALIST_SCHEMA_COMPASS } from "@/app/prototype/prosera-compass/agents/_types"
import { SPECIALIST_SCHEMA as SPECIALIST_SCHEMA_FE } from "@/app/prototype/future-energy/agents/_types"
import { PRICING_SPECIALIST_PROMPT as PRICING_COMPASS } from "@/app/prototype/prosera-compass/agents/_prompts"
import { PRICING_SPECIALIST_PROMPT as PRICING_FE } from "@/app/prototype/future-energy/agents/_prompts"
import { outputLanguageInstruction, sanitizeSpecialistOutput } from "@/lib/compass/data-grounded-language"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  if (!hasAnyProvider()) return fallbackResponse()

  try {
    const { context, drillState, locale, tenant } = await req.json()
    const SPECIALIST_SCHEMA = tenant === "future-energy" ? SPECIALIST_SCHEMA_FE : SPECIALIST_SCHEMA_COMPASS
    const PRICING_SPECIALIST_PROMPT = tenant === "future-energy" ? PRICING_FE : PRICING_COMPASS
    const language = `${outputLanguageInstruction(locale)}\n\n`

    const response = await callWithFallback({
      model: MODELS.openai,
      temperature: 0.2,
      messages: [
        { role: "system", content: PRICING_SPECIALIST_PROMPT },
        {
          role: "user",
          content: `${language}Analyze the following pricing and quote data and return your structured analysis.\n\nNavigation: ${JSON.stringify(drillState)}\n\nData:\n${JSON.stringify(context, null, 1)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: SPECIALIST_SCHEMA,
      },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from model"))

    const parsed = sanitizeSpecialistOutput(extractJson(content) as Record<string, unknown>)
    parsed.specialistId = "pricing"

    return Response.json({ fallback: false, data: parsed })
  } catch (err) {
    return errorResponse(err)
  }
}
