import { createChatStream, errorResponse } from "@/lib/compass/engine"
import { CHAT_SYSTEM_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { messages, dataContext, chatBriefing, locale } = await req.json()

    const briefingBlock = chatBriefing ? `${chatBriefing}\n` : ""
    const languageInstruction = locale === "fr"
      ? "Répondez exclusivement en français. Conservez inchangés les noms propres, marques, normes, identifiants et références documentaires. Utilisez « Suite : » pour la ligne d’action finale."
      : "Respond exclusively in English."
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
