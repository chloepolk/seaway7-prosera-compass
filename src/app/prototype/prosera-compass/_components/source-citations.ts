import type { Page } from "../_store"
import type { DiamondMission } from "../_diamond/types"

export interface ReasoningCitation {
  /** Stable dedupe key */
  key: string
  /** Display number in works cited (1-based) */
  id?: number
  label: string
  href?: string
  /** In-app intelligence view */
  page?: Page
  provenance: "internal" | "external" | "benchmark"
}

const EXTERNAL: Record<string, string> = {
  bls: "https://www.bls.gov/oes/2023/may/oes499021.htm",
  census: "https://www.census.gov/construction/bps/msamonthly.html",
  eia: "https://www.eia.gov/petroleum/gasdiesel/",
  noaa: "https://www.climate.gov/",
  profitability: "https://www.profitabilitypartners.com/resources",
}

const FILE_PAGE: Record<string, Page> = {
  "_tenders.ts": "tender-studio",
  "_documents.ts": "tender-studio",
  "_bids.ts": "bid-evaluation",
  "_bid-scoring.ts": "bid-evaluation",
}

function fileFromLabel(label: string): string | undefined {
  const m = label.match(/\(([^)]+\.ts)\)/)
  return m?.[1]
}

function detectExternalHref(label: string): string | undefined {
  const lower = label.toLowerCase()
  if (lower.includes("bls")) return EXTERNAL.bls
  if (lower.includes("census")) return EXTERNAL.census
  if (lower.includes("eia")) return EXTERNAL.eia
  if (lower.includes("noaa")) return EXTERNAL.noaa
  if (lower.includes("profitability partners")) return EXTERNAL.profitability
  return undefined
}

function detectPage(label: string, fallback?: Page): Page | undefined {
  const file = fileFromLabel(label)
  if (file && FILE_PAGE[file]) return FILE_PAGE[file]

  const lower = label.toLowerCase()
  if (lower.includes("action centre") || lower.includes("operating loop")) {
    return "operating-loop"
  }
  if (lower.includes("tender") || lower.includes("itt") || lower.includes("controlled document")) {
    return "tender-studio"
  }
  if (lower.includes("bid") || lower.includes("award") || lower.includes("evaluation")) {
    return "bid-evaluation"
  }
  return fallback
}

function provenanceFor(label: string, href?: string): ReasoningCitation["provenance"] {
  if (href) return "external"
  if (label.toLowerCase().includes("profitability")) return "benchmark"
  return "internal"
}

/** Turn a legacy source string into a traceable citation with optional link. */
export function citationFromLabel(label: string, fallbackPage?: Page): ReasoningCitation {
  const href = detectExternalHref(label)
  const page = href ? undefined : detectPage(label, fallbackPage)
  return {
    key: `${href ?? ""}|${page ?? ""}|${label}`,
    label,
    href,
    page,
    provenance: provenanceFor(label, href),
  }
}

function dedupeCitations(items: ReasoningCitation[]): ReasoningCitation[] {
  const seen = new Set<string>()
  const out: ReasoningCitation[] = []
  for (const item of items) {
    if (seen.has(item.key)) continue
    seen.add(item.key)
    out.push(item)
  }
  return out.map((c, i) => ({ ...c, id: i + 1 }))
}

export function mergeCitations(...groups: ReasoningCitation[][]): ReasoningCitation[] {
  return dedupeCitations(groups.flat())
}

/** Collect works-cited entries from Action Centre missions and their BluePilot reasoning meta. */
export function aggregateCitationsFromMissions(missions: DiamondMission[]): ReasoningCitation[] {
  const raw: ReasoningCitation[] = []

  for (const m of missions) {
    raw.push(
      citationFromLabel(`${m.source.label} — ${m.name}`, m.source.page),
    )
    if (m.reasoningMeta?.sources) {
      for (const s of m.reasoningMeta.sources) {
        raw.push(citationFromLabel(s, m.source.page))
      }
    }
  }

  return dedupeCitations(raw)
}
