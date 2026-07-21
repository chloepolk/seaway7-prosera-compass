import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import { ReasoningExpand } from "@/app/prototype/prosera-compass/_components/reasoning-disclosure"
import { reasoningFromExpansionAction } from "@/app/prototype/prosera-compass/_components/reasoning-helpers"

export interface ActionCardAction {
  action: string
  lever: "M&A" | "Sales" | "Pricing" | "Operations"
  rationale: string
  expectedImpact: string
  math?: string
  sources: ("BLS" | "Census" | "EIA" | "Internal")[]
  confidence: "high" | "medium" | "low"
}

const leverIcons: Record<ActionCardAction["lever"], string> = {
  "M&A": "Building2",
  Sales: "Target",
  Pricing: "DollarSign",
  Operations: "Settings",
}

const leverTagStyles: Record<ActionCardAction["lever"], string> = {
  "M&A": "bg-[var(--color-tint-info)] text-[var(--color-accent-info)]",
  Sales: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive)]",
  Pricing: "bg-[var(--color-tint-warning)] text-[var(--color-accent-warning)]",
  Operations: "bg-[var(--color-tint-neutral)] text-[var(--color-text-secondary)]",
}

const leverIconStyles: Record<ActionCardAction["lever"], string> = {
  "M&A": "bg-[var(--color-tint-info)] text-[var(--color-accent-info)]",
  Sales: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive)]",
  Pricing: "bg-[var(--color-tint-warning)] text-[var(--color-accent-warning)]",
  Operations: "bg-[var(--color-tint-neutral)] text-[var(--color-text-secondary)]",
}

const confidenceStyles: Record<ActionCardAction["confidence"], string> = {
  high: "text-[var(--color-accent-positive)]",
  medium: "text-[var(--color-accent-warning)]",
  low: "text-[var(--color-text-muted)]",
}

const sourceStyles: Record<string, string> = {
  BLS: "bg-[var(--color-tint-info)] text-[var(--color-accent-info)]",
  Census: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive)]",
  EIA: "bg-[var(--color-tint-warning)] text-[var(--color-accent-warning)]",
  Internal: "bg-[var(--color-tint-neutral)] text-[var(--color-text-muted)]",
}

export function ActionCard({ action }: { action: ActionCardAction }) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 shadow-[0_6px_16px_rgba(26,38,64,0.05)]">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[14px] font-semibold leading-snug text-[var(--color-text-primary)]">
          {action.action}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-[6px] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3px]",
            leverTagStyles[action.lever],
          )}
        >
          {action.lever}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-[12px]",
            leverIconStyles[action.lever],
          )}
        >
          <SafeIcon name={leverIcons[action.lever] ?? "Zap"} className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 rounded-[10px] bg-[var(--color-bg-subtle)] px-3.5 py-2.5">
          <p className="text-[13px] font-semibold leading-snug text-[var(--color-text-primary)]">
            {action.expectedImpact}
          </p>
        </div>
      </div>

      <ReasoningExpand reasoning={reasoningFromExpansionAction(action)} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span className={cn("font-medium", confidenceStyles[action.confidence])}>
          {action.confidence} confidence
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {action.sources.filter(s => s !== "Internal").map(src => (
            <span
              key={src}
              className={cn(
                "inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px]",
                sourceStyles[src],
              )}
            >
              {src}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
