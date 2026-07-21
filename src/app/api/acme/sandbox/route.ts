import { createChatStream, errorResponse } from "@/lib/compass/engine"
import { SANDBOX_SYSTEM_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { scenarioPrompt } = await req.json()

    const stream = await createChatStream(
      SANDBOX_SYSTEM_PROMPT,
      "",
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
