/* ------------------------------------------------------------------ */
/*  Modular-OS module contract — the "app manifest" for any board.     */
/*                                                                     */
/*  Every board section implements this so the OS can render it as a   */
/*  tile (lean summary) and open it as a full app (Detail), CRUD it,   */
/*  reorder it, and hand its insights to the Operating Loop. Generic   */
/*  over the domain's computed dataset (TData) so the engine ships     */
/*  here while the data shape stays a domain concern.                  */
/* ------------------------------------------------------------------ */

import type * as React from "react"

export type ModuleSeverity = "critical" | "high" | "medium" | "info"

/** "scenario" and "custom" carry CRUD behavior in the board; any other
 *  string is a domain display label. */
export type ModuleCategory = "scenario" | "custom" | (string & {})

/** Bucket-2 seam: constrained widget footprints (types only for now). */
export type WidgetSize = "1x1" | "1x2" | "2x1" | "2x2" | "hero"

export interface KeyFigure {
  label: string
  value: string
  tone?: "good" | "bad" | "neutral"
}

/** The lean BLUF shown on the collapsed tile. */
export interface ModuleSummary {
  headline: string
  severity: ModuleSeverity
  figures: KeyFigure[]
}

export interface IntelModule<TData = unknown> {
  id: string
  title: string
  /** lucide icon name (PascalCase). */
  icon: string
  category: ModuleCategory
  /** Pure BLUF derivation for the tile. */
  summary: (data: TData) => ModuleSummary
  /** Full "opened app" view. */
  Detail: React.FC
  /** Optional richer tile body; falls back to the figures grid. */
  Widget?: React.FC
  /** Optional Operating Loop hand-off shown in the Detail header. */
  sendToLoop?: { label: string; missionId?: string }
  /** True for user-created modules (e.g. saved sandbox scenarios). */
  removable?: boolean
  /** Bucket-2 seam: preferred footprint when the layout manager lands. */
  size?: WidgetSize
}

/* ------------------------------------------------------------------ */
/*  Bucket-2 seam: ticker source (types only)                          */
/*                                                                     */
/*  A widget can later expose a set of selector-bound figures the      */
/*  squawk-box ticker rotates through. No behavior yet.                */
/* ------------------------------------------------------------------ */

export interface TickerSelector {
  label: string
  /** Dot-path into the domain's ComputedData. */
  selector: string
  fmt?: "usd" | "pct" | "num" | "text"
}

export interface TickerSource {
  selectors: TickerSelector[]
}
