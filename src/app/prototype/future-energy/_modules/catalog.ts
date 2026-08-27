export interface SelectorDescriptor {
  selector: string
  kind: "kpi" | "series" | "table"
  describe: string
  fields?: string[]
}

export const INTERNAL_SELECTORS: SelectorDescriptor[] = [
  { selector: "tenderPipeline", kind: "table", describe: "Meridian OWF tender packages", fields: ["id", "packageRef", "title", "stage", "budget", "targetSavings"] },
]

export interface ExternalSourceDescriptor {
  id: string
  label: string
  provider: string
  summary: string
  wired: boolean
}

export const EXTERNAL_SOURCES: ExternalSourceDescriptor[] = [
  { id: "controlled-docs", label: "Controlled document register", provider: "Meridian OWF", summary: "Engineering specifications, QA manual, procurement terms and charter particulars used to draft ITTs.", wired: true },
]

export function buildCatalogPromptContext(): string {
  const internal = INTERNAL_SELECTORS
    .map(s => `  - ${s.selector} (${s.kind}): ${s.describe}${s.fields ? ` [fields: ${s.fields.join(", ")}]` : ""}`)
    .join("\n")
  const external = EXTERNAL_SOURCES
    .map(s => `  - ${s.id} — ${s.label} (${s.provider}): ${s.summary}`)
    .join("\n")
  return [
    "INTERNAL DATA (hard bindings):",
    internal,
    "",
    "EXTERNAL SOURCES:",
    external,
  ].join("\n")
}
