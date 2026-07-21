import { getClient, getGeminiClient, callWithRetry, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { APP_COMPOSER_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"
import { buildCatalogPromptContext } from "@/app/prototype/prosera-compass/_modules/catalog"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const gemini = getGeminiClient()
  const openai = getClient()
  const client = gemini || openai
  if (!client) return fallbackResponse()

  const model = gemini ? MODELS.gemini : MODELS.openai

  try {
    const { idea, features } = await req.json()
    if (!idea) return errorResponse(new Error("No idea provided to composer"))

    const userContent = [
      `Chosen idea:\n${JSON.stringify(idea, null, 1)}`,
      `\nEnabled features: ${JSON.stringify(features ?? {})}`,
      `\n${buildCatalogPromptContext()}`,
      `\nCompose the AppSpec JSON now. Output ONLY the JSON object.`,
    ].join("\n")

    const response = await callWithRetry(
      client,
      {
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: APP_COMPOSER_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      },
      gemini ? openai : null,
      MODELS.openai,
    )

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from composer"))

    const parsed = extractJson(content)
    return Response.json({ fallback: false, data: parsed })
  } catch (err) {
    return errorResponse(err)
  }
}
