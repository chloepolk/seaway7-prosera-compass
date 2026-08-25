"use client"

import { formatDateDMY } from "@/lib/compass/locale-display"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import type { DiamondMission } from "./types"
import { STAGE_ORDER, stageIndex } from "./stages"
import { useT } from "../_i18n/use-t"
import { useStore } from "../_store"
import { localeTag } from "../_i18n"

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

export function StageTimeline({ mission }: { mission: DiamondMission }) {
  const t = useT()
  const { locale } = useStore()
  const idx = stageIndex(mission.stage)

  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="mb-3 flex items-center gap-2">
        <SafeIcon name="GitCommitHorizontal" className="h-4 w-4 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("diamond.gateTimeline")}
        </span>
      </div>
      <div className="flex items-start">
        {STAGE_ORDER.map((s, i) => {
          const done = i < idx
          const isCurrent = idx === i
          const entered = mission.stageDates[s]
          const prevEntered = i > 0 ? mission.stageDates[STAGE_ORDER[i - 1]] : null
          const gap = entered && prevEntered ? daysBetween(prevEntered, entered) : null
          return (
            <div key={s} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 ? (
                  <div className={cn("h-0.5 flex-1 rounded-full", idx >= i ? "bg-flight-done" : "bg-flight-line")} />
                ) : (
                  <div className="flex-1" />
                )}
                <div
                  className={cn(
                    "relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done && "size-5 border-flight-done bg-flight-done text-primary-foreground",
                    isCurrent &&
                      "size-7 border-flight-current bg-flight-current text-primary-foreground shadow-[0_0_0_4px_var(--color-tint-brand)]",
                    !done &&
                      !isCurrent &&
                      "size-5 border-flight-upcoming-stroke bg-flight-upcoming-fill text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {done && <SafeIcon name="Check" className="size-3" />}
                  {isCurrent && <SafeIcon name="Plane" className="size-3.5 rotate-45" />}
                  {!done && !isCurrent && <span className="size-1.5 rounded-full bg-flight-pin" aria-hidden />}
                </div>
                {i < STAGE_ORDER.length - 1 ? (
                  <div className={cn("h-0.5 flex-1 rounded-full", idx >= i + 1 ? "bg-flight-done" : "bg-flight-line")} />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <div className="mt-1.5 text-center">
                <div
                  className={cn(
                    "text-[10px] font-semibold leading-tight",
                    isCurrent ? "text-brand-strong" : done ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(`stages.${s}.title`)}
                </div>
                <div className="text-[9px] leading-tight text-muted-foreground">
                  {entered ? formatDateDMY(entered) : t("diamond.pending")}
                </div>
                {gap !== null ? (
                  <div className="text-[9px] font-medium leading-tight text-muted-foreground">+{gap}d</div>
                ) : (
                  <div className="text-[9px] leading-tight">&nbsp;</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
