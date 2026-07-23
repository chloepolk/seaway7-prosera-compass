"use client"

import * as React from "react"
import { Button } from "@/components/ui/prosera/button"
import { cn } from "@/lib/utils"
import { enterMotion, insightsHeroShell, pcmButton } from "../motion"
import { BluePilotReasoningButton, ReasoningExpand, ReasoningTooltip, type ReasoningContent } from "../reasoning-disclosure"
import { isReasoningEmpty } from "../reasoning-helpers"

export interface HeroStatTile {
  value: string
  label: string
  /** Value color — defaults to brand cyan for first tile, mint for second. */
  tone?: "brand" | "positive"
  reasoning?: ReasoningContent
}

export interface FocusHeroProps {
  eyebrow: string
  headline: string
  body: string
  ctaLabel?: string
  onCta?: () => void
  stats?: HeroStatTile[]
  reasoning?: ReasoningContent
  /** Action Centre keeps expandable BP reasoning; other tabs use hover tooltips. */
  reasoningDisclosure?: "tooltip" | "expand"
  className?: string
}

const STAT_VALUE_TONE: Record<"brand" | "positive", string> = {
  brand: "text-[#5BD2F2]",
  positive: "text-[#8FE8C8]",
}

const HERO_CTA_BTN =
  "h-auto rounded-[10px] bg-[var(--color-brand-primary)] px-4 py-2.5 text-[13px] font-semibold text-[var(--color-brand-onPrimary)] hover:bg-[var(--color-brand-primary)]/90"

const HERO_BP_BTN =
  "h-auto rounded-[10px] border border-white/16 bg-white/8 px-2.5 py-2.5 hover:bg-white/12"

export function FocusHero({
  eyebrow,
  headline,
  body,
  ctaLabel,
  onCta,
  stats = [],
  reasoning,
  reasoningDisclosure = "tooltip",
  className,
}: FocusHeroProps) {
  const enter = enterMotion(0)
  const [reasoningOpen, setReasoningOpen] = React.useState(false)
  const hasReasoning = !isReasoningEmpty(reasoning)
  const showBpButton = hasReasoning && reasoningDisclosure === "expand"
  const showCta = Boolean(ctaLabel && onCta)
  const showActionRow = showCta || showBpButton

  return (
    <section
      className={cn(
        enter.className,
        insightsHeroShell,
        "flex flex-col gap-6 px-8 py-[30px] lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
      style={enter.style}
    >
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <span className="size-[7px] shrink-0 rounded-full bg-[#5BD2F2]" aria-hidden />
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5BD2F2]">
            {eyebrow}
            {reasoningDisclosure === "tooltip" && (
              <ReasoningTooltip
                reasoning={reasoning}
                iconClassName="text-[#AECBDC]/70"
                label="Why this focus"
              />
            )}
          </p>
        </div>
        <h1 className="text-[22px] font-semibold leading-[1.34] text-white">{headline}</h1>
        <p className="max-w-3xl text-[14px] leading-[1.48] text-[#AECBDC]">{body}</p>
        {showActionRow && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {showBpButton && (
              <BluePilotReasoningButton
                open={reasoningOpen}
                dark
                onClick={() => setReasoningOpen((v) => !v)}
                className={HERO_BP_BTN}
              />
            )}
            {showCta && (
              <Button
                type="button"
                onClick={onCta}
                className={cn(pcmButton, HERO_CTA_BTN)}
              >
                {ctaLabel}
              </Button>
            )}
          </div>
        )}
        {showBpButton && (
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
      {stats.length > 0 && (
        <div className="grid shrink-0 grid-cols-2 gap-3 self-center">
          {stats.map((s, i) => {
            const tone = s.tone ?? (i === 1 ? "positive" : "brand")
            return (
              <div
                key={s.label}
                className="flex w-[112px] flex-col items-center justify-center rounded-[14px] border border-white/16 bg-white/10 px-3 py-4 text-center backdrop-blur-sm"
              >
                <p className={cn("text-[22px] font-bold leading-none tabular-nums", STAT_VALUE_TONE[tone])}>{s.value}</p>
                <p className="mt-1.5 flex items-center justify-center gap-0.5 text-[11px] font-medium leading-snug text-[#AECBDC]">
                  <span>{s.label}</span>
                  <ReasoningTooltip reasoning={s.reasoning} iconClassName="text-[#AECBDC]/70" label={`Why ${s.label}`} />
                </p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
