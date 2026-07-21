/* ------------------------------------------------------------------ */
/*  Compass LLM Engine — domain-agnostic provider plumbing            */
/*                                                                     */
/*  Lifted verbatim from the per-prototype `_openai.ts`. Nothing here  */
/*  references a domain: clients, retry/fallback ladders, streaming,   */
/*  JSON extraction, and error envelopes. Every Compass project's API  */
/*  routes import these instead of carrying their own copy.            */
/* ------------------------------------------------------------------ */

import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"

/* ------------------------------------------------------------------ */
/*  Model registry — single source of truth for provider model names  */
/* ------------------------------------------------------------------ */

export const MODELS = {
  gemini: "gemini-2.5-pro",
  /** Low-latency model for structured extraction/synthesis on interactive paths. */
  geminiFlash: "gemini-2.5-flash",
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
} as const

/* ------------------------------------------------------------------ */
/*  Defensive JSON extraction — tolerates fenced / prose-wrapped JSON  */
/* ------------------------------------------------------------------ */

export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model response")
  }
  return JSON.parse(cleaned.slice(start, end + 1))
}

let _client: OpenAI | null = null
let _geminiClient: OpenAI | null = null
let _anthropicClient: Anthropic | null = null

export function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25_000 })
  }
  return _client
}

export function getGeminiClient(): OpenAI | null {
  if (!process.env.GEMINI_API_KEY) return null
  if (!_geminiClient) {
    _geminiClient = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      timeout: 60_000,
    })
  }
  return _geminiClient
}

export function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000 })
  }
  return _anthropicClient
}

export function hasAnyProvider(): boolean {
  return !!(getGeminiClient() || getClient() || getAnthropicClient())
}

const RETRIABLE = new Set([429, 500, 502, 503])
const RETRY_DELAYS = [2000, 5000]

/* ------------------------------------------------------------------ */
/*  Orchestrator: Gemini → OpenAI → Anthropic                         */
/* ------------------------------------------------------------------ */

export async function callWithRetry(
  client: OpenAI,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  fallbackClient?: OpenAI | null,
  fallbackModel?: string,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await client.chat.completions.create(params)
    } catch (err) {
      lastError = err
      const status = (err as { status?: number })?.status
      if (RETRIABLE.has(status!) && attempt < RETRY_DELAYS.length) {
        console.warn(`[BluePilot] ${status} from primary, retrying in ${RETRY_DELAYS[attempt]}ms (attempt ${attempt + 1})`)
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
        continue
      }
      console.warn(`[BluePilot] Primary failed (${status ?? "unknown"}) after ${attempt + 1} attempt(s)`)
      break
    }
  }

  if (fallbackClient && fallbackModel) {
    try {
      console.warn("[BluePilot] Falling back to OpenAI")
      return await fallbackClient.chat.completions.create({ ...params, model: fallbackModel })
    } catch (err) {
      lastError = err
      console.warn(`[BluePilot] OpenAI fallback failed (${(err as { status?: number })?.status ?? "unknown"})`)
    }
  }

  const anthropic = getAnthropicClient()
  if (anthropic) {
    try {
      console.warn("[BluePilot] Falling back to Anthropic Claude")
      return await callAnthropic(anthropic, params)
    } catch (err) {
      lastError = err
      console.warn(`[BluePilot] Anthropic fallback failed: ${err instanceof Error ? err.message : "unknown"}`)
    }
  }

  throw lastError
}

/* ------------------------------------------------------------------ */
/*  Specialists / Verifier: OpenAI → Anthropic                        */
/* ------------------------------------------------------------------ */

export async function callWithFallback(
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const gemini = getGeminiClient()
  if (gemini) {
    try {
      // Flash, not Pro: these are small structured-JSON calls on the blocking
      // path of the landing-page briefing, where Pro's thinking latency dominates.
      return await gemini.chat.completions.create({ ...params, model: MODELS.geminiFlash })
    } catch (err) {
      console.warn(`[BluePilot] Gemini failed (${(err as { status?: number })?.status ?? "unknown"}), trying OpenAI`)
    }
  }

  const openai = getClient()
  if (openai) {
    try {
      return await openai.chat.completions.create({ ...params, model: MODELS.openai })
    } catch (err) {
      console.warn(`[BluePilot] OpenAI failed (${(err as { status?: number })?.status ?? "unknown"}), trying Anthropic`)
    }
  }

  const anthropic = getAnthropicClient()
  if (anthropic) {
    return await callAnthropic(anthropic, params)
  }

  throw new Error("No LLM provider available")
}

