"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import type { IntelModule, KeyFigure } from "./module-contract"

const BRAND = "#004F9A"

const TONE_CLS: Record<NonNullable<KeyFigure["tone"]>, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-red-600 dark:text-red-400",
  neutral: "text-foreground",
}

interface TickerItem {
  key: string
  moduleId: string
  moduleTitle: string
  icon: string
  label: string
  value: string
  tone: NonNullable<KeyFigure["tone"]>
}

/**
 * Squawk-box ticker — a stock-ticker-style marquee that rotates every
 * on-board module's key figures. Values flash when they change (e.g. after
 * a What-If scenario shifts the numbers). Honors prefers-reduced-motion by
 * pausing the scroll. Clicking an item opens that module.
 */
export function TickerBar<TData>({
  modules,
  data,
  onOpenModule,
  onHide,
}: {
  modules: IntelModule<TData>[]
  data: TData
  onOpenModule: (id: string) => void
  onHide: () => void
}) {
  const items = React.useMemo<TickerItem[]>(() => {
    const out: TickerItem[] = []
    for (const m of modules) {
      let summary
      try {
        summary = m.summary(data)
      } catch {
        continue
      }
      for (const f of summary.figures.slice(0, 3)) {
        out.push({
          key: `${m.id}:${f.label}`,
          moduleId: m.id,
          moduleTitle: m.title,
          icon: m.icon,
          label: f.label,
          value: f.value,
          tone: f.tone ?? "neutral",
        })
      }
    }
    return out
  }, [modules, data])

  // Track previous values to pulse the ones that changed. Done in an effect so
  // we never read/write a ref during render.
  const prevRef = React.useRef<Record<string, string>>({})
  const [changed, setChanged] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    const set = new Set<string>()
    for (const it of items) {
      if (prevRef.current[it.key] !== undefined && prevRef.current[it.key] !== it.value) {
        set.add(it.key)
      }
    }
    const next: Record<string, string> = {}
    for (const it of items) next[it.key] = it.value
    prevRef.current = next
    if (set.size === 0) return
    setChanged(set)
    const t = setTimeout(() => setChanged(new Set()), 1600)
    return () => clearTimeout(t)
  }, [items])

  if (items.length === 0) return null

  // Duplicate the track so the marquee can loop seamlessly.
  const track = [...items, ...items]

  return (
    <div className="relative flex items-center gap-2 overflow-hidden rounded-lg border bg-card/80 py-1.5 pl-2 pr-1 shadow-sm">
      <TickerStyles />
      <span
        className="z-10 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: BRAND }}
      >
        <SafeIcon name="Radio" className="h-3 w-3" /> Live
      </span>

      <div className="relative flex-1 overflow-hidden">
        <div className="cmp-ticker-track flex w-max items-center gap-6">
          {track.map((it, i) => (
            <button
              key={`${it.key}-${i}`}
              type="button"
              onClick={() => onOpenModule(it.moduleId)}
              className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
              title={`${it.moduleTitle} · open`}
            >
              <SafeIcon name={it.icon} className="h-3 w-3 text-muted-foreground group-hover:text-[#004F9A]" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{it.label}</span>
              <span
                className={cn(
                  "text-[12px] font-semibold tabular-nums",
                  TONE_CLS[it.tone],
                  changed.has(it.key) && "cmp-ticker-pulse",
                )}
              >
                {it.value}
              </span>
            </button>
          ))}
        </div>
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-card/90 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card/90 to-transparent" />
      </div>

      <button
        type="button"
        onClick={onHide}
        aria-label="Hide ticker"
        title="Hide ticker"
        className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <SafeIcon name="X" className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function TickerStyles() {
  return (
    <style>{`
      @keyframes cmp-ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .cmp-ticker-track { animation: cmp-ticker-scroll 40s linear infinite; }
      .cmp-ticker-track:hover { animation-play-state: paused; }
      @keyframes cmp-ticker-flash { 0% { background-color: rgba(0,79,154,0.25); } 100% { background-color: transparent; } }
      .cmp-ticker-pulse { animation: cmp-ticker-flash 1.4s ease-out; border-radius: 3px; padding: 0 2px; }
      @media (prefers-reduced-motion: reduce) {
        .cmp-ticker-track { animation: none; }
        .cmp-ticker-pulse { animation: none; }
      }
    `}</style>
  )
}
