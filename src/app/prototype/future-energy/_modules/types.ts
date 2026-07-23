/* ------------------------------------------------------------------ */
/*  Intel Module contract — the "app manifest" for the Pricing board.  */
/*                                                                     */
/*  Every Pricing Intel section implements this so the board can       */
/*  render it as a tile (lean Widget / summary) and open it as a full  */
/*  app (Detail), CRUD it, reorder it, and hand its insights to the    */
/*  Operating Loop. New analyses become modules dropped into the       */
/*  registry — no board changes required.                              */
/* ------------------------------------------------------------------ */

import type * as React from "react"
import type { ComputedData } from "../data/_transform"

export type ModuleSeverity = "critical" | "high" | "medium" | "info"

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

export interface IntelModule {
  id: string
  title: string
  /** lucide icon name (PascalCase). */
  icon: string
  category: "weather" | "pricing" | "cost" | "sales" | "process" | "customer" | "scenario" | "custom"
  /** Pure BLUF derivation for the tile. */
  summary: (data: ComputedData) => ModuleSummary
  /** Full "opened app" view. */
  Detail: React.FC
  /** Optional richer tile body; falls back to the figures grid. */
  Widget?: React.FC
  /** Optional Operating Loop hand-off shown in the Detail header. */
  sendToLoop?: { label: string; missionId?: string }
  /** True for user-created modules (e.g. saved sandbox scenarios). */
  removable?: boolean
}
