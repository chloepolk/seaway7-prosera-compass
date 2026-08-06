"use client"

import { cn } from "@/lib/utils"
import { useT } from "../../_i18n/use-t"
import { FilterChipBar } from "./filter-chip-bar"
import type { StatusKey } from "./hub-types"

export type HorizonKey = "immediate" | "near-term" | "long-term"
export type AssigneeKey = "assigned-to-you"

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
  const t = useT()

  const horizonOptions = [
    { key: "immediate" as const, label: t("filters.immediate") },
    { key: "near-term" as const, label: t("filters.nearTerm") },
    { key: "long-term" as const, label: t("filters.longTerm") },
  ]

  const statusOptions = [
    { key: "open" as const, label: t("filters.open") },
    { key: "completed" as const, label: t("filters.completed") },
  ]

  const assigneeOptions = [{ key: "assigned-to-you" as const, label: t("filters.assignedToYou") }]

  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-2", className)}>
      <FilterChipBar
        active={horizon}
        onChange={onHorizonChange}
        options={[{ key: null, label: t("common.all") }, ...horizonOptions]}
      />
      <FilterDivider />
      <FilterChipBar
        active={status}
        onChange={onStatusChange}
        options={[{ key: null, label: t("common.all") }, ...statusOptions]}
      />
      {onAssigneeChange && (
        <>
          <FilterDivider />
          <FilterChipBar
            active={assignee ?? null}
            onChange={onAssigneeChange}
            options={[{ key: null, label: t("filters.allAssignees") }, ...assigneeOptions]}
          />
        </>
      )}
    </div>
  )
}
