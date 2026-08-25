import { hasAnyProvider, callWithFallback, extractJson, MODELS, errorResponse } from "@/lib/compass/engine"
import { outputLanguageInstruction } from "@/lib/compass/data-grounded-language"
import {
  computeAwardNoteImpact,
  mergeNoteImpactFromAgent,
  type AwardNoteImpact,
} from "@/lib/compass/award-notes"
import { type DisplayLocale, usdToEur } from "@/lib/compass/locale-display"

export const runtime = "nodejs"
export const maxDuration = 30

type SnapshotIn = {
  proposedAwardUsd: number
  budgetUsd: number
  varianceUsd: number
  recommendedSupplier?: string
}

const IMPACT_SCHEMA = {
  name: "award_note_impact",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      discountPct: { type: ["number", "null"] as const },
      deltaUsd: { type: ["number", "null"] as const },
      revisedAwardUsd: { type: ["number", "null"] as const },
      summary: { type: "string" as const },
    },
    required: ["discountPct", "deltaUsd", "revisedAwardUsd", "summary"],
    additionalProperties: false,
  },
}

function asLocale(value: unknown): DisplayLocale {
  return value === "fr" ? "fr" : "en"
}

export async function POST(req: Request) {
  let snapshot: SnapshotIn | undefined
  let notes: string | string[] = ""
  let locale: DisplayLocale = "en"
  try {
    const body = await req.json()
    locale = asLocale(body.locale)
    snapshot = body.snapshot as SnapshotIn | undefined
    notes = Array.isArray(body.notes) ? body.notes.map(String) : String(body.notes ?? "")

    if (!snapshot || typeof snapshot.proposedAwardUsd !== "number") {
      return Response.json({ fallback: true, data: null, error: "snapshot.proposedAwardUsd is required" }, { status: 400 })
    }

    const deterministic = computeAwardNoteImpact(snapshot, notes, locale)

    if (!hasAnyProvider()) {
      return Response.json({ fallback: true, data: deterministic })
    }

    const language = outputLanguageInstruction(locale)
    const originalEur = usdToEur(snapshot.proposedAwardUsd)

    const response = await callWithFallback({
      model: MODELS.openai,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You extract numeric award-proposal changes from team notes. Return JSON only.
Seed amounts are USD. Display currency is EUR at USD 1 = EUR 0.92.
If notes say a 5% discount, revisedAwardUsd = originalAwardUsd * 0.95 and discountPct = 5 and deltaUsd is negative.
If no numeric change is stated, set discountPct, deltaUsd, and revisedAwardUsd to null and say that no numeric change was found.
Do not invent a change. Put the metric, direction, and number in the same sentence.`,
        },
        {
          role: "user",
          content: `${language}

Original proposed award USD: ${snapshot.proposedAwardUsd}
Original proposed award EUR: ${originalEur}
Budget USD: ${snapshot.budgetUsd}
Variance USD: ${snapshot.varianceUsd}
Recommended supplier: ${snapshot.recommendedSupplier ?? ""}

Team notes:
${Array.isArray(notes) ? notes.join("\n") : notes}

Deterministic parse (use if the notes match):
${JSON.stringify(deterministic)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: IMPACT_SCHEMA,
      },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return Response.json({ fallback: true, data: deterministic })

    const parsed = extractJson(content) as {
      discountPct?: number | null
      deltaUsd?: number | null
      revisedAwardUsd?: number | null
      summary?: string | null
    }
    const merged: AwardNoteImpact = mergeNoteImpactFromAgent(deterministic, parsed, locale)
    return Response.json({ fallback: false, data: merged })
  } catch (err) {
    if (snapshot && typeof snapshot.proposedAwardUsd === "number") {
      return Response.json({ fallback: true, data: computeAwardNoteImpact(snapshot, notes, locale) })
    }
    return errorResponse(err)
  }
}
