"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/prosera/tooltip"
import { cn } from "@/lib/utils"
import { isReasoningEmpty } from "./reasoning-helpers"
import { BluePilotMark } from "./bluepilot-mark"
import { useStore, type Page } from "../_store"
import { citationFromLabel, type ReasoningCitation } from "./source-citations"

export type { ReasoningCitation } from "./source-citations"

export interface ReasoningContent {
  /** One-line framing of how this was derived. */
  summary?: string
  /** Ordered reasoning chain (analysis steps). */
  steps?: string[]
  /** Supporting data points or observations. */
  evidence?: string[]
  /** Recommended action or takeaway. */
  conclusion?: string
  /** Data sources referenced (legacy plain labels). */
  sources?: string[]
  /** Traceable works-cited entries with hyperlinks. */
  citations?: ReasoningCitation[]
  /** Explicit formulas with substituted values. */
  equations?: string[]
}

const PROVENANCE_CLS: Record<ReasoningCitation["provenance"], string> = {
  internal: "text-[#5BD2F2]",
  external: "text-[#8FE8C8]",
  benchmark: "text-[#F5D78E]",
}

function CitationLink({
  citation,
  variant = "default",
}: {
  citation: ReasoningCitation
  variant?: "default" | "dark"
}) {
  const { setPage, setIntelPanelOpen, setIntelRailSection } = useStore()
  const isDark = variant === "dark"
  const num = citation.id != null ? `[${citation.id}] ` : ""
  const className = cn(
    "inline text-left underline decoration-dotted underline-offset-2 transition hover:decoration-solid",
    isDark ? PROVENANCE_CLS[citation.provenance] : "text-[var(--color-brand-strong)]",
  )

  if (citation.href) {
    return (
      <a href={citation.href} target="_blank" rel="noopener noreferrer" className={className}>
        {num}
        {citation.label}
        <SafeIcon name="ExternalLink" className="ml-1 inline h-2.5 w-2.5 opacity-70" />
      </a>
    )
  }

  if (citation.page) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          setPage(citation.page!)
          setIntelRailSection("context")
          setIntelPanelOpen(true)
        }}
      >
        {num}
        {citation.label}
      </button>
    )
  }

  return (
    <span className={cn("text-[11px]", isDark ? "text-[#AECBDC]" : "text-[var(--color-text-secondary)]")}>
      {num}
      {citation.label}
    </span>
  )
}

function resolveCitations(reasoning: ReasoningContent): ReasoningCitation[] {
  if (reasoning.citations?.length) return reasoning.citations
  if (!reasoning.sources?.length) return []
  return reasoning.sources.map((label, i) => ({
    ...citationFromLabel(label),
    id: i + 1,
  }))
}

