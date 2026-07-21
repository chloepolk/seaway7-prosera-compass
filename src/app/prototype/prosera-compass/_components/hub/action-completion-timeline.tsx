"use client"

import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Avatar, AvatarFallback } from "@/components/ui/prosera/avatar"
import { cn } from "@/lib/utils"
import { getInitials } from "@/app/prototype/prosera-compass/_diamond/stages"
import type { ActionTimelineEntry, AgentTimelineSubEntry, TimelineEntryStatus } from "./hub-types"
import { displayName } from "./active-user"

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function TimelineNode({
  status,
  initials,
}: {
  status: TimelineEntryStatus
  initials: string
}) {
  if (status === "done") {
    return (
      <div className="relative z-[1] flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]">
        <SafeIcon name="Check" className="size-3" />
      </div>
    )
  }

  if (status === "current") {
    return (
      <div className="relative z-[1] flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-flight-current)] bg-[var(--color-bg-surface)]">
        <Avatar className="size-4">
          <AvatarFallback className="bg-[var(--color-bg-inverse)] text-[7px] font-semibold text-[var(--color-text-inverse)]">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    )
  }

  return (
    <div className="relative z-[1] flex size-[22px] shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--color-border-default)] bg-transparent">
      <span className="size-1.5 rounded-full bg-[var(--color-text-muted)]/40" />
    </div>
  )
}

function connectorClass(prev: TimelineEntryStatus, next: TimelineEntryStatus): string {
  const base = "absolute left-[11px] top-6 bottom-0 w-px"
  if (prev === "done" && next === "done") {
    return cn(base, "bg-[var(--color-border-default)]")
  }
  return cn(base, "border-l border-dashed border-[var(--color-border-default)]")
}

function AgentSubRow({ agent }: { agent: AgentTimelineSubEntry }) {
  const isDone = agent.status === "done"
  const isCurrent = agent.status === "current"
  const isUpcoming = agent.status === "upcoming"

  return (
    <div className="mt-2 flex gap-2 border-l-2 border-dashed border-[var(--color-border-default)] pl-2.5">
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
          isDone && "bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)]",
          isCurrent && "border border-dashed border-[var(--color-brand-strong)] bg-[var(--color-tint-brand)]/40",
          isUpcoming && "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]",
        )}
      >
        <SafeIcon name="Bot" className="size-2.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-brand-strong)]">
          BluePilot
        </p>
        <p
          className={cn(
            "mt-0.5 text-[11px] leading-snug",
            isUpcoming ? "text-[var(--color-text-muted)]" : "font-medium text-[var(--color-text-secondary)]",
          )}
        >
          {agent.label}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-text-secondary)]">{displayName(agent.assignee)}</span>
          {agent.assigneeRole ? ` · ${agent.assigneeRole}` : null}
          {isDone && agent.completedAt ? ` · ${formatDate(agent.completedAt)}` : null}
          {isCurrent ? (
            <span className="font-medium text-[var(--color-brand-strong)]"> · In progress</span>
          ) : null}
          {!isDone && !isCurrent && agent.dueAt ? ` · Due ${formatDate(agent.dueAt)}` : null}
        </p>
      </div>
    </div>
  )
}

export function ActionCompletionTimeline({
  entries,
  className,
}: {
  entries: ActionTimelineEntry[]
  className?: string
}) {
  if (entries.length === 0) {
    return (
      <div className={cn("rounded-[12px] border border-dashed border-[var(--color-border-default)] px-3 py-6 text-center", className)}>
        <p className="text-[11px] text-[var(--color-text-muted)]">No timeline steps yet.</p>
      </div>
    )
  }

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Actions taken
      </p>
      <ol className="mt-2 max-h-[220px] space-y-0 overflow-y-auto pr-1" aria-label="Action timeline">
        {entries.map((entry, i) => {
          const isLast = i === entries.length - 1
          const initials = getInitials(displayName(entry.assignee))
          const isDone = entry.status === "done"
          const isCurrent = entry.status === "current"
          const isUpcoming = entry.status === "upcoming"

          return (
            <li key={entry.id} className="relative flex gap-2.5 pb-3">
              {!isLast && (
                <span
                  aria-hidden
                  className={connectorClass(entry.status, entries[i + 1]!.status)}
                />
              )}
              <TimelineNode status={entry.status} initials={initials} />
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-[12px] font-medium leading-snug",
                    isDone && "text-[var(--color-text-primary)]",
                    isCurrent && "text-[var(--color-text-primary)]",
                    isUpcoming && "text-[var(--color-text-muted)]",
                  )}
                >
                  {entry.label}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--color-text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Avatar className={cn("size-4", isUpcoming && "opacity-60")}>
                      <AvatarFallback className="bg-[var(--color-bg-inverse)] text-[7px] font-semibold text-[var(--color-text-inverse)]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(isUpcoming && "opacity-70")}>
                      <span className="font-medium text-[var(--color-text-secondary)]">{displayName(entry.assignee)}</span>
                      {entry.assigneeRole ? ` · ${entry.assigneeRole}` : null}
                    </span>
                  </span>
                  {isDone && entry.completedAt ? (
                    <span>{formatDate(entry.completedAt)}</span>
                  ) : null}
                  {isCurrent ? (
                    <span className="font-medium text-[var(--color-brand-strong)]">In progress</span>
                  ) : null}
                  {isCurrent && entry.dueAt ? (
                    <span>Due {formatDate(entry.dueAt)}</span>
                  ) : null}
                  {isUpcoming && entry.dueAt ? (
                    <span>Due {formatDate(entry.dueAt)}</span>
                  ) : null}
                  {entry.stageLabel ? (
                    <span
                      className={cn(
                        "rounded px-1 py-px text-[9px] font-medium uppercase tracking-wide",
                        isUpcoming
                          ? "bg-[var(--color-bg-subtle)]/60 text-[var(--color-text-muted)]"
                          : "bg-[var(--color-bg-subtle)]",
                      )}
                    >
                      {entry.stageLabel}
                    </span>
                  ) : null}
                </div>
                {entry.agentSteps && entry.agentSteps.length > 0 ? (
                  <div className="mt-1">
                    {entry.agentSteps.map((agent) => (
                      <AgentSubRow key={agent.id} agent={agent} />
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
