"use client"

import { cn } from "@/lib/utils"
import { formatCurrency } from "./stages"
import { useT } from "../_i18n/use-t"
import { useStore } from "../_store"

export function ROIValue({
  value,
  realized,
  multiple,
  size = "md",
  align = "left",
}: {
  value: number
  realized?: number
  multiple?: number
  size?: "sm" | "md" | "lg"
  align?: "left" | "right"
}) {
  const t = useT()
  const { locale } = useStore()
  const isRealized = typeof realized === "number"
  const amount = isRealized ? realized! : value
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-2xl"

  return (
    <div className={cn("flex flex-col", align === "right" && "items-end")}>
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {isRealized ? t("diamond.realizedRoi") : t("diamond.projectedValue")}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-semibold tabular-nums",
            text,
            isRealized ? "text-[var(--color-accent-positive-text)]" : "text-foreground"
          )}
        >
          {formatCurrency(amount, locale)}
        </span>
        {multiple ? (
          <span className="rounded bg-[var(--color-tint-positive)] px-1.5 py-0.5 text-xs font-semibold text-[var(--color-accent-positive-text)]">
            {multiple}x
          </span>
        ) : null}
      </div>
    </div>
  )
}
