"use client"

import { activeLocaleTag, formatActivePercent, formatActiveUsd, localizeActiveCopy } from "../_i18n/legacy"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts"
import { useStore } from "../_store"
import { WeatherStripaPanel } from "./weather-stripa"
import { ReasoningTooltip } from "./reasoning-disclosure"
import { StageBlock, Stat, StripaCard, ConfidenceBadge, MetricTile } from "./stripa-scaffold"
import type { ComputedData } from "../data/_transform"
import { isWeatherRelevant } from "../_modules/spec"
import type { AppSpec, AppBlock, Figure, SourceRef, Fmt, Tone, StripaStages } from "../_modules/spec"
import type { ModuleSummary, ModuleSeverity, KeyFigure } from "../_modules/types"

/* ----------------------------- helpers ---------------------------- */

function fmtUsd(n: number): string {
  return formatActiveUsd(n)
}

function formatValue(v: unknown, fmt: Fmt = "num"): string {
  if (v == null) return "—"
  if (fmt === "text") return String(v)
  const n = typeof v === "number" ? v : Number(v)
  if (Number.isNaN(n)) return String(v)
  if (fmt === "usd") return fmtUsd(n)
  if (fmt === "pct") return formatActivePercent(Math.abs(n) <= 1 ? n : n / 100)
  return n.toLocaleString(activeLocaleTag(), { maximumFractionDigits: 1 })
}

/** Safe dot-path read into ComputedData (or a row). */
export function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return undefined
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

const CHART_COLOR: Record<Tone, string> = {
  good: "var(--accent-positive)",
  bad: "var(--accent-critical)",
  neutral: "var(--color-brand-strong)",
}

