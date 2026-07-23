/* ------------------------------------------------------------------ */
/*  AppSpec — the declarative contract an agent emits to create an app */
/*                                                                     */
/*  A user states intent; the architect agent discovers data + sources */
/*  and proposes ideas; the composer agent emits an AppSpec (pure JSON).*/
/*  The SpecRenderer turns that JSON into a real IntelModule Detail —   */
/*  no per-app code. Mirrors how saved sandbox scenarios already become */
/*  modules at runtime.                                                 */
/* ------------------------------------------------------------------ */

import type { WidgetSize } from "./module-contract"

export type Provenance = "live" | "benchmark" | "modeled"
export type Confidence = "high" | "moderate" | "indicative"
export type Fmt = "usd" | "pct" | "num" | "text"
export type Tone = "good" | "bad" | "neutral"

/** Bucket-2 seam: where a created app lives in the library. */
export type WidgetScope = "user" | "org" | "builtin"

/** A data source the architect surfaced. `live`/`benchmark` resolve from
 *  real data; `modeled` carries agent-synthesised series (clearly badged). */
export interface SourceRef {
  id: string
  label: string
  external: boolean
  provenance: Provenance
  confidence?: Confidence
  /** One-line method note, shown only when provenance === "modeled". */
  method?: string
}

export interface Figure {
  label: string
  /** Dot-path into ComputedData (e.g. "salesPerformance.overallWinRate"). */
  selector?: string
  /** Pre-baked literal value (used by modeled blocks). */
  value?: string
  fmt?: Fmt
  tone?: Tone
}

export interface TableColumn {
  label: string
  field: string
  fmt?: Fmt
}

export interface MarketIntelligenceAction { label: string; detail: string }

/** A single STRIPA stage's authored content (Surface / TRend / Infer). */
export interface StripaStage {
  narrative: string
  /** Optional evidence/KPIs for the stage (selector- or value-bound). */
  figures?: Figure[]
}

/** The Predict stage may carry a forward table in addition to narrative. */
export interface StripaPredict {
  narrative: string
  figures?: Figure[]
  source?: string
  rows?: Record<string, unknown>[]
  columns?: TableColumn[]
  max?: number
}

export interface StripaStages {
  surface: StripaStage
  trend: StripaStage
  infer: StripaStage
  predict: StripaPredict
  act: { actions: MarketIntelligenceAction[] }
}

export type AppBlock =
  | { type: "kpiRow"; figures: Figure[] }
  | {
      type: "chart"
      chart: "area" | "bar" | "line"
      title?: string
      /** Internal array selector OR inline `points` for modeled data. */
      source?: string
      points?: Record<string, number | string>[]
      x: string
      y: string[]
      sourceRef?: string
    }
  | {
      type: "table"
      title?: string
      source?: string
      rows?: Record<string, unknown>[]
      columns: TableColumn[]
      sourceRef?: string
      max?: number
    }
  | {
      /** STRIPA (Surface→TRend→Infer→Predict→Act) — universal analytical IP.
       *  engine "weather" renders the live weather→demand engine (weather apps
       *  only); "declarative" renders the agent-authored stages for ANY app. */
      type: "stripa"
      engine?: "weather" | "declarative"
      title?: string
      confidence?: Confidence
      stages?: StripaStages
      sourceRef?: string
    }
  | { type: "explainability"; narrative: string; drivers?: string[] }
  | { type: "marketIntelligence"; actions: MarketIntelligenceAction[] }
  | { type: "playbook"; actions: MarketIntelligenceAction[] } // legacy alias

export type BlockType = AppBlock["type"]

export interface AppSpec {
  id: string
  title: string
  /** lucide icon name (PascalCase). */
  icon: string
  rationale: string
  sources: SourceRef[]
  summary: { headline: string; figures: Figure[] }
  blocks: AppBlock[]
  sendToLoop?: { label: string; missionId?: string }
  createdAt: number
  /** Bucket-2 seam: preferred footprint for the layout manager. */
  size?: WidgetSize
  /** Bucket-2 seam: library scope (defaults to "user"). */
  scope?: WidgetScope
}

/* ------------------------------------------------------------------ */
/*  Ideation — what the architect agent streams (NDJSON)               */
/* ------------------------------------------------------------------ */

