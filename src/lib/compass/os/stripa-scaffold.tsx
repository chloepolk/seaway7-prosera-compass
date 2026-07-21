"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/prosera/card"

/* ------------------------------------------------------------------ */
/*  Shared STRIPA visual primitives                                    */
/*                                                                     */
/*  STRIPA (Surface → TRend → Infer → Predict → Act) is core IP — a    */
/*  universal reasoning scaffold, not a weather feature. These pieces  */
/*  are shared by the live weather engine and the declarative engine   */
/*  that any agent-composed app can author.                            */
/* ------------------------------------------------------------------ */

export const STRIPA_BRAND = "#004F9A"

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
      <span
        className="flex h-5 min-w-[22px] items-center justify-center rounded-md px-1 text-[10px] font-bold tabular-nums"
        style={{ backgroundColor: `${STRIPA_BRAND}1A`, color: STRIPA_BRAND }}
      >
        {tag}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
    </div>
  )
}

export function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <div className="text-[17px] font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground/70">{hint}</div>}
    </div>
  )
}

/** The brand-edged card every STRIPA engine renders inside. */
export function StripaCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`border-l-[3px] ${className ?? ""}`} style={{ borderLeftColor: STRIPA_BRAND }}>
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
