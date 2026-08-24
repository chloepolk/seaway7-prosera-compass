"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { FlightPath, type FlightPathStep } from "@/components/ui/prosera/flight-path"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/prosera/avatar"
import { cn } from "@/lib/utils"
import { formatCurrency, getInitials } from "@/app/prototype/prosera-compass/_diamond/stages"
import { expandPanelMotion, EXPAND_DURATION_MS } from "../motion"
import type { AuditEntry, ActionTimelineEntry } from "./hub-types"
import { employeeById, employeeByRole, EMPLOYEES, type Employee } from "@/app/prototype/prosera-compass/data/_people"
import { AssigneePicker } from "./assignee-picker"
import { ActionCompletionTimeline } from "./action-completion-timeline"
import { BluePilotMark } from "../bluepilot-mark"
import { ReasoningExpand, BluePilotReasoningButton, ReasoningTooltip, type ReasoningContent } from "../reasoning-disclosure"
import { isReasoningEmpty } from "../reasoning-helpers"
import type { MissionObjective } from "@/app/prototype/prosera-compass/_diamond/types"
import { VALUE_BADGE_CLS, VALUE_BADGE_LABEL, valueBadgeAmount } from "../value-tones"
import { ACTIVE_USER, displayName, NOTIFY_DELEGATE } from "./active-user"
import { avatarColor, avatarSrcFor } from "./avatar-color"
import { employeeForCurrentTimelineStep } from "./mission-timeline-helpers"
import { EmailIcon, SlackIcon, TeamsIcon } from "./brand-icons"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/prosera/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/prosera/sheet"

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
  /** Prominent workflow action (e.g. "Draft ITT") rendered ahead of the overflow menu. */
  primaryActionLabel?: string
  onPrimaryAction?: () => void
  onEditClick?: () => void
  onEmailClick?: () => void
  onCompleteClick?: () => void
  isAssignedToYou?: boolean
  auditEntries?: AuditEntry[]
  onViewAudit?: () => void
  isCompleted?: boolean
  timelineEntries?: ActionTimelineEntry[]
  isReconciling?: boolean
  reconcilePhase?: string
  /** Award-governance status chip (Procurement review, Approval required, …). */
  governanceChip?: React.ReactNode
  /** One-line definition of the current award-governance status. */
  governanceNote?: string
  /** Inline award-approval body (clarification, revision, approver actions). */
  governancePanel?: React.ReactNode
  evaluateBidsLabel?: string
  onEvaluateBids?: () => void
}

// White fill with a semantic-coloured outline + text (renders white on light,
// adapts on dark via the surface token — keeps the label legible either way).
const STATUS_CLS = {
  on_track: "border border-[var(--color-brand-strong)] bg-[var(--color-bg-surface)] text-[var(--color-brand-strong)]",
  at_risk: "border border-[var(--color-accent-warning-text)] bg-[var(--color-bg-surface)] text-[var(--color-accent-warning-text)]",
  overdue: "border border-[var(--color-accent-critical-text)] bg-[var(--color-bg-surface)] text-[var(--color-accent-critical-text)]",
}

