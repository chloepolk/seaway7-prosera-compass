"use client"

import { cn } from "@/lib/utils"
import { FilterChipBar } from "./filter-chip-bar"
import type { StatusKey } from "./hub-types"

export type HorizonKey = "immediate" | "near-term" | "long-term"
export type AssigneeKey = "assigned-to-you"

const HORIZON_OPTIONS = [
  { key: "immediate" as const, label: "Immediate" },
  { key: "near-term" as const, label: "Near-term" },
  { key: "long-term" as const, label: "Long-term" },
]

const STATUS_OPTIONS = [
  { key: "open" as const, label: "Open" },
  { key: "completed" as const, label: "Completed" },
]

const ASSIGNEE_OPTIONS = [{ key: "assigned-to-you" as const, label: "Assigned to you" }]

function FilterDivider() {
  return (
    <span
      aria-hidden
      className="mx-2 h-5 w-px shrink-0 bg-[var(--color-text-secondary)]/35"
    />
  )
}

export function ActionFilterBar({
  horizon,
  onHorizonChange,
  status,
  onStatusChange,
  assignee,
  onAssigneeChange,
  className,
}: {
  horizon: HorizonKey | null
  onHorizonChange: (k: HorizonKey | null) => void
  status: StatusKey | null
  onStatusChange: (k: StatusKey | null) => void
  assignee?: AssigneeKey | null
  onAssigneeChange?: (k: AssigneeKey | null) => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-2", className)}>
      <FilterChipBar
        active={horizon}
        onChange={onHorizonChange}
        options={[{ key: null, label: "All" }, ...HORIZON_OPTIONS]}
      />
      <FilterDivider />
      <FilterChipBar
        active={status}
        onChange={onStatusChange}
        options={[{ key: null, label: "All" }, ...STATUS_OPTIONS]}
      />
      {onAssigneeChange && (
        <>
          <FilterDivider />
          <FilterChipBar
            active={assignee ?? null}
            onChange={onAssigneeChange}
            options={[{ key: null, label: "All assignees" }, ...ASSIGNEE_OPTIONS]}
          />
        </>
      )}
    </div>
  )
}
