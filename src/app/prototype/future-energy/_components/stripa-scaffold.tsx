"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/prosera/card"
import { enterMotion, pcmCard } from "./motion"

/* ------------------------------------------------------------------ */
/*  Shared STRIPA visual primitives                                    */
/*                                                                     */
/*  STRIPA (Surface → TRend → Infer → Predict → Act) is core IP — a    */
/*  universal reasoning scaffold, not a weather feature. These pieces  */
/*  are shared by the live weather engine and the declarative engine   */
/*  that any agent-composed app can author.                            */
/* ------------------------------------------------------------------ */

export const STRIPA_BRAND = "var(--color-brand-primary)"

export type StripaConfidence = "high" | "moderate" | "indicative"

const CONF_CLS: Record<StripaConfidence, string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  moderate: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  indicative: "bg-muted text-muted-foreground",
}

export function ConfidenceBadge({ confidence }: { confidence: StripaConfidence }) {
  return (
    <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${CONF_CLS[confidence]}`}>
      {confidence} confidence
    </span>
  )
}

export function StageTag({ tag, label }: { tag: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-5 min-w-[22px] items-center justify-center rounded-md bg-tint-brand px-1 text-[10px] font-bold tabular-nums text-brand-strong">
        {tag}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
    </div>
  )
}

type MetricTone = "good" | "bad" | "neutral"

const TONE_ACCENT: Record<MetricTone, { strip: string; value: string }> = {
  good: { strip: "bg-tint-positive", value: "text-accent-positive-text" },
  bad: { strip: "bg-tint-critical", value: "text-accent-critical-text" },
  neutral: { strip: "bg-tint-brand", value: "text-foreground" },
}

const INDEX_ACCENTS = [
  { strip: "bg-tint-brand", value: "text-foreground" },
  { strip: "bg-tint-info", value: "text-foreground" },
  { strip: "bg-tint-positive", value: "text-foreground" },
  { strip: "bg-tint-warning", value: "text-foreground" },
] as const

export function metricAccent(tone: MetricTone | undefined, index: number) {
  return TONE_ACCENT[tone ?? "neutral"] ?? INDEX_ACCENTS[index % INDEX_ACCENTS.length]
}

/** Rich metric tile — accent strip, hierarchy, hover lift, staggered entrance. */
export function MetricTile({
  label,
  value,
  hint,
  tone = "neutral",
  index = 0,
  prominence = "secondary",
  visual,
}: {
  label: string
  value: string
  hint?: string
  tone?: MetricTone
  index?: number
  prominence?: "primary" | "secondary"
  visual?: React.ReactNode
}) {
  const accent = metricAccent(tone, index)
  const isPrimary = prominence === "primary"
  const enter = enterMotion(index)

  return (
    <div
      className={cn(
        enter.className,
        "group relative overflow-hidden rounded-[12px] border border-border bg-card shadow-sm",
        pcmCard,
      )}
      style={enter.style}
    >
      <div className={cn("h-1", accent.strip)} />
      <div className={cn(isPrimary ? "p-3.5" : "p-3")}>
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <div
            className={cn(
              "font-semibold tabular-nums leading-none",
              isPrimary ? cn("text-[28px]", accent.value) : "text-[14px] text-muted-foreground",
            )}
          >
            {value}
          </div>
          {visual && (
            <div className={cn("shrink-0", isPrimary ? "h-10 w-[72px]" : "h-8 w-14")}>{visual}</div>
          )}
        </div>
        {hint && <div className="mt-1 text-[10px] text-muted-foreground/70">{hint}</div>}
      </div>
    </div>
  )
}

export function Stat({
  value,
  label,
  hint,
  tone,
  index = 0,
  prominence = "secondary",
  visual,
}: {
  value: string
  label: string
  hint?: string
  tone?: MetricTone
  index?: number
  prominence?: "primary" | "secondary"
  visual?: React.ReactNode
}) {
  return (
    <MetricTile
      value={value}
      label={label}
      hint={hint}
      tone={tone}
      index={index}
      prominence={prominence}
      visual={visual}
    />
  )
}

/** The brand-edged card every STRIPA engine renders inside. */
export function StripaCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const enter = enterMotion(0)
  return (
    <Card
      className={cn(
        enter.className,
        pcmCard,
        "overflow-hidden border-l-[3px] shadow-sm",
        className,
      )}
      style={{ ...enter.style, borderLeftColor: STRIPA_BRAND }}
    >
      <CardContent className="space-y-5 p-4">{children}</CardContent>
    </Card>
  )
}

/** A bordered stage block used by the declarative engine (S/TR/I/P/A). */
export function StageBlock({
  tag,
  label,
  topBorder = true,
  children,
}: {
  tag: string
  label: string
  topBorder?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-2.5 ${topBorder ? "border-t border-border/40 pt-4" : ""}`}>
      <StageTag tag={tag} label={label} />
      {children}
    </div>
  )
}
