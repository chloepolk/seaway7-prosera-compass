/* ------------------------------------------------------------------ */
/*  CapabilityModule — the USE-CASE layer                             */
/*                                                                     */
/*  A composable analytical capability inside a domain: Dwell Time     */
/*  Accuracy, Clustering, Pricing Intel, Portfolio Health, …           */
/*                                                                     */
/*  Many capabilities plug into one DomainPack. A tenant enables the   */
/*  subset it bought. Each capability contributes pages, finding        */
/*  categories, catalog selectors, and an optional context slice —      */
/*  the engine merges these across the enabled set.                    */
/* ------------------------------------------------------------------ */

import type {
  DrillState,
  ExternalSourceDescriptor,
  PageDef,
  SelectorDescriptor,
} from "../domain-contract"

export interface CapabilityModule<TComputed = unknown> {
  /** Stable id, e.g. "dwell" | "clustering" | "pricing". */
  id: string
  /** Display label, e.g. "Dwell Time Accuracy". */
  label: string
  /** Semver for governance. */
  version: string

  /** The DomainPack id this capability is built for. */
  domainPackId: string

  /** Pages this capability adds to the cockpit nav. */
  pages: PageDef[]

  /** Finding categories this capability may emit (merged into the schema). */
  categories: readonly string[]

  /** Internal selectors this capability exposes to the modular OS. */
  selectors?: SelectorDescriptor[]

  /** External sources this capability surfaces. */
  externalSources?: ExternalSourceDescriptor[]

  /** Drill dimension keys this capability needs (validated vs the domain). */
  requiresDimensions?: string[]

  /** Optional capability-specific context slice for the orchestrator. */
  buildContext?: (data: TComputed, drill: DrillState) => Record<string, unknown>
}
