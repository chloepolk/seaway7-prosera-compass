"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { enterMotion, pcmCard } from "../motion"
import { MiniVisual } from "../spec-renderer"
import { ReasoningTooltip, type ReasoningContent } from "../reasoning-disclosure"

export interface PriorityCardProps {
  title: string
  tag?: string
  tagTone?: "watch" | "growth" | "pricing" | "process" | "neutral"
  headline: string
  headlineSub?: string
  detail: string
  figureValue?: string
  figureTone?: "good" | "bad" | "neutral"
  reasoning?: ReasoningContent
  editMode?: boolean
  onRemove?: () => void
  className?: string
}

const TAG_CLS: Record<NonNullable<PriorityCardProps["tagTone"]>, string> = {
  watch: "bg-[var(--color-tint-warning)] text-[var(--color-accent-warning-text)]",
  growth: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]",
  pricing: "bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)]",
  process: "bg-[var(--color-tint-info)] text-[var(--color-accent-info-text)]",
  neutral: "bg-[var(--color-tint-neutral)] text-[var(--color-text-muted)]",
}

export function PriorityCard({
  title,
  tag,
  tagTone = "neutral",
  headline,
  headlineSub,
  detail,
  figureValue,
  figureTone = "neutral",
  reasoning,
  editMode,
  onRemove,
  className,
  index = 0,
}: PriorityCardProps & { index?: number }) {
  const motion = enterMotion(index)
  return (
    <article
      className={cn(
        motion.className,
        pcmCard,
        "relative flex flex-col rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 shadow-[0_6px_16px_rgba(26,38,64,0.05)]",
        editMode && "ring-2 ring-[var(--color-brand-primary)]/20",
        className,
      )}
      style={motion.style}
    >
      {editMode && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -left-2 -top-2 flex size-[22px] items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] shadow-sm hover:bg-[var(--color-tint-critical)] hover:text-[var(--color-accent-critical)]"
          aria-label={`Remove ${title}`}
        >
          −
        </button>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-1 text-[14px] font-semibold text-[var(--color-text-primary)]">
          {title}
          <ReasoningTooltip reasoning={reasoning} label={`Why ${title}`} />
        </h3>
        {tag && (
          <span className={cn("shrink-0 rounded-[6px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", TAG_CLS[tagTone])}>
            {tag}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4">
        {figureValue && (
          <div className="h-16 w-16 shrink-0 opacity-90">
            <MiniVisual display={figureValue} fmt={figureValue.includes("%") ? "pct" : undefined} tone={figureTone} compact />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[26px] font-semibold tabular-nums leading-none text-[var(--color-text-primary)]">{headline}</p>
          {headlineSub && <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">{headlineSub}</p>}
        </div>
      </div>
      <p className="mt-4 flex-1 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{detail}</p>
    </article>
  )
}

export function AddTile({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[211px] flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-strong)]",
        className,
      )}
    >
      <span className="text-[32px] font-light leading-none">+</span>
      <span className="mt-2 text-[13px] font-medium">Add tile</span>
    </button>
  )
}
