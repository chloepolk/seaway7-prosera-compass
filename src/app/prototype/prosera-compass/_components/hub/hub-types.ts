export type StatusKey = "open" | "completed"

export type TimelineEntryStatus = "done" | "current" | "upcoming"

/** Agent work nested under a human confirmation step. */
export type AgentTimelineSubEntry = {
  id: string
  label: string
  assignee: string
  assigneeRole?: string
  status: TimelineEntryStatus
  completedAt?: string
  dueAt?: string
}

/** One human confirmation / action on the main timeline. */
export type ActionTimelineEntry = {
  id: string
  label: string
  assignee: string
  assigneeRole?: string
  status: TimelineEntryStatus
  /** Set for completed steps; current/upcoming may use dueAt instead. */
  completedAt?: string
  dueAt?: string
  stageLabel?: string
  /** Automated prep / verify work tied to this human step. */
  agentSteps?: AgentTimelineSubEntry[]
}

export interface AuditEntry {
  id: string
  timestamp: string
  field: "recommendation" | "completion"
  oldValue: string
  newValue: string
}

export function emailForPerson(name: string): string {
  const parts = name.toLowerCase().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}.${parts[parts.length - 1]}@seaway7.com`
  return `${parts[0]}@seaway7.com`
}
