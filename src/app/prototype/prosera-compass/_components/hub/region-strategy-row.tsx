"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { enterMotion, pcmCard } from "../motion"
import { FilterChipBar } from "./filter-chip-bar"
import type { ExpansionStrategy } from "../../data/_expansion"
import { ReasoningTooltip, type ReasoningContent } from "../reasoning-disclosure"

const STRATEGY_ACCENT: Record<ExpansionStrategy, string> = {
  invest: "bg-[var(--color-accent-positive)]",
  expand: "bg-[var(--color-accent-info)]",
  defend: "bg-[var(--color-accent-warning)]",
  harvest: "bg-muted-foreground",
  explore: "bg-[var(--color-brand-primary)]",
}

const STRATEGY_TAG: Record<ExpansionStrategy, string> = {
  invest: "INVEST",
  expand: "EXPAND",
  defend: "DEFEND",
  harvest: "HARVEST",
  explore: "EXPLORE",
}

export interface RegionStrategyRowProps {
  name: string
  strategy: ExpansionStrategy
  narrative: string
  margin: string
  jobs: number
  customers: number
  score: number
  reasoning?: ReasoningContent
  onClick?: () => void
  className?: string
}

export function RegionStrategyRow({
  name,
  strategy,
  narrative,
  margin,
  jobs,
  customers,
  score,
  reasoning,
  onClick,
  className,
  index = 0,
}: RegionStrategyRowProps & { index?: number }) {
  const motion = enterMotion(index)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        motion.className,
        pcmCard,
        "flex w-full items-center gap-4 rounded-[14px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-[18px] py-4 text-left shadow-[0_6px_16px_rgba(26,38,64,0.05)] hover:bg-[var(--color-bg-subtle)]",
        className,
      )}
      style={motion.style}
    >
      <span className={cn("h-11 w-1 shrink-0 rounded-full", STRATEGY_ACCENT[strategy])} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[15px] font-semibold text-[var(--color-text-primary)]">
            {name}
            <ReasoningTooltip reasoning={reasoning} label={`Why ${name}`} />
          </span>
          <span className="rounded-[6px] bg-[var(--color-tint-neutral)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {STRATEGY_TAG[strategy]}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{narrative}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-6 text-center sm:flex">
        {[
          { v: margin, l: "Margin" },
          { v: String(jobs), l: "Jobs" },
          { v: String(customers), l: "Customers" },
          { v: String(score), l: "Score" },
        ].map((k) => (
          <div key={k.l} className="min-w-[44px]">
            <p className="text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">{k.v}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">{k.l}</p>
          </div>
        ))}
      </div>
      <span className="shrink-0 text-[var(--color-text-muted)]">›</span>
    </button>
  )
}

export function StrategyFilterBar({
  active,
  onChange,
}: {
  active: ExpansionStrategy | null
  onChange: (s: ExpansionStrategy | null) => void
}) {
  const items: { key: ExpansionStrategy; label: string }[] = [
    { key: "invest", label: "Invest" },
    { key: "defend", label: "Defend" },
    { key: "harvest", label: "Harvest" },
    { key: "explore", label: "Explore" },
  ]

  return (
    <FilterChipBar
      active={active}
      onChange={onChange}
      options={[{ key: null, label: "All" }, ...items]}
    />
  )
}
