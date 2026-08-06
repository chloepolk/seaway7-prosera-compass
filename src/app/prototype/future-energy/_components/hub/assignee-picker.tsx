"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Input } from "@/components/ui/prosera/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/prosera/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/prosera/tooltip"
import { cn } from "@/lib/utils"
import { getInitials } from "@/app/prototype/future-energy/_diamond/stages"
import {
  filterEmployees,
  getAssignRecommendations,
  type Employee,
} from "@/app/prototype/future-energy/data/_people"
import { BluePilotMark } from "../bluepilot-mark"
import { displayName } from "./active-user"
import { avatarColor, avatarSrcById } from "./avatar-color"
import { useT } from "../../_i18n/use-t"
import { useStore } from "../../_store"
import { localeTag } from "../../_i18n"
import { localizeRole } from "../../_i18n/domain"

export interface AssigneePickerProps {
  ownerRole: string
  selectedId?: string
  onSelect?: (employee: Employee) => void
  className?: string
}

function RecommendBadge({ reasoning }: { reasoning: string }) {
  const t = useT()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--color-brand-strong)]"
          aria-label={t("missionCard.recommendation")}
        >
          <SafeIcon name="Star" className="size-3.5 fill-current" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        className="max-w-[260px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)] shadow-md"
      >
        <div className="flex items-start gap-2">
          <BluePilotMark size={16} className="mt-0.5 shrink-0 text-[var(--color-brand-strong)]" />
          <p className="whitespace-pre-wrap">{t("missionCard.recommendationReason", { reason: reasoning })}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function AssigneePicker({ ownerRole, selectedId, onSelect, className }: AssigneePickerProps) {
  const t = useT()
  const { locale } = useStore()
  const [query, setQuery] = React.useState("")
  const recommendations = React.useMemo(() => getAssignRecommendations(ownerRole), [ownerRole])
  const reasoningById = React.useMemo(
    () => Object.fromEntries(recommendations.map((r) => [r.employeeId, r.reasoning])),
    [recommendations],
  )

  const filtered = React.useMemo(() => filterEmployees(query), [query])

  const sorted = React.useMemo(() => {
    const recIds = new Set(recommendations.map((r) => r.employeeId))
    return [...filtered].sort((a, b) => {
      const aRec = recIds.has(a.id)
      const bRec = recIds.has(b.id)
      if (aRec !== bRec) return aRec ? -1 : 1
      return a.name.localeCompare(b.name, localeTag(locale))
    })
  }, [filtered, recommendations, locale])

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative px-0.5">
        <SafeIcon
          name="Search"
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("missionCard.searchPeople")}
          className="h-7 rounded-[7px] border-[var(--color-border-default)] bg-[var(--color-bg-surface)] pl-8 pr-2.5 text-[12px] shadow-none placeholder:text-[var(--color-text-muted)] focus-visible:ring-[var(--color-border-default)]"
        />
      </div>

      <div className="max-h-[156px] overflow-y-auto overscroll-contain pr-0.5">
        {sorted.length === 0 ? (
          <p className="px-2 py-3 text-center text-[12px] text-[var(--color-text-muted)]">{t("missionCard.noMatches")}</p>
        ) : (
          <div className="space-y-0.5">
            {sorted.map((employee) => {
              const selected = selectedId === employee.id
              const reasoning = reasoningById[employee.id]
              const src = avatarSrcById(employee.id)

              return (
                <div
                  key={employee.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect?.(employee)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelect?.(employee)
                    }
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition-colors",
                    selected
                      ? "bg-[var(--color-bg-surface)]"
                      : "hover:bg-[var(--color-bg-surface)]/60",
                  )}
                >
                  <Avatar className="size-[26px] shrink-0">
                    {src ? <AvatarImage src={src} alt="" /> : null}
                    <AvatarFallback className={cn(avatarColor(employee.name), "text-[10px] text-white")}>
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                      {displayName(employee.name)}
                    </p>
                    <p className="truncate text-[11px] text-[var(--color-text-muted)]">{localizeRole(employee.role, locale)}</p>
                  </div>
                  {reasoning && <RecommendBadge reasoning={reasoning} />}
                  {selected && (
                    <span className="shrink-0 text-[11px] font-medium text-[var(--color-brand-strong)]">✓</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
