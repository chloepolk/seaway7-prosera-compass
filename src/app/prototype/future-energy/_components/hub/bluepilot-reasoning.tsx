"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { ReasoningStep } from "../../agents/_types"
import { useT } from "../../_i18n/use-t"

export function BluePilotReasoning({
  title,
  paragraphs,
  className,
}: {
  title?: string
  paragraphs: string[]
  className?: string
}) {
  const t = useT()
  if (paragraphs.length === 0) return null

  return (
    <section
      className={cn(
        "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-7 py-5 shadow-[0_6px_16px_rgba(26,38,64,0.05)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="size-[7px] shrink-0 rounded-full bg-[var(--color-brand-primary)]" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{t("reasoning.title")}</p>
      </div>
      <h2 className="mt-3 text-[16px] font-semibold text-[var(--color-text-primary)]">{title ?? t("reasoning.actionsOrder")}</h2>
      <div className="mt-3 space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{p}</p>
        ))}
      </div>
    </section>
  )
}

export function reasoningParagraphsFromSteps(steps: ReasoningStep[]): string[] {
  return steps.map((s) => s.text).filter(Boolean).slice(0, 4)
}
