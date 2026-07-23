"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import type { DiamondMission } from "../../_diamond/types"

export function CompleteActionModal({
  mission,
  currentValue,
  onSubmit,
  onClose,
}: {
  mission: DiamondMission
  currentValue: string
  onSubmit: (value: string) => void
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
            <SafeIcon name="CircleCheck" className="h-4 w-4 text-[var(--color-accent-positive-text)]" />
            <h3 className="text-sm font-semibold">Mission complete — {mission.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted">
            <SafeIcon name="X" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Describe what you did. BluePilot will ingest your confirmation and update the action timeline.
          </p>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Your action
            </label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={6}
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
            onClick={() => onSubmit(value)}
            disabled={!value.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent-positive-text)] px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <SafeIcon name="CircleCheck" className="h-3.5 w-3.5" />
            Submit confirmation
          </button>
        </div>
      </div>
    </div>
  )
}
