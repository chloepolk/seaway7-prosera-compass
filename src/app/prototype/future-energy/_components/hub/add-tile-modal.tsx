"use client"

import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import type { AppTileItem } from "./app-tile-grid"

export function AddTileModal({
  available,
  onAdd,
  onClose,
}: {
  available: AppTileItem[]
  onAdd: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-5 py-3">
          <div className="flex items-center gap-2">
            <SafeIcon name="LayoutGrid" className="h-4 w-4 text-[var(--color-brand-strong)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Add app</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--color-bg-subtle)]"
          >
            <SafeIcon name="X" className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {available.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-[var(--color-text-muted)]">
              Every app is already on your board.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {available.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onAdd(item.id)}
                    className="flex w-full items-center gap-3 rounded-[10px] border border-transparent px-3 py-2.5 text-left hover:border-[var(--color-border-default)] hover:bg-[var(--color-bg-subtle)]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)]">
                      <SafeIcon name={item.icon ?? "LayoutGrid"} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--color-text-primary)]">
                      {item.label}
                    </span>
                    <SafeIcon name="Plus" className="h-4 w-4 shrink-0 text-[var(--color-brand-strong)]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
