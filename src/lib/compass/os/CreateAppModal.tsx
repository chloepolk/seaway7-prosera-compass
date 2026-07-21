"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { useCompassOS } from "./os-context"
import { normalizeSpec, type AppIdea, type AppIdeaFeatures, type SourceRef, type Provenance, type Confidence } from "./app-spec"

const BRAND = "#004F9A"

type Phase = "intent" | "working" | "composing"

const FEATURE_META: { key: keyof AppIdeaFeatures; label: string; icon: string }[] = [
  { key: "visuals", label: "Visuals", icon: "BarChart3" },
  { key: "stripa", label: "STRIPA (S·TR·I·P·A)", icon: "Activity" },
  { key: "explainability", label: "Explainability", icon: "Sparkles" },
  { key: "marketIntelligence", label: "Market Intelligence → Loop", icon: "Wrench" },
]

const PROV_CLS: Record<SourceRef["provenance"], string> = {
  live: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  benchmark: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  modeled: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
}

const PROVS: Provenance[] = ["live", "benchmark", "modeled"]
const CONFS: Confidence[] = ["high", "moderate", "indicative"]

function normIdea(raw: unknown): AppIdea | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.title !== "string" || !r.title.trim()) return null
  const feat = (r.features && typeof r.features === "object" ? r.features : {}) as Record<string, unknown>
  const sources = Array.isArray(r.sources) ? r.sources : []
  return {
    id: typeof r.id === "string" && r.id ? r.id : `idea-${Math.random().toString(36).slice(2, 8)}`,
    title: r.title,
    icon: typeof r.icon === "string" ? r.icon : "Sparkles",
    rationale: typeof r.rationale === "string" ? r.rationale : "",
    internalBindings: Array.isArray(r.internalBindings) ? r.internalBindings.filter((s): s is string => typeof s === "string") : [],
    sources: sources
      .map(s => (s && typeof s === "object" ? s as Record<string, unknown> : null))
      .filter((s): s is Record<string, unknown> => !!s && typeof s.label === "string")
      .map(s => ({
        id: typeof s.id === "string" && s.id ? s.id : String(s.label).toLowerCase().replace(/\s+/g, "-"),
        label: String(s.label),
        external: Boolean(s.external),
        provenance: PROVS.includes(s.provenance as Provenance) ? (s.provenance as Provenance) : "modeled",
        confidence: CONFS.includes(s.confidence as Confidence) ? (s.confidence as Confidence) : undefined,
        method: typeof s.method === "string" && s.method ? s.method : undefined,
      })),
    features: {
      visuals: feat.visuals !== false,
      stripa: Boolean(feat.stripa),
      explainability: feat.explainability !== false,
      marketIntelligence: Boolean(feat.marketIntelligence ?? feat.playbook),
    },
  }
}

function SourceBadges({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {sources.slice(0, 4).map(s => (
        <span key={s.id} title={s.method ? `Modeled: ${s.method}` : s.label} className={cn("rounded-sm px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide", PROV_CLS[s.provenance])}>
          {s.label} · {s.provenance}
        </span>
      ))}
    </div>
  )
}

