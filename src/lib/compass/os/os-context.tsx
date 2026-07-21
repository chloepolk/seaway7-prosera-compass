"use client"

import * as React from "react"
import type { AppSpec } from "./app-spec"
import type { WidgetSize } from "./module-contract"

/* ------------------------------------------------------------------ */
/*  CompassOS context — the store seam the modular-OS UI consumes.      */
/*                                                                     */
/*  The library board/renderer/modal read everything they need from    */
/*  this context, never from a concrete app store. A host app adapts    */
/*  its own state into a CompassOSValue and wraps the tree in           */
/*  <CompassOSProvider>. This is what makes the OS reusable across      */
/*  projects without dragging a specific store along.                   */
/* ------------------------------------------------------------------ */

/** An iPhone-style folder grouping tiles on a board. */
export interface BoardFolder {
  id: string
  label: string
  moduleIds: string[]
}

/** Persisted per-board layout: tile order, hidden ids, pinned hero(es),
 *  per-tile footprint, folders, and ticker visibility. `heroId` is retained
 *  for backward-compat with layouts saved before multi-hero. */
export interface BoardState {
  order: string[]
  hidden: string[]
  heroId: string | null
  /** Multiple pinned hero sections (supersedes `heroId`). */
  heroIds?: string[]
  /** Per-module footprint chosen in edit mode. */
  sizes?: Record<string, WidgetSize>
  /** Named folders grouping tiles on this board. */
  folders?: BoardFolder[]
  /** When true, the squawk-box ticker is hidden on this board. */
  tickerOff?: boolean
}

/* ------------------------------------------------------------------ */
/*  Bucket-2 seam: viewer context (types only, sourced later from the   */
/*  shipped OrgModel — no behavior yet).                                */
/* ------------------------------------------------------------------ */

export interface ViewContext {
  personaId?: string
  permissions?: {
    canConfigure?: boolean
    canViewFinancials?: boolean
  }
}

export interface CompassOSValue<TData = unknown> {
  /** The domain's computed dataset that selectors resolve against. */
  data: TData
  /** API root for agent endpoints, e.g. "/api/transportation". */
  apiBase: string
  /** Host-supplied copy for the agent app builder. Keeps domain language out
   *  of the library — the OS shows neutral defaults until the host provides it. */
  appDiscovery?: {
    /** Seed reasoning lines shown while the architect warms up. */
    seedLogs?: string[]
    /** One-line nudge shown when an intent is rejected as out-of-domain. */
    scopeHint?: string
  }

  /* board layout */
  getBoard: (boardId: string) => BoardState
  setBoardOrder: (boardId: string, ids: string[]) => void
  setModuleHidden: (boardId: string, id: string, hidden: boolean) => void
  setBoardHero: (boardId: string, id: string | null) => void
  /** Pin/unpin a module as a hero section (multi-hero). */
  toggleHero: (boardId: string, id: string) => void
  /** Set a module's preferred footprint. */
  setModuleSize: (boardId: string, id: string, size: WidgetSize) => void
  /** Replace the board's folder set. */
  setFolders: (boardId: string, folders: BoardFolder[]) => void
  /** Show/hide the squawk-box ticker on a board. */
  setTickerOff: (boardId: string, off: boolean) => void

  /* opened tile (one detail overlay at a time) */
  openModuleId: string | null
  openModule: (id: string) => void
  closeModule: () => void

  /* user-created, agent-composed apps */
  customApps: AppSpec[]
  deletedCustomApps: AppSpec[]
  saveCustomApp: (spec: AppSpec) => void
  deleteCustomApp: (id: string) => void
  restoreCustomApp: (id: string) => void

  /** Hand an insight to the host's action/operating loop. */
  navigateToMission?: (missionId?: string) => void
  /** Domain panel injected for the STRIPA weather engine. */
  weatherEngine?: React.FC
  /** Bucket-2 seam: viewer persona/permissions (no behavior yet). */
  viewContext?: ViewContext
}

export const CompassOSContext = React.createContext<CompassOSValue | null>(null)

export function useCompassOS<TData = unknown>(): CompassOSValue<TData> {
  const ctx = React.useContext(CompassOSContext)
  if (!ctx) throw new Error("useCompassOS must be used within a CompassOSProvider")
  return ctx as CompassOSValue<TData>
}

export function CompassOSProvider<TData = unknown>({
  value,
  children,
}: {
  value: CompassOSValue<TData>
  children: React.ReactNode
}) {
  return (
    <CompassOSContext.Provider value={value as CompassOSValue}>
      {children}
    </CompassOSContext.Provider>
  )
}
