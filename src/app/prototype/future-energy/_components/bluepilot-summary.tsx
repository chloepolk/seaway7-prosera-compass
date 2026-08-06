"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { enterMotion, insightsHeroShell, pcmButton } from "./motion"
import type { Severity } from "../data/_insights"
import { BluePilotReasoningButton, ReasoningExpand, ReasoningTooltip, type ReasoningContent } from "./reasoning-disclosure"
import { isReasoningEmpty } from "./reasoning-helpers"
import { useT } from "../_i18n/use-t"

/* ------------------------------------------------------------------ */
/*  Severity tag — mirrors the right-rail findings idiom (monochrome,  */
/*  deliberately NOT the BCG tier palette) so nothing reads as a tier. */
/* ------------------------------------------------------------------ */

const severityTag: Record<Severity, { labelKey: string; icon: string; cls: string }> = {
  critical: { labelKey: "severity.critical", icon: "OctagonAlert", cls: "bg-white text-[#14233D]" },
  high: { labelKey: "severity.high", icon: "TriangleAlert", cls: "bg-white/20 text-white" },
  medium: { labelKey: "severity.medium", icon: "Info", cls: "bg-white/12 text-[#AECBDC]" },
  info: { labelKey: "severity.info", icon: "CircleDot", cls: "bg-white/8 text-[#AECBDC]/80" },
}

function normalizeSeverity(s: string | undefined | null): Severity {
  return s === "critical" || s === "high" || s === "medium" || s === "info" ? s : "info"
}

