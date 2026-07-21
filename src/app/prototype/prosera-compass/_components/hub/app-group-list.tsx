"use client"

import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"

export interface AppRowItem {
  id: string
  label: string
  metric: string
  onClick?: () => void
}

export interface AppGroup {
  id: string
  label: string
  apps: AppRowItem[]
}

export function AppGroupList({ groups, className }: { groups: AppGroup[]; className?: string }) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-2", className)}>
      {groups.map((group) => (
        <section
          key={group.id}
          className="overflow-hidden rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]"
        >
          <header className="flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-5 py-2.5">
            <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{group.label}</h3>
            <span className="text-[11px] text-[var(--color-text-muted)]">{group.apps.length} apps</span>
          </header>
          <ul>
            {group.apps.map((app) => (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={app.onClick}
                  className="flex w-full items-center gap-3 border-b border-[var(--color-border-default)] px-5 py-2.5 text-left last:border-b-0 hover:bg-[var(--color-bg-subtle)]"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-brand-primary)]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--color-text-primary)]">{app.label}</span>
                  <span className="shrink-0 tabular-nums text-[13px] text-[var(--color-text-secondary)]">{app.metric}</span>
                  <SafeIcon name="ChevronRight" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function AppFlatList({ apps, className }: { apps: AppRowItem[]; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]", className)}>
      <ul>
        {apps.map((app) => (
          <li key={app.id}>
            <button
              type="button"
              onClick={app.onClick}
              className="flex w-full items-center gap-3 border-b border-[var(--color-border-default)] px-5 py-2.5 text-left last:border-b-0 hover:bg-[var(--color-bg-subtle)]"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-brand-primary)]" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--color-text-primary)]">{app.label}</span>
              <span className="shrink-0 tabular-nums text-[13px] text-[var(--color-text-secondary)]">{app.metric}</span>
              <SafeIcon name="ChevronRight" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
