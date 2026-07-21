/* ------------------------------------------------------------------ */
/*  DomainPack — the VERTICAL knowledge layer                          */
/*                                                                     */
/*  Everything that makes the platform expert in a vertical (retail    */
/*  transportation, commercial field services, …): the specialists,    */
/*  prompts, knowledge base, data shape, and provenance sources.       */
/*                                                                     */
/*  A DomainPack is reusable across enterprises. It knows nothing      */
/*  about a specific tenant, their org chart, or their workflow.       */
/* ------------------------------------------------------------------ */

import type {
  DomainCatalog,
  DomainDataAdapter,
  DrillDimensionDef,
  DrillState,
  OrchestratorOutput,
  PromptSet,
  SpecialistDef,
  SpecialistOutput,
} from "../domain-contract"

export interface DomainPack<
  TSpecialistId extends string = string,
  TDataSource extends string = string,
  TComputed = unknown,
> {
  /** Stable id, e.g. "transportation". */
  id: string
  /** Display label, e.g. "Retail Inbound Transportation". */
  label: string
  /** Semver — tenants pin this so engine/domain upgrades are deliberate. */
  version: string

  /** Analytical lenses (the specialists in the pipeline). */
  specialists: SpecialistDef<TSpecialistId, TComputed>[]

  /** Allowed provenance data sources (drives schema enums + UI tags). */
  dataSources: readonly TDataSource[]

  /** Hierarchical drill dimensions the entity model exposes. */
  drillDimensions: DrillDimensionDef[]

  /** Global prompts (specialist prompts live on each SpecialistDef). */
  prompts: PromptSet

  /** Base modular-OS catalog (capabilities may contribute more). */
  catalog: DomainCatalog

  /** Cited benchmark library injected as orchestrator/verifier knowledge. */
  knowledgeBase?: unknown

  /** Data layer: compute the dataset + brief the chat. */
  data: DomainDataAdapter<TComputed>

  /** Synthesis context for the orchestrator. */
  buildOrchestratorContext: (
    data: TComputed,
    specialistOutputs: SpecialistOutput<TSpecialistId>[],
    drill: DrillState,
  ) => Record<string, unknown>

  /** Fact-check context for the verifier. */
  buildVerifierContext: (
    data: TComputed,
    orchestratorOutput: OrchestratorOutput<TSpecialistId, TDataSource>,
    drill: DrillState,
  ) => Record<string, unknown>
}
