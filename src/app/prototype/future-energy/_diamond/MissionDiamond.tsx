"use client"

import {
  BASE_POS,
  PATH_SEGMENTS,
  STAGE_ORDER,
  HEALTH_STYLE,
  getInitials,
  isSegmentComplete,
  stageIndex,
  type MissionStage,
} from "./stages"
import type { DiamondMission } from "./types"
import { DiamondBaseNode } from "./DiamondBaseNode"

function Arrow({ active }: { active: boolean }) {
  return <span className={active ? "text-[var(--color-brand-primary)]" : "text-slate-300"}>{"\u2192"}</span>
}

export function MissionDiamond({
  mission,
  selectedGate,
  onSelectGate,
}: {
  mission: DiamondMission
  selectedGate: MissionStage
  onSelectGate: (s: MissionStage) => void
}) {
  const pulse = BASE_POS[mission.stage]
  const idx = stageIndex(mission.stage)
  const pct = idx / 4
  const flow = HEALTH_STYLE[mission.health].flow

  const owner = mission.owner
  const crit = mission.critical

  const critTone = crit && crit.status === "blocked" ? "var(--color-accent-critical)" : "var(--color-accent-warning)"
  const pinDx = 200 - pulse.x
  const pinDy = 200 - pulse.y
  const pinLen = Math.hypot(pinDx, pinDy) || 1
  const pinX = pulse.x + (pinDx / pinLen) * 40
  const pinY = pulse.y + (pinDy / pinLen) * 40

  const gaugeR = 54
  const gaugeC = 2 * Math.PI * gaugeR
  const gaugeOffset = gaugeC * (1 - pct)

  return (
    <div className="flex w-full flex-col items-center">
      <svg viewBox="-64 -44 528 504" className="h-auto w-[85%] max-w-none">
        <defs>
          <linearGradient id="adGradReached" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-primary)" />
            <stop offset="100%" stopColor="var(--color-brand-strong)" />
          </linearGradient>
          <linearGradient id="adGradTrack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <radialGradient id="adHub" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </radialGradient>
          <filter id="adShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.18" />
          </filter>
        </defs>

        <style>{`
          @keyframes adFlow { to { stroke-dashoffset: -16; } }
          @keyframes adGlow { 0%,100% { opacity: .22 } 50% { opacity: .08 } }
        `}</style>

        {/* loop field */}
        <polygon
          points={`${BASE_POS.mission_created.x},${BASE_POS.mission_created.y} ${BASE_POS.understand.x},${BASE_POS.understand.y} ${BASE_POS.decide.x},${BASE_POS.decide.y} ${BASE_POS.execute.x},${BASE_POS.execute.y}`}
          className="fill-[var(--color-brand-primary)]/[0.05] stroke-[#94a3b8]/40"
          strokeWidth={1}
        />

        {/* loop segments */}
        {PATH_SEGMENTS.map((seg, i) => {
          const from = BASE_POS[seg.from]
          const to = BASE_POS[seg.to]
          const done = isSegmentComplete(mission.stage, i)
          const active = idx === i
          if (done) {
            return (
              <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeLinecap="round"
                className="stroke-[var(--color-brand-primary)] transition-all duration-500" strokeWidth={5} />
            )
          }
          if (active) {
            return (
              <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeLinecap="round"
                stroke={flow} strokeWidth={4} strokeDasharray="6 6"
                style={{ animation: "adFlow 0.9s linear infinite" }} />
            )
          }
          return (
            <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeLinecap="round"
              className="stroke-[#94a3b8] opacity-50" strokeWidth={2} />
          )
        })}

        {/* center hub: progress gauge + medallion */}
        <g>
          <circle cx={200} cy={200} r={gaugeR} fill="none" stroke="#e2e8f0" strokeWidth={5} />
          <circle
            cx={200}
            cy={200}
            r={gaugeR}
            fill="none"
            stroke={mission.health === "on_track" ? "var(--color-brand-primary)" : flow}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={gaugeC}
            strokeDashoffset={gaugeOffset}
            transform="rotate(-90 200 200)"
            className="transition-all duration-700"
          />
          <circle cx={200} cy={200} r={43} fill="url(#adHub)" stroke="#cbd5e1" strokeWidth={1} filter="url(#adShadow)" />

          {/* owner avatar */}
          <circle cx={200} cy={176} r={11} className="fill-[var(--color-brand-strong)]" />
          <text x={200} y={180} textAnchor="middle" className="fill-white text-[9px] font-bold">
            {getInitials(owner)}
          </text>

          <text x={200} y={206} textAnchor="middle" className="fill-foreground text-[20px] font-bold tabular-nums">
            {Math.round(pct * 100)}%
          </text>
          <text x={200} y={219} textAnchor="middle" className="fill-muted-foreground text-[8px] font-medium uppercase tracking-[0.15em]">
            {mission.completedAt ? "Loop closed" : `${mission.elapsedDays}/${mission.totalDays}d`}
          </text>
        </g>

        {/* gate nodes */}
        {STAGE_ORDER.filter((s) => s !== "outcome_roi").map((s) => (
          <DiamondBaseNode
            key={s}
            stage={s}
            currentStage={mission.stage}
            selected={selectedGate === s || (s === "mission_created" && selectedGate === "outcome_roi")}
            onSelect={onSelectGate}
          />
        ))}

        {/* live pulse — the mission's current position on the loop */}
        <g
          style={{
            transform: `translate(${pulse.x}px, ${pulse.y}px)`,
            transition: "transform 700ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <circle r={16} fill={flow} opacity={0.18} />
          <circle r={9} className="fill-[#1E293B]" />
          <circle r={9} className="fill-none stroke-white/80" strokeWidth={1.5} />
          <circle r={3.5} className="fill-[var(--color-brand-primary)]" />
        </g>

        {/* "waiting on" pin: who/what is blocking the current gate */}
        {crit ? (
          <g
            style={{
              transform: `translate(${pinX}px, ${pinY}px)`,
              transition: "transform 700ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <circle r={14} fill={critTone} opacity={0.22} style={{ animation: "adGlow 1.8s ease-in-out infinite" }} />
            <circle r={11} fill="#ffffff" stroke={critTone} strokeWidth={2} filter="url(#adShadow)" />
            <text x={0} y={3.5} textAnchor="middle" className="text-[8px] font-bold" fill={critTone}>
              {getInitials(crit.owner)}
            </text>
            <g transform="translate(13,-13)">
              <circle r={6} fill={critTone} />
              <text x={0} y={2.5} textAnchor="middle" className="text-[7px] font-bold" fill="#ffffff">
                {crit.status === "blocked" ? "!" : "\u23F1"}
              </text>
            </g>
          </g>
        ) : null}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        <span className={idx >= 2 ? "text-[var(--color-brand-primary)]" : ""}>Recommendation</span>
        <Arrow active={idx >= 2} />
        <span className={idx >= 2 ? "text-[var(--color-brand-primary)]" : ""}>Decision</span>
        <Arrow active={idx >= 3} />
        <span className={idx >= 3 ? "text-[var(--color-brand-primary)]" : ""}>Action</span>
        <Arrow active={idx >= 4} />
        <span className={idx >= 4 ? "text-[var(--color-brand-primary)]" : ""}>Outcome</span>
        <Arrow active={idx >= 4} />
        <span className={idx >= 4 ? "text-[var(--color-brand-primary)]" : ""}>ROI</span>
      </div>
    </div>
  )
}
