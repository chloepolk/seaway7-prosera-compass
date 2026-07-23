"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/** Injected once in layout — disables entrance + lift when user prefers reduced motion. */
export function CompassMotionStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @keyframes pcm-jiggle-kf {
            0%, 100% { transform: rotate(-0.6deg); }
            50% { transform: rotate(0.6deg); }
          }
          @keyframes pcm-highlight-flash-kf {
            0% { background-color: color-mix(in srgb, var(--color-brand-primary) 12%, transparent); }
            100% { background-color: transparent; }
          }
          @keyframes pcm-bar-grow-kf {
            from { width: 0; }
            to { width: var(--bar-target, 100%); }
          }
          @keyframes pcm-spark-draw-kf {
            from { stroke-dashoffset: var(--spark-length, 200); }
            to { stroke-dashoffset: 0; }
          }
          @keyframes pcm-pulse-once-kf {
            0% { transform: scale(1); }
            50% { transform: scale(1.18); }
            100% { transform: scale(1); }
          }
          @keyframes pcm-thinking-in-kf {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .pcm-jiggle {
            animation: pcm-jiggle-kf 0.22s ease-in-out infinite;
            animation-delay: calc(var(--tile-index, 0) * 40ms);
          }
          .pcm-highlight-flash {
            animation: pcm-highlight-flash-kf 600ms ease-out;
          }
          .pcm-bar-fill {
            width: 0;
            animation: pcm-bar-grow-kf 500ms ease-out forwards;
          }
          .pcm-spark-draw {
            animation: pcm-spark-draw-kf 800ms ease-out forwards;
          }
          .pcm-pulse-once {
            animation: pcm-pulse-once-kf 400ms ease-out;
          }
          .pcm-thinking-phase {
            animation: pcm-thinking-in-kf 300ms ease-out backwards;
          }
          @media (prefers-reduced-motion: reduce) {
            .pcm-enter,
            .pcm-finding-enter,
            .pcm-list-item,
            .pcm-fade-cross,
            .pcm-toast,
            .pcm-expand,
            .pcm-drawer,
            .pcm-jiggle,
            .pcm-highlight-flash,
            .pcm-bar-fill,
            .pcm-spark-draw,
            .pcm-pulse-once,
            .pcm-thinking-phase {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
              width: var(--bar-target, auto) !important;
              stroke-dashoffset: 0 !important;
            }
            .pcm-expand-grid {
              transition: none !important;
            }
            .pcm-interactive,
            .pcm-chip-indicator {
              transition: none !important;
            }
            .pcm-interactive:hover,
            .pcm-interactive:active {
              transform: none !important;
            }
            .pcm-sonar,
            .animate-pulse {
              animation: none !important;
            }
          }
        `,
      }}
    />
  )
}

const ENTER = "pcm-enter animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
const LIST_ITEM = "pcm-list-item animate-in fade-in duration-200 fill-mode-backwards"
const FINDING_ENTER = "pcm-finding-enter animate-in fade-in slide-in-from-right-2 duration-300 fill-mode-backwards"
const FADE_CROSS = "pcm-fade-cross animate-in fade-in duration-150 fill-mode-backwards"
const TOAST = "pcm-toast animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
const EXPAND_PANEL =
  "pcm-expand duration-300 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-bottom-2 data-[state=open]:fill-mode-backwards data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-bottom-2 data-[state=closed]:fill-mode-forwards"

export const EXPAND_DURATION_MS = 300

/** Staggered mount — fade + slight rise. */
export function enterMotion(index = 0, extra?: string) {
  return {
    className: cn(ENTER, extra),
    style: { animationDelay: `${index * 60}ms` } as React.CSSProperties,
  }
}

/** Lighter list stagger — fade only. */
export function listItemMotion(index = 0, extra?: string) {
  return {
    className: cn(LIST_ITEM, extra),
    style: { animationDelay: `${index * 40}ms` } as React.CSSProperties,
  }
}

/** Intelligence rail finding cards — slide in from the right. */
export function findingMotion(index = 0, extra?: string) {
  return {
    className: cn(FINDING_ENTER, extra),
    style: { animationDelay: `${index * 50}ms` } as React.CSSProperties,
  }
}

/** Page content swap — opacity only, avoids competing with rail slides. */
export function fadeCrossMotion(extra?: string) {
  return {
    className: cn(FADE_CROSS, extra),
    style: {} as React.CSSProperties,
  }
}

/** Undo / toast bar — slide up from bottom. */
export function toastMotion(extra?: string) {
  return {
    className: cn(TOAST, extra),
    style: {} as React.CSSProperties,
  }
}

/** Expandable panel — fade + rise in, fade + sink out via data-state. */
export function expandPanelMotion(extra?: string) {
  return {
    className: cn(EXPAND_PANEL, extra),
    style: {} as React.CSSProperties,
  }
}

/** Score / progress bar fill — grows from 0 to target width. */
export function barFillMotion(index = 0, targetPct: number, extra?: string) {
  return {
    className: cn("pcm-bar-fill h-full rounded-full", extra),
    style: {
      "--bar-target": `${targetPct}%`,
      animationDelay: `${index * 60}ms`,
    } as React.CSSProperties,
  }
}

/** Sparkline stroke reveal. */
export function sparkDrawMotion(pathLength: number, extra?: string) {
  return {
    className: cn("pcm-spark-draw", extra),
    style: {
      strokeDasharray: pathLength,
      strokeDashoffset: pathLength,
      "--spark-length": String(pathLength),
    } as React.CSSProperties,
  }
}

/** Agent thinking phase cards — staggered fade in. */
export function thinkingPhaseMotion(index = 0, extra?: string) {
  return {
    className: cn("pcm-thinking-phase", extra),
    style: { animationDelay: `${index * 120}ms` } as React.CSSProperties,
  }
}

/** Brief row highlight on click. */
export const highlightFlashClass = "pcm-highlight-flash"

/** Flash a table/list row on click, then run the action. */
export function useRowFlash() {
  const [flashKey, setFlashKey] = React.useState<string | null>(null)
  const flash = React.useCallback((key: string, action: () => void) => {
    setFlashKey(key)
    action()
    window.setTimeout(() => setFlashKey(null), 600)
  }, [])
  return { flashKey, flash }
}

/** Single pulse on flight-path current node. */
export const pulseOnceClass = "pcm-pulse-once"

/** Sliding indicator for filter chip bars. */
export const chipIndicatorClass = "pcm-chip-indicator transition-all duration-200 ease-out"

export const pcmCard =
  "pcm-interactive transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm"

export const pcmButton =
  "pcm-interactive transition-all duration-200 hover:brightness-[1.03] active:scale-[0.98] active:brightness-100"

/** Slide-out drawer — matches Sheet right-side entrance; respects reduced motion via CompassMotionStyles. */
export function drawerSlideMotion(extra?: string) {
  return {
    className: cn(
      "pcm-drawer data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
      "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      "data-[state=open]:duration-300 data-[state=closed]:duration-250",
      extra,
    ),
    style: {} as React.CSSProperties,
  }
}

export const pcmTab =
  "pcm-interactive transition-all duration-200 hover:bg-muted/40 active:scale-[0.97]"

/** iOS-style home-screen jiggle while tiles are in edit mode. */
export const pcmJiggle = "pcm-jiggle"

/** Shared shell for top-of-page insights / focus hero cards. */
export const insightsHeroShell =
  "w-full overflow-hidden rounded-[20px] bg-gradient-to-r from-[#14233D] to-[#0C5E7E] text-white shadow-[0_14px_17px_rgba(13,102,140,0.22)]"
