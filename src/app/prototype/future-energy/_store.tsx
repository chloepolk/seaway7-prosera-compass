"use client"

import * as React from "react"
import { computeAll, buildCustomerAggregates, type ComputedData, type CustomerAggregate, type RegionAggregate, type CityAggregate, type Job, type DataScope } from "./data/_transform"
import type { QualitySummary } from "./data/_validate"
import { generateFindings, type BPFinding } from "./data/_insights"
import type { Region } from "./data/_regions"
import type {
  AgentPhase,
  SpecialistOutput,
  OrchestratorOutput,
  VerifierOutput,
  OrchestratorFinding,
  ReasoningStep,
  DrillState,
  AgentApiResponse,
} from "./agents/_types"
import type { SavedScenario } from "./_sandbox/types"
import type { ScopeOutput, IttDocument, TenderAuditOutput } from "./agents/_tender-types"
import type { AppSpec } from "./_modules/spec"
import type { GateTaskStatus } from "./_diamond/types"
import type { MissionStage } from "./_diamond/stages"
import {
  buildPortfolioContext,
  buildPricingContext,
  buildMarketContext,
  buildOrchestratorContext,
  buildVerifierContext,
  buildChatBriefing,
  buildBidEvaluationContext,
} from "./agents/_context"
import {
  type Locale,
  loadStoredLocale,
  persistLocale,
} from "./_i18n"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Page = "commercial-center" | "customer-intel" | "pricing-intel" | "market-position" | "process-velocity" | "operating-loop" | "tender-studio" | "bid-evaluation"
export type DrillLevel = "macro" | "region" | "city" | "customer" | "job"
export type IntelRailSection = "findings" | "reasoning" | "context" | "ask"
export type { Locale }

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

/** A completed ITT draft, catalogued so it survives navigation and reloads. */
export interface DraftedTender {
  id: string
  componentId: string
  quantity: string
  packageId: string | null
  prompt: string
  createdAt: string
  scope: ScopeOutput
  itt: IttDocument
  audit: TenderAuditOutput | null
  submitted: boolean
}

/** Session-only user action applied on top of a derived Operating Loop task. */
export interface TaskAction {
  status?: GateTaskStatus
  note?: string
  override?: { reason: string; at: string }
  postponedTo?: string
  postponeReason?: string
  alerted?: boolean
}

interface CockpitState {
  activePage: Page
  drillLevel: DrillLevel
  selectedRegion: Region | null
  selectedCity: string | null
  selectedCustomer: string | null
  selectedJobType: string | null
  selectedJob: number | null
  intelRailSection: IntelRailSection
}

interface AgentState {
  agentPhase: AgentPhase
  orchestratorResult: OrchestratorOutput | null
  verifierResult: VerifierOutput | null
  agentError: string | null
}

export interface AcmeDemoStore {
  activePage: Page
  drillLevel: DrillLevel
  selectedRegion: Region | null
  selectedCity: string | null
  selectedCustomer: string | null
  selectedJobType: string | null
  selectedJob: number | null
  intelRailSection: IntelRailSection

  setPage: (page: Page) => void
  drillToRegion: (region: Region) => void
  drillToCity: (city: string) => void
  drillToCustomer: (customer: string) => void
  drillToJob: (jobNumber: number) => void
  drillToJobType: (jobType: string) => void
  drillBack: () => void
  resetDrill: () => void
  setIntelRailSection: (section: IntelRailSection) => void

  data: ComputedData
  dataQuality: QualitySummary
  dataScope: DataScope
  allFindings: BPFinding[]
  contextFindings: BPFinding[]
  filteredCustomers: CustomerAggregate[]
  filteredCityCustomers: CustomerAggregate[]
  filteredRegion: RegionAggregate | null
  filteredCity: CityAggregate | null
  selectedCustomerData: CustomerAggregate | null
  selectedJobData: Job | null
  breadcrumbs: { label: string; onClick?: () => void }[]

  authenticated: boolean
  login: () => void

  /** UI language for the Future Energy module (EN / FR). Persisted in localStorage. */
  locale: Locale
  setLocale: (locale: Locale) => void

  agentPhase: AgentPhase
  orchestratorResult: OrchestratorOutput | null
  verifierResult: VerifierOutput | null
  agentError: string | null
  /** True while waiting for orchestrator — show skeleton, not static copy. */
  isAgentLoading: boolean
  /** True when LLM pipeline failed (e.g. missing API keys) — static fallback allowed. */
  useStaticFallback: boolean
  isThinking: boolean
  isVerified: boolean
  bpHeadline: { title: string; narrative: string; severity: string } | null
  bpFindings: OrchestratorFinding[]
  bpReasoning: ReasoningStep[]

  chatMessages: ChatMessage[]
  chatLoading: boolean
  sendChatMessage: (message: string) => void
  clearChat: () => void

  sandboxOpen: boolean
  setSandboxOpen: (open: boolean) => void
  biOpen: boolean
  setBiOpen: (open: boolean) => void
  intelPanelOpen: boolean
  setIntelPanelOpen: (open: boolean) => void
  savedScenarios: SavedScenario[]
  saveScenario: (scenario: SavedScenario) => void
  deleteScenario: (id: string) => void

  /** Persisted manual ordering of Operating Loop missions (mission ids). */
  missionPriority: string[]
  setMissionPriority: (ids: string[]) => void

  /** Mission to auto-select when the Operating Loop opens (e.g. promoted from a weather alert). */
  focusMissionId: string | null
  setFocusMission: (id: string | null) => void

