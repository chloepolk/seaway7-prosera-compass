"use client"

import { cn } from "@/lib/utils"
import {
  BASE_POS,
  stageIndex,
  type MissionStage,
} from "./stages"
import { useT } from "../_i18n/use-t"

// Gate index on the loop (matches stageIndex). Origin is gate 0; the loop
// returns to it at Outcome, so both share the "0" marker.
const BASE_NUMERAL: Record<MissionStage, string> = {
  mission_created: "0",
  understand: "1",
  decide: "2",
  execute: "3",
  outcome_roi: "0",
}

export function DiamondBaseNode({
  stage,
  currentStage,
  selected,
  onSelect,
}: {
  stage: MissionStage
  currentStage: MissionStage
  selected: boolean
  onSelect: (s: MissionStage) => void
}) {
  const t = useT()
  const pos = BASE_POS[stage]
  const baseLabel = t(`stages.${stage}.baseLabel`)
  const title = t(`stages.${stage}.title`)
  const reached = stageIndex(currentStage) >= stageIndex(stage)
  const isActive = stage === currentStage

  const labelBelow = stage === "mission_created"
  const anchor =
    stage === "understand" ? "start" : stage === "execute" ? "end" : "middle"
  const dx = stage === "understand" ? 32 : stage === "execute" ? -32 : 0

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={() => onSelect(stage)}
      className="cursor-pointer"
      role="button"
      aria-label={`${baseLabel}: ${title}`}
    >
      {isActive ? (
        <circle r={28} className="fill-[var(--color-brand-primary)]" style={{ opacity: 0.16, animation: "adGlow 2.4s ease-in-out infinite" }} />
      ) : null}

      <g transform="rotate(45)">
        <rect
          x={-15}
          y={-15}
          width={30}
          height={30}
          rx={7}
          fill={reached ? "url(#adGradReached)" : "url(#adGradTrack)"}
          stroke={selected ? "var(--color-brand-primary)" : reached ? "var(--color-brand-strong)" : "#cbd5e1"}
          strokeWidth={selected ? 3 : 1.5}
          filter="url(#adShadow)"
          className="transition-all duration-500"
        />
      </g>

      <text
        x={0}
        y={4}
        textAnchor="middle"
        className={cn(
          "pointer-events-none text-[13px] font-bold",
          reached ? "fill-white" : "fill-muted-foreground"
        )}
      >
        {BASE_NUMERAL[stage]}
      </text>

      <text
        x={dx}
        y={labelBelow ? 48 : stage === "decide" ? -34 : -4}
        textAnchor={anchor}
        className="pointer-events-none fill-foreground text-[11px] font-semibold"
      >
        {baseLabel}
      </text>
      <text
        x={dx}
        y={labelBelow ? 62 : stage === "decide" ? -20 : 12}
        textAnchor={anchor}
        className="pointer-events-none fill-muted-foreground text-[10px]"
      >
        {title}
      </text>
    </g>
  )
}
