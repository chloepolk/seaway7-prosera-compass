"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/prosera/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/prosera/collapsible"
import { cn } from "@/lib/utils"
import { getInitials } from "@/app/prototype/future-energy/_diamond/stages"
import { EMPLOYEES } from "@/app/prototype/future-energy/data/_people"
import type { ActionTimelineEntry, AgentTimelineSubEntry, TimelineEntryStatus } from "./hub-types"
import { ACTIVE_USER, displayName } from "./active-user"
import { avatarColor, avatarSrcFor } from "./avatar-color"

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/** Illustrated (or coloured-initial fallback) avatar for every human on the timeline. */
function PersonAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "xs" }) {
  const initials = getInitials(displayName(name) === "You" ? ACTIVE_USER.name : name)
  const src = avatarSrcFor(name, EMPLOYEES, ACTIVE_USER.name)
  return (
    <Avatar className={cn(size === "sm" ? "size-6" : "size-4", "shrink-0")}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className={cn(avatarColor(name), "font-semibold text-white", size === "sm" ? "text-[9px]" : "text-[7px]")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

type PillTone = "done" | "current" | "upcoming"

const PILL_CLS: Record<PillTone, string> = {
  done: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]",
  current: "bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)]",
  upcoming: "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]",
}

function statusPill(status: TimelineEntryStatus, completedAt?: string, dueAt?: string): { label: string; tone: PillTone } {
  if (status === "done") return { label: completedAt ? `Done · ${formatDate(completedAt)}` : "Done", tone: "done" }
  if (status === "current") return { label: "In Progress", tone: "current" }
  return { label: dueAt ? `Due ${formatDate(dueAt)}` : "Pending", tone: "upcoming" }
}

function StatusPill({ status, completedAt, dueAt }: { status: TimelineEntryStatus; completedAt?: string; dueAt?: string }) {
  const { label, tone } = statusPill(status, completedAt, dueAt)
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", PILL_CLS[tone])}>
      {label}
    </span>
  )
}

/** A single BluePilot agent sub-activity inside the shaded AI layer. */
function AgentRow({ agent }: { agent: AgentTimelineSubEntry }) {
  const isDone = agent.status === "done"
  const isCurrent = agent.status === "current"
  return (
    <div className="flex items-start gap-2">
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
          isDone && "bg-[var(--color-brand-strong)] text-white",
          isCurrent && "border border-[var(--color-brand-strong)] bg-white text-[var(--color-brand-strong)]",
          !isDone && !isCurrent && "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]",
        )}
      >
        <SafeIcon name="Bot" className="size-2.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[11px] leading-snug", agent.status === "upcoming" ? "text-[var(--color-text-muted)]" : "font-medium text-[var(--color-text-secondary)]")}>
          {agent.label}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
          {isDone && agent.completedAt ? formatDate(agent.completedAt) : null}
          {isCurrent ? <span className="font-medium text-[var(--color-brand-strong)]">In progress</span> : null}
          {!isDone && !isCurrent && agent.dueAt ? `Due ${formatDate(agent.dueAt)}` : null}
        </p>
      </div>
    </div>
  )
}

function TimelineRow({ entry }: { entry: ActionTimelineEntry }) {
  const hasAgents = !!entry.agentSteps && entry.agentSteps.length > 0

  const header = (
    <div className="flex w-full items-center gap-2.5 text-left">
      <PersonAvatar name={entry.assignee} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">{entry.label}</p>
        <p className="truncate text-[10px] text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-text-secondary)]">{displayName(entry.assignee)}</span>
          {entry.assigneeRole ? ` · ${entry.assigneeRole}` : null}
        </p>
      </div>
      <StatusPill status={entry.status} completedAt={entry.completedAt} dueAt={entry.dueAt} />
      {hasAgents && (
        <SafeIcon
          name="ChevronDown"
          className="size-3.5 shrink-0 text-[var(--color-text-muted)] transition-transform group-data-[state=open]:rotate-180"
        />
      )}
    </div>
  )

  const rowClass = "rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-2"

  if (!hasAgents) {
    return <div className={rowClass}>{header}</div>
  }

  return (
    <Collapsible defaultOpen={entry.status === "current"} className={rowClass}>
      <CollapsibleTrigger className="group w-full">{header}</CollapsibleTrigger>
      <CollapsibleContent>
        {/* Shaded layer differentiates automated BluePilot work from human actions. */}
        <div className="mt-2 space-y-2 rounded-[8px] border border-[var(--color-brand-strong)]/10 bg-[var(--color-tint-brand)]/50 p-2.5">
          <div className="flex items-center gap-1.5">
            <SafeIcon name="Sparkles" className="size-3 text-[var(--color-brand-strong)]" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-brand-strong)]">
              BluePilot activity
            </span>
          </div>
          {entry.agentSteps!.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
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
      <div className="mt-2 max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
        {entries.map((entry) => (
          <TimelineRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
