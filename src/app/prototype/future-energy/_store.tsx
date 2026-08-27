"use client"

import * as React from "react"
import { generateFindings, type BPFinding } from "./data/_insights"
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
import type { ScopeOutput, IttDocument, TenderAuditOutput } from "./agents/_tender-types"
import type { GateTaskStatus } from "./_diamond/types"
import type { MissionStage } from "./_diamond/stages"
import {
  type AwardActor,
  type AwardApprovalRecord,
  type AwardApprovalSnapshot,
  type AwardSupportingDocument,
  type RevisionReasonCategory,
  approveAwardRecommendation,
  confirmAwardNotes,
  confirmSupplierAward,
  requestAwardClarification,
  resubmitAwardApproval,
  returnAwardForRevision,
  submitAwardRecommendation as commitAwardRecommendation,
  submitClarificationResponse,
} from "@/lib/compass/award-governance"
import {
  buildPortfolioContext,
  buildPricingContext,
  buildMarketContext,
  buildOrchestratorContext,
  buildVerifierContext,
  buildChatBriefing,
  buildBidEvaluationContext,
} from "./agents/_context"
import { sanitizeOrchestratorOutput } from "@/lib/compass/data-grounded-language"
import {
  type Locale,
  loadStoredLocale,
  persistLocale,
} from "./_i18n"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Page = "operating-loop" | "tender-studio" | "bid-evaluation"
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
  selectedRegion: string | null
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
  selectedRegion: string | null
  selectedCity: string | null
  selectedCustomer: string | null
  selectedJobType: string | null
  selectedJob: number | null
  intelRailSection: IntelRailSection

  setPage: (page: Page) => void
  drillToRegion: (region: string) => void
  drillToCity: (city: string) => void
  drillToCustomer: (customer: string) => void
  drillToJob: (jobNumber: number) => void
  drillToJobType: (jobType: string) => void
  drillBack: () => void
  resetDrill: () => void
  setIntelRailSection: (section: IntelRailSection) => void

  allFindings: BPFinding[]
  contextFindings: BPFinding[]
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
  /** True while waiting for orchestrator â€” show skeleton, not static copy. */
  isAgentLoading: boolean
  /** True when LLM pipeline failed (e.g. missing API keys) â€” static fallback allowed. */
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

  intelPanelOpen: boolean
  setIntelPanelOpen: (open: boolean) => void

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

  /** Session award-approval workflow, keyed by package / mission id. */
  awardApprovals: Record<string, AwardApprovalRecord>
  submitAwardRecommendation: (packageId: string, snapshot: AwardApprovalSnapshot, actor: AwardActor, noteToApprover?: string) => void
  approveAward: (packageId: string, comments: string, actor: AwardActor) => void
  requestAwardClarification: (packageId: string, question: string, actor: AwardActor) => void
  respondToAwardClarification: (
    packageId: string,
    args: {
      response: string
      attachments: AwardSupportingDocument[]
      sourceReferences: string[]
      snapshot?: AwardApprovalSnapshot
    },
    actor: AwardActor,
  ) => void
  returnAwardForRevision: (
    packageId: string,
    args: { reasonCategory: RevisionReasonCategory; instructions: string; supportingReference: string; dueDate: string | null },
    actor: AwardActor,
  ) => void
  resubmitAwardApproval: (
    packageId: string,
    args: { snapshot: AwardApprovalSnapshot; actionTaken: string; explanation: string; attachments: AwardSupportingDocument[] },
    actor: AwardActor,
  ) => void
  confirmAward: (packageId: string, actor: AwardActor) => void
  confirmAwardNotes: (packageId: string, actor: AwardActor) => void

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

