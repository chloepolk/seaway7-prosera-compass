import { hasAnyProvider, callWithFallback, extractJson, MODELS, fallbackResponse, errorResponse } from "@/lib/compass/engine"
import { VERIFIER_SCHEMA } from "@/app/prototype/prosera-compass/agents/_types"
import { VERIFIER_PROMPT } from "@/app/prototype/prosera-compass/agents/_prompts"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  if (!hasAnyProvider()) return fallbackResponse()

  try {
    const { orchestratorOutput, sourceData, drillState, verifiableBenchmarks } = await req.json()

    if (!orchestratorOutput?.findings?.length) {
      return Response.json({
        fallback: false,
        data: {
          verified: true,
          corrections: [],
          suppressions: [],
          annotations: [],
          overallAssessment: "No findings to verify.",
        },
      })
    }

    const response = await callWithFallback({
      model: MODELS.openai,
      temperature: 0.1,
      messages: [
        { role: "system", content: VERIFIER_PROMPT },
        {
          role: "user",
          content: `Verify the following orchestrator output against the source data.

Navigation Context: ${JSON.stringify(drillState)}

ORCHESTRATOR OUTPUT (claims to verify):
${JSON.stringify(orchestratorOutput, null, 1)}

SOURCE DATA (ground truth):
${JSON.stringify(sourceData, null, 1)}
${verifiableBenchmarks ? `\nVERIFIABLE INDUSTRY BENCHMARKS:\n${JSON.stringify(verifiableBenchmarks, null, 1)}` : ""}

Verify every numerical claim and benchmark citation, check logical consistency, assess severity calibration, and detect omissions. Return your structured verification.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: VERIFIER_SCHEMA,
      },
    })

    const content = response.choices[0]?.message?.content
    if (!content) return errorResponse(new Error("Empty response from verifier"))

    const parsed = extractJson(content)
    return Response.json({ fallback: false, data: parsed })
  } catch (err) {
    return errorResponse(err)
  }
}
