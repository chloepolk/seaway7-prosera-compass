"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import { pulseOnceClass } from "@/app/prototype/prosera-compass/_components/motion"

export type FlightPathStepState = "done" | "current" | "upcoming"

export interface FlightPathStep {
  id: string
  label: string
  description?: string
}

const flightPathVariants = cva("", {
  variants: {
    variant: {
      horizontal: "",
      curved: "relative w-full",
    },
  },
  defaultVariants: { variant: "horizontal" },
})

export interface FlightPathProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof flightPathVariants> {
  steps: FlightPathStep[]
  currentStepId: string
  showLabels?: boolean
  /** Rendered inline with the timeline row (e.g. collapsed stage label). */
  suffix?: React.ReactNode
  /** Classes applied to the timeline row only (not the plane spacer or suffix). */
  timelineClassName?: string
  /** Curved variant sizing — compact narrows the arc for side-by-side layouts. */
  size?: "default" | "compact"
  /** When true, every step renders as completed (solid done styling). */
  completed?: boolean
}

function resolveState(index: number, currentIndex: number, allComplete = false): FlightPathStepState {
  if (allComplete) return "done"
  if (index < currentIndex) return "done"
  if (index === currentIndex) return "current"
  return "upcoming"
}

const nodeVariants = cva(
  "relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
  {
    variants: {
      state: {
        done: "size-5 border-flight-done bg-flight-done",
        current: "size-5 border-flight-current bg-flight-current",
        upcoming: "size-5 border-flight-upcoming-stroke bg-flight-upcoming-fill",
      },
    },
  },
)

const PIN_CLS: Record<FlightPathStepState, string> = {
  done: "text-flight-done fill-flight-done",
  current: "text-flight-current fill-flight-current",
  upcoming: "text-flight-pin fill-flight-pin",
}

function FlightPathNode({
  state,
  index,
  label,
  description,
  showLabel,
  marker = "dot",
  pinWhiteFillWhenIncomplete = false,
  pulse = false,
}: {
  state: FlightPathStepState
  index: number
  label: string
  description?: string
  showLabel: boolean
  marker?: "dot" | "pin"
  pinWhiteFillWhenIncomplete?: boolean
  pulse?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        {state === "current" && (
          <SafeIcon
            name="Plane"
            className="absolute bottom-full left-1/2 mb-0.5 size-3.5 -translate-x-1/2 rotate-45 text-flight-plane"
            aria-hidden
          />
        )}
        {marker === "pin" ? (
          <SafeIcon
            name="MapPin"
            className={cn(
              "size-5 shrink-0",
              pinWhiteFillWhenIncomplete && state !== "done"
                ? "fill-white text-flight-pin"
                : PIN_CLS[state],
            )}
            aria-current={state === "current" ? "step" : undefined}
          />
        ) : (
          <div
            className={cn(nodeVariants({ state }), state === "current" && pulse && pulseOnceClass)}
            aria-current={state === "current" ? "step" : undefined}
          />
        )}
      </div>
      {showLabel && (
        <div className="max-w-[5.5rem] text-center">
          <span
            className={cn(
              "block truncate text-[10px] font-semibold leading-tight",
              state === "current" ? "text-brand-strong" : "text-foreground",
            )}
          >
            {label}
          </span>
          {description && (
            <span className="mt-0.5 block truncate text-[9px] leading-tight text-muted-foreground">
              {description}
            </span>
          )}
        </div>
      )}
      <span className="sr-only">{`${label}, step ${index + 1}, ${state}`}</span>
    </div>
  )
}

function FlightPathConnector({ filled }: { filled: boolean }) {
  return (
    <div
      className={cn(
        "h-px min-w-4 flex-1 rounded-full",
        filled ? "bg-flight-done" : "bg-flight-upcoming-stroke",
      )}
      aria-hidden
    />
  )
}

const ARC_BASE_Y = 96
const ARC_CONTROL_Y = -16

function stepPositionOnArc(t: number, width: number, height: number, padX: number, arcBaseY: number, arcControlY: number) {
  const x0 = padX
  const x2 = width - padX
  const cx = width / 2
  const y0 = arcBaseY
  const y2 = arcBaseY
  const cy = arcControlY
  const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x2
  const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y2
  return { x, y: Math.min(y, height) }
}

function arcPathD(width: number, padX: number, arcBaseY: number, arcControlY: number) {
  return `M ${padX} ${arcBaseY} Q ${width / 2} ${arcControlY}, ${width - padX} ${arcBaseY}`
}

const FlightPathHorizontal = React.forwardRef<
  HTMLDivElement,
  Omit<FlightPathProps, "variant" | "currentStepId"> & {
    currentIndex: number
    pulseCurrent?: boolean
    completed?: boolean
  }