  /** Session progress on tender packages (e.g. an ITT drafted in Tender Studio
   *  advances its package to the approval gate on the Action Centre). */
  tenderStages: Record<string, MissionStage>
  advanceTenderStage: (packageId: string, stage: MissionStage) => void
  /** Package to preload when Tender Studio opens (set by the board's Draft ITT action). */
  focusTenderId: string | null
  openTenderStudio: (packageId: string | null) => void
  /** Package to focus when Bid Evaluation opens (set by the board's Evaluate bids action). */
  focusEvalPackageId: string | null
  openBidEvaluation: (packageId: string | null) => void

  /** Catalogue of completed ITT drafts (persisted across navigation and reloads). */
  draftedTenders: DraftedTender[]
  saveDraftedTender: (draft: DraftedTender) => void
  deleteDraftedTender: (id: string) => void

  /** Session-only overlay of user actions on Operating Loop tasks, keyed by task id. */
  taskActions: Record<string, TaskAction>
  markTaskComplete: (taskId: string, note?: string) => void
  overrideTask: (taskId: string, reason: string) => void
  postponeTask: (taskId: string, until: string, reason: string) => void
  sendTaskAlert: (taskId: string) => void

  /** Modular "app boards" keyed by boardId (pricing, process-velocity, customer-intel…):
   *  each persists tile order, hidden ids, and the pinned hero. The open tile is
   *  session-only and global (one detail overlay at a time). */
  boards: Record<string, { order: string[]; hidden: string[]; heroId: string | null }>
  getBoard: (boardId: string) => { order: string[]; hidden: string[]; heroId: string | null }
  setBoardOrder: (boardId: string, ids: string[]) => void
  setModuleHidden: (boardId: string, id: string, hidden: boolean) => void
  setBoardHero: (boardId: string, id: string | null) => void
  openModuleId: string | null
  openModule: (id: string) => void
  closeModule: () => void

  /** User-created, agent-composed pricing apps (persisted). */
  customApps: AppSpec[]
  saveCustomApp: (spec: AppSpec) => void
  deleteCustomApp: (id: string) => void
  /** Soft-deleted custom apps, recoverable from "Recently deleted". */
  deletedCustomApps: AppSpec[]
  restoreCustomApp: (id: string) => void
}

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

type CacheKey = string
interface CachedResult {
  orchestrator: OrchestratorOutput
  verifier: VerifierOutput | null
}
const agentCache = new Map<CacheKey, CachedResult>()

function clearAgentCache() {
  agentCache.clear()
  inFlightPipelines.clear()
}

/* Last-known briefings persisted across reloads so the Action Centre hero
   paints instantly on sign-in; a silent pipeline run refreshes them after. */
const BRIEFING_STORE_KEY = "s7-bluepilot-briefings-v1"

function loadStoredBriefing(key: CacheKey): CachedResult | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(BRIEFING_STORE_KEY)
    if (!raw) return null
    const all = JSON.parse(raw) as Record<string, CachedResult>
    return all[key]?.orchestrator ? all[key] : null
  } catch {
    return null
  }
}

function storeBriefing(key: CacheKey, result: CachedResult) {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(BRIEFING_STORE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, CachedResult>) : {}
    all[key] = result
    localStorage.setItem(BRIEFING_STORE_KEY, JSON.stringify(all))
  } catch {}
}

function makeCacheKey(state: CockpitState): CacheKey {
  return `${state.activePage}:${state.drillLevel}:${state.selectedRegion ?? ""}:${state.selectedCity ?? ""}:${state.selectedCustomer ?? ""}:${state.selectedJobType ?? ""}`
}

const ALL_AGENT_PAGES: Page[] = [
  "operating-loop",
  "tender-studio",
]

function macroCockpitState(page: Page): CockpitState {
  return {
    activePage: page,
    drillLevel: "macro",
    selectedRegion: null,
    selectedCity: null,
    selectedCustomer: null,
    selectedJobType: null,
    selectedJob: null,
    intelRailSection: "findings",
  }
}

function isMacroState(state: CockpitState): boolean {
  return state.drillLevel === "macro"
    && state.selectedRegion === null
    && state.selectedCity === null
    && state.selectedCustomer === null
    && state.selectedJobType === null
    && state.selectedJob === null
}

const inFlightPipelines = new Map<CacheKey, Promise<void>>()

/* ------------------------------------------------------------------ */
/*  Specialist Routing                                                 */
/* ------------------------------------------------------------------ */

function getSpecialistsForPage(page: Page): ("portfolio" | "pricing" | "market")[] {
  switch (page) {
    case "operating-loop": return ["portfolio", "pricing", "market"]
    case "tender-studio": return ["portfolio", "pricing", "market"]
    default: return ["portfolio"]
  }
}

function getPageContext(page: Page): string {
  switch (page) {
    case "operating-loop": return "Action Centre — the live tender pipeline for the Meridian offshore wind programme, where procurement packages move through 5 gates (Scoped → Specified → Approved → Issued → Awarded), each with an accountable owner, submission deadline and savings target, plus an accumulated savings ledger of awarded packages"
    case "tender-studio": return "Tender Studio — the ITT drafting workspace: a controlled document repository (engineering specifications, QA manual, procurement terms, charter party), a drafting prompt, and the multi-agent pipeline that assembles, audits and renders a complete Invitation to Tender"
    case "bid-evaluation": return "Bid Evaluation — multi-ITT portfolio of tabulated supplier returns with hard gates (ISO 9001, knock-for-knock, DDP Rotterdam) and 100-point composite scoring (Price 35 / Tech 25 / QA 20 / Legal 20), including matrix, baseball cards and award recommendations"
    default: return "Supply chain management workspace for the Meridian offshore wind programme covering Action Centre, Tender Studio and Bid Evaluation"
  }
}

