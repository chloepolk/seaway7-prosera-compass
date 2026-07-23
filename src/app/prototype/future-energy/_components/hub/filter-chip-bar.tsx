"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { chipIndicatorClass } from "../motion"
import { controlFilterClass } from "./control-button"

export interface FilterChipOption<T extends string> {
  key: T | null
  label: string
}

export function FilterChipBar<T extends string>({
  options,
  active,
  onChange,
  className,
}: {
  options: FilterChipOption<T>[]
  active: T | null
  onChange: (key: T | null) => void
  className?: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const buttonRefs = React.useRef<Map<T | null, HTMLButtonElement>>(new Map())
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0, opacity: 0 })

  const updateIndicator = React.useCallback(() => {
    const btn = buttonRefs.current.get(active)
    const container = containerRef.current
    if (!btn || !container) return
    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    setIndicator({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
      opacity: 1,
    })
  }, [active])

  React.useLayoutEffect(() => {
    updateIndicator()
    window.addEventListener("resize", updateIndicator)
    return () => window.removeEventListener("resize", updateIndicator)
  }, [updateIndicator, options])

  return (
    <div ref={containerRef} className={cn("relative flex flex-wrap items-center gap-1.5", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 h-full rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-tint-neutral)]",
          chipIndicatorClass,
        )}
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.opacity,
        }}
      />
      {options.map((opt) => {
        const isActive = active === opt.key
        return (
          <button
            key={opt.key ?? "__all__"}
            ref={(el) => {
              if (el) buttonRefs.current.set(opt.key, el)
              else buttonRefs.current.delete(opt.key)
            }}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              controlFilterClass(isActive),
              "relative z-[1] border-transparent bg-transparent",
              isActive ? "font-semibold text-[var(--color-text-primary)]" : "font-medium text-foreground",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