/* ------------------------------------------------------------------ */
/*  Chat streaming: Gemini → OpenAI → Anthropic                       */
/* ------------------------------------------------------------------ */

export async function createChatStream(
  systemPrompt: string,
  contextMessage: string,
  messages: Array<{ role: string; content: string }>,
  temperature = 0.3,
): Promise<ReadableStream<Uint8Array>> {
  const gemini = getGeminiClient()
  const openai = getClient()
  const anthropic = getAnthropicClient()
  const encoder = new TextEncoder()

  // Single system message: some OpenAI-compatible providers (Gemini) only
  // honour one system message and silently drop the rest.
  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: `${systemPrompt}\n\n${contextMessage}` },
    ...messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ]

  if (gemini) {
    try {
      const response = await gemini.chat.completions.create({
        model: MODELS.gemini, temperature, stream: true, messages: openaiMessages,
      })
      return openAIStreamToReadable(response, encoder)
    } catch (err) {
      console.warn(`[BluePilot Chat] Gemini stream failed (${(err as { status?: number })?.status ?? "unknown"})`)
    }
  }

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: MODELS.openai, temperature, stream: true, messages: openaiMessages,
      })
      return openAIStreamToReadable(response, encoder)
    } catch (err) {
      console.warn(`[BluePilot Chat] OpenAI stream failed (${(err as { status?: number })?.status ?? "unknown"})`)
    }
  }

  if (anthropic) {
    console.warn("[BluePilot Chat] Falling back to Anthropic stream")
    const userMessages = messages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
    if (userMessages.length === 0 || userMessages[0].role !== "user") {
      userMessages.unshift({ role: "user", content: "Proceed." })
    }

    const stream = anthropic.messages.stream({
      model: MODELS.anthropic,
      max_tokens: 4096,
      temperature,
      system: `${systemPrompt}\n\n${contextMessage}`,
      messages: userMessages,
    })

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) { controller.error(err) }
      },
    })
  }

  throw new Error("No LLM provider available for chat")
}

/* ------------------------------------------------------------------ */
/*  Anthropic adapter                                                  */
/* ------------------------------------------------------------------ */

async function callAnthropic(
  client: Anthropic,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const systemParts: string[] = []
  const messages: Array<{ role: "user" | "assistant"; content: string }> = []

  for (const m of params.messages) {
    if (m.role === "system") {
      systemParts.push(typeof m.content === "string" ? m.content : JSON.stringify(m.content))
    } else {
      messages.push({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })
    }
  }

  let system = systemParts.join("\n\n")
  if (params.response_format?.type === "json_schema") {
    const schema = (params.response_format as unknown as Record<string, unknown>).json_schema
    system += `\n\nYou MUST respond with valid JSON matching this schema. Output ONLY the JSON object — no markdown fences, no explanation outside the JSON.\n${JSON.stringify((schema as Record<string, unknown>)?.schema ?? schema, null, 1)}`
  }

  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: "Proceed with the analysis." })
  }

  const response = await client.messages.create({
    model: MODELS.anthropic,
    max_tokens: 8192,
    temperature: params.temperature ?? 0.2,
    system,
    messages,
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("")

  return {
    id: response.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [{
      index: 0,
      message: { role: "assistant" as const, content: text, refusal: null },
      finish_reason: "stop" as const,
      logprobs: null,
    }],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  } as unknown as OpenAI.Chat.Completions.ChatCompletion
}

function openAIStreamToReadable(
  response: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  encoder: TextEncoder,
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content
          if (text) controller.enqueue(encoder.encode(text))
        }
        controller.close()
      } catch (err) { controller.error(err) }
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Error responses                                                    */
/* ------------------------------------------------------------------ */

export function fallbackResponse() {
  return Response.json({ fallback: true, data: null, error: "API key not configured" })
}

export function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error"
  console.error("[BluePilot Agent Error]", message)
  return Response.json({ fallback: true, data: null, error: message })
}