export function CreateAppModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { saveCustomApp, apiBase, appDiscovery } = useCompassOS()
  const [phase, setPhase] = React.useState<Phase>("intent")
  const [intent, setIntent] = React.useState("")
  const [logs, setLogs] = React.useState<string[]>([])
  const [ideas, setIdeas] = React.useState<AppIdea[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [features, setFeatures] = React.useState<AppIdeaFeatures | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [rejection, setRejection] = React.useState<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([])
  const logEndRef = React.useRef<HTMLDivElement | null>(null)

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  React.useEffect(() => () => { abortRef.current?.abort(); clearTimers() }, [clearTimers])
  React.useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [logs])

  const selected = ideas.find(i => i.id === selectedId) ?? null

  const startDiscovery = React.useCallback(async () => {
    clearTimers()
    setPhase("working"); setIdeas([]); setSelectedId(null); setFeatures(null); setError(null); setRejection(null)
    setLogs(appDiscovery?.seedLogs ?? ["Reading the live dataset…", "Matching relevant signals to your intent…"])
    const ctrl = new AbortController(); abortRef.current = ctrl

    const sleep = (ms: number) => new Promise<void>(resolve => {
      timersRef.current.push(setTimeout(resolve, ms))
    })

    try {
      const res = await fetch(`${apiBase}/app-architect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
        signal: ctrl.signal,
      })
      const json = await res.json()
      const data = json?.data
      const scope = data?.scope
      const realLogs: string[] = Array.isArray(data?.logs) ? data.logs.filter((s: unknown): s is string => typeof s === "string") : []
      const ideaList: AppIdea[] = Array.isArray(data?.ideas) ? data.ideas.map(normIdea).filter((i: AppIdea | null): i is AppIdea => !!i) : []

      // Domain guardrail: the architect rejected an out-of-scope intent.
      if (scope && scope.inScope === false) {
        const reason = typeof scope.reason === "string" && scope.reason.trim()
          ? scope.reason.trim()
          : "That request is outside what this cockpit covers."
        setRejection(reason)
        setLogs([])
        setPhase("intent")
        return
      }

      if (ideaList.length === 0) {
        setError("The architect didn't return any ideas. Try a more specific intent and run discovery again.")
        setPhase("intent")
        return
      }

      // Simulate live reasoning: reveal logs, then pop in idea cards.
      for (const line of realLogs) {
        if (ctrl.signal.aborted) return
        setLogs(prev => [...prev, line])
        await sleep(420)
      }
      for (const idea of ideaList) {
        if (ctrl.signal.aborted) return
        setIdeas(prev => [...prev, idea])
        await sleep(340)
      }
      if (!ctrl.signal.aborted) setPhase("intent")
    } catch (err) {
      if ((err as Error).name !== "AbortError") { setError("Discovery failed. Please try again."); setPhase("intent") }
    }
  }, [intent, clearTimers, apiBase, appDiscovery])

  const createApp = React.useCallback(async () => {
    if (!selected) return
    setPhase("composing"); setError(null)
    const ctrl = new AbortController(); abortRef.current = ctrl
    try {
      const res = await fetch(`${apiBase}/app-compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: selected, features: features ?? selected.features }),
        signal: ctrl.signal,
      })
      const json = await res.json()
      const spec = normalizeSpec(json?.data)
      if (!spec) throw new Error("compose returned an unusable spec")
      spec.icon = selected.icon || spec.icon
      saveCustomApp(spec)
      onCreated(spec.id)
      onClose()
    } catch (err) {
      if ((err as Error).name !== "AbortError") { setError("Couldn't compose that app. Pick another idea or retry."); setPhase("working") }
    }
  }, [selected, features, saveCustomApp, onCreated, onClose, apiBase])

  const toggleFeature = (k: keyof AppIdeaFeatures) =>
    setFeatures(prev => prev ? { ...prev, [k]: !prev[k] } : prev)

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <SafeIcon name="Sparkles" className="h-4 w-4 text-[#004F9A] dark:text-sky-400" />
            <h3 className="text-sm font-semibold">Create an app</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">agent-built</span>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted">
            <SafeIcon name="X" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
          {/* Intent */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">What do you want to understand?</label>
            <textarea
              value={intent}
              onChange={e => setIntent(e.target.value)}
              placeholder="e.g. Where can weather and material costs let us raise prices? — or leave blank and let the agent recommend."
              rows={2}
              disabled={phase === "composing"}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-[#004F9A]"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={startDiscovery}
                disabled={phase === "working" || phase === "composing"}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: BRAND }}
              >
                <SafeIcon name="Compass" className="h-3.5 w-3.5" />
                {phase === "working" ? "Discovering…" : ideas.length > 0 ? "Rediscover" : "Discover ideas"}
              </button>
              {phase === "intent" && (
                <button type="button" onClick={() => { setIntent(""); startDiscovery() }} className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline">
                  Just recommend something
                </button>
              )}
            </div>
          </div>

          {error && <p className="rounded-md bg-red-500/10 px-3 py-2 text-[12px] text-red-700 dark:text-red-400">{error}</p>}

          {rejection && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400">
                <SafeIcon name="ShieldAlert" className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">Outside this cockpit&apos;s scope</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-amber-700/90 dark:text-amber-200/80">{rejection}</p>
                {appDiscovery?.scopeHint && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{appDiscovery.scopeHint}</p>
                )}
              </div>
            </div>
          )}

          {/* Live discovery log */}
          {logs.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {phase === "working" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#004F9A] opacity-60" />}
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: BRAND }} />
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Discovery log</span>
              </div>
              <ul className="space-y-0.5">
                {logs.map((l, i) => <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">{l}</li>)}
              </ul>
              <div ref={logEndRef} />
            </div>
          )}

          {/* Idea cards */}
          {ideas.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Proposed apps {phase === "working" && "(streaming…)"}</span>
              {ideas.map(idea => {
                const isSel = idea.id === selectedId
                return (
                  <div key={idea.id} className={cn("rounded-lg border transition-all", isSel ? "border-[#004F9A] bg-[#004F9A]/5" : "hover:border-border")}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSel) { setSelectedId(null); setFeatures(null); return }
                        setSelectedId(idea.id)
                        // STRIPA is universal IP — available on every app.
                        setFeatures({ ...idea.features })
                      }}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${BRAND}14`, color: BRAND }}>
                        <SafeIcon name={idea.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-foreground">{idea.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{idea.rationale}</span>
                        <span className="mt-1.5 block"><SourceBadges sources={idea.sources} /></span>
                      </span>
                      <SafeIcon name={isSel ? "ChevronUp" : "ChevronDown"} className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>

                    {isSel && features && (
                      <div className="space-y-3 border-t border-border/50 px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {FEATURE_META.map(f => {
                            const on = features[f.key]
                            return (
                              <button
                                key={f.key}
                                type="button"
                                onClick={() => toggleFeature(f.key)}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                  on ? "border-[#004F9A] bg-[#004F9A]/10 text-[#004F9A] dark:text-sky-400" : "text-muted-foreground hover:bg-muted/50",
                                )}
                              >
                                <SafeIcon name={on ? "Check" : f.icon} className="h-3 w-3" />
                                {f.label}
                              </button>
                            )
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={createApp}
                          disabled={phase === "composing"}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: BRAND }}
                        >
                          <SafeIcon name="Plus" className="h-3.5 w-3.5" />
                          {phase === "composing" ? "Composing…" : "Create this app"}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {phase === "working" && ideas.length === 0 && logs.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted-foreground">
              <SafeIcon name="Loader" className="h-4 w-4 animate-spin" /> Discovering opportunities…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