>(function FlightPathHorizontal(
  { steps, currentIndex, showLabels = true, suffix, timelineClassName, className, pulseCurrent = false, completed = false, ...props },
  ref,
) {
  const hasCurrent = !completed && currentIndex >= 0 && currentIndex < steps.length

  return (
    <div ref={ref} className={cn("w-full", className)} {...props}>
      {hasCurrent && <div className="h-5 shrink-0" aria-hidden />}
      <div className="flex items-center gap-2">
        <div
          role="list"
          aria-label="Flight path progress"
          className={cn("flex min-w-0 flex-1 items-center", timelineClassName)}
        >
          {steps.map((step, i) => {
            const state = resolveState(i, currentIndex, completed)
            const connectorFilled = completed ? i > 0 : i > 0 && i <= currentIndex
            return (
              <React.Fragment key={step.id}>
                {i > 0 && <FlightPathConnector filled={connectorFilled} />}
                <div role="listitem" className="flex shrink-0 flex-col items-center">
                  <FlightPathNode
                    state={state}
                    index={i}
                    label={step.label}
                    description={step.description}
                    showLabel={showLabels}
                    pulse={pulseCurrent && state === "current"}
                  />
                </div>
              </React.Fragment>
            )
          })}
        </div>
        {suffix}
      </div>
    </div>
  )
})

function FlightPathCurved({
  steps,
  currentIndex,
  showLabels = true,
  size = "default",
  completed = false,
  className,
  ...props
}: Omit<FlightPathProps, "variant" | "currentStepId"> & { currentIndex: number; completed?: boolean }) {
  const viewWidth = size === "compact" ? 400 : 640
  const viewHeight = size === "compact" ? 100 : 120
  const padX = size === "compact" ? 24 : 32
  const arcBaseY = size === "compact" ? 72 : ARC_BASE_Y
  const arcControlY = size === "compact" ? -8 : ARC_CONTROL_Y
  const pathD = arcPathD(viewWidth, padX, arcBaseY, arcControlY)
  const labelTopPct = ((arcBaseY + 14) / viewHeight) * 100
  const labelWidthClass = size === "compact" ? "w-[4.25rem]" : "w-[5.5rem]"

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      {...props}
    >
      <div
        className="relative w-full"
        style={{ aspectRatio: `${viewWidth} / ${viewHeight}`, paddingTop: showLabels ? 20 : 12 }}
      >
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          className="absolute inset-0 h-full w-full text-flight-path"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <path d={pathD} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="3 5" />
        </svg>
        {steps.map((step, i) => {
          const t = steps.length <= 1 ? 0 : i / (steps.length - 1)
          const { x, y } = stepPositionOnArc(t, viewWidth, viewHeight, padX, arcBaseY, arcControlY)
          const state = resolveState(i, currentIndex, completed)
          const leftPct = (x / viewWidth) * 100
          const topPct = (y / viewHeight) * 100
          const isDestination = i === steps.length - 1

          return (
            <div
              key={step.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            >
              <FlightPathNode
                state={state}
                index={i}
                label={step.label}
                description={step.description}
                showLabel={false}
                marker={isDestination ? "pin" : "dot"}
                pinWhiteFillWhenIncomplete={isDestination}
              />
            </div>
          )
        })}
        {showLabels &&
          steps.map((step, i) => {
            const t = steps.length <= 1 ? 0 : i / (steps.length - 1)
            const { x } = stepPositionOnArc(t, viewWidth, viewHeight, padX, arcBaseY, arcControlY)
            const leftPct = (x / viewWidth) * 100
            const isCurrent = !completed && i === currentIndex

            return (
              <div
                key={`${step.id}-label`}
                className={cn("absolute -translate-x-1/2 text-center", labelWidthClass)}
                style={{ left: `${leftPct}%`, top: `${labelTopPct}%` }}
              >
                <span
                  className={cn(
                    "block truncate text-[10px] font-semibold leading-tight",
                    isCurrent ? "text-brand-strong" : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="mt-0.5 block truncate text-[9px] leading-tight text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

const FlightPath = React.forwardRef<HTMLDivElement, FlightPathProps>(
  ({ steps, currentStepId, variant = "horizontal", showLabels = true, suffix, timelineClassName, size = "default", completed = false, className, ...props }, ref) => {
    const currentIndex = Math.max(0, steps.findIndex(s => s.id === currentStepId))
    const [pulseCurrent, setPulseCurrent] = React.useState(false)
    const prevIndexRef = React.useRef(currentIndex)

    React.useEffect(() => {
      if (prevIndexRef.current !== currentIndex) {
        prevIndexRef.current = currentIndex
        setPulseCurrent(true)
        const t = window.setTimeout(() => setPulseCurrent(false), 400)
        return () => window.clearTimeout(t)
      }
    }, [currentIndex])

    if (steps.length === 0) return null

    if (variant === "curved") {
      return (
        <div ref={ref} className={cn(flightPathVariants({ variant }))}>
          <FlightPathCurved
            steps={steps}
            currentIndex={currentIndex}
            showLabels={showLabels}
            size={size}
            completed={completed}
            className={className}
            {...props}
          />
        </div>
      )
    }

    return (
      <FlightPathHorizontal
        ref={ref}
        steps={steps}
        currentIndex={currentIndex}
        showLabels={showLabels}
        suffix={suffix}
        timelineClassName={timelineClassName}
        pulseCurrent={pulseCurrent}
        completed={completed}
        className={cn(flightPathVariants({ variant }), className)}
        {...props}
      />
    )
  },
)
FlightPath.displayName = "FlightPath"

export { FlightPath, FlightPathNode, FlightPathConnector, flightPathVariants }