export interface AppIdeaFeatures {
  visuals: boolean
  stripa: boolean
  explainability: boolean
  marketIntelligence: boolean
}

export interface AppIdea {
  id: string
  title: string
  icon: string
  rationale: string
  /** Internal catalog selector ids the idea would bind to. */
  internalBindings: string[]
  /** Sources the agent discovered (internal + external, provenance-tagged). */
  sources: SourceRef[]
  features: AppIdeaFeatures
}

/** One line of the architect's NDJSON stream. */
export type ArchitectEvent =
  | { kind: "log"; text: string }
  | { kind: "idea"; idea: AppIdea }
  | { kind: "done" }

/* ------------------------------------------------------------------ */
/*  Relevance guards                                                    */
/* ------------------------------------------------------------------ */

/** STRIPA renders the weather→demand engine, so it only belongs in apps
 *  that are genuinely weather/seasonality-driven. Used to keep the panel
 *  out of regulatory/cost/pricing apps even if the model proposes it. */
const WEATHER_RE = /weather|seasonal|seasonality|degree[\s-]?day|\bhdd\b|\bcdd\b|noaa|cold\s?snap|heat\s?wave|storm|temperature swing|climate/i

export function isWeatherRelevant(input: {
  title?: string
  rationale?: string
  sources?: { id?: string; label?: string }[]
}): boolean {
  const parts = [input.title, input.rationale]
  for (const s of input.sources ?? []) { parts.push(s.id, s.label) }
  return WEATHER_RE.test(parts.filter(Boolean).join(" "))
}

/* ------------------------------------------------------------------ */
/*  Tolerant normalisation — never trust raw LLM JSON blindly           */
/* ------------------------------------------------------------------ */

const ICON_ALLOW = new Set([
  "Activity", "AlertTriangle", "BarChart3", "CloudLightning", "Coins", "Compass",
  "DollarSign", "Factory", "Flame", "Fuel", "Gauge", "LineChart", "Package",
  "Snowflake", "Sparkles", "TrendingUp", "TrendingDown", "Thermometer", "Users",
  "Wrench", "Zap",
])

const PROVENANCE = new Set<Provenance>(["live", "benchmark", "modeled"])
const TONES = new Set<Tone>(["good", "bad", "neutral"])
const FMTS = new Set<Fmt>(["usd", "pct", "num", "text"])
const SIZES = new Set<WidgetSize>(["1x1", "1x2", "2x1", "2x2", "hero"])

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback
}
function arr<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}
function pickIcon(v: unknown): string {
  const s = str(v)
  return ICON_ALLOW.has(s) ? s : "Sparkles"
}

function normFigure(raw: unknown): Figure | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const label = str(r.label)
  if (!label) return null
  const fmt = FMTS.has(r.fmt as Fmt) ? (r.fmt as Fmt) : "num"
  const tone = TONES.has(r.tone as Tone) ? (r.tone as Tone) : "neutral"
  const f: Figure = { label, fmt, tone }
  if (typeof r.selector === "string") f.selector = r.selector
  if (typeof r.value === "string") f.value = r.value
  return f.selector || f.value ? f : null
}

function normSource(raw: unknown): SourceRef | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const label = str(r.label)
  if (!label) return null
  const provenance = PROVENANCE.has(r.provenance as Provenance) ? (r.provenance as Provenance) : "modeled"
  const s: SourceRef = {
    id: str(r.id) || label.toLowerCase().replace(/\s+/g, "-"),
    label,
    external: Boolean(r.external),
    provenance,
  }
  if (r.confidence === "high" || r.confidence === "moderate" || r.confidence === "indicative") s.confidence = r.confidence
  if (typeof r.method === "string") s.method = r.method
  return s
}

function normFigures(raw: unknown): Figure[] {
  return arr(raw).map(normFigure).filter((f): f is Figure => !!f)
}

function normActions(raw: unknown): MarketIntelligenceAction[] {
  return arr(raw)
    .map(a => {
      if (!a || typeof a !== "object") return null
      const aa = a as Record<string, unknown>
      const label = str(aa.label)
      if (!label) return null
      return { label, detail: str(aa.detail) }
    })
    .filter((a): a is MarketIntelligenceAction => !!a)
}

