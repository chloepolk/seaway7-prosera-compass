"use client"

import { cn } from "@/lib/utils"
import { enterMotion } from "../motion"
import { ReasoningTooltip, type ReasoningContent } from "../reasoning-disclosure"
import { useT } from "../../_i18n/use-t"
import { localizeLegacyCopy } from "../../_i18n/legacy"
import { useStore } from "../../_store"

export interface KpiItem {
  label: string
  value: string
  sublabel?: string
  tone?: "neutral" | "positive" | "warning" | "critical"
  reasoning?: ReasoningContent
}

function kpiValueCls(tone?: KpiItem["tone"]) {
  return tone === "positive"
    ? "text-[var(--color-accent-positive)]"
    : tone === "warning"
      ? "text-[var(--color-accent-warning)]"
      : tone === "critical"
        ? "text-[var(--color-accent-critical)]"
        : "text-[var(--color-text-primary)]"
}

export function KpiStrip({
  items,
  className,
  variant = "cards",
}: {
  items: KpiItem[]
  className?: string
  variant?: "cards" | "unified"
}) {
  const t = useT()
  const { locale } = useStore()
  if (variant === "unified") {
    return (
      <div
        className={cn(
          "flex flex-wrap divide-x divide-[var(--color-border-default)] rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[0_6px_16px_rgba(26,38,64,0.05)]",
          className,
        )}
      >
        {items.map((item, i) => {
          const motion = enterMotion(i)
          return (
            <div
              key={item.label}
              className={cn(motion.className, "min-w-[140px] flex-1 px-[18px] py-4")}
              style={motion.style}
            >
              <p className="flex items-center gap-1 text-[13px] text-[var(--color-text-secondary)]">
                {localizeLegacyCopy(item.label, locale)}
                <ReasoningTooltip reasoning={item.reasoning} label={t("common.whyNamed", { name: localizeLegacyCopy(item.label, locale) })} />
              </p>
              <p className={cn("mt-1 text-[22px] font-semibold tabular-nums leading-none", kpiValueCls(item.tone))}>
                {item.value}
              </p>
              {item.sublabel && (
                <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">{localizeLegacyCopy(item.sublabel, locale)}</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item, i) => {
        const motion = enterMotion(i)
        return (
          <article
            key={item.label}
            className={cn(
              motion.className,
              "rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-[18px] py-4 shadow-[0_6px_16px_rgba(26,38,64,0.05)]",
            )}
            style={motion.style}
          >
            <p className="flex items-center gap-1 text-[13px] text-[var(--color-text-secondary)]">
              {localizeLegacyCopy(item.label, locale)}
              <ReasoningTooltip reasoning={item.reasoning} label={t("common.whyNamed", { name: localizeLegacyCopy(item.label, locale) })} />
            </p>
            <p className={cn("mt-1 text-[22px] font-semibold tabular-nums leading-none", kpiValueCls(item.tone))}>
              {item.value}
            </p>
            {item.sublabel && (
              <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">{localizeLegacyCopy(item.sublabel, locale)}</p>
            )}
          </article>
        )
      })}
    </div>
  )
}
