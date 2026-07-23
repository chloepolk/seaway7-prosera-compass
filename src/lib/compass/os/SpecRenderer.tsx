"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import { useCompassOS } from "./os-context"
import { StageBlock, Stat, StripaCard, ConfidenceBadge } from "./stripa-scaffold"
import { isWeatherRelevant } from "./app-spec"
import type { AppSpec, AppBlock, Figure, SourceRef, Fmt, Tone, StripaStages } from "./app-spec"
import type { ModuleSummary, ModuleSeverity, KeyFigure } from "./module-contract"

const BRAND = "#004F9A"

/* ----------------------------- helpers ---------------------------- */

function fmtUsd(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return `${sign}$${abs.toFixed(0)}`
}

function formatValue(v: unknown, fmt: Fmt = "num"): string {
  if (v == null) return "—"
  if (fmt === "text") return String(v)
  const n = typeof v === "number" ? v : Number(v)
  if (Number.isNaN(n)) return String(v)
  if (fmt === "usd") return fmtUsd(n)
  if (fmt === "pct") return `${(n * (Math.abs(n) <= 1 ? 100 : 1)).toFixed(1)}%`
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

/** Safe dot-path read into the computed dataset (or a row). */
export function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return undefined
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

const TONE_CLS: Record<Tone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-red-600 dark:text-red-400",
  neutral: "text-foreground",
}

/* --------------------------- provenance --------------------------- */

const PROV_CLS: Record<SourceRef["provenance"], string> = {
  live: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  benchmark: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  modeled: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
}