const COMPLETED_STATUS_CLS = "border border-[var(--color-accent-positive-text)] bg-[var(--color-bg-surface)] text-[var(--color-accent-positive-text)]"

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
  primaryActionLabel,
  onPrimaryAction,
  onEditClick,
  onEmailClick,
  onCompleteClick,
  isAssignedToYou = false,
  auditEntries = [],
  onViewAudit,
  isCompleted = false,
  timelineEntries = [],
  isReconciling = false,
  reconcilePhase,
  governanceChip,
  governanceNote,
  governancePanel,
  evaluateBidsLabel,
  onEvaluateBids,
  className,
  ...props
}: MissionActionCardProps) {
  const displayOwner = displayName(owner)
  const ownerAvatarSrc = avatarSrcFor(owner, EMPLOYEES, ACTIVE_USER.name)
  const initials = isAssignedToYou ? "Y" : getInitials(owner)
  const panelMotion = expandPanelMotion()
  const [contentMounted, setContentMounted] = React.useState(expanded)
  const [closing, setClosing] = React.useState(false)
  const [assignDrawerOpen, setAssignDrawerOpen] = React.useState(false)
  const [reasoningOpen, setReasoningOpen] = React.useState(false)
  const [narrativeOpen, setNarrativeOpen] = React.useState(false)
  const hasReasoning = !isReasoningEmpty(reasoning)
  // Long summaries collapse to a single line with a "Show details" toggle.
  const narrativeIsLong = narrative.trim().length > 90

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
              {ownerAvatarSrc ? <AvatarImage src={ownerAvatarSrc} alt="" /> : null}
              <AvatarFallback className={cn(avatarColor(owner), "text-[8px] font-semibold text-white")}>
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
          {governanceChip}
          <span
            className={cn(
              "rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide",
              isCompleted ? COMPLETED_STATUS_CLS : STATUS_CLS[statusTone],
            )}
          >
            {isCompleted ? "LANDED" : statusLabel}
          </span>
          <span
            className={cn(
              "inline-flex items-baseline gap-1.5 rounded-[8px] px-2.5 py-1.5",
              VALUE_BADGE_CLS[valueType],
            )}
          >
            <span className="text-[15px] font-bold tabular-nums">
              {valueBadgeAmount(valueChip, valueType)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
              {VALUE_BADGE_LABEL[valueType]}
            </span>
          </span>
          <SafeIcon
            name={expanded ? "ChevronUp" : "ChevronDown"}
            className="size-4 text-[var(--color-text-muted)]"
          />
        </div>
      </button>

      <div className={cn("mt-3 pl-9", isReconciling && "opacity-60")}>
        <p
          className={cn(
            "text-[13px] leading-relaxed text-[var(--color-text-muted)]",
            narrativeIsLong && !narrativeOpen && "line-clamp-1",
          )}
        >
          {narrative}
        </p>
        {governanceNote && (
          <p className="mt-1.5 text-[12px] text-[var(--color-text-secondary)]">{governanceNote}</p>
        )}
        {governancePanel}
        {narrativeIsLong && (
          <button
            type="button"
            onClick={() => setNarrativeOpen((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <SafeIcon name={narrativeOpen ? "ChevronUp" : "ChevronDown"} className="size-3" />
            {narrativeOpen ? "Hide details" : "Show details"}
          </button>
        )}
      </div>

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
            showPlane={false}
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
                  variant="ghost"
                  size="sm"
                  onClick={onPrimaryAction}
                  className="h-[29px] rounded-[8px] bg-[var(--color-bg-inverse)] px-[13px] text-[12px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90"
                >
                  <SafeIcon name="FileSignature" className="h-3.5 w-3.5" />
                  {primaryActionLabel}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAssignDrawerOpen(true)}
                className={cn(actionButtonClass, "gap-1 text-[var(--color-text-primary)]")}
              >
                <SafeIcon name="UserPlus" className="h-3.5 w-3.5" />
                Reassign
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="More actions"
                    className={cn(actionButtonClass, "px-2")}
                  >
                    <SafeIcon name="MoreHorizontal" className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {isAssignedToYou && (
                    <DropdownMenuItem
                      onClick={onCompleteClick}
                      className="text-[var(--color-accent-positive-text)]"
                    >
                      <SafeIcon name="CheckCircle2" className="h-4 w-4" />
                      Mark as complete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onEditClick}>
                    <SafeIcon name="Pencil" className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEmailClick}>
                    <SafeIcon name="Mail" className="h-4 w-4" />
                    Notify
                  </DropdownMenuItem>
                  {onEvaluateBids && evaluateBidsLabel && (
                    <DropdownMenuItem onClick={onEvaluateBids}>
                      <SafeIcon name="Scale" className="h-4 w-4" />
                      {evaluateBidsLabel}
                    </DropdownMenuItem>
                  )}
                  {hasReasoning && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setReasoningOpen((v) => !v)}>
                        <SafeIcon name="Sparkles" className="h-4 w-4" />
                        {reasoningOpen ? "Hide" : "Show"} BluePilot reasoning
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {isCompleted && hasReasoning && (
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
              <ActionCompletionTimeline entries={timelineEntries} />
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
            </div>
          )}
        </div>
      </div>

      {/* Reassign slide-over: opens only from the overflow menu, keeping the card itself clean. */}
      <Sheet open={assignDrawerOpen} onOpenChange={setAssignDrawerOpen}>
        <SheetContent side="right" className="flex w-[400px] max-w-[400px] flex-col gap-0 p-0">
          <SheetHeader className="shrink-0 border-b border-[var(--color-border-default)] px-4 py-3">
            <SheetTitle className="text-[15px] font-semibold">Reassign action</SheetTitle>
            <p className="truncate text-[12px] text-[var(--color-text-muted)]">{title}</p>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="rounded-[12px] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3">
              <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Assign to
              </p>
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
                  onClick={() => {
                    setAssignDrawerOpen(false)
                    onEmailClick?.()
                  }}
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
        </SheetContent>
      </Sheet>
    </article>
  )
}
