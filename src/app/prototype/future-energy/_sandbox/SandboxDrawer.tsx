"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { useStore } from "../_store"
import type { ScenarioState, ScenarioProjection, LeverCategory, SavedScenario } from "./types"
import { DEFAULT_SCENARIO } from "./types"
import { projectAll, getDogsCount, getCurrentFuelPrice, getDogsNames } from "./projections"
import { buildSandboxPrompt } from "./prompt"
import { buildPortfolioContext } from "../agents/_context"
import { useT } from "../_i18n/use-t"
import { localeTag } from "../_i18n"
import { activeLocaleTag, formatActiveUsd } from "../_i18n/legacy"

const usd = (n: number) => `${n >= 0 ? "+" : ""}${formatActiveUsd(n, false)}`
const pts = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1)
const bps = (n: number) => (n >= 0 ? "+" : "") + Math.round(n)

export function SandboxDrawer() {
  const { sandboxOpen, setSandboxOpen, data, savedScenarios, saveScenario, deleteScenario, locale } = useStore()
  const t = useT()
  const leverTabs: { key: LeverCategory; label: string; icon: string }[] = [
    { key: "customer-mix", label: t("sandbox.customerMix"), icon: "Users" },
    { key: "pricing", label: t("sandbox.pricing"), icon: "TrendingUp" },
    { key: "fuel", label: t("sandbox.fuel"), icon: "Fuel" },
    { key: "nte", label: t("sandbox.nteFriction"), icon: "ShieldCheck" },
  ]
  const [activeLever, setActiveLever] = React.useState<LeverCategory>("customer-mix")
  const [scenario, setScenario] = React.useState<ScenarioState>(() => ({
    ...DEFAULT_SCENARIO,
    fuel: { pricePerGal: getCurrentFuelPrice(data) },
  }))
  const [agentText, setAgentText] = React.useState("")
  const [agentLoading, setAgentLoading] = React.useState(false)
  const [showSaved, setShowSaved] = React.useState(false)
  const [savePromptOpen, setSavePromptOpen] = React.useState(false)
  const [saveName, setSaveName] = React.useState("")
  const abortRef = React.useRef<AbortController | null>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const dogsCount = React.useMemo(() => getDogsCount(data), [data])
  const currentFuelPrice = React.useMemo(() => getCurrentFuelPrice(data), [data])

  const projection: ScenarioProjection = React.useMemo(
    () => projectAll(data, scenario),
    [data, scenario],
  )

  const exitedDogNames = React.useMemo(
    () => getDogsNames(data, scenario.customerMix.exitDogs),
    [data, scenario.customerMix.exitDogs],
  )

  const isNeutral = scenario.customerMix.exitDogs === 0
    && scenario.customerMix.addStars === 0
    && scenario.pricing.laborMultiplier === 0
    && scenario.pricing.materialMarkupPct === 0
    && Math.abs(scenario.fuel.pricePerGal - currentFuelPrice) < 0.01
    && scenario.nte.thresholdMultiplier === 1.0

  const fireAgent = React.useCallback((state: ScenarioState, proj: ScenarioProjection, lever: LeverCategory) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setAgentLoading(true)
    setAgentText("")

    const ctx = buildPortfolioContext(data, {
      page: "customer-intel",
      drillLevel: "macro",
      selectedRegion: null,
      selectedCity: null,
      selectedCustomer: null,
      selectedJobType: null,
    })

    const scenarioPrompt = buildSandboxPrompt({
      lever,
      state,
      projection: proj,
      portfolioContext: ctx,
      locale,
    })

    fetch("/api/acme/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioPrompt, locale }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) {
          setAgentText(t("sandbox.unable"))
          setAgentLoading(false)
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setAgentText(accumulated)
        }
        setAgentLoading(false)
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setAgentText(t("sandbox.error"))
          setAgentLoading(false)
        }
      })
  }, [data, locale, t])

  const debouncedFireAgent = React.useCallback((state: ScenarioState, lever: LeverCategory) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const proj = projectAll(data, state)
      fireAgent(state, proj, lever)
    }, 600)
  }, [data, fireAgent])

  const updateScenario = React.useCallback((updater: (s: ScenarioState) => ScenarioState) => {
    setScenario(prev => {
      const next = updater(prev)
      debouncedFireAgent(next, activeLever)
      return next
    })
  }, [debouncedFireAgent, activeLever])

  const resetScenario = React.useCallback(() => {
    setScenario({ ...DEFAULT_SCENARIO, fuel: { pricePerGal: currentFuelPrice } })
    setAgentText("")
    setAgentLoading(false)
    if (abortRef.current) abortRef.current.abort()
  }, [currentFuelPrice])

  const loadScenario = React.useCallback((saved: SavedScenario) => {
    setScenario(saved.state)
    setAgentText(saved.agentExplanation)
    setShowSaved(false)
  }, [])

  const handleSave = React.useCallback(() => {
    if (!saveName.trim()) return
    const s: SavedScenario = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      state: scenario,
      projection,
      agentExplanation: agentText,
      timestamp: Date.now(),
    }
    saveScenario(s)
    setSaveName("")
    setSavePromptOpen(false)
  }, [saveName, scenario, projection, agentText, saveScenario])

  const handleExport = React.useCallback(() => {
    const lines = [
      "═══ BluePilot What-If Scenario Export ═══",
      "",
      `${locale === "fr" ? "Date" : "Date"}: ${new Date().toLocaleDateString(localeTag(locale))}`,
      "",
      "── Scenario Parameters ──",
      `Customer Mix: Exit ${scenario.customerMix.exitDogs} Dogs, Add ${scenario.customerMix.addStars} Stars`,
      `Pricing: Labor ${scenario.pricing.laborMultiplier > 0 ? scenario.pricing.laborMultiplier.toFixed(1) + "x" : "unchanged"}, Material ${scenario.pricing.materialMarkupPct > 0 ? scenario.pricing.materialMarkupPct + "%" : "unchanged"}`,
      `Fuel: $${scenario.fuel.pricePerGal.toFixed(2)}/gal`,
      `NTE friction sensitivity: ${scenario.nte.thresholdMultiplier.toFixed(1)}x`,
      "",
      "── Projected Impact ──",
      `Revenue: ${usd(projection.revenueDelta)}`,
      `Margin: ${usd(projection.marginDelta)} (${pts(projection.marginPtsDelta)} pts)`,
      `EBITDA: ${bps(projection.ebitdaDeltaBps)} bps`,
      `Freed Truck Rolls: ${projection.freedTruckRolls}`,
      `Affected Customers: ${projection.affectedCustomers.join(", ") || "n/a"}`,
      "",
      "── Strategic Analysis ──",
      agentText || "(no analysis generated)",
      "",
      "── Powered by BluePilot / Future Energy ──",
    ]
    navigator.clipboard.writeText(lines.join("\n"))
  }, [scenario, projection, agentText, locale])

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sandboxOpen) setSandboxOpen(false)
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [sandboxOpen, setSandboxOpen])

  if (!sandboxOpen) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/98 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
      style={{ height: "42vh", animation: "slideUp 250ms ease-out" }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0.8; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Drawer header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <SafeIcon name="FlaskConical" className="h-4 w-4 text-[var(--color-brand-strong)]" />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{t("sandbox.title")}</span>
          </div>
          {/* Lever tabs */}
          <div className="flex items-center gap-1 ml-4">
            {leverTabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveLever(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  activeLever === tab.key
                    ? "bg-[var(--color-brand-primary)] text-[var(--color-brand-onPrimary)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]",
                )}
              >
                <SafeIcon name={tab.icon} className="h-3 w-3" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedScenarios.length > 0 && (
            <div className="relative">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowSaved(!showSaved)}>
                <SafeIcon name="FolderOpen" className="h-3 w-3" />
                {t("sandbox.saved", { count: savedScenarios.length })}
              </Button>
              {showSaved && (
                <div className="absolute right-0 top-8 z-50 w-64 rounded-lg border bg-background p-2 shadow-lg space-y-1">
                  {savedScenarios.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 group">
                      <button type="button" className="flex-1 text-left text-xs truncate" onClick={() => loadScenario(s)}>
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground ml-2">{new Date(s.timestamp).toLocaleDateString(localeTag(locale))}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteScenario(s.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <SafeIcon name="X" className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={resetScenario} disabled={isNeutral}>
            <SafeIcon name="RotateCcw" className="h-3 w-3" />
            {t("sandbox.reset")}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSandboxOpen(false)}>
            <SafeIcon name="X" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex h-[calc(100%-44px)] divide-x divide-[var(--color-border-default)]">
        {/* Column 1: Levers */}
        <div className="w-[320px] shrink-0 overflow-y-auto p-4 space-y-4">
          {activeLever === "customer-mix" && (
            <CustomerMixLevers
              scenario={scenario}
              dogsCount={dogsCount}
              exitedNames={exitedDogNames}
              onUpdate={updateScenario}
            />
          )}
          {activeLever === "pricing" && (
            <PricingLevers scenario={scenario} onUpdate={updateScenario} />
          )}
          {activeLever === "fuel" && (
            <FuelLevers scenario={scenario} currentPrice={currentFuelPrice} onUpdate={updateScenario} />
          )}
          {activeLever === "nte" && (
            <NteLevers scenario={scenario} onUpdate={updateScenario} />
          )}
        </div>

        {/* Column 2: Impact */}
        <div className="w-[260px] shrink-0 overflow-y-auto p-4 space-y-3">
          <ImpactPanel
            projection={projection}
            isNeutral={isNeutral}
            onSnapshot={() => setSavePromptOpen(true)}
            onExport={handleExport}
          />
          {savePromptOpen && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <input
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder={t("sandbox.scenarioName")}
                autoFocus
                className="w-full rounded-md border border-[var(--color-border-default)] bg-transparent px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-primary)]"
                onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setSavePromptOpen(false) }}
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-6 text-[10px] flex-1" onClick={handleSave} disabled={!saveName.trim()}>{t("sandbox.save")}</Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setSavePromptOpen(false)}>{t("sandbox.cancel")}</Button>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Agent */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4">
          <AgentPanel text={agentText} loading={agentLoading} isNeutral={isNeutral} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Slider Primitives                                                  */
/* ------------------------------------------------------------------ */

function LeverSlider({ label, value, min, max, step, unit, onChange, displayValue }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
  displayValue?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="text-xs font-mono font-semibold tabular-nums">
          {displayValue ?? `${value}${unit ?? ""}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-brand-primary)] bg-[var(--color-bg-subtle)]"
      />
      <div className="flex justify-between text-[9px] text-muted-foreground/50">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Per-Lever Slider Sets                                              */
/* ------------------------------------------------------------------ */

function CustomerMixLevers({ scenario, dogsCount, exitedNames, onUpdate }: {
  scenario: ScenarioState
  dogsCount: number
  exitedNames: string[]
  onUpdate: (fn: (s: ScenarioState) => ScenarioState) => void
}) {
  const t = useT()
  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <SafeIcon name="Users" className="h-3.5 w-3.5 text-[var(--color-brand-strong)]" />
        {t("sandbox.customerPortfolioMix")}
      </div>
      <LeverSlider
        label={t("sandbox.exitDogs")}
        value={scenario.customerMix.exitDogs}
        min={0}
        max={dogsCount}
        step={1}
        onChange={v => onUpdate(s => ({ ...s, customerMix: { ...s.customerMix, exitDogs: v } }))}
      />
      {scenario.customerMix.exitDogs > 0 && exitedNames.length > 0 && (
        <div className="rounded-md bg-red-500/5 border border-red-500/10 p-2 space-y-0.5">
          <p className="text-[9px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">{t("sandbox.exiting")}</p>
          {exitedNames.map(n => (
            <p key={n} className="text-[10px] text-muted-foreground truncate">{n}</p>
          ))}
        </div>
      )}
      <LeverSlider
        label={t("sandbox.addStars")}
        value={scenario.customerMix.addStars}
        min={0}
        max={20}
        step={1}
        onChange={v => onUpdate(s => ({ ...s, customerMix: { ...s.customerMix, addStars: v } }))}
      />
    </>
  )
}

function PricingLevers({ scenario, onUpdate }: {
  scenario: ScenarioState
  onUpdate: (fn: (s: ScenarioState) => ScenarioState) => void
}) {
  const t = useT()
  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <SafeIcon name="TrendingUp" className="h-3.5 w-3.5 text-[var(--color-brand-strong)]" />
        {t("sandbox.pricingAdjustments")}
      </div>
      <LeverSlider
        label={t("sandbox.laborMultiplier")}
        value={scenario.pricing.laborMultiplier}
        min={0}
        max={4.0}
        step={0.1}
        displayValue={scenario.pricing.laborMultiplier === 0 ? t("sandbox.off") : `${scenario.pricing.laborMultiplier.toFixed(1)}x`}
        onChange={v => onUpdate(s => ({ ...s, pricing: { ...s.pricing, laborMultiplier: v } }))}
      />
      <LeverSlider
        label={t("sandbox.materialMarkup")}
        value={scenario.pricing.materialMarkupPct}
        min={0}
        max={35}
        step={1}
        unit="%"
        displayValue={scenario.pricing.materialMarkupPct === 0 ? t("sandbox.off") : `${scenario.pricing.materialMarkupPct}%`}
        onChange={v => onUpdate(s => ({ ...s, pricing: { ...s.pricing, materialMarkupPct: v } }))}
      />
    </>
  )
}

function FuelLevers({ scenario, currentPrice, onUpdate }: {
  scenario: ScenarioState
  currentPrice: number
  onUpdate: (fn: (s: ScenarioState) => ScenarioState) => void
}) {
  const t = useT()
  const delta = scenario.fuel.pricePerGal - currentPrice
  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <SafeIcon name="Fuel" className="h-3.5 w-3.5 text-[var(--color-brand-strong)]" />
        {t("sandbox.fuelScenario")}
      </div>
      <LeverSlider
        label={t("sandbox.unleadedPrice")}
        value={scenario.fuel.pricePerGal}
        min={2.50}
        max={6.00}
        step={0.05}
        displayValue={`$${scenario.fuel.pricePerGal.toFixed(2)}`}
        onChange={v => onUpdate(s => ({ ...s, fuel: { pricePerGal: v } }))}
      />
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>{t("sandbox.current")}: ${currentPrice.toFixed(2)}</span>
        <span className={cn(delta > 0 ? "text-[var(--color-accent-critical-text)]" : delta < 0 ? "text-[var(--color-accent-positive-text)]" : "")}>
          {delta > 0 ? "+" : ""}{delta.toFixed(2)}/gal
        </span>
      </div>
    </>
  )
}

function NteLevers({ scenario, onUpdate }: {
  scenario: ScenarioState
  onUpdate: (fn: (s: ScenarioState) => ScenarioState) => void
}) {
  const t = useT()
  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <SafeIcon name="ShieldCheck" className="h-3.5 w-3.5 text-[var(--color-brand-strong)]" />
        {t("sandbox.nteTitle")}
      </div>
      <LeverSlider
        label={t("sandbox.counterfactual")}
        value={scenario.nte.thresholdMultiplier}
        min={1.0}
        max={2.0}
        step={0.1}
        displayValue={`${scenario.nte.thresholdMultiplier.toFixed(1)}x`}
        onChange={v => onUpdate(s => ({ ...s, nte: { thresholdMultiplier: v } }))}
      />
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {t("sandbox.nteHelp")}
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Impact Panel                                                       */
/* ------------------------------------------------------------------ */

function ImpactPanel({ projection, isNeutral, onSnapshot, onExport }: {
  projection: ScenarioProjection
  isNeutral: boolean
  onSnapshot: () => void
  onExport: () => void
}) {
  const t = useT()
  const metrics = [
    { label: t("sandbox.revenue"), value: usd(projection.revenueDelta), positive: projection.revenueDelta >= 0 },
    { label: t("sandbox.margin"), value: `${usd(projection.marginDelta)} (${pts(projection.marginPtsDelta)} pts)`, positive: projection.marginDelta >= 0 },
    { label: "EBITDA", value: `${bps(projection.ebitdaDeltaBps)} bps`, positive: projection.ebitdaDeltaBps >= 0 },
    { label: t("sandbox.truckRolls"), value: projection.freedTruckRolls > 0 ? t("sandbox.freed", { count: projection.freedTruckRolls }) : "—", positive: projection.freedTruckRolls >= 0 },
    { label: t("sandbox.jobsAffected"), value: projection.affectedJobs > 0 ? projection.affectedJobs.toLocaleString(activeLocaleTag()) : "—", positive: true },
  ]

  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <SafeIcon name="BarChart3" className="h-3.5 w-3.5 text-[var(--color-brand-strong)]" />
        {t("sandbox.projectedImpact")}
      </div>
      <div className="space-y-1.5">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
            <span className={cn(
              "text-xs font-mono font-semibold tabular-nums",
              isNeutral ? "text-muted-foreground/40" : m.positive ? "text-[var(--color-accent-positive-text)]" : "text-[var(--color-accent-critical-text)]",
            )}>
              {isNeutral ? "—" : m.value}
            </span>
          </div>
        ))}
      </div>
      {!isNeutral && projection.affectedCustomers.length > 0 && (
        <div className="rounded-md border bg-muted/20 p-2">
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t("sandbox.affectedAccounts")}</p>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {projection.affectedCustomers.map(c => (
              <p key={c} className="text-[10px] text-muted-foreground truncate">{c}</p>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-1.5 pt-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 gap-1" onClick={onSnapshot} disabled={isNeutral}>
          <SafeIcon name="Camera" className="h-3 w-3" />
          {t("sandbox.snapshot")}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1 gap-1" onClick={onExport} disabled={isNeutral}>
          <SafeIcon name="Copy" className="h-3 w-3" />
          {t("sandbox.export")}
        </Button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Agent Panel                                                        */
/* ------------------------------------------------------------------ */

function AgentPanel({ text, loading, isNeutral }: { text: string; loading: boolean; isNeutral: boolean }) {
  const t = useT()
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [text])

  if (isNeutral && !text && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <SafeIcon name="FlaskConical" className="h-8 w-8 text-muted-foreground/30" />
        <div>
          <p className="text-sm font-medium text-muted-foreground/60">{t("sandbox.adjustLever")}</p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            {t("sandbox.agentHelp")}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1.5 text-xs font-semibold mb-3 shrink-0">
        <SafeIcon name="BrainCircuit" className="h-3.5 w-3.5 text-[var(--color-brand-strong)]" />
        {t("sandbox.strategicAnalysis")}
        {loading && (
          <span className="ml-2 inline-flex items-center gap-1 text-[9px] text-muted-foreground font-normal">
            <span className="h-1 w-1 rounded-full bg-[var(--color-brand-primary)] animate-pulse" />
            <span className="h-1 w-1 rounded-full bg-[var(--color-brand-primary)] animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="h-1 w-1 rounded-full bg-[var(--color-brand-primary)] animate-pulse" style={{ animationDelay: "300ms" }} />
          </span>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {text || (loading ? "" : "")}
        </div>
        {loading && !text && (
          <div className="space-y-2 mt-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="h-3 rounded"
                style={{
                  width: `${80 - i * 15}%`,
                  background: "linear-gradient(90deg, var(--color-muted) 25%, color-mix(in srgb, var(--color-muted-foreground) 20%, var(--color-muted)) 37%, var(--color-muted) 63%)",
                  backgroundSize: "200% 100%",
                  animation: `shimmer 1.5s ease-in-out infinite ${i * 120}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