/* ------------------------------------------------------------------ */
/*  Apply Verifier Corrections                                         */
/* ------------------------------------------------------------------ */

function applyVerifierCorrections(
  orchestratorResult: OrchestratorOutput,
  verifierResult: VerifierOutput
): OrchestratorOutput {
  const suppressedIds = new Set(verifierResult.suppressions.map(s => s.findingId))

  // Clone findings (and their evidence arrays) so corrections never mutate the
  // original orchestrator result, which may be shared with the cache / state.
  const findings = orchestratorResult.findings
    .filter(f => !suppressedIds.has(f.id))
    .map(f => ({ ...f, evidence: [...f.evidence] }))

  const findingById = new Map(findings.map(f => [f.id, f]))

  for (const correction of verifierResult.corrections) {
    const finding = findingById.get(correction.findingId)
    if (!finding) continue

    const { original, corrected, reason } = correction
    let applied = false

    if (original && finding.narrative.includes(original)) {
      finding.narrative = finding.narrative.split(original).join(corrected)
      applied = true
    }
    if (original && finding.title.includes(original)) {
      finding.title = finding.title.split(original).join(corrected)
      applied = true
    }
    for (let i = 0; i < finding.evidence.length; i++) {
      if (original && finding.evidence[i].includes(original)) {
        finding.evidence[i] = finding.evidence[i].split(original).join(corrected)
        applied = true
      }
    }

    // Fallback: the verifier flagged a correction whose `original` text we could
    // not locate verbatim (the model often paraphrases). Surface it as evidence
    // rather than silently dropping it.
    if (!applied) {
      const note = `Verifier correction: "${original}" → "${corrected}"${reason ? ` (${reason})` : ""}`
      finding.evidence = [...finding.evidence, note]
    }
  }

  return { ...orchestratorResult, findings }
}

type PipelineOptions = {
  silent?: boolean
  signal: AbortSignal
  setAgentState?: React.Dispatch<React.SetStateAction<AgentState>>
}