function makeCacheKey(state: CockpitState, locale: Locale): CacheKey {
  return `${locale}:${state.activePage}:${state.drillLevel}:${state.selectedRegion ?? ""}:${state.selectedCity ?? ""}:${state.selectedCustomer ?? ""}:${state.selectedJobType ?? ""}`
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

function getPageContext(page: Page, locale: Locale): string {
  if (locale === "fr") {
    switch (page) {
      case "operating-loop": return "Centre dâ€™actions â€” pipeline actif des appels dâ€™offres du programme Ã©olien offshore Meridian, oÃ¹ les lots dâ€™achats progressent par 5 portes (CadrÃ© â†’ SpÃ©cifiÃ© â†’ ApprouvÃ© â†’ Ã‰mis â†’ AttribuÃ©), avec responsable, date limite de soumission, objectif dâ€™Ã©conomies et registre cumulÃ© des Ã©conomies"
      case "tender-studio": return "Studio dâ€™appels dâ€™offres â€” espace de rÃ©daction des AO depuis les documents contrÃ´lÃ©s, avec pipeline multi-agents dâ€™assemblage, dâ€™audit et de rendu"
      case "bid-evaluation": return "Ã‰valuation des offres â€” portefeuille de rÃ©ponses fournisseurs dÃ©pouillÃ©es avec portes Ã©liminatoires et notation composite sur 100, matrice et recommandations dâ€™attribution"
      default: return "Espace de gestion de la chaÃ®ne dâ€™approvisionnement du programme Ã©olien offshore Meridian"
    }
  }
  switch (page) {
    case "operating-loop": return "Action Centre â€” the live tender pipeline for the Meridian offshore wind programme, where procurement packages move through 5 gates (Scoped â†’ Specified â†’ Approved â†’ Issued â†’ Awarded), each with an accountable owner, submission deadline and savings target, plus an accumulated savings ledger of awarded packages"
    case "tender-studio": return "Tender Studio â€” the ITT drafting workspace: a controlled document repository (engineering specifications, QA manual, procurement terms, charter party), a drafting prompt, and the multi-agent pipeline that assembles, audits and renders a complete Invitation to Tender"
    case "bid-evaluation": return "Bid Evaluation â€” multi-ITT portfolio of tabulated supplier returns with hard gates (ISO 9001, knock-for-knock, DDP Rotterdam) and 100-point composite scoring (Price 35 / Tech 25 / QA 20 / Legal 20), including matrix, baseball cards and award recommendations"
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
      const note = `Verifier correction: "${original}" â†’ "${corrected}"${reason ? ` (${reason})` : ""}`
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
  locale: Locale,
  { silent = false, signal, setAgentState }: PipelineOptions,
): Promise<void> {
  const cacheKey = makeCacheKey(cockpitState, locale)
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
      portfolio: buildPortfolioContext(drill),
      pricing: buildPricingContext(drill),
      market: buildMarketContext(drill),
    }

    const specialistPromises = specialistsNeeded.map(async (id) => {
      try {
        const res = await fetch(`/api/acme/specialist/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: contextMap[id], drillState: drill, locale, tenant: "future-energy" }),
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
          agentError: locale === "fr"
            ? "BluePilot indisponible â€” configurez OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY dans Vercel"
            : "BluePilot unavailable â€” configure OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY in Vercel",
        }))
      }
      return
    }

    update(s => ({ ...s, agentPhase: "orchestrating" }))

    const orchestratorContext = buildOrchestratorContext(specialistOutputs, drill, getPageContext(cockpitState.activePage, locale))

    const orchRes = await fetch("/api/acme/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        specialistOutputs,
        drillState: drill,
        pageContext: getPageContext(cockpitState.activePage, locale),
        orchestratorContext,
        locale,
        tenant: "future-energy",
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
          agentError: locale === "fr"
            ? "Ã‰chec de lâ€™orchestration BluePilot â€” utilisation de lâ€™analyse statique"
            : (orchJson.error ?? "BluePilot orchestration failed â€” using static analysis"),
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

    const verifierContext = buildVerifierContext(orchJson.data, drill)

    await fetch("/api/acme/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orchestratorOutput: orchJson.data,
        sourceData: verifierContext.sourceData,
        drillState: drill,
        verifiableBenchmarks: verifierContext.verifiableBenchmarks,
        locale,
        tenant: "future-energy",
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
        agentError: locale === "fr"
          ? "Erreur du pipeline BluePilot"
          : (err instanceof Error ? err.message : "Pipeline error"),
      }))
    }
  }
}

async function runPipelineWithDedup(
  cockpitState: CockpitState,
  locale: Locale,
  options: PipelineOptions,
): Promise<void> {
  const cacheKey = makeCacheKey(cockpitState, locale)
  if (agentCache.has(cacheKey)) return

  const existing = inFlightPipelines.get(cacheKey)
  if (existing) {
    await existing
    return
  }

  const promise = executeAgentPipeline(cockpitState, locale, options)
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
    const stored = loadStoredLocale()
    setLocaleState(stored)
    persistLocale(stored)
  }, [])

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "fr" ? "fr-FR" : "en-GB"
    }
  }, [locale])

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

  const allFindings = React.useMemo(() => generateFindings(), [])

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

    drillToRegion: (region: string) =>
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
    const cached = agentCache.get(makeCacheKey(cockpitState, locale))
    if (!cached) return false
    setAgentState({
      agentPhase: "complete",
      orchestratorResult: cached.orchestrator,
      verifierResult: cached.verifier,
      agentError: null,
    })
    return true
  }, [locale])

  const runAgentPipeline = React.useCallback(async (cockpitState: CockpitState) => {
    if (applyCachedAgentState(cockpitState)) return

    const cacheKey = makeCacheKey(cockpitState, locale)
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
    // silently â€” the hero swaps to the fresh synthesis when it lands.
    const stored = loadStoredBriefing(cacheKey)
    if (stored) {
      setAgentState({
        agentPhase: "complete",
        orchestratorResult: stored.orchestrator,
        verifierResult: stored.verifier,
        agentError: null,
      })
      await runPipelineWithDedup(cockpitState, locale, {
        silent: true,
        signal: controller.signal,
      })
      if (!controller.signal.aborted) {
        applyCachedAgentState(cockpitState)
      }
      return
    }

    await runPipelineWithDedup(cockpitState, locale, {
      silent: false,
      signal: controller.signal,
      setAgentState,
    })

    if (!controller.signal.aborted) {
      applyCachedAgentState(cockpitState)
    }
  }, [applyCachedAgentState, locale])

  const prefetchAllAgentInsights = React.useCallback(async (currentState: CockpitState) => {
    if (prefetchAbortRef.current) prefetchAbortRef.current.abort()
    const controller = new AbortController()
    prefetchAbortRef.current = controller

    for (const page of ALL_AGENT_PAGES) {
      if (controller.signal.aborted) return

      const prefetchState = macroCockpitState(page)
      if (page === currentState.activePage && isMacroState(currentState)) continue
      if (agentCache.has(makeCacheKey(prefetchState, locale))) continue

      await runPipelineWithDedup(prefetchState, locale, {
        silent: true,
        signal: controller.signal,
      })
    }
  }, [locale])

  // Run pipeline for the active view after login and on navigation changes.
  React.useEffect(() => {
    if (!authenticated) return
    runAgentPipeline(state)
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [authenticated, state.activePage, state.drillLevel, state.selectedRegion, state.selectedCity, state.selectedCustomer, state.selectedJobType, locale, runAgentPipeline])

  // Prefetch macro-level insights for every page on login (Ask chat excluded).
  React.useEffect(() => {
    if (!authenticated) return
    void prefetchAllAgentInsights(state)
    return () => {
      if (prefetchAbortRef.current) prefetchAbortRef.current.abort()
    }
  }, [authenticated, locale, prefetchAllAgentInsights])

  /* ---------------------------------------------------------------- */
  /*  Derived Values                                                   */
  /* ---------------------------------------------------------------- */

  const derived = React.useMemo(() => {
    const contextFindings = allFindings.filter(f => {
      const pageMatch = f.page === state.activePage
      if (!pageMatch) return false
      if (state.drillLevel === "macro") return f.drillLevel === "macro"
      if ((state.drillLevel === "region" || state.drillLevel === "city") && state.selectedRegion) {
        return f.drillLevel === "macro" || (f.drillLevel === "region" && f.regionScope === state.selectedRegion)
      }
      if (state.drillLevel === "customer" && state.selectedCustomer) {
        return f.customerScope === state.selectedCustomer || f.drillLevel === "macro"
      }
      return true
    })

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
        ? state.selectedCustomer.slice(0, 25) + "â€¦"
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

    const orch = agentState.orchestratorResult
      ? sanitizeOrchestratorOutput(agentState.orchestratorResult)
      : null
    const bpHeadline = orch?.headline?.title?.trim() ? orch.headline : null

    const bpFindings = orch?.findings ?? []

    const bpReasoning = orch?.reasoning ?? []

    return {
      allFindings,
      contextFindings,
      breadcrumbs,
      isThinking,
      isAgentLoading,
      useStaticFallback,
      isVerified,
      bpHeadline,
      bpFindings,
      bpReasoning,
    }
  }, [state, allFindings, actions, agentState, authenticated])

  /* ---------------------------------------------------------------- */
  /*  Chat State                                                       */
  /* ---------------------------------------------------------------- */

  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = React.useState(false)
  const chatAbortRef = React.useRef<AbortController | null>(null)

  const setLocale = React.useCallback((next: Locale) => {
    abortRef.current?.abort()
    prefetchAbortRef.current?.abort()
    chatAbortRef.current?.abort()
    clearAgentCache()
    setAgentState({
      agentPhase: "idle",
      orchestratorResult: null,
      verifierResult: null,
      agentError: null,
    })
    setChatMessages([])
    setChatLoading(false)
    setLocaleState(next)
    persistLocale(next)
  }, [])

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
    const chatBriefing = buildChatBriefing()
    const dataContext = {
      portfolio: buildPortfolioContext(drill),
      pricing: buildPricingContext(drill),
      market: buildMarketContext(drill),
      orchestratorData: buildOrchestratorContext([], drill, getPageContext(state.activePage, locale)),
      bidEvaluation: buildBidEvaluationContext(locale),
    }

    const controller = new AbortController()
    chatAbortRef.current = controller

    try {
      const allMessages = [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch("/api/acme/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, dataContext, chatBriefing, locale, tenant: "future-energy" }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        setChatMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: locale === "fr" ? "Impossible de se connecter Ã  BluePilot. Veuillez rÃ©essayer." : "Unable to connect to BluePilot. Please try again." }
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
          copy[copy.length - 1] = { role: "assistant", content: locale === "fr" ? "Une erreur sâ€™est produite. Veuillez rÃ©essayer." : "Something went wrong. Please try again." }
          return copy
        })
      }
    } finally {
      setChatLoading(false)
    }
  }, [chatLoading, chatMessages, state, locale])

  /* ---------------------------------------------------------------- */
  /*  Intelligence panel                                               */
  /* ---------------------------------------------------------------- */

  const [intelPanelOpen, setIntelPanelOpen] = React.useState(false)

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
  const [awardApprovals, setAwardApprovals] = React.useState<Record<string, AwardApprovalRecord>>({})

  const advanceTenderStage = React.useCallback((packageId: string, stage: MissionStage) => {
    setTenderStages(prev => ({ ...prev, [packageId]: stage }))
  }, [])

  const submitAwardRecommendation = React.useCallback((packageId: string, snapshot: AwardApprovalSnapshot, actor: AwardActor, noteToApprover = "") => {
    setAwardApprovals(prev => ({
      ...prev,
      [packageId]: commitAwardRecommendation(prev[packageId], snapshot, actor, noteToApprover, new Date().toISOString(), locale),
    }))
  }, [locale])

  const approveAward = React.useCallback((packageId: string, comments: string, actor: AwardActor) => {
    setAwardApprovals(prev => {
      const current = prev[packageId]
      if (!current) return prev
      return { ...prev, [packageId]: approveAwardRecommendation(current, comments, actor) }
    })
  }, [])

  const requestAwardClarificationFn = React.useCallback((packageId: string, question: string, actor: AwardActor) => {
    setAwardApprovals(prev => {
      const current = prev[packageId]
      if (!current) return prev
      return { ...prev, [packageId]: requestAwardClarification(current, question, actor, new Date().toISOString(), locale) }
    })
  }, [locale])

  const respondToAwardClarification = React.useCallback((
    packageId: string,
    args: {
      response: string
      attachments: AwardSupportingDocument[]
      sourceReferences: string[]
      snapshot?: AwardApprovalSnapshot
    },
    actor: AwardActor,
  ) => {
    setAwardApprovals(prev => {
      const current = prev[packageId]
      if (!current) return prev
      return { ...prev, [packageId]: submitClarificationResponse(current, args, actor, new Date().toISOString(), locale) }
    })
  }, [locale])

  const returnAwardForRevisionFn = React.useCallback((
    packageId: string,
    args: { reasonCategory: RevisionReasonCategory; instructions: string; supportingReference: string; dueDate: string | null },
    actor: AwardActor,
  ) => {
    setAwardApprovals(prev => {
      const current = prev[packageId]
      if (!current) return prev
      return { ...prev, [packageId]: returnAwardForRevision(current, args, actor, new Date().toISOString(), locale) }
    })
  }, [locale])

  const resubmitAwardApprovalFn = React.useCallback((
    packageId: string,
    args: { snapshot: AwardApprovalSnapshot; actionTaken: string; explanation: string; attachments: AwardSupportingDocument[] },
    actor: AwardActor,
  ) => {
    setAwardApprovals(prev => {
      const current = prev[packageId]
      if (!current) return prev
      return { ...prev, [packageId]: resubmitAwardApproval(current, args, actor, new Date().toISOString(), locale) }
    })
  }, [locale])

  const confirmAward = React.useCallback((packageId: string, actor: AwardActor) => {
    setAwardApprovals(prev => {
      const current = prev[packageId]
      if (!current || current.status !== "approved_for_award") return prev
      return { ...prev, [packageId]: confirmSupplierAward(current, actor) }
    })
    advanceTenderStage(packageId, "outcome_roi")
  }, [advanceTenderStage])

  const confirmAwardNotesFn = React.useCallback((packageId: string, actor: AwardActor) => {
    setAwardApprovals(prev => {
      const current = prev[packageId]
      if (!current) return prev
      return { ...prev, [packageId]: confirmAwardNotes(current, actor) }
    })
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
      orchestratorResult: agentState.orchestratorResult
        ? sanitizeOrchestratorOutput(agentState.orchestratorResult)
        : null,
      verifierResult: agentState.verifierResult,
      agentError: agentState.agentError,
      chatMessages,
      chatLoading,
      sendChatMessage,
      clearChat,
      intelPanelOpen,
      setIntelPanelOpen,
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
      awardApprovals,
      submitAwardRecommendation,
      approveAward,
      requestAwardClarification: requestAwardClarificationFn,
      respondToAwardClarification,
      returnAwardForRevision: returnAwardForRevisionFn,
      resubmitAwardApproval: resubmitAwardApprovalFn,
      confirmAward,
      confirmAwardNotes: confirmAwardNotesFn,
      draftedTenders,
      saveDraftedTender,
      deleteDraftedTender,
      taskActions,
      markTaskComplete,
      overrideTask,
      postponeTask,
      sendTaskAlert,
    }),
    [state, actions, derived, authenticated, login, locale, setLocale, agentState, chatMessages, chatLoading, sendChatMessage, clearChat, intelPanelOpen, missionPriority, setMissionPriority, focusMissionId, setFocusMission, tenderStages, advanceTenderStage, focusTenderId, openTenderStudio, focusEvalPackageId, openBidEvaluation, awardApprovals, submitAwardRecommendation, approveAward, requestAwardClarificationFn, respondToAwardClarification, returnAwardForRevisionFn, resubmitAwardApprovalFn, confirmAward, confirmAwardNotesFn, draftedTenders, saveDraftedTender, deleteDraftedTender, taskActions, markTaskComplete, overrideTask, postponeTask, sendTaskAlert]
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
