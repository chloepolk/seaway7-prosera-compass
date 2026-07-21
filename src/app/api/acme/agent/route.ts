import { createChatStream, errorResponse } from "@/lib/compass/engine"
import { AGENT_SYSTEM_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { agent, mission, task, dataContext } = await req.json()

    const brief = [
      `AGENT IDENTITY: ${agent?.name ?? "Execution Agent"} — ${agent?.capability ?? "general execution"}`,
      "",
      `MISSION: ${mission?.name ?? "(unnamed)"}`,
      `MISSION OBJECTIVE: ${mission?.objective ?? ""}`,
      "",
      `ASSIGNED GATE: ${task?.stage ?? ""}`,
      `ASSIGNED TASK: ${task?.label ?? ""}`,
      `TASK OBJECTIVE: ${task?.agentObjective ?? task?.label ?? ""}`,
      "",
      dataContext ? `RELEVANT PORTFOLIO CONTEXT:\n${JSON.stringify(dataContext, null, 1)}` : "",
      "",
      "Execute your assigned task now and emit your working log.",
    ].join("\n")

    const stream = await createChatStream(AGENT_SYSTEM_PROMPT, brief, [
      { role: "user", content: "Spawn and execute the assigned task." },
    ])

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
