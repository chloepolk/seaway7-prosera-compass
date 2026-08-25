import { createChatStream, errorResponse } from "@/lib/compass/engine"
import { CHAT_SYSTEM_PROMPT as CHAT_COMPASS } from "@/app/prototype/prosera-compass/agents/_prompts"
import { CHAT_SYSTEM_PROMPT as CHAT_FE } from "@/app/prototype/future-energy/agents/_prompts"
import { outputLanguageInstruction } from "@/lib/compass/data-grounded-language"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages, dataContext, chatBriefing, locale, tenant } = await req.json()
    const CHAT_SYSTEM_PROMPT = tenant === "future-energy" ? CHAT_FE : CHAT_COMPASS

    const briefingBlock = chatBriefing ? `${chatBriefing}\n` : ""
    const languageInstruction = outputLanguageInstruction(locale, { chatNextLine: true })
    const contextMessage = `${languageInstruction}\n\n${briefingBlock}Current cockpit context:\n${JSON.stringify(dataContext, null, 1)}`

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
