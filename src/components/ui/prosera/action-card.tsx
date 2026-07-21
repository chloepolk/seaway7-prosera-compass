"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { FlightPath, type FlightPathStep } from "@/components/ui/prosera/flight-path"
import { cn } from "@/lib/utils"

export type ActionCardSeverity = "critical" | "high" | "medium" | "info"

const severityVariants = cva(
  "rounded-[6px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
  {
    variants: {
      severity: {
        critical: "bg-tint-critical text-accent-critical-text",
        high: "bg-tint-warning text-accent-warning-text",
        medium: "bg-tint-brand text-brand-strong",
        info: "bg-tint-neutral text-muted-foreground",
      },
    },
    defaultVariants: { severity: "info" },
  },
)

export interface ActionCardProps extends React.HTMLAttributes<HTMLElement> {
  rank?: number
  title: string
  narrative?: string
  severity?: ActionCardSeverity
  category?: string
  valueChip?: string
  assignee?: string
  assigneeRole?: string
  flightPathSteps?: FlightPathStep[]
  currentFlightStepId?: string
  flightPathVariant?: "horizontal" | "curved"
  onEdit?: () => void
  onAssign?: () => void
  onEmail?: () => void
  footer?: React.ReactNode
}

const ActionCard = React.forwardRef<HTMLElement, ActionCardProps>(
  (
    {
      rank,
      title,
      narrative,
      severity = "info",
      category,
      valueChip,
      assignee,
      assigneeRole = "accountable",
      flightPathSteps,
      currentFlightStepId,
      flightPathVariant = "horizontal",
      onEdit,
      onAssign,
      onEmail,
      footer,
      className,
      ...props
    },
    ref,
  ) => {
    const showFlightPath =
      Boolean(flightPathSteps && flightPathSteps.length > 0 && currentFlightStepId)

    const showFooter = Boolean(assignee || onEdit || onAssign || onEmail || footer)

    return (
      <article
        ref={ref}
        className={cn(
          "rounded-[16px] border border-border bg-card p-5 shadow-[0_6px_16px_rgba(26,38,64,0.05)]",
          className,
        )}
        {...props}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {rank != null && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-bold tabular-nums text-muted-foreground">
                {rank}
              </span>
            )}
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-semibold leading-snug text-foreground">{title}</h2>
                <span className={cn(severityVariants({ severity }))}>{severity}</span>
                {category && (
                  <span className="rounded-[6px] bg-tint-neutral px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {category}
                  </span>
                )}
              </div>
              {narrative && (
                <p className="text-[13px] leading-relaxed text-muted-foreground">{narrative}</p>
              )}
            </div>
          </div>
          {valueChip && (
            <span className="shrink-0 rounded-[10px] bg-tint-positive px-3 py-1.5 text-[13px] font-semibold tabular-nums text-accent-positive">
              {valueChip}
            </span>
          )}
        </div>

        {showFlightPath && (
          <div className="mt-4 overflow-x-auto border-t border-border pt-4">
            <FlightPath
              steps={flightPathSteps!}
              currentStepId={currentFlightStepId!}
              variant={flightPathVariant}
            />
          </div>
        )}

        {showFooter && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {assignee ? (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className="rounded-full bg-sidebar px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sidebar-foreground">
                  A
                </span>
                <span className="font-medium text-foreground">{assignee}</span>
                <span>· {assigneeRole}</span>
              </div>
            ) : (
              <div />
            )}
            {footer ?? (
              <div className="flex items-center gap-1.5">
                {onEdit && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={onEdit}>
                    <SafeIcon name="Pencil" className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                {onAssign && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={onAssign}>
                    <SafeIcon name="UserPlus" className="h-3.5 w-3.5" />
                    Assign
                  </Button>
                )}
                {onEmail && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={onEmail}>
                    <SafeIcon name="Mail" className="h-3.5 w-3.5" />
                    Email
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </article>
    )
  },
)
ActionCard.displayName = "ActionCard"

export { ActionCard, severityVariants }
