import { createChatStream, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { CHAT_SYSTEM_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages, dataContext, chatBriefing } = await req.json()

    const briefingBlock = chatBriefing ? `${chatBriefing}\n` : ""
    const contextMessage = `${briefingBlock}Current cockpit context:\n${JSON.stringify(dataContext, null, 1)}`

    const stream = await createChatStream(CHAT_SYSTEM_PROMPT, contextMessage, messages)

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