function normStage(raw: unknown): StripaStage {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  return { narrative: str(r.narrative), figures: normFigures(r.figures) }
}

function normStripaStages(raw: unknown): StripaStages | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const predictRaw = (r.predict && typeof r.predict === "object" ? r.predict : {}) as Record<string, unknown>
  const predict: StripaPredict = { narrative: str(predictRaw.narrative), figures: normFigures(predictRaw.figures) }
  if (typeof predictRaw.source === "string") predict.source = predictRaw.source
  if (Array.isArray(predictRaw.rows)) predict.rows = predictRaw.rows as Record<string, unknown>[]
  const cols = arr(predictRaw.columns)
    .map(c => {
      if (!c || typeof c !== "object") return null
      const cc = c as Record<string, unknown>
      const label = str(cc.label); const field = str(cc.field)
      if (!label || !field) return null
      const col: TableColumn = { label, field }
      if (FMTS.has(cc.fmt as Fmt)) col.fmt = cc.fmt as Fmt
      return col
    })
    .filter((c): c is TableColumn => !!c)
  if (cols.length) predict.columns = cols
  if (typeof predictRaw.max === "number") predict.max = predictRaw.max

  const stages: StripaStages = {
    surface: normStage(r.surface),
    trend: normStage(r.trend),
    infer: normStage(r.infer),
    predict,
    act: { actions: normActions((r.act as Record<string, unknown> | undefined)?.actions) },
  }
  // Require at least some authored substance to be worth rendering.
  const hasContent = [stages.surface, stages.trend, stages.infer].some(s => s.narrative || (s.figures && s.figures.length))
    || stages.predict.narrative || stages.act.actions.length
  return hasContent ? stages : null
}

function normBlock(raw: unknown): AppBlock | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  switch (r.type) {
    case "kpiRow": {
      const figures = arr(r.figures).map(normFigure).filter((f): f is Figure => !!f)
      return figures.length ? { type: "kpiRow", figures } : null
    }
    case "chart": {
      const x = str(r.x)
      const y = arr<string>(r.y).filter(s => typeof s === "string")
      const chart = r.chart === "bar" || r.chart === "line" ? r.chart : "area"
      if (!x || y.length === 0) return null
      const block: Extract<AppBlock, { type: "chart" }> = { type: "chart", chart, x, y }
      if (typeof r.title === "string") block.title = r.title
      if (typeof r.source === "string") block.source = r.source
      if (Array.isArray(r.points)) block.points = r.points as Record<string, number | string>[]
      if (typeof r.sourceRef === "string") block.sourceRef = r.sourceRef
      return block.source || block.points ? block : null
    }
    case "table": {
      const columns = arr(r.columns)
        .map(c => {
          if (!c || typeof c !== "object") return null
          const cc = c as Record<string, unknown>
          const label = str(cc.label)
          const field = str(cc.field)
          if (!label || !field) return null
          const col: TableColumn = { label, field }
          if (FMTS.has(cc.fmt as Fmt)) col.fmt = cc.fmt as Fmt
          return col
        })
        .filter((c): c is TableColumn => !!c)
      if (columns.length === 0) return null
      const block: Extract<AppBlock, { type: "table" }> = { type: "table", columns }
      if (typeof r.title === "string") block.title = r.title
      if (typeof r.source === "string") block.source = r.source
      if (Array.isArray(r.rows)) block.rows = r.rows as Record<string, unknown>[]
      if (typeof r.sourceRef === "string") block.sourceRef = r.sourceRef
      if (typeof r.max === "number") block.max = r.max
      return block.source || block.rows ? block : null
    }
    case "stripa": {
      const block: Extract<AppBlock, { type: "stripa" }> = { type: "stripa" }
      const stages = normStripaStages(r.stages)
      // engine defaults to "weather" only for legacy bare blocks (no stages).
      const engine = r.engine === "weather" || r.engine === "declarative"
        ? r.engine
        : (stages ? "declarative" : "weather")
      block.engine = engine
      if (stages) block.stages = stages
      if (typeof r.title === "string") block.title = r.title
      if (r.confidence === "high" || r.confidence === "moderate" || r.confidence === "indicative") block.confidence = r.confidence
      if (typeof r.sourceRef === "string") block.sourceRef = r.sourceRef
      // A declarative STRIPA with no authored stages is empty — drop it.
      if (engine === "declarative" && !stages) return null
      return block
    }
    case "explainability": {
      const narrative = str(r.narrative)
      if (!narrative) return null
      const drivers = arr<string>(r.drivers).filter(s => typeof s === "string")
      return { type: "explainability", narrative, drivers: drivers.length ? drivers : undefined }
    }
    case "playbook":
    case "marketIntelligence": {
      const actions = normActions(r.actions)
      return actions.length ? { type: "marketIntelligence", actions } : null
    }
    default:
      return null
  }
}

