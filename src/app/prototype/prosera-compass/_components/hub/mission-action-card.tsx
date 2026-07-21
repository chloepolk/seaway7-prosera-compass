"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { FlightPath, type FlightPathStep } from "@/components/ui/prosera/flight-path"
import { Avatar, AvatarFallback } from "@/components/ui/prosera/avatar"
import { cn } from "@/lib/utils"
import { formatCurrency, getInitials } from "@/app/prototype/prosera-compass/_diamond/stages"
import { expandPanelMotion, EXPAND_DURATION_MS } from "../motion"
import type { AuditEntry, ActionTimelineEntry } from "./hub-types"
import { employeeById, employeeByRole, type Employee } from "@/app/prototype/prosera-compass/data/_people"
import { AssigneePicker } from "./assignee-picker"
import { ActionCompletionTimeline } from "./action-completion-timeline"
import { BluePilotMark } from "../bluepilot-mark"
import { ReasoningExpand, BluePilotReasoningButton, ReasoningTooltip, type ReasoningContent } from "../reasoning-disclosure"
import { isReasoningEmpty } from "../reasoning-helpers"
import type { MissionObjective } from "@/app/prototype/prosera-compass/_diamond/types"
import { VALUE_AMOUNT_BOX, VALUE_AMOUNT_TEXT } from "../value-tones"
import { ACTIVE_USER, displayName, NOTIFY_DELEGATE } from "./active-user"
import { employeeForCurrentTimelineStep } from "./mission-timeline-helpers"
import { EmailIcon, SlackIcon, TeamsIcon } from "./brand-icons"

export interface MissionActionCardProps extends React.HTMLAttributes<HTMLElement> {
  rank: number
  title: string
  narrative: string
  valueChip: string
  valueType?: MissionObjective
  statusLabel?: string
  statusTone?: "on_track" | "at_risk" | "overdue"
  stageLabel?: string
  flightPathSteps: FlightPathStep[]
  currentFlightStepId: string
  owner: string
  ownerRole?: string
  confidence?: number
  cost?: number
  risk?: string
  reasoning?: ReasoningContent
  expanded?: boolean
  onToggleExpand?: () => void
  showAssignPanel?: boolean
  /** Prominent workflow action (e.g. "Draft ITT") rendered ahead of the standard actions. */
  primaryActionLabel?: string
  onPrimaryAction?: () => void
  onEditClick?: () => void
  onAssignClick?: () => void
  onEmailClick?: () => void
  onCompleteClick?: () => void
  isAssignedToYou?: boolean
  auditEntries?: AuditEntry[]
  onViewAudit?: () => void
  isCompleted?: boolean
  timelineEntries?: ActionTimelineEntry[]
  isReconciling?: boolean
  reconcilePhase?: string
}

const STATUS_CLS = {
  on_track: "bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)]",
  at_risk: "bg-[var(--color-tint-warning)] text-[var(--color-accent-warning-text)]",
  overdue: "bg-[var(--color-tint-critical)] text-[var(--color-accent-critical-text)]",
}

const COMPLETED_STATUS_CLS = "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]"