function WorksCited({
  reasoning,
  variant = "default",
  defaultOpen = false,
}: {
  reasoning: ReasoningContent
  variant?: "default" | "dark"
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const citations = resolveCitations(reasoning)
  if (citations.length === 0) return null
  const isDark = variant === "dark"

  return (
    <div className={cn(isDark ? "border-t border-white/12 pt-3" : "border-t border-[var(--color-border-default)] pt-2.5")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-[6px] py-1 text-left transition",
          isDark ? "text-[#5BD2F2]/90 hover:text-[#5BD2F2]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider">
          View sources ({citations.length})
        </span>
        <SafeIcon name={open ? "ChevronUp" : "ChevronDown"} className="size-3.5 shrink-0 opacity-70" />
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5">
          {citations.map((c) => (
            <li key={c.key} className="text-[11px] leading-relaxed">
              <CitationLink citation={c} variant={variant} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function ReasoningBody({
  reasoning,
  className,
  textClassName = "text-[var(--color-text-secondary)]",
  labelClassName = "text-[var(--color-text-muted)]",
  variant = "default",
}: {
  reasoning: ReasoningContent
  className?: string
  textClassName?: string
  labelClassName?: string
  variant?: "default" | "dark"
}) {
  const isDark = variant === "dark"
  return (
    <div className={cn("space-y-2", className)}>
      {reasoning.summary && (
        <p className={cn("text-[12px] leading-relaxed", textClassName)}>{reasoning.summary}</p>
      )}
      {reasoning.steps && reasoning.steps.length > 0 && (
        <div className="space-y-1">
          <p className={cn("text-[10px] font-semibold uppercase tracking-wider", labelClassName)}>Analysis</p>
          <ol className="list-decimal space-y-0.5 pl-4 text-[11px] leading-relaxed">
            {reasoning.steps.map((step, i) => (
              <li key={i} className={textClassName}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {reasoning.equations && reasoning.equations.length > 0 && (
        <div className="space-y-1">
          <p className={cn("text-[10px] font-semibold uppercase tracking-wider", labelClassName)}>Calculations</p>
          <ul className="space-y-1 pl-0 text-[11px] leading-relaxed">
            {reasoning.equations.map((eq, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-[6px] px-2 py-1 font-mono text-[10px] leading-snug",
                  isDark ? "bg-white/8 text-[#AECBDC]" : "bg-[var(--color-bg-canvas)] text-[var(--color-text-secondary)]",
                )}
              >
                {eq}
              </li>
            ))}
          </ul>
        </div>
      )}
      {reasoning.evidence && reasoning.evidence.length > 0 && (
        <div className="space-y-1">
          <p className={cn("text-[10px] font-semibold uppercase tracking-wider", labelClassName)}>Evidence</p>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed">
            {reasoning.evidence.map((item, i) => (
              <li key={i} className={textClassName}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {reasoning.conclusion && (
        <div
          className={cn(
            "rounded-[8px] px-2.5 py-2",
            isDark
              ? "border border-white/16 bg-white/10"
              : "bg-[var(--color-bg-subtle)]",
          )}
        >
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              isDark ? "text-[#5BD2F2]" : labelClassName,
            )}
          >
            Recommendation
          </p>
          <p
            className={cn(
              "mt-0.5 text-[11px] leading-relaxed",
              isDark ? "text-white" : textClassName,
            )}
          >
            {reasoning.conclusion}
          </p>
        </div>
      )}
      {(reasoning.citations?.length || reasoning.sources?.length) ? (
        <WorksCited reasoning={reasoning} variant={variant} />
      ) : null}
    </div>
  )
}

function formatTooltipText(reasoning: ReasoningContent): string {
  const parts: string[] = []
  if (reasoning.summary) parts.push(reasoning.summary)
  if (reasoning.steps?.length) parts.push(reasoning.steps.join(" → "))
  if (reasoning.equations?.length) parts.push(reasoning.equations.join(" · "))
  if (reasoning.evidence?.length) parts.push(reasoning.evidence.join(" · "))
  if (reasoning.conclusion) parts.push(reasoning.conclusion)
  return parts.join("\n\n")
}

export interface ReasoningTooltipProps {
  reasoning?: ReasoningContent | null
  side?: "top" | "right" | "bottom" | "left"
  className?: string
  iconClassName?: string
  label?: string
}

/** Compact info-icon trigger — reasoning shown on hover/focus only. */
export function ReasoningTooltip({
  reasoning,
  side = "top",
  className,
  iconClassName,
  label = "Why this value",
}: ReasoningTooltipProps) {
  if (isReasoningEmpty(reasoning)) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.stopPropagation()
          }}
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-secondary)]",
            className,
          )}
          aria-label={label}
        >
          <SafeIcon name="Info" className={cn("size-3", iconClassName)} />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-[280px] whitespace-pre-wrap border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-text-secondary)] shadow-md"
      >
        {formatTooltipText(reasoning!)}
      </TooltipContent>
    </Tooltip>
  )
}

export interface ReasoningExpandProps {
  reasoning?: ReasoningContent | null
  variant?: "default" | "dark" | "compact" | "inline"
  /** How the disclosure trigger renders. `none` = parent supplies the trigger. */
  trigger?: "bluepilot" | "bluepilot-compact" | "none"
  className?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const TOOLBAR_BTN =
  "inline-flex h-[29px] shrink-0 items-center justify-center rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"

const TOOLBAR_BTN_DARK =
  "inline-flex h-[29px] shrink-0 items-center justify-center rounded-[8px] border border-white/16 bg-white/8 px-2 text-[#AECBDC] transition-colors hover:bg-white/12"

const COMPACT_BTN =
  "inline-flex h-6 shrink-0 items-center justify-center rounded-[6px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)]"

const COMPACT_BTN_DARK =
  "inline-flex h-6 shrink-0 items-center justify-center rounded-[6px] border border-white/16 bg-white/8 px-1.5 text-[#AECBDC] transition-colors hover:bg-white/12"

export function BluePilotReasoningButton({
  open = false,
  onClick,
  compact = false,
  dark = false,
  className,
}: {
  open?: boolean
  onClick?: (e: React.MouseEvent) => void
  compact?: boolean
  dark?: boolean
  className?: string
}) {
  const btnCls = compact
    ? dark
      ? COMPACT_BTN_DARK
      : COMPACT_BTN
    : dark
      ? TOOLBAR_BTN_DARK
      : TOOLBAR_BTN

  const iconSize = compact ? 16 : 20

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? "Hide BluePilot reasoning" : "Show BluePilot reasoning"}
      title="BluePilot reasoning"
      className={cn(
        btnCls,
        open && (dark ? "bg-white/12 ring-1 ring-white/20" : "bg-[var(--color-bg-subtle)] ring-1 ring-[var(--color-border-default)]"),
        className,
      )}
    >
      <BluePilotMark size={iconSize} />
    </button>
  )
}

/** Expandable reasoning panel for larger insight and action cards. */
export function ReasoningExpand({
  reasoning,
  variant = "default",
  trigger,
  className,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: ReasoningExpandProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  if (isReasoningEmpty(reasoning)) return null

  const isDark = variant === "dark"
  const isCompact = variant === "compact" || variant === "inline"
  const triggerMode = trigger ?? (isCompact ? "bluepilot-compact" : "bluepilot")
  const showTrigger = triggerMode !== "none"

  const panelTextCls = isDark ? "text-[#AECBDC]" : undefined
  const panelLabelCls = isDark ? "text-[#5BD2F2]" : undefined
  const panelBorderCls = isDark ? "border-white/12" : "border-[var(--color-border-default)]"

  return (
    <div
      className={cn(variant === "inline" ? "" : "mt-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {showTrigger && (
        <BluePilotReasoningButton
          open={open}
          compact={triggerMode === "bluepilot-compact"}
          dark={isDark}
          onClick={() => setOpen(!open)}
        />
      )}

      <div
        className={cn(
          "pcm-expand-grid grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
            <div
              className={cn(
                "space-y-2",
                !isCompact && "mt-2 rounded-[10px] border pt-3",
                !isCompact && panelBorderCls,
                !isCompact && (isDark ? "bg-white/5 px-3 pb-3" : "bg-[var(--color-bg-subtle)] px-3 pb-3"),
                isCompact && "mt-1.5",
              )}
            >
              <ReasoningBody
                reasoning={reasoning!}
                variant={isDark ? "dark" : "default"}
                textClassName={panelTextCls}
                labelClassName={panelLabelCls}
              />
            </div>
        </div>
      </div>
    </div>
  )
}
