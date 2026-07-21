"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { pcmButton } from "../motion"

/** Bordered toolbar button — Edit board, Customize, Add app, Done, etc. */
export function controlButtonClass(active?: boolean, className?: string) {
  return cn(
    pcmButton,
    "inline-flex items-center gap-1 rounded-[10px] border px-2.5 py-1 font-sans text-[11px] font-medium",
    active
      ? "border-brand-strong/30 bg-tint-brand text-brand-strong"
      : "border-border bg-card text-foreground hover:bg-muted/50",
    className,
  )
}

/** Filter/toggle chip using the same bordered control style. */
export function controlFilterClass(active?: boolean, className?: string) {
  return cn(
    pcmButton,
    "whitespace-nowrap rounded-[10px] border px-2.5 py-1 font-sans text-[11px] transition-colors",
    active
      ? "border-brand-strong/30 bg-tint-brand font-semibold text-brand-strong"
      : "border-border bg-card font-medium text-foreground hover:bg-muted/50",
    className,
  )
}

export function ControlButton({
  active,
  icon,
  iconClassName,
  className,
  children,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  icon?: string
  iconClassName?: string
}) {
  return (
    <button type={type} className={controlButtonClass(active, className)} {...props}>
      {icon && <SafeIcon name={icon} className={cn("h-3 w-3 shrink-0", iconClassName)} />}
      {children}
    </button>
  )
}
