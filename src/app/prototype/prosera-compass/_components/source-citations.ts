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
  "_raw.ts": "customer-intel",
  "_costs.ts": "customer-intel",
  "_rootcause.ts": "customer-intel",
  "_transform.ts": "customer-intel",
  "_scorecard.ts": "customer-intel",
  "_benchmarks.ts": "pricing-intel",
  "_raw_quotes.ts": "pricing-intel",
  "_dispatch.ts": "pricing-intel",
  "_fuel.ts": "pricing-intel",
  "_atob.ts": "pricing-intel",
  "_eia.ts": "pricing-intel",
  "_weather_demand.ts": "pricing-intel",
  "_labor.ts": "market-position",
  "_construction.ts": "market-position",
  "_expansion.ts": "market-position",
  "_weather.ts": "market-position",
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
  if (lower.includes("customer intel") || lower.includes("margin remediation") || lower.includes("root cause")) {
    return "customer-intel"
  }
  if (lower.includes("pricing") || lower.includes("quote") || lower.includes("nte") || lower.includes("fuel")) {
    return "pricing-intel"
  }
  if (lower.includes("market position") || lower.includes("expansion") || lower.includes("regional")) {
    return "market-position"
  }
  if (lower.includes("invoice") || lower.includes("process velocity") || lower.includes("ci-05")) {
    return "process-velocity"
  }
  if (lower.includes("commercial center") || lower.includes("portfolio hub")) {
    return "commercial-center"
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

/** Collect works-cited entries from Action Board missions and their BluePilot reasoning meta. */
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