function SeverityTag({ severity }: { severity: Severity }) {
  const translate = useT()
  const t = severityTag[severity]
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", t.cls)}>
      <SafeIcon name={t.icon} className="h-2.5 w-2.5" />
      {translate(t.labelKey)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Figure emphasis — bold the dollar / % / multiplier / unit figures  */
/*  so numbers carry visual weight like the executive narrative.       */
/* ------------------------------------------------------------------ */

const FIGURE_BODY = "\\$[\\d][\\d.,]*\\s?[MmKkBb]?|\\d+(?:\\.\\d+)?%|\\d+(?:\\.\\d+)?x|\\d+(?:\\.\\d+)?\\s?(?:pts?|points|percentage points|days)"
const FIGURE_SPLIT = new RegExp(`(${FIGURE_BODY})`, "g")
const FIGURE_TEST = new RegExp(`^(?:${FIGURE_BODY})$`)

const HERO_CTA_BTN =
  "h-auto rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-brand-onPrimary)] hover:bg-[var(--color-brand-primary)]/90"

const HERO_BP_BTN =
  "h-auto rounded-[10px] border border-white/16 bg-white/8 px-2.5 py-2.5 hover:bg-white/12"

function emphasize(text: string, keyPrefix: string, strongCls = "font-semibold tabular-nums"): React.ReactNode[] {
  return text.split(FIGURE_SPLIT).filter(p => p !== undefined && p !== "").map((part, i) => {
    if (FIGURE_TEST.test(part)) {
      return <strong key={`${keyPrefix}-${i}`} className={strongCls}>{part}</strong>
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
  })
}

/* ------------------------------------------------------------------ */
/*  BluePilot summary — focus hero with expandable detail              */
/* ------------------------------------------------------------------ */

export interface BluePilotSummaryProps {
  /** BLUF line in foreground weight; falls back to the first sentence. */
  headline?: string
  /** Narrative sentences (the first becomes the headline when none is given). */
  sentences: string[]
  /** Recommended actions, rendered as numbered chips when expanded. */
  bullets?: string[]
  /** Optional per-action reasoning (parallel to bullets). */
  bulletReasoning?: ReasoningContent[]
  severity?: string
  /** Overall reasoning for the summary and recommendations. */
  reasoning?: ReasoningContent
  /** Small right-aligned eyebrow, e.g. "Portfolio" or "Pricing". */
  eyebrow?: string
  /** How many body sentences to show before "Show more". */
  collapsedSentences?: number
}

export function BluePilotSummary({
  headline,
  sentences,
  bullets = [],
  bulletReasoning = [],
  severity,
  reasoning,
  eyebrow,
  collapsedSentences: _collapsedSentences = 2,
}: BluePilotSummaryProps) {
  const [expanded, setExpanded] = React.useState(false)
  const t = useT()
  const [reasoningOpen, setReasoningOpen] = React.useState(false)
  const sev = normalizeSeverity(severity)
  const hasReasoning = !isReasoningEmpty(reasoning)

  const bluf = headline ?? sentences[0] ?? ""
  const body = headline ? sentences : sentences.slice(1)
  const supporting = body[0] ?? ""
  const denseBody = body.slice(1)

  const hasMore = denseBody.length > 0 || bullets.length > 0
  const enter = enterMotion(0)

  return (
    <section
      className={cn(enter.className, insightsHeroShell)}
      style={enter.style}
    >
      <div className="px-8 py-[30px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-[7px] shrink-0 rounded-full bg-[#5BD2F2]" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5BD2F2]">
              {eyebrow ?? t("reasoning.trends")}
            </p>
          </div>
          <SeverityTag severity={sev} />
        </div>

        {bluf && (
          <h2 className="mt-3 text-[22px] font-semibold leading-[1.34] text-white">
            {emphasize(bluf, "bluf")}
          </h2>
        )}

        {supporting && (
          <p className="mt-2 max-w-3xl text-[14px] leading-[1.48] text-[#AECBDC]">
            {emphasize(supporting, "support")}
          </p>
        )}

        {(hasMore && !expanded) || hasReasoning ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {hasReasoning && (
              <BluePilotReasoningButton
                open={reasoningOpen}
                dark
                onClick={() => setReasoningOpen((v) => !v)}
                className={HERO_BP_BTN}
              />
            )}
            {hasMore && !expanded && (
              <Button
                type="button"
                onClick={() => setExpanded(true)}
                className={cn(pcmButton, HERO_CTA_BTN)}
              >
                {t("reasoning.showMore")}
                <SafeIcon name="ChevronDown" className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : null}
        {hasReasoning && (
          <ReasoningExpand
            reasoning={reasoning}
            trigger="none"
            variant="dark"
            open={reasoningOpen}
            onOpenChange={setReasoningOpen}
            className="mt-0"
          />
        )}
      </div>

      {expanded && hasMore && (
        <div className="space-y-4 border-t border-white/16 bg-white/10 px-8 py-5">
          {denseBody.length > 0 && (
            <div className="space-y-2">
              {denseBody.map((s, i) => (
                <p key={i} className="text-[13px] leading-relaxed text-[#AECBDC]">
                  {emphasize(s, `body-${i}`)}
                </p>
              ))}
            </div>
          )}

          {bullets.length > 0 && (
            <div className="space-y-2.5 border-t border-white/12 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5BD2F2]/80">
                {t("reasoning.recommendedActions")}
              </p>
              <ol className="space-y-2">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#5BD2F2]/15 text-[9px] font-bold tabular-nums text-[#5BD2F2]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-start gap-1 text-[13px] leading-relaxed text-white/90">
                        {emphasize(b, `act-${i}`)}
                        <ReasoningTooltip
                          reasoning={bulletReasoning[i]}
                          iconClassName="text-[#AECBDC]/70"
                          label={t("reasoning.whyAction", { count: i + 1 })}
                          className="mt-0.5"
                        />
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            type="button"
            onClick={() => setExpanded(false)}
            className={cn(pcmButton, "inline-flex items-center gap-1 text-[11px] font-medium text-[#5BD2F2] hover:underline")}
          >
            {t("reasoning.showLess")}
            <SafeIcon name="ChevronUp" className="h-3 w-3" />
          </button>
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton — shared analyzing state                          */
/* ------------------------------------------------------------------ */

export function BluePilotSkeleton({ label }: { label?: string }) {
  const t = useT()
  const shimmerStyle: React.CSSProperties = {
    background: "linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.22) 37%, rgba(255,255,255,0.08) 63%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s ease-in-out infinite",
  }
  return (
    <section className={insightsHeroShell}>
      <div className="space-y-3 px-8 py-[30px]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={shimmerStyle} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#5BD2F2]/70">
            {label ?? t("agent.bluePilotAnalyzing")}
          </span>
        </div>
        <div className="h-5 w-2/3 rounded" style={shimmerStyle} />
        <div className="h-4 w-full rounded" style={shimmerStyle} />
        <div className="h-9 w-28 rounded-[10px]" style={shimmerStyle} />
      </div>
    </section>
  )
}
