"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import type { DiamondMission } from "../../_diamond/types"

export function EditActionModal({
  mission,
  currentValue,
  onSave,
  onClose,
}: {
  mission: DiamondMission
  currentValue: string
  onSave: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = React.useState(currentValue)

  React.useEffect(() => {
    setValue(currentValue)
  }, [currentValue])

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <SafeIcon name="Pencil" className="h-4 w-4 text-[var(--color-brand-strong)]" />
            <h3 className="text-sm font-semibold">Edit action — {mission.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted">
            <SafeIcon name="X" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Recommended action
            </label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--color-brand-primary)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(value)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-brand-primary)] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
