"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { enterMotion, pcmCard, pcmJiggle } from "../motion"

export interface AppTileItem {
  id: string
  label: string
  metric: string
  icon?: string
  onClick?: () => void
}

export function AppTile({
  item,
  index,
  editing,
  dragging,
  loading,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onClick,
}: {
  item: AppTileItem
  index: number
  editing: boolean
  dragging: boolean
  loading?: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  onRemove: () => void
  onClick?: () => void
}) {
  const motion = editing ? { className: "", style: undefined } : enterMotion(index)
  return (
    <div
      role={editing ? undefined : "button"}
      tabIndex={editing ? undefined : 0}
      draggable={editing}
      onDragStart={editing ? onDragStart : undefined}
      onDragOver={editing ? onDragOver : undefined}
      onDrop={editing ? onDrop : undefined}
      onDragEnd={editing ? onDragEnd : undefined}
      onClick={editing ? undefined : onClick}
      onKeyDown={
        editing
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick?.()
              }
            }
      }
      className={cn(
        motion.className,
        "group relative flex w-full flex-col rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 text-left shadow-[0_6px_16px_rgba(26,38,64,0.05)]",
        pcmCard,
        editing ? "cursor-grab border-dashed active:cursor-grabbing" : "cursor-pointer hover:border-[var(--color-brand-primary)]/20",
        editing && pcmJiggle,
        dragging && "opacity-40",
      )}
      style={{ "--tile-index": index, ...motion.style } as React.CSSProperties}
    >
      {editing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute -left-2 -top-2 flex size-[22px] items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] shadow-sm hover:bg-[var(--color-tint-critical)] hover:text-[var(--color-accent-critical)]"
          aria-label={`Remove ${item.label}`}
        >
          <SafeIcon name="X" className="h-3 w-3" />
        </button>
      )}

      <div className="flex items-start justify-between gap-2">
        {item.icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)]">
            <SafeIcon name={item.icon} className="h-4 w-4" />
          </span>
        )}
        {!editing && (
          <SafeIcon
            name="ChevronRight"
            className="ml-auto h-4 w-4 shrink-0 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-[var(--color-bg-subtle)]" />
        </div>
      ) : (
        <>
          <p className="mt-3 truncate text-[13px] font-medium text-[var(--color-text-primary)]">{item.label}</p>
          <p className="mt-1 text-[18px] font-semibold tabular-nums leading-none text-[var(--color-text-primary)]">
            {item.metric}
          </p>
        </>
      )}
    </div>
  )
}

export function AppTileGrid({
  items,
  editing,
  loadingTileId,
  onReorder,
  onRemove,
  onTileClick,
}: {
  items: AppTileItem[]
  editing: boolean
  loadingTileId?: string | null
  onReorder: (ids: string[]) => void
  onRemove: (id: string) => void
  onTileClick?: (item: AppTileItem) => void
}) {
  const [dragId, setDragId] = React.useState<string | null>(null)

  const handleDrop = React.useCallback(
    (targetId: string) => {
      if (!dragId || dragId === targetId) return
      const ids = items.map((t) => t.id)
      const next = [...ids]
      const from = next.indexOf(dragId)
      const to = next.indexOf(targetId)
      if (from < 0 || to < 0) return
      next.splice(from, 1)
      next.splice(to, 0, dragId)
      onReorder(next)
    },
    [dragId, items, onReorder],
  )

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {items.map((item, i) => (
        <AppTile
          key={item.id}
          item={item}
          index={i}
          editing={editing}
          dragging={dragId === item.id}
          loading={loadingTileId === item.id}
          onDragStart={() => setDragId(item.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(item.id)}
          onDragEnd={() => setDragId(null)}
          onRemove={() => onRemove(item.id)}
          onClick={item.onClick ?? (onTileClick ? () => onTileClick(item) : undefined)}
        />
      ))}
    </div>
  )
}