/** Coerce raw model JSON into a safe AppSpec; drops malformed blocks. */
export function normalizeSpec(raw: unknown): AppSpec | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const title = str(r.title).trim()
  if (!title) return null

  const sources = arr(r.sources).map(normSource).filter((s): s is SourceRef => !!s)

  let blocks = arr(r.blocks).map(normBlock).filter((b): b is AppBlock => !!b)
  // STRIPA is universal IP. Only the *weather engine* is weather-gated: for a
  // non-weather app, downgrade a weather-engine block to declarative if it has
  // authored stages, otherwise drop it (a bare weather panel doesn't belong).
  if (!isWeatherRelevant({ title, rationale: str(r.rationale), sources })) {
    blocks = blocks
      .map(b => {
        if (b.type !== "stripa" || b.engine !== "weather") return b
        return b.stages ? { ...b, engine: "declarative" as const } : null
      })
      .filter((b): b is AppBlock => !!b)
  }
  if (blocks.length === 0) return null

  const summaryRaw = (r.summary && typeof r.summary === "object" ? r.summary : {}) as Record<string, unknown>
  const figures = arr(summaryRaw.figures).map(normFigure).filter((f): f is Figure => !!f)

  const spec: AppSpec = {
    id: str(r.id) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    icon: pickIcon(r.icon),
    rationale: str(r.rationale),
    sources,
    summary: { headline: str(summaryRaw.headline) || title, figures },
    blocks,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
  }

  const stl = r.sendToLoop as Record<string, unknown> | undefined
  if (stl && typeof stl === "object" && typeof stl.label === "string") {
    spec.sendToLoop = { label: stl.label }
    if (typeof stl.missionId === "string") spec.sendToLoop.missionId = stl.missionId
  } else {
    spec.sendToLoop = { label: "Send to Action Centre" }
  }

  // Bucket-2 seams: tolerate (but don't require) size/scope hints.
  if (typeof r.size === "string" && SIZES.has(r.size as WidgetSize)) spec.size = r.size as WidgetSize
  if (r.scope === "user" || r.scope === "org" || r.scope === "builtin") spec.scope = r.scope

  return spec
}

/** Parse a single NDJSON line from the architect stream. */
export function parseArchitectLine(line: string): ArchitectEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  let obj: unknown
  try { obj = JSON.parse(trimmed) } catch { return null }
  if (!obj || typeof obj !== "object") return null
  const r = obj as Record<string, unknown>
  if (r.kind === "log" && typeof r.text === "string") return { kind: "log", text: r.text }
  if (r.kind === "done") return { kind: "done" }
  if (r.kind === "idea" || r.title) {
    const src = (r.kind === "idea" ? r.idea : r) as Record<string, unknown>
    if (!src || typeof src !== "object" || typeof src.title !== "string") return null
    const feat = (src.features && typeof src.features === "object" ? src.features : {}) as Record<string, unknown>
    const idea: AppIdea = {
      id: str(src.id) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      title: str(src.title),
      icon: pickIcon(src.icon),
      rationale: str(src.rationale),
      internalBindings: arr<string>(src.internalBindings).filter(s => typeof s === "string"),
      sources: arr(src.sources).map(normSource).filter((s): s is SourceRef => !!s),
      features: {
        visuals: feat.visuals !== false,
        stripa: Boolean(feat.stripa),
        explainability: feat.explainability !== false,
        marketIntelligence: Boolean(feat.marketIntelligence ?? feat.playbook),
      },
    }
    return { kind: "idea", idea }
  }
  return null
}