function ProvenanceBar({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sources.map(s => (
        <span
          key={s.id}
          title={s.provenance === "modeled" && s.method ? `Modeled: ${s.method}` : `${s.label}${s.confidence ? ` · ${s.confidence} confidence` : ""}`}
          className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${PROV_CLS[s.provenance]}`}
        >
          {s.external && <SafeIcon name="Globe" className="h-2.5 w-2.5" />}
          {s.label}
          <span className="opacity-70">· {s.provenance}</span>
        </span>
      ))}
    </div>
  )
}

/* ----------------------------- blocks ----------------------------- */

function KpiRow({ figures, data }: { figures: Figure[]; data: unknown }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {figures.map((f, i) => {
        const raw = f.value != null ? f.value : f.selector ? resolvePath(data, f.selector) : undefined
        if (raw == null && f.value == null) return null
        const display = f.value != null ? f.value : formatValue(raw, f.fmt)
        return (
          <div key={i} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
            <div className={`text-lg font-semibold tabular-nums ${TONE_CLS[f.tone ?? "neutral"]}`}>{display}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</div>
          </div>
        )
      })}
    </div>
  )
}

function ChartBlock({ block, data }: { block: Extract<AppBlock, { type: "chart" }>; data: unknown }) {
  const rows = block.points ?? (block.source ? resolvePath(data, block.source) : undefined)
  if (!Array.isArray(rows) || rows.length === 0) return null
  const palette = ["#004F9A", "#22c55e", "#eab308"]
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
      <XAxis dataKey={block.x} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
      <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} width={44} />
      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
    </>
  )
  return (
    <div>
      {block.title && <p className="mb-2 text-xs font-medium text-muted-foreground">{block.title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        {block.chart === "bar" ? (
          <BarChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
            {common}
            {block.y.map((k, i) => <Bar key={k} dataKey={k} fill={palette[i % palette.length]} radius={[3, 3, 0, 0]} />)}
          </BarChart>
        ) : block.chart === "line" ? (
          <LineChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
            {common}
            {block.y.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={palette[i % palette.length]} strokeWidth={2} dot={false} />)}
          </LineChart>
        ) : (
          <AreaChart data={rows} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
            {common}
            {block.y.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={palette[i % palette.length]} fill={palette[i % palette.length]} fillOpacity={0.15} strokeWidth={2} />)}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function TableBlock({ block, data }: { block: Extract<AppBlock, { type: "table" }>; data: unknown }) {
  const rows = block.rows ?? (block.source ? resolvePath(data, block.source) : undefined)
  if (!Array.isArray(rows) || rows.length === 0) return null
  const visible = rows.slice(0, block.max ?? 8)
  return (
    <div>
      {block.title && <p className="mb-2 text-xs font-medium text-muted-foreground">{block.title}</p>}
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              {block.columns.map(c => <th key={c.field} className="px-3 py-2 font-medium">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                {block.columns.map(c => (
                  <td key={c.field} className="px-3 py-2 font-mono text-xs">{formatValue(resolvePath(row, c.field), c.fmt)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Explainability({ narrative, drivers }: { narrative: string; drivers?: string[] }) {
  return (
    <div className="rounded-lg border-l-[3px] bg-muted/30 px-4 py-3" style={{ borderLeftColor: BRAND }}>
      <div className="mb-1 flex items-center gap-1.5">
        <SafeIcon name="Sparkles" className="h-3.5 w-3.5 text-[#004F9A] dark:text-sky-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Why this matters</span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{narrative}</p>
      {drivers && drivers.length > 0 && (
        <ul className="mt-2 space-y-1">
          {drivers.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: BRAND }} />
              {d}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MarketIntelligence({ actions }: { actions: { label: string; detail: string }[] }) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prescribed market intelligence</span>
      <ol className="space-y-2">
        {actions.map((a, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ backgroundColor: `${BRAND}1A`, color: BRAND }}>{i + 1}</span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">{a.label}</p>
              {a.detail && <p className="text-[11px] text-muted-foreground">{a.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ----------------------------- STRIPA ----------------------------- */

type StripaBlock = Extract<AppBlock, { type: "stripa" }>

/** Effective engine: legacy bare blocks (no stages) default to weather. */
function stripaEngine(block: StripaBlock): "weather" | "declarative" {
  return block.engine ?? (block.stages ? "declarative" : "weather")
}

/** Resolve a figure list to display tiles; returns null if nothing resolves. */
function FigureStats({ figures, data }: { figures?: Figure[]; data: unknown }) {
  if (!figures || figures.length === 0) return null
  const tiles = figures
    .map(f => {
      const raw = f.value != null ? f.value : f.selector ? resolvePath(data, f.selector) : undefined
      if (raw == null && f.value == null) return null
      return { label: f.label, value: f.value != null ? f.value : formatValue(raw, f.fmt) }
    })
    .filter((t): t is { label: string; value: string } => !!t)
  if (tiles.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {tiles.map((t, i) => <Stat key={i} value={t.value} label={t.label} />)}
    </div>
  )
}

function PredictTable({ stages, data }: { stages: StripaStages; data: unknown }) {
  const p = stages.predict
  const rows = p.rows ?? (p.source ? resolvePath(data, p.source) : undefined)
  if (!Array.isArray(rows) || rows.length === 0 || !p.columns || p.columns.length === 0) return null
  const visible = rows.slice(0, p.max ?? 6)
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-muted/40 text-left text-[9px] uppercase tracking-wide text-muted-foreground">
            {p.columns.map(c => <th key={c.field} className="px-3 py-1.5 font-medium">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={i} className={i % 2 ? "bg-muted/15" : undefined}>
              {p.columns!.map(c => (
                <td key={c.field} className="px-3 py-1.5 tabular-nums text-foreground">{formatValue(resolvePath(row, c.field), c.fmt)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Narrative({ text }: { text?: string }) {
  if (!text) return null
  return <p className="text-[12px] leading-relaxed text-muted-foreground">{text}</p>
}

/** Universal STRIPA scaffold authored by the composer agent — works for any
 *  app (refrigerant, fuel, labor, pricing…), not just weather-driven demand. */
function DeclarativeStripa({ block, data }: { block: StripaBlock; data: unknown }) {
  const s = block.stages
  if (!s) return null
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SafeIcon name="Activity" className="h-3.5 w-3.5 text-[#004F9A] dark:text-sky-400" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-foreground">{block.title || "STRIPA Analysis"}</h3>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">Surface · TRend · Infer · Predict · Act</span>
        {block.confidence && <ConfidenceBadge confidence={block.confidence} />}
      </div>
      <StripaCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <StageBlock tag="S" label="Surface" topBorder={false}>
            <Narrative text={s.surface.narrative} />
            <FigureStats figures={s.surface.figures} data={data} />
          </StageBlock>
          <StageBlock tag="TR" label="Trend" topBorder={false}>
            <Narrative text={s.trend.narrative} />
            <FigureStats figures={s.trend.figures} data={data} />
          </StageBlock>
        </div>
        <StageBlock tag="I" label="Infer">
          <Narrative text={s.infer.narrative} />
          <FigureStats figures={s.infer.figures} data={data} />
        </StageBlock>
        <StageBlock tag="P" label="Predict">
          <Narrative text={s.predict.narrative} />
          <FigureStats figures={s.predict.figures} data={data} />
          <PredictTable stages={s} data={data} />
        </StageBlock>
        <StageBlock tag="A" label="Act">
          {s.act.actions.length > 0 ? (
            <ol className="space-y-2">
              {s.act.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ backgroundColor: `${BRAND}1A`, color: BRAND }}>{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{a.label}</p>
                    {a.detail && <p className="text-[11px] text-muted-foreground">{a.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Narrative text="No recommended actions yet — send findings to the Action Centre to assign owners." />
          )}
        </StageBlock>
      </StripaCard>
    </section>
  )
}

function renderBlock(block: AppBlock, data: unknown, WeatherEngine?: React.FC): React.ReactNode {
  switch (block.type) {
    case "kpiRow": return <KpiRow figures={block.figures} data={data} />
    case "chart": return <ChartBlock block={block} data={data} />
    case "table": return <TableBlock block={block} data={data} />
    case "stripa": return stripaEngine(block) === "weather"
      ? (WeatherEngine ? <WeatherEngine /> : null)
      : <DeclarativeStripa block={block} data={data} />
    case "explainability": return <Explainability narrative={block.narrative} drivers={block.drivers} />
    case "playbook":
    case "marketIntelligence": return <MarketIntelligence actions={block.actions} />
    default: return null
  }
}

/* --------------------------- public API --------------------------- */

export function SpecRenderer({ spec }: { spec: AppSpec }) {
  const { data, weatherEngine } = useCompassOS()
  // STRIPA is universal. Only the *weather engine* is gated: keep the live
  // weather→demand panel out of non-weather apps even if an old spec baked it
  // in. Declarative STRIPA (authored stages) renders for any app.
  const weatherOk = isWeatherRelevant(spec)
  const blocks = weatherOk
    ? spec.blocks
    : spec.blocks.filter(b => !(b.type === "stripa" && stripaEngine(b) === "weather"))
  return (
    <div className="space-y-5">
      {spec.rationale && <p className="text-[12px] leading-relaxed text-muted-foreground">{spec.rationale}</p>}
      <ProvenanceBar sources={spec.sources} />
      {blocks.map((b, i) => {
        const node = renderBlock(b, data, weatherEngine)
        return node ? <div key={i}>{node}</div> : null
      })}
    </div>
  )
}

/* --------------------------- tile summary ------------------------- */

/** Lean BLUF for the board tile, derived from the spec's summary figures. */
export function summarizeSpec(spec: AppSpec, data: unknown): ModuleSummary {
  const figures: KeyFigure[] = spec.summary.figures.slice(0, 3).map(f => {
    const raw = f.value != null ? f.value : f.selector ? resolvePath(data, f.selector) : undefined
    return {
      label: f.label,
      value: f.value != null ? f.value : formatValue(raw, f.fmt),
      tone: f.tone ?? "neutral",
    }
  })
  // modeled-heavy apps read as "medium"; live pricing-risk apps can read higher
  const hasModeled = spec.sources.some(s => s.provenance === "modeled")
  const severity: ModuleSeverity = hasModeled ? "medium" : "high"
  return { headline: spec.summary.headline, severity, figures }
}
