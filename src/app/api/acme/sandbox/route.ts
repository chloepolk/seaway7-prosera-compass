import { createChatStream, errorResponse } from "@/lib/compass/engine"
import { SANDBOX_SYSTEM_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"
import { outputLanguageInstruction } from "@/lib/compass/data-grounded-language"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { scenarioPrompt, locale } = await req.json()
    const language = outputLanguageInstruction(locale)

    const stream = await createChatStream(
      SANDBOX_SYSTEM_PROMPT,
      language,
      [{ role: "user", content: scenarioPrompt }],
      0.3,
    )

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
