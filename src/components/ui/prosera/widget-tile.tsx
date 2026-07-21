"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { cn } from "@/lib/utils"

export interface WidgetTileProps extends React.HTMLAttributes<HTMLElement> {
  title: string
  editMode?: boolean
  onRemove?: () => void
  headerAction?: React.ReactNode
  children: React.ReactNode
}

const WidgetTile = React.forwardRef<HTMLElement, WidgetTileProps>(
  ({ title, editMode = false, onRemove, headerAction, children, className, ...props }, ref) => (
    <article
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-[16px] border border-border bg-card",
        editMode && "ring-2 ring-primary/20",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{title}</h3>
        <div className="flex items-center gap-1">
          {headerAction}
          {editMode && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${title}`}
            >
              <SafeIcon name="X" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div>{children}</div>
    </article>
  ),
)
WidgetTile.displayName = "WidgetTile"

function WidgetTileGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-4 md:grid-cols-2", className)} {...props} />
}

export interface WidgetAddOption {
  id: string
  label: string
}

export interface WidgetAddPickerProps extends React.HTMLAttributes<HTMLDivElement> {
  options: WidgetAddOption[]
  onAdd: (id: string) => void
  label?: string
}

function WidgetAddPicker({
  options,
  onAdd,
  label = "Add widget",
  className,
  ...props
}: WidgetAddPickerProps) {
  if (options.length === 0) return null

  return (
    <div
      className={cn("rounded-[12px] border border-dashed border-border bg-muted/20 p-4", className)}
      {...props}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <Button
            key={opt.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[12px]"
            onClick={() => onAdd(opt.id)}
          >
            <SafeIcon name="Plus" className="h-3.5 w-3.5" />
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export interface WidgetEditBarProps extends React.HTMLAttributes<HTMLDivElement> {
  editMode: boolean
  onToggle: () => void
  hint?: string
}

function WidgetEditBar({
  editMode,
  onToggle,
  hint,
  className,
  ...props
}: WidgetEditBarProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4", className)}
      {...props}
    >
      <p className="text-[12px] text-muted-foreground">
        {hint ??
          (editMode
            ? "Remove widgets you don't need, or add them back below."
            : "Customize which metrics and charts appear on this view.")}
      </p>
      <Button
        type="button"
        variant={editMode ? "default" : "outline"}
        size="sm"
        className="h-8 gap-1.5 text-[12px]"
        onClick={onToggle}
      >
        <SafeIcon name={editMode ? "Check" : "LayoutGrid"} className="h-3.5 w-3.5" />
        {editMode ? "Done editing" : "Customize layout"}
      </Button>
    </div>
  )
}

export { WidgetTile, WidgetTileGrid, WidgetAddPicker, WidgetEditBar }