export function MissionActionCard({
  rank,
  title,
  narrative,
  valueChip,
  valueType = "protection",
  statusLabel = "ON TRACK",
  statusTone = "on_track",
  stageLabel,
  flightPathSteps,
  currentFlightStepId,
  owner,
  ownerRole,
  confidence,
  risk,
  reasoning,
  expanded = false,
  onToggleExpand,
  showAssignPanel = false,
  primaryActionLabel,
  onPrimaryAction,
  onEditClick,
  onAssignClick,
  onEmailClick,
  onCompleteClick,
  isAssignedToYou = false,
  auditEntries = [],
  onViewAudit,
  isCompleted = false,
  timelineEntries = [],
  isReconciling = false,
  reconcilePhase,
  className,
  ...props
}: MissionActionCardProps) {
  const displayOwner = displayName(owner)
  const initials = isAssignedToYou ? "Y" : getInitials(owner)
  const panelMotion = expandPanelMotion()
  const [contentMounted, setContentMounted] = React.useState(expanded)
  const [closing, setClosing] = React.useState(false)
  const assignPanelRef = React.useRef<HTMLDivElement>(null)
  const [wantsAssignScroll, setWantsAssignScroll] = React.useState(false)
  const [reasoningOpen, setReasoningOpen] = React.useState(false)
  const hasReasoning = !isReasoningEmpty(reasoning)

  const assignOwnerRole = React.useMemo(() => {
    const current = timelineEntries.find((e) => e.status === "current")
    return current?.assigneeRole ?? ownerRole ?? ""
  }, [timelineEntries, ownerRole])
  const defaultEmployee = React.useMemo(() => {
    const fromTimeline = employeeForCurrentTimelineStep(timelineEntries)
    if (fromTimeline) return fromTimeline
    return ownerRole ? employeeByRole(ownerRole) : undefined
  }, [timelineEntries, ownerRole])
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState<string | undefined>(defaultEmployee?.id)
  const selectedAssignee = React.useMemo(
    () => (selectedAssigneeId ? employeeById(selectedAssigneeId) : defaultEmployee),
    [selectedAssigneeId, defaultEmployee],
  )
  const notifyTarget = React.useMemo(() => {
    if (!selectedAssignee) return null
    if (selectedAssignee.id === ACTIVE_USER.id) return NOTIFY_DELEGATE
    return selectedAssignee
  }, [selectedAssignee])

  React.useEffect(() => {
    setSelectedAssigneeId(defaultEmployee?.id)
  }, [defaultEmployee?.id, assignOwnerRole])

  React.useEffect(() => {
    if (expanded) {
      setContentMounted(true)
      setClosing(false)
      return
    }
    if (!contentMounted) return
    setClosing(true)
    const id = window.setTimeout(() => {
      setContentMounted(false)
      setClosing(false)
    }, EXPAND_DURATION_MS)
    return () => window.clearTimeout(id)
  }, [expanded, contentMounted])

  React.useEffect(() => {
    if (expanded && wantsAssignScroll) {
      const id = window.setTimeout(() => {
        assignPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        setWantsAssignScroll(false)
      }, EXPAND_DURATION_MS)
      return () => window.clearTimeout(id)
    }
  }, [expanded, wantsAssignScroll])

  const showDetailRow = confidence != null || risk
  const actionButtonClass =
    "h-[29px] rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-[11px] text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"

  return (
    <article
      className={cn(
        "rounded-[14px] border px-[18px] py-4 shadow-[0_6px_16px_rgba(26,38,64,0.05)]",
        isCompleted
          ? "border-[var(--color-accent-positive)]/25 bg-[var(--color-tint-positive)]/20"
          : "border-[var(--color-border-default)] bg-[var(--color-bg-surface)]",
        className,
      )}
      {...props}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-[var(--color-bg-subtle)] text-[12px] font-bold tabular-nums text-[var(--color-text-secondary)]">
          {rank}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold leading-snug text-[var(--color-text-primary)]">{title}</h2>
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--color-bg-subtle)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)]">
            <Avatar className="size-4 shrink-0">
              <AvatarFallback className="bg-[var(--color-bg-inverse)] text-[8px] font-semibold text-[var(--color-text-inverse)]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span>
              {isAssignedToYou ? (
                <span className="font-medium text-[var(--color-text-primary)]">Assigned to you</span>
              ) : (
                <>
                  <span className="font-medium text-[var(--color-text-primary)]">{displayOwner}</span>
                  {" assigned"}
                </>
              )}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span
            className={cn(
              "rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide",
              isCompleted ? COMPLETED_STATUS_CLS : STATUS_CLS[statusTone],
            )}
          >
            {isCompleted ? "LANDED" : statusLabel}
          </span>
          <span className={cn(VALUE_AMOUNT_BOX, "text-[15px]", VALUE_AMOUNT_TEXT[valueType])}>
            {valueChip}
          </span>
          <SafeIcon
            name={expanded ? "ChevronUp" : "ChevronDown"}
            className="size-4 text-[var(--color-text-muted)]"
          />
        </div>
      </button>

      <p className={cn("mt-3 pl-9 text-[13px] leading-relaxed text-[var(--color-text-muted)]", isReconciling && "opacity-60")}>
        {narrative}
      </p>

      {isReconciling && (
        <div className="mt-3 ml-9 flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-strong)]/20 bg-[var(--color-tint-brand)] px-3 py-2">
          <BluePilotMark size={16} className="shrink-0 text-[var(--color-brand-strong)]" />
          <span className="text-[11px] font-medium text-[var(--color-brand-strong)]">
            {reconcilePhase ?? "BluePilot is updating this action…"}
          </span>
          <span className="ml-auto inline-block size-1.5 animate-pulse rounded-full bg-[var(--color-brand-strong)]" />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 pl-9">
        <div className="flex min-w-0 flex-1">
          <FlightPath
            steps={flightPathSteps}
            currentStepId={currentFlightStepId}
            variant="horizontal"
            showLabels={false}
            completed={isCompleted}
            timelineClassName="max-w-[260px]"
            suffix={
              stageLabel ? (
                <span className="shrink-0 whitespace-nowrap text-[12px] font-medium text-[var(--color-text-secondary)]">
                  {stageLabel}
                </span>
              ) : undefined
            }
          />
        </div>
        <div className="flex items-center gap-1.5">
          {!isCompleted && !isReconciling && (
            <>
              {primaryActionLabel && onPrimaryAction && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onPrimaryAction}
                  className="h-[29px] rounded-[8px] bg-[var(--color-brand-primary)] px-[13px] text-[12px] font-semibold text-[var(--color-brand-onPrimary)] hover:opacity-90"
                >
                  <SafeIcon name="FileSignature" className="h-3.5 w-3.5" />
                  {primaryActionLabel}
                </Button>
              )}
              {isAssignedToYou && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCompleteClick}
                  className={cn(actionButtonClass, "text-[var(--color-accent-positive-text)]")}
                >
                  Mark as Complete
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={onEditClick} className={actionButtonClass}>
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onAssignClick?.()
                  setWantsAssignScroll(true)
                }}
                className={actionButtonClass}
              >
                Assign
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onEmailClick} className={actionButtonClass}>
                Email
              </Button>
            </>
          )}
          {hasReasoning && (
            <BluePilotReasoningButton
              open={reasoningOpen}
              onClick={(e) => {
                e.stopPropagation()
                setReasoningOpen((v) => !v)
              }}
              className={actionButtonClass}
            />
          )}
        </div>
      </div>

      {hasReasoning && (
        <ReasoningExpand
          reasoning={reasoning}
          trigger="none"
          open={reasoningOpen}
          onOpenChange={setReasoningOpen}
          className="pl-9"
        />
      )}

      <div
        className={cn(
          "pcm-expand-grid grid transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {contentMounted && (
            <div
              data-state={closing ? "closed" : "open"}
              className={cn(
                panelMotion.className,
                "mt-4 space-y-4 border-t border-[var(--color-border-default)] pt-4",
              )}
              style={panelMotion.style}
            >
              {auditEntries.length > 0 && (
                <button
                  type="button"
                  onClick={onViewAudit}
                  className="text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:underline"
                >
                  View audit ({auditEntries.length})
                </button>
              )}
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-0">
                <div className="border-b border-[var(--color-border-default)] pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
                  <p
                    aria-hidden
                    className="text-[10px] font-semibold uppercase tracking-wider text-transparent select-none"
                  >
                    Actions taken
                  </p>
                  <div className="mt-2 flex max-h-[220px] items-center">
                    <FlightPath
                      steps={flightPathSteps}
                      currentStepId={currentFlightStepId}
                      variant="curved"
                      showLabels
                      size="compact"
                      completed={isCompleted}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="lg:pl-4">
                  <ActionCompletionTimeline entries={timelineEntries} />
                </div>
              </div>
              {showDetailRow && (
                <div className="grid grid-cols-3 gap-3">
                  {confidence != null && (
                    <div className="rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Confidence</p>
                      <p className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                        {Math.round(confidence * 100)}%
                      </p>
                    </div>
                  )}
                  {risk && (
                    <div className="rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Risk</p>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--color-text-secondary)]">
                        {risk}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {showAssignPanel && !isCompleted && (
                <div ref={assignPanelRef} className="grid gap-4 lg:grid-cols-[1fr_300px]">
                  <div className="rounded-[12px] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3">
                    <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Assign to</p>
                    <AssigneePicker
                      className="mt-2"
                      ownerRole={assignOwnerRole}
                      selectedId={selectedAssignee?.id}
                      onSelect={(employee: Employee) => setSelectedAssigneeId(employee.id)}
                    />
                  </div>
                  <div className="rounded-[12px] bg-[var(--color-bg-inverse)] p-4 text-[var(--color-text-inverse)]">
                    <p className="text-[14px] font-semibold">Notify assignee</p>
                    <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-text-inverse)]/70">
                      {notifyTarget ? (
                        <>
                          An email will be sent to {displayName(notifyTarget.name)} ({notifyTarget.email}) with the
                          action, target, and deadline.
                        </>
                      ) : (
                        <>Select an assignee to preview the notification.</>
                      )}
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button
                        type="button"
                        onClick={onEmailClick}
                        className="w-full rounded-[10px] bg-[#475569] text-[13px] font-semibold text-white hover:bg-[#334155]"
                      >
                        <EmailIcon size={14} />
                        Send via Email
                      </Button>
                      <Button
                        type="button"
                        className="w-full rounded-[10px] bg-[#611F69] text-[13px] font-semibold text-white hover:bg-[#4A154B]"
                      >
                        <SlackIcon size={14} />
                        Send via Slack
                      </Button>
                      <Button
                        type="button"
                        className="w-full rounded-[10px] bg-[#5059C9] text-[13px] font-semibold text-white hover:bg-[#464EB8]"
                      >
                        <TeamsIcon size={14} />
                        Send via Teams
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