async function executeAgentPipeline(
  cockpitState: CockpitState,
  data: ComputedData,
  { silent = false, signal, setAgentState }: PipelineOptions,
): Promise<void> {
  const cacheKey = makeCacheKey(cockpitState)
  if (agentCache.has(cacheKey)) return

  const update = (fn: React.SetStateAction<AgentState>) => {
    if (!silent && setAgentState) setAgentState(fn)
  }

  const drill: DrillState = {
    page: cockpitState.activePage,
    drillLevel: cockpitState.drillLevel,
    selectedRegion: cockpitState.selectedRegion,
    selectedCity: cockpitState.selectedCity,
    selectedCustomer: cockpitState.selectedCustomer,
    selectedJobType: cockpitState.selectedJobType,
  }

  try {
    update(s => ({ ...s, agentPhase: "specialists", agentError: null, orchestratorResult: null, verifierResult: null }))

    const specialistsNeeded = getSpecialistsForPage(cockpitState.activePage)
    const contextMap: Record<string, Record<string, unknown>> = {
      portfolio: buildPortfolioContext(data, drill),
      pricing: buildPricingContext(data, drill),
      market: buildMarketContext(data, drill),
    }

    const specialistPromises = specialistsNeeded.map(async (id) => {
      try {
        const res = await fetch(`/api/acme/specialist/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: contextMap[id], drillState: drill }),
          signal,
        })
        const json: AgentApiResponse<SpecialistOutput> = await res.json()
        if (json.fallback || !json.data) return null
        return json.data
      } catch {
        return null
      }
    })

    const specialistResults = await Promise.allSettled(specialistPromises)
    if (signal.aborted) return

    const specialistOutputs = specialistResults
      .map(r => r.status === "fulfilled" ? r.value : null)
      .filter((v): v is SpecialistOutput => v !== null)

    if (specialistOutputs.length === 0) {
      if (!silent) {
        update(s => ({
          ...s,
          agentPhase: "idle",
          agentError: "BluePilot unavailable — configure OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY in Vercel",
        }))
      }
      return
    }

    update(s => ({ ...s, agentPhase: "orchestrating" }))

    const orchestratorContext = buildOrchestratorContext(specialistOutputs, drill, getPageContext(cockpitState.activePage), data)

    const orchRes = await fetch("/api/acme/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        specialistOutputs,
        drillState: drill,
        pageContext: getPageContext(cockpitState.activePage),
        orchestratorContext,
      }),
      signal,
    })
    const orchJson: AgentApiResponse<OrchestratorOutput> = await orchRes.json()
    if (signal.aborted) return

    if (orchJson.fallback || !orchJson.data) {
      if (!silent) {
        update(s => ({
          ...s,
          agentPhase: "idle",
          agentError: orchJson.error ?? "BluePilot orchestration failed — using static analysis",
        }))
      }
      return
    }

    update(s => ({
      ...s,
      agentPhase: "verifying",
      orchestratorResult: orchJson.data!,
    }))

    agentCache.set(cacheKey, { orchestrator: orchJson.data, verifier: null })
    storeBriefing(cacheKey, { orchestrator: orchJson.data, verifier: null })

    const verifierContext = buildVerifierContext(orchJson.data, data, drill)

    await fetch("/api/acme/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orchestratorOutput: orchJson.data,
        sourceData: verifierContext.sourceData,
        drillState: drill,
        verifiableBenchmarks: verifierContext.verifiableBenchmarks,
      }),
      signal,
    })
      .then(res => res.json())
      .then((verJson: AgentApiResponse<VerifierOutput>) => {
        if (signal.aborted) return
        if (verJson.fallback || !verJson.data) {
          update(s => ({ ...s, agentPhase: "complete" }))
          return
        }

        const correctedOrchestrator = applyVerifierCorrections(orchJson.data!, verJson.data)

        agentCache.set(cacheKey, {
          orchestrator: correctedOrchestrator,
          verifier: verJson.data,
        })
        storeBriefing(cacheKey, {
          orchestrator: correctedOrchestrator,
          verifier: verJson.data,
        })

        update(s => ({
          ...s,
          agentPhase: "complete",
          orchestratorResult: correctedOrchestrator,
          verifierResult: verJson.data!,
        }))
      })
      .catch((verifyErr) => {
        if (!signal.aborted) {
          console.warn("[BluePilot] Verifier error:", verifyErr)
          update(s => ({ ...s, agentPhase: "complete" }))
        }
      })
  } catch (err) {
    if (!signal.aborted && !silent) {
      update(s => ({
        ...s,
        agentPhase: "idle",
        agentError: err instanceof Error ? err.message : "Pipeline error",
      }))
    }
  }
}

async function runPipelineWithDedup(
  cockpitState: CockpitState,
  data: ComputedData,
  options: PipelineOptions,
): Promise<void> {
  const cacheKey = makeCacheKey(cockpitState)
  if (agentCache.has(cacheKey)) return

  const existing = inFlightPipelines.get(cacheKey)
  if (existing) {
    await existing
    return
  }

  const promise = executeAgentPipeline(cockpitState, data, options)
  inFlightPipelines.set(cacheKey, promise)
  try {
    await promise
  } finally {
    inFlightPipelines.delete(cacheKey)
  }
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const StoreContext = React.createContext<AcmeDemoStore | null>(null)

export function useStore(): AcmeDemoStore {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within AcmeDemoStoreProvider")
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AcmeDemoStoreProvider({ children }: { children: React.ReactNode }) {

  const [authenticated, setAuthenticated] = React.useState(false)
  const [locale, setLocaleState] = React.useState<Locale>("en")

  React.useEffect(() => {
    setLocaleState(loadStoredLocale())
  }, [])

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "fr" ? "fr" : "en"
    }
  }, [locale])

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next)
    persistLocale(next)
  }, [])

  const [state, setState] = React.useState<CockpitState>({
    activePage: "operating-loop",
    drillLevel: "macro",
    selectedRegion: null,
    selectedCity: null,
    selectedCustomer: null,
    selectedJobType: null,
    selectedJob: null,
    intelRailSection: "findings",
  })

  const [agentState, setAgentState] = React.useState<AgentState>({
    agentPhase: "idle",
    orchestratorResult: null,
    verifierResult: null,
    agentError: null,
  })

  const abortRef = React.useRef<AbortController | null>(null)
  const prefetchAbortRef = React.useRef<AbortController | null>(null)

  const data = React.useMemo(() => computeAll(), [])
  const allFindings = React.useMemo(() => generateFindings(data), [data])

  const actions = React.useMemo(() => ({
    setPage: (page: Page) =>
      setState(s => ({
        ...s,
        activePage: page,
        drillLevel: "macro" as DrillLevel,
        selectedRegion: null,
        selectedCity: null,
        selectedCustomer: null,
        selectedJobType: null,
        selectedJob: null,
      })),

    drillToRegion: (region: Region) =>
      setState(s => ({ ...s, drillLevel: "region" as DrillLevel, selectedRegion: region, selectedCity: null, selectedCustomer: null, selectedJob: null })),

    drillToCity: (city: string) =>
      setState(s => ({ ...s, drillLevel: "city" as DrillLevel, selectedCity: city, selectedCustomer: null, selectedJob: null })),

    drillToCustomer: (customer: string) =>
      setState(s => ({ ...s, drillLevel: "customer" as DrillLevel, selectedCustomer: customer, selectedJob: null })),

    drillToJob: (jobNumber: number) =>
      setState(s => ({ ...s, drillLevel: "job" as DrillLevel, selectedJob: jobNumber })),

    drillToJobType: (jobType: string) =>
      setState(s => ({ ...s, drillLevel: "region" as DrillLevel, selectedJobType: jobType })),

    drillBack: () =>
      setState(s => {
        if (s.drillLevel === "job") return { ...s, drillLevel: "customer" as DrillLevel, selectedJob: null }
        if (s.drillLevel === "customer") {
          if (s.selectedCity) return { ...s, drillLevel: "city" as DrillLevel, selectedCustomer: null }
          if (s.selectedRegion) return { ...s, drillLevel: "region" as DrillLevel, selectedCustomer: null }
          return { ...s, drillLevel: "macro" as DrillLevel, selectedCustomer: null }
        }
        if (s.drillLevel === "city") return { ...s, drillLevel: "region" as DrillLevel, selectedCity: null }
        if (s.drillLevel === "region") return { ...s, drillLevel: "macro" as DrillLevel, selectedRegion: null, selectedCity: null, selectedJobType: null }
        return s
      }),

    resetDrill: () =>
      setState(s => ({
        ...s,
        drillLevel: "macro" as DrillLevel,
        selectedRegion: null,
        selectedCity: null,
        selectedCustomer: null,
        selectedJobType: null,
        selectedJob: null,
      })),

    setIntelRailSection: (section: IntelRailSection) =>
      setState(s => ({ ...s, intelRailSection: section })),
  }), [])

  /* ---------------------------------------------------------------- */
  /*  Agent Pipeline                                                   */
  /* ---------------------------------------------------------------- */

  const applyCachedAgentState = React.useCallback((cockpitState: CockpitState) => {
    const cached = agentCache.get(makeCacheKey(cockpitState))
    if (!cached) return false
    setAgentState({
      agentPhase: "complete",
      orchestratorResult: cached.orchestrator,
      verifierResult: cached.verifier,
      agentError: null,
    })
    return true
  }, [])

  const runAgentPipeline = React.useCallback(async (cockpitState: CockpitState) => {
    if (applyCachedAgentState(cockpitState)) return

    const cacheKey = makeCacheKey(cockpitState)
    const inFlight = inFlightPipelines.get(cacheKey)
    if (inFlight) {
      setAgentState(s => ({ ...s, agentPhase: "specialists", agentError: null, orchestratorResult: null, verifierResult: null }))
      await inFlight
      applyCachedAgentState(cockpitState)
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Hydrate instantly from the last persisted briefing, then refresh
    // silently — the hero swaps to the fresh synthesis when it lands.
    const stored = loadStoredBriefing(cacheKey)
    if (stored) {
      setAgentState({
        agentPhase: "complete",
        orchestratorResult: stored.orchestrator,
        verifierResult: stored.verifier,
        agentError: null,
      })
      await runPipelineWithDedup(cockpitState, data, {
        silent: true,
        signal: controller.signal,
      })
      if (!controller.signal.aborted) {
        applyCachedAgentState(cockpitState)
      }
      return
    }

    await runPipelineWithDedup(cockpitState, data, {
      silent: false,
      signal: controller.signal,
      setAgentState,
    })

    if (!controller.signal.aborted) {
      applyCachedAgentState(cockpitState)
    }
  }, [applyCachedAgentState, data])

  const prefetchAllAgentInsights = React.useCallback(async (currentState: CockpitState) => {
    if (prefetchAbortRef.current) prefetchAbortRef.current.abort()
    const controller = new AbortController()
    prefetchAbortRef.current = controller

    for (const page of ALL_AGENT_PAGES) {
      if (controller.signal.aborted) return

      const prefetchState = macroCockpitState(page)
      if (page === currentState.activePage && isMacroState(currentState)) continue
      if (agentCache.has(makeCacheKey(prefetchState))) continue

      await runPipelineWithDedup(prefetchState, data, {
        silent: true,
        signal: controller.signal,
      })
    }
  }, [data])

  // Run pipeline for the active view after login and on navigation changes.
  React.useEffect(() => {
    if (!authenticated) return
    runAgentPipeline(state)
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [authenticated, state.activePage, state.drillLevel, state.selectedRegion, state.selectedCity, state.selectedCustomer, state.selectedJobType, runAgentPipeline])

  // Prefetch macro-level insights for every page on login (Ask chat excluded).
  React.useEffect(() => {
    if (!authenticated) return
    void prefetchAllAgentInsights(state)
    return () => {
      if (prefetchAbortRef.current) prefetchAbortRef.current.abort()
    }
  }, [authenticated, prefetchAllAgentInsights])

  /* ---------------------------------------------------------------- */
  /*  Derived Values                                                   */
  /* ---------------------------------------------------------------- */

  const derived = React.useMemo(() => {
    const contextFindings = allFindings.filter(f => {
      if (f.page !== state.activePage) return false
      if (state.drillLevel === "macro") return f.drillLevel === "macro"
      if ((state.drillLevel === "region" || state.drillLevel === "city") && state.selectedRegion) {
        return f.drillLevel === "macro" || (f.drillLevel === "region" && f.regionScope === state.selectedRegion)
      }
      if (state.drillLevel === "customer" && state.selectedCustomer) {
        return f.customerScope === state.selectedCustomer || f.drillLevel === "macro"
      }
      return true
    })

    // Customer Score is customer-level (scope-independent), so drill subsets
    // re-aggregated from job slices inherit the canonical score by name.
    const scoreByName = new Map(data.customers.map(c => [c.customerName, c.customerScore]))
    const withScore = (list: CustomerAggregate[]): CustomerAggregate[] =>
      list.map(c => (c.customerScore ? c : { ...c, customerScore: scoreByName.get(c.customerName) }))

    const filteredCustomers = state.selectedRegion
      ? withScore(buildCustomerAggregates(data.jobs.filter(j => j.region === state.selectedRegion)))
      : data.customers

    const filteredCityCustomers = state.selectedCity
      ? withScore(buildCustomerAggregates(data.jobs.filter(j => j.city === state.selectedCity)))
      : []

    const filteredRegion = state.selectedRegion
      ? data.regions.find(r => r.region === state.selectedRegion) ?? null
      : null

    const filteredCity = (state.selectedCity && filteredRegion)
      ? filteredRegion.cities.find(c => c.city === state.selectedCity) ?? null
      : null

    const selectedCustomerData = state.selectedCustomer
      ? data.customers.find(c => c.customerName === state.selectedCustomer) ?? null
      : null

    const selectedJobData = state.selectedJob
      ? data.jobs.find(j => j.jobNumber === state.selectedJob) ?? null
      : null

    const breadcrumbs: { label: string; onClick?: () => void }[] = []
    if (state.selectedRegion) {
      breadcrumbs.push({
        label: state.selectedRegion,
        onClick: () => actions.drillToRegion(state.selectedRegion!),
      })
    }
    if (state.selectedCity) {
      breadcrumbs.push({
        label: state.selectedCity,
        onClick: () => actions.drillToCity(state.selectedCity!),
      })
    }
    if (state.selectedCustomer) {
      const shortName = state.selectedCustomer.length > 25
        ? state.selectedCustomer.slice(0, 25) + "…"
        : state.selectedCustomer
      breadcrumbs.push({ label: shortName })
    }
    if (state.selectedJobType) {
      breadcrumbs.push({ label: state.selectedJobType })
    }
    if (state.selectedJob) {
      breadcrumbs.push({ label: `Job ${state.selectedJob}` })
    }

    // Agent-derived fields
    const isThinking = agentState.agentPhase !== "idle" && agentState.agentPhase !== "complete"
    const isAgentLoading =
      authenticated && agentState.orchestratorResult === null && agentState.agentError === null
    const useStaticFallback = agentState.agentError !== null
    const isVerified = agentState.verifierResult !== null && agentState.verifierResult.verified === true

    const bpHeadline = agentState.orchestratorResult?.headline ?? null

    const bpFindings = agentState.orchestratorResult?.findings ?? []

    const bpReasoning = agentState.orchestratorResult?.reasoning ?? []

    return {
      data,
      dataQuality: data.dataQuality,
      dataScope: data.dataScope,
      allFindings,
      contextFindings,
      filteredCustomers,
      filteredCityCustomers,
      filteredRegion,
      filteredCity,
      selectedCustomerData,
      selectedJobData,
      breadcrumbs,
      isThinking,
      isAgentLoading,
      useStaticFallback,
      isVerified,
      bpHeadline,
      bpFindings,
      bpReasoning,
    }
  }, [state, data, allFindings, actions, agentState, authenticated])

  /* ---------------------------------------------------------------- */
  /*  Chat State                                                       */
  /* ---------------------------------------------------------------- */

  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = React.useState(false)
  const chatAbortRef = React.useRef<AbortController | null>(null)

  const login = React.useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    if (prefetchAbortRef.current) prefetchAbortRef.current.abort()
    if (chatAbortRef.current) chatAbortRef.current.abort()
    clearAgentCache()
    setAgentState({
      agentPhase: "idle",
      orchestratorResult: null,
      verifierResult: null,
      agentError: null,
    })
    setChatMessages([])
    setChatLoading(false)
    setAuthenticated(true)
  }, [])

  React.useEffect(() => {
    setChatMessages([])
    if (chatAbortRef.current) chatAbortRef.current.abort()
  }, [state.activePage, state.drillLevel, state.selectedRegion, state.selectedCity, state.selectedCustomer])

  const clearChat = React.useCallback(() => {
    if (chatAbortRef.current) chatAbortRef.current.abort()
    setChatMessages([])
    setChatLoading(false)
  }, [])

  const sendChatMessage = React.useCallback(async (message: string) => {
    if (!message.trim() || chatLoading) return

    const userMsg: ChatMessage = { role: "user", content: message.trim() }
    setChatMessages(prev => [...prev, userMsg])
    setChatLoading(true)

    const assistantMsg: ChatMessage = { role: "assistant", content: "" }
    setChatMessages(prev => [...prev, assistantMsg])

    const drill: DrillState = {
      page: state.activePage,
      drillLevel: state.drillLevel,
      selectedRegion: state.selectedRegion,
      selectedCity: state.selectedCity,
      selectedCustomer: state.selectedCustomer,
      selectedJobType: state.selectedJobType,
    }
    const chatBriefing = buildChatBriefing(data)
    const dataContext = {
      portfolio: buildPortfolioContext(data, drill),
      pricing: buildPricingContext(data, drill),
      market: buildMarketContext(data, drill),
      orchestratorData: buildOrchestratorContext([], drill, getPageContext(state.activePage), data),
      bidEvaluation: buildBidEvaluationContext(),
    }

    const controller = new AbortController()
    chatAbortRef.current = controller

    try {
      const allMessages = [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch("/api/acme/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, dataContext, chatBriefing }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        setChatMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: "Unable to connect to BluePilot. Please try again." }
          return copy
        })
        setChatLoading(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const snapshot = accumulated
        setChatMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: snapshot }
          return copy
        })
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setChatMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." }
          return copy
        })
      }
    } finally {
      setChatLoading(false)
    }
  }, [chatLoading, chatMessages, state, data])

  /* ---------------------------------------------------------------- */
  /*  Sandbox State                                                    */
  /* ---------------------------------------------------------------- */

  const [sandboxOpen, setSandboxOpen] = React.useState(false)
  const [biOpen, setBiOpen] = React.useState(false)
  const [intelPanelOpen, setIntelPanelOpen] = React.useState(false)
  const [savedScenarios, setSavedScenarios] = React.useState<SavedScenario[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem("bp-sandbox-scenarios")
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const saveScenario = React.useCallback((scenario: SavedScenario) => {
    setSavedScenarios(prev => {
      const next = [scenario, ...prev.filter(s => s.id !== scenario.id)].slice(0, 5)
      try { localStorage.setItem("bp-sandbox-scenarios", JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const deleteScenario = React.useCallback((id: string) => {
    setSavedScenarios(prev => {
      const next = prev.filter(s => s.id !== id)
      try { localStorage.setItem("bp-sandbox-scenarios", JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const [missionPriority, setMissionPriorityState] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem("bp-mission-priority")
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const setMissionPriority = React.useCallback((ids: string[]) => {
    setMissionPriorityState(ids)
    try { localStorage.setItem("bp-mission-priority", JSON.stringify(ids)) } catch {}
  }, [])

  const [focusMissionId, setFocusMission] = React.useState<string | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Tender package progress (session-only)                           */
  /* ---------------------------------------------------------------- */

  const [tenderStages, setTenderStages] = React.useState<Record<string, MissionStage>>({})
  const [focusTenderId, setFocusTenderId] = React.useState<string | null>(null)
  const [focusEvalPackageId, setFocusEvalPackageId] = React.useState<string | null>(null)

  const advanceTenderStage = React.useCallback((packageId: string, stage: MissionStage) => {
    setTenderStages(prev => ({ ...prev, [packageId]: stage }))
  }, [])

  const openTenderStudio = React.useCallback((packageId: string | null) => {
    setFocusTenderId(packageId)
    setState(s => ({
      ...s,
      activePage: "tender-studio" as Page,
      drillLevel: "macro" as DrillLevel,
      selectedRegion: null,
      selectedCity: null,
      selectedCustomer: null,
      selectedJobType: null,
      selectedJob: null,
    }))
  }, [])

  const openBidEvaluation = React.useCallback((packageId: string | null) => {
    setFocusEvalPackageId(packageId)
    setState(s => ({
      ...s,
      activePage: "bid-evaluation" as Page,
      drillLevel: "macro" as DrillLevel,
      selectedRegion: null,
      selectedCity: null,
      selectedCustomer: null,
      selectedJobType: null,
      selectedJob: null,
    }))
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Drafted tender catalogue (persisted)                             */
  /* ---------------------------------------------------------------- */

  const [draftedTenders, setDraftedTenders] = React.useState<DraftedTender[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem("s7-drafted-tenders")
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const saveDraftedTender = React.useCallback((draft: DraftedTender) => {
    setDraftedTenders(prev => {
      const next = [draft, ...prev.filter(d => d.id !== draft.id)].slice(0, 20)
      try { localStorage.setItem("s7-drafted-tenders", JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const deleteDraftedTender = React.useCallback((id: string) => {
    setDraftedTenders(prev => {
      const next = prev.filter(d => d.id !== id)
      try { localStorage.setItem("s7-drafted-tenders", JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Pricing Intel app board (persisted layout)                       */
  /* ---------------------------------------------------------------- */

  // Backward-compatible storage key: pricing keeps its original key so existing
  // saved layouts survive; other boards use a per-board namespace.
  const boardStorageKey = (boardId: string) => (boardId === "pricing" ? "bp-pricing-board" : `bp-board-${boardId}`)
  const emptyBoard = () => ({ order: [] as string[], hidden: [] as string[], heroId: null as string | null })

  const [boards, setBoards] = React.useState<Record<string, { order: string[]; hidden: string[]; heroId: string | null }>>(() => {
    if (typeof window === "undefined") return {}
    const result: Record<string, { order: string[]; hidden: string[]; heroId: string | null }> = {}
    for (const boardId of ["pricing", "process-velocity", "customer-intel", "commercial-center"]) {
      try {
        const raw = localStorage.getItem(boardStorageKey(boardId))
        const parsed = raw ? JSON.parse(raw) : null
        if (parsed && Array.isArray(parsed.order)) {
          result[boardId] = { order: parsed.order, hidden: parsed.hidden ?? [], heroId: parsed.heroId ?? null }
        }
      } catch {}
    }
    return result
  })
  const [openModuleId, setOpenModuleId] = React.useState<string | null>(null)

  const getBoard = React.useCallback(
    (boardId: string) => boards[boardId] ?? emptyBoard(),
    [boards],
  )

  const persistBoard = (boardId: string, next: { order: string[]; hidden: string[]; heroId: string | null }) => {
    try { localStorage.setItem(boardStorageKey(boardId), JSON.stringify(next)) } catch {}
  }

  const setBoardOrder = React.useCallback((boardId: string, ids: string[]) => {
    setBoards(prev => {
      const cur = prev[boardId] ?? emptyBoard()
      const next = { ...cur, order: ids }
      persistBoard(boardId, next)
      return { ...prev, [boardId]: next }
    })
  }, [])

  const setModuleHidden = React.useCallback((boardId: string, id: string, hidden: boolean) => {
    setBoards(prev => {
      const cur = prev[boardId] ?? emptyBoard()
      const set = new Set(cur.hidden)
      if (hidden) set.add(id); else set.delete(id)
      const next = { ...cur, hidden: [...set] }
      persistBoard(boardId, next)
      return { ...prev, [boardId]: next }
    })
  }, [])

  const setBoardHero = React.useCallback((boardId: string, id: string | null) => {
    setBoards(prev => {
      const cur = prev[boardId] ?? emptyBoard()
      const next = { ...cur, heroId: id }
      persistBoard(boardId, next)
      return { ...prev, [boardId]: next }
    })
  }, [])

  const openModule = React.useCallback((id: string) => setOpenModuleId(id), [])
  const closeModule = React.useCallback(() => setOpenModuleId(null), [])

  /* ---------------------------------------------------------------- */
  /*  Custom (agent-composed) pricing apps                             */
  /* ---------------------------------------------------------------- */

  const [customApps, setCustomApps] = React.useState<AppSpec[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem("bp-custom-apps")
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const [deletedCustomApps, setDeletedCustomApps] = React.useState<AppSpec[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem("bp-custom-apps-trash")
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const saveCustomApp = React.useCallback((spec: AppSpec) => {
    setCustomApps(prev => {
      const next = [spec, ...prev.filter(s => s.id !== spec.id)].slice(0, 12)
      try { localStorage.setItem("bp-custom-apps", JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const deleteCustomApp = React.useCallback((id: string) => {
    setCustomApps(prev => {
      const removed = prev.find(s => s.id === id)
      const next = prev.filter(s => s.id !== id)
      try { localStorage.setItem("bp-custom-apps", JSON.stringify(next)) } catch {}
      if (removed) {
        setDeletedCustomApps(trash => {
          const nextTrash = [removed, ...trash.filter(s => s.id !== id)].slice(0, 12)
          try { localStorage.setItem("bp-custom-apps-trash", JSON.stringify(nextTrash)) } catch {}
          return nextTrash
        })
      }
      return next
    })
  }, [])

  const restoreCustomApp = React.useCallback((id: string) => {
    setDeletedCustomApps(trash => {
      const restored = trash.find(s => s.id === id)
      const nextTrash = trash.filter(s => s.id !== id)
      try { localStorage.setItem("bp-custom-apps-trash", JSON.stringify(nextTrash)) } catch {}
      if (restored) {
        setCustomApps(prev => {
          const next = [restored, ...prev.filter(s => s.id !== id)].slice(0, 12)
          try { localStorage.setItem("bp-custom-apps", JSON.stringify(next)) } catch {}
          return next
        })
      }
      return nextTrash
    })
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Operating Loop task actions (session-only overlay)               */
  /* ---------------------------------------------------------------- */

  const [taskActions, setTaskActions] = React.useState<Record<string, TaskAction>>({})

  const today = () => new Date().toISOString().slice(0, 10)

  const markTaskComplete = React.useCallback((taskId: string, note?: string) => {
    setTaskActions(prev => ({ ...prev, [taskId]: { ...prev[taskId], status: "done", note } }))
  }, [])

  const overrideTask = React.useCallback((taskId: string, reason: string) => {
    setTaskActions(prev => ({ ...prev, [taskId]: { ...prev[taskId], status: "overridden", override: { reason, at: today() } } }))
  }, [])

  const postponeTask = React.useCallback((taskId: string, until: string, reason: string) => {
    setTaskActions(prev => ({ ...prev, [taskId]: { ...prev[taskId], status: "postponed", postponedTo: until, postponeReason: reason } }))
  }, [])

  const sendTaskAlert = React.useCallback((taskId: string) => {
    setTaskActions(prev => ({ ...prev, [taskId]: { ...prev[taskId], alerted: true } }))
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Assemble Store                                                   */
  /* ---------------------------------------------------------------- */

  const store: AcmeDemoStore = React.useMemo(
    () => ({
      ...state,
      ...actions,
      ...derived,
      authenticated,
      login,
      locale,
      setLocale,
      agentPhase: agentState.agentPhase,
      orchestratorResult: agentState.orchestratorResult,
      verifierResult: agentState.verifierResult,
      agentError: agentState.agentError,
      chatMessages,
      chatLoading,
      sendChatMessage,
      clearChat,
      sandboxOpen,
      setSandboxOpen,
      biOpen,
      setBiOpen,
      intelPanelOpen,
      setIntelPanelOpen,
      savedScenarios,
      saveScenario,
      deleteScenario,
      missionPriority,
      setMissionPriority,
      focusMissionId,
      setFocusMission,
      tenderStages,
      advanceTenderStage,
      focusTenderId,
      openTenderStudio,
      focusEvalPackageId,
      openBidEvaluation,
      draftedTenders,
      saveDraftedTender,
      deleteDraftedTender,
      taskActions,
      markTaskComplete,
      overrideTask,
      postponeTask,
      sendTaskAlert,
      boards,
      getBoard,
      setBoardOrder,
      setModuleHidden,
      setBoardHero,
      openModuleId,
      openModule,
      closeModule,
      customApps,
      saveCustomApp,
      deleteCustomApp,
      deletedCustomApps,
      restoreCustomApp,
    }),
    [state, actions, derived, authenticated, login, locale, setLocale, agentState, chatMessages, chatLoading, sendChatMessage, clearChat, sandboxOpen, biOpen, intelPanelOpen, savedScenarios, saveScenario, deleteScenario, missionPriority, setMissionPriority, focusMissionId, setFocusMission, tenderStages, advanceTenderStage, focusTenderId, openTenderStudio, focusEvalPackageId, openBidEvaluation, draftedTenders, saveDraftedTender, deleteDraftedTender, taskActions, markTaskComplete, overrideTask, postponeTask, sendTaskAlert, boards, getBoard, setBoardOrder, setModuleHidden, setBoardHero, openModuleId, openModule, closeModule, customApps, saveCustomApp, deleteCustomApp, deletedCustomApps, restoreCustomApp]
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
