import { hasAnyProvider, callWithFallback, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { SPECIALIST_SCHEMA } from "@/app/prototype/prosera-compass/agents/_types"
import { MARKET_SPECIALIST_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"
import { outputLanguageInstruction } from "@/lib/compass/data-grounded-language"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  if (!hasAnyProvider()) return fallbackResponse()

  try {
    const { context, drillState, locale } = await req.json()
    const language = `${outputLanguageInstruction(locale)}\n\n`

    const response = await callWithFallback({
      model: MODELS.openai,
      temperature: 0.2,
      messages: [
        { role: "system", content: MARKET_SPECIALIST_PROMPT },
        {
          role: "user",
          content: `${language}Analyze the following market and fuel data and return your structured analysis.\n\nNavigation: ${JSON.stringify(drillState)}\n\nData:\n${JSON.stringify(context, null, 1)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: SPECIALIST_SCHEMA,
      },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from model"))

    const parsed = extractJson(content) as Record<string, unknown>
    parsed.specialistId = "market"

    return Response.json({ fallback: false, data: parsed })
  } catch (err) {
    return errorResponse(err)
  }
}