function parseDisplayNumber(display: string, fmt?: Fmt): number | null {
  if (fmt === "text") return null
  const cleaned = display.replace(/[^0-9.\-]/g, "")
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

function sparkPoints(n: number): { i: number; v: number }[] {
  const seed = Math.abs(Math.round(n * 100)) % 997
  const scale = n === 0 ? 1 : Math.abs(n)
  return Array.from({ length: 8 }, (_, i) => {
    const wave = Math.sin((i + (seed % 7)) * 0.85) * 0.1
    const drift = (i / 7) * 0.1
    return { i, v: scale * (0.78 + drift + wave) }
  })
}

function MiniSparkline({ data, color, compact }: { data: { i: number; v: number }[]; color: string; compact?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={compact ? 32 : 40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.18} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function MiniDonut({ pct, color, compact }: { pct: number; color: string; compact?: boolean }) {
  const v = Math.min(100, Math.max(0, pct))
  const size = compact ? 32 : 40
  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={[{ value: v }, { value: 100 - v }]}
          innerRadius={compact ? 10 : 13}
          outerRadius={compact ? 14 : 18}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          stroke="none"
          isAnimationActive={false}
        >
          <Cell fill={color} />
          <Cell fill="var(--color-muted)" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MiniVisual({ display, fmt, tone = "neutral", compact }: { display: string; fmt?: Fmt; tone?: Tone; compact?: boolean }) {
  const color = CHART_COLOR[tone ?? "neutral"]
  const isPct = fmt === "pct" || display.includes("%")
  const n = parseDisplayNumber(display, fmt)
  if (n == null) return null
  if (isPct) return <MiniDonut pct={n} color={color} compact={compact} />
  return <MiniSparkline data={sparkPoints(n)} color={color} compact={compact} />
}

/* --------------------------- provenance --------------------------- */

const PROV_CLS: Record<SourceRef["provenance"], string> = {
  live: "bg-tint-positive text-accent-positive-text",
  benchmark: "bg-tint-info text-accent-info-text",
  modeled: "bg-tint-warning text-accent-warning-text",
}

function ProvenanceBar({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sources.map(s => (
        <span
          key={s.id}
          title={s.provenance === "modeled" && s.method ? `Modeled: ${s.method}` : `${localizeActiveCopy(s.label)}${s.confidence ? ` · ${s.confidence} confidence` : ""}`}
          className={`inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${PROV_CLS[s.provenance]}`}
        >
          {s.external && <SafeIcon name="Globe" className="h-2.5 w-2.5" />}
          {localizeActiveCopy(s.label)}
          <span className="opacity-70">· {s.provenance}</span>
        </span>
      ))}
    </div>
  )
}

/* ----------------------------- blocks ----------------------------- */

function KpiRow({ figures, data }: { figures: Figure[]; data: ComputedData }) {
  const resolved = figures
    .map((f, i) => {
      const raw = f.value != null ? f.value : f.selector ? resolvePath(data, f.selector) : undefined
      if (raw == null && f.value == null) return null
      const display = f.value != null ? f.value : formatValue(raw, f.fmt)
      return { display, label: f.label, fmt: f.fmt, tone: f.tone ?? "neutral", index: i }
    })
    .filter((t): t is NonNullable<typeof t> => !!t)

  if (resolved.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {resolved.map((f, i) => (
        <MetricTile
          key={f.index}
          label={localizeActiveCopy(f.label)}
          value={f.display}
          tone={f.tone}
          index={i}
          prominence={i === 0 ? "primary" : "secondary"}
          visual={<MiniVisual display={f.display} fmt={f.fmt} tone={f.tone} compact={i > 0} />}
        />
      ))}
    </div>
  )
}

function ChartBlock({ block, data }: { block: Extract<AppBlock, { type: "chart" }>; data: ComputedData }) {
  const rows = block.points ?? (block.source ? resolvePath(data, block.source) : undefined)
  if (!Array.isArray(rows) || rows.length === 0) return null
  const palette = ["var(--color-brand-primary)", "var(--color-accent-positive)", "var(--color-accent-warning)"]
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
      {block.title && <p className="mb-2 text-xs font-medium text-muted-foreground">{localizeActiveCopy(block.title)}</p>}
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

function TableBlock({ block, data }: { block: Extract<AppBlock, { type: "table" }>; data: ComputedData }) {
  const rows = block.rows ?? (block.source ? resolvePath(data, block.source) : undefined)
  if (!Array.isArray(rows) || rows.length === 0) return null
  const visible = rows.slice(0, block.max ?? 8)
  return (
    <div>
      {block.title && <p className="mb-2 text-xs font-medium text-muted-foreground">{localizeActiveCopy(block.title)}</p>}
      <div className="overflow-x-auto rounded-[10px] border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              {block.columns.map(c => <th key={c.field} className="px-3 py-2 font-medium">{localizeActiveCopy(c.label)}</th>)}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
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
    <div className="flex items-start gap-2 rounded-[10px] border border-border border-l-[3px] border-l-primary bg-tint-brand px-4 py-2">
      <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-muted-foreground">{localizeActiveCopy(narrative)}</p>
      <ReasoningTooltip
        reasoning={{
          summary: narrative,
          evidence: drivers,
        }}
        label={localizeActiveCopy("Why this insight")}
        className="mt-0.5 shrink-0"
      />
    </div>
  )
}

function MarketIntelligence({ actions }: { actions: { label: string; detail: string }[] }) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{localizeActiveCopy("Assigned actions by role")}</span>
      <ol className="space-y-2">
        {actions.map((a, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-[10px] border border-border bg-card px-3 py-2.5 shadow-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-tint-brand text-[10px] font-bold text-brand-strong">{i + 1}</span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[13px] font-medium text-foreground">
                {localizeActiveCopy(a.label)}
                <ReasoningTooltip reasoning={a.detail ? { summary: a.detail } : undefined} label={`Why ${localizeActiveCopy(a.label)}`} />
              </p>
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
function FigureStats({ figures, data }: { figures?: Figure[]; data: ComputedData }) {
  if (!figures || figures.length === 0) return null
  const tiles = figures
    .map((f, i) => {
      const raw = f.value != null ? f.value : f.selector ? resolvePath(data, f.selector) : undefined
      if (raw == null && f.value == null) return null
      return {
        label: f.label,
        value: f.value != null ? f.value : formatValue(raw, f.fmt),
        fmt: f.fmt,
        tone: f.tone ?? "neutral",
        index: i,
      }
    })
    .filter((t): t is NonNullable<typeof t> => t != null)
  if (tiles.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {tiles.map((t, i) => (
        <Stat
          key={t.index}
          value={t.value}
          label={localizeActiveCopy(t.label)}
          tone={t.tone}
          index={i}
          prominence={i === 0 ? "primary" : "secondary"}
          visual={<MiniVisual display={t.value} fmt={t.fmt} tone={t.tone} compact={i > 0} />}
        />
      ))}
    </div>
  )
}

function PredictTable({ stages, data }: { stages: StripaStages; data: ComputedData }) {
  const p = stages.predict
  const rows = p.rows ?? (p.source ? resolvePath(data, p.source) : undefined)
  if (!Array.isArray(rows) || rows.length === 0 || !p.columns || p.columns.length === 0) return null
  const visible = rows.slice(0, p.max ?? 6)
  return (
    <div className="overflow-x-auto rounded-[10px] border border-border bg-card">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[9px] uppercase tracking-wide text-muted-foreground">
            {p.columns.map(c => <th key={c.field} className="px-3 py-1.5 font-medium">{localizeActiveCopy(c.label)}</th>)}
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
function DeclarativeStripa({ block, data }: { block: StripaBlock; data: ComputedData }) {
  const s = block.stages
  if (!s) return null
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SafeIcon name="Activity" className="h-3.5 w-3.5 text-brand-strong" />
        <h3 className="text-xs font-medium uppercase tracking-wider text-foreground">{block.title || "STRIPA Analysis"}</h3>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50">{localizeActiveCopy("Surface · TRend · Infer · Predict · Act")}</span>
        {block.confidence && <ConfidenceBadge confidence={block.confidence} />}
      </div>
      <StripaCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <StageBlock tag="S" label={localizeActiveCopy("Surface")} topBorder={false}>
            <Narrative text={localizeActiveCopy(s.surface.narrative)} />
            <FigureStats figures={s.surface.figures} data={data} />
          </StageBlock>
          <StageBlock tag="TR" label={localizeActiveCopy("Trend")} topBorder={false}>
            <Narrative text={localizeActiveCopy(s.trend.narrative)} />
            <FigureStats figures={s.trend.figures} data={data} />
          </StageBlock>
        </div>
        <StageBlock tag="I" label={localizeActiveCopy("Infer")}>
          <Narrative text={localizeActiveCopy(s.infer.narrative)} />
          <FigureStats figures={s.infer.figures} data={data} />
        </StageBlock>
        <StageBlock tag="P" label={localizeActiveCopy("Predict")}>
          <Narrative text={localizeActiveCopy(s.predict.narrative)} />
          <FigureStats figures={s.predict.figures} data={data} />
          <PredictTable stages={s} data={data} />
        </StageBlock>
        <StageBlock tag="A" label={localizeActiveCopy("Act")}>
          {s.act.actions.length > 0 ? (
            <ol className="space-y-2">
              {s.act.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-[10px] border border-border bg-card px-3 py-2.5 shadow-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-tint-brand text-[10px] font-bold text-brand-strong">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{localizeActiveCopy(a.label)}</p>
                    {a.detail && <p className="text-[11px] text-muted-foreground">{localizeActiveCopy(a.detail)}</p>}
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

function renderBlock(block: AppBlock, data: ComputedData): React.ReactNode {
  switch (block.type) {
    case "kpiRow": return <KpiRow figures={block.figures} data={data} />
    case "chart": return <ChartBlock block={block} data={data} />
    case "table": return <TableBlock block={block} data={data} />
    case "stripa": return stripaEngine(block) === "weather"
      ? <WeatherStripaPanel />
      : <DeclarativeStripa block={block} data={data} />
    case "explainability": return <Explainability narrative={localizeActiveCopy(block.narrative)} drivers={block.drivers} />
    case "playbook":
    case "marketIntelligence": return <MarketIntelligence actions={block.actions} />
    default: return null
  }
}

/* --------------------------- public API --------------------------- */

export function SpecRenderer({ spec }: { spec: AppSpec }) {
  const { data } = useStore()
  // STRIPA is universal. Only the *weather engine* is gated: keep the live
  // weather→demand panel out of non-weather apps even if an old spec baked it
  // in. Declarative STRIPA (authored stages) renders for any app.
  const weatherOk = isWeatherRelevant(spec)
  const blocks = weatherOk
    ? spec.blocks
    : spec.blocks.filter(b => !(b.type === "stripa" && stripaEngine(b) === "weather"))
  return (
    <div className="space-y-5">
      {spec.rationale && <p className="text-[12px] leading-relaxed text-muted-foreground">{localizeActiveCopy(spec.rationale)}</p>}
      <ProvenanceBar sources={spec.sources} />
      {blocks.map((b, i) => {
        const node = renderBlock(b, data)
        return node ? <div key={i}>{node}</div> : null
      })}
    </div>
  )
}

/* --------------------------- tile summary ------------------------- */

/** Lean BLUF for the board tile, derived from the spec's summary figures. */
export function summarizeSpec(spec: AppSpec, data: ComputedData): ModuleSummary {
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
