"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { useStore } from "../_store"
import { buildChatBriefing, buildPortfolioContext } from "../agents/_context"
import { buildDiamondMissions, buildPortfolioRoi } from "../_diamond/adapter"
import { useT } from "../_i18n/use-t"
import { localeTag } from "../_i18n"
import { formatActivePercent, formatActiveUsd } from "../_i18n/legacy"
import { outputLanguageInstruction } from "@/lib/compass/data-grounded-language"

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

function fmtUsd(n: number): string {
  return formatActiveUsd(n)
}

function fmtPct(n: number): string {
  return formatActivePercent(n)
}

/* ------------------------------------------------------------------ */
/*  Cross-page signal parsing (reuse buildChatBriefing)                */
/* ------------------------------------------------------------------ */

interface Signal {
  label: string
  body: string
}

type SignalSeverity = "critical" | "high" | "medium" | "info"

const SEV_DOT: Record<SignalSeverity, string> = {
  critical: "bg-accent-critical",
  high: "bg-accent-warning",
  medium: "bg-accent-info",
  info: "bg-muted-foreground/40",
}

/** Presentation-only: map briefing label keywords to a calm severity dot. */
function inferSignalSeverity(label: string): SignalSeverity {
  const u = label.toUpperCase()
  if (/CONCENTRATION|NEGATIVE-MARGIN|CRITICAL/.test(u)) return "critical"
  if (/NTE|WIN RATE|HIDDEN LOSS|PM PRICING|ANOMALY/.test(u)) return "high"
  if (/FUEL|REGIONAL|SALES REP|SPREAD/.test(u)) return "medium"
  return "info"
}

/** Presentation-only: turn briefing shout-case into plain English. */
function toPlainLabel(label: string): string {
  if (label === "Signal") return label
  const acronyms = new Set(["NTE", "PM", "ROI", "CI", "BLS", "EIA", "NOAA", "TAM"])
  return label
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim()
    .split(/\s+/)
    .map(word => {
      const bare = word.replace(/[^A-Za-z0-9/-]/g, "")
      if (acronyms.has(bare.toUpperCase())) return bare.toUpperCase()
      if (word === word.toUpperCase() && word.length <= 2) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

function parseSignals(briefing: string): Signal[] {
  return briefing
    .split("\n")
    .filter(l => l.trimStart().startsWith("•"))
    .map(l => {
      const text = l.replace(/^\s*•\s*/, "")
      const m = text.match(/^([A-Z][A-Z0-9 ()/&-]+?):\s*(.*)$/)
      if (m) return { label: m[1].trim(), body: m[2].trim() }
      return { label: "Signal", body: text }
    })
}

/* ------------------------------------------------------------------ */
/*  Executive briefing renderer (self-contained, no markdown dep)      */
/* ------------------------------------------------------------------ */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
  })
}

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; text: string }

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => { if (para.length) { blocks.push({ type: "p", text: para.join(" ") }); para = [] } }

  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const t = raw.trim()
    if (!t) { flush(); continue }
    const h2 = t.match(/^#{1,2}\s+(.*)$/)
    const h3 = t.match(/^#{3,}\s+(.*)$/)
    const ol = t.match(/^\d+[.)]\s+(.*)$/)
    const ul = t.match(/^[-*•]\s+(.*)$/)
    if (h2) { flush(); blocks.push({ type: "h2", text: h2[1] }); continue }
    if (h3) { flush(); blocks.push({ type: "h3", text: h3[1] }); continue }
    if (ol) {
      flush()
      const last = blocks[blocks.length - 1]
      if (last?.type === "ol") last.items.push(ol[1]); else blocks.push({ type: "ol", items: [ol[1]] })
      continue
    }
    if (ul) {
      flush()
      const last = blocks[blocks.length - 1]
      if (last?.type === "ul") last.items.push(ul[1]); else blocks.push({ type: "ul", items: [ul[1]] })
      continue
    }
    para.push(t)
  }
  flush()
  return blocks
}

function ReportBody({ md }: { md: string }) {
  const blocks = React.useMemo(() => parseBlocks(md), [md])
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.type === "h2") {
          return (
            <h3 key={i} className="mt-5 border-b border-border pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground first:mt-0">
              {b.text}
            </h3>
          )
        }
        if (b.type === "h3") {
          return <h4 key={i} className="mt-3 text-[12px] font-semibold text-foreground">{renderInline(b.text, `h3-${i}`)}</h4>
        }
        if (b.type === "ol") {
          return (
            <ol key={i} className="space-y-2">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-tint-brand text-[9px] font-bold tabular-nums text-brand-strong">{j + 1}</span>
                  <span className="text-[13px] leading-relaxed text-foreground">{renderInline(it, `ol-${i}-${j}`)}</span>
                </li>
              ))}
            </ol>
          )
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2.5 text-[13px] leading-relaxed text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-info" />
                  <span>{renderInline(it, `ul-${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          )
        }
        return <p key={i} className="text-[13px] leading-relaxed text-muted-foreground">{renderInline(b.text, `p-${i}`)}</p>
      })}
    </div>
  )
}

/** Flatten the briefing Markdown into clean, deck-pasteable plain text. */
function markdownToPlainText(md: string): string {
  const out: string[] = []
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const t = raw.trim()
    const h2 = t.match(/^#{1,2}\s+(.*)$/)
    const h3 = t.match(/^#{3,}\s+(.*)$/)
    if (h2) { out.push("", h2[1].toUpperCase()); continue }
    if (h3) { out.push("", h3[1]); continue }
    let line = t.replace(/\*\*([^*]+)\*\*/g, "$1")
    line = line.replace(/^[-*•]\s+/, "  • ").replace(/^(\d+)[.)]\s+/, "  $1. ")
    out.push(line)
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

/* ------------------------------------------------------------------ */
/*  KPI                                                                */
/* ------------------------------------------------------------------ */

function Kpi({ label, value, sub, tone = "default", icon }: {
  label: string
  value: string
  sub?: string
  tone?: "default" | "green" | "blue" | "amber" | "red"
  icon: string
}) {
  const toneCls =
    tone === "green" ? "text-accent-positive-text"
    : tone === "blue" ? "text-brand-strong"
    : tone === "amber" ? "text-accent-warning-text"
    : tone === "red" ? "text-accent-critical-text"
    : "text-foreground"
  return (
    <div className="rounded-[12px] border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <SafeIcon name={icon} className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className={cn("mt-2 text-[20px] font-semibold tabular-nums leading-none", toneCls)}>{value}</div>
      {sub ? <div className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Drawer                                                             */
/* ------------------------------------------------------------------ */

const EXEC_PROMPT = `Produce an EXECUTIVE BRIEFING in Markdown for the Future Energy leadership team. It must be pasteable into a briefing memo with no further editing. Synthesize signals that carry a euro figure, percentage, or named comparison across every intelligence domain.

Follow this EXACT structure, using Markdown headings (##), bold (**), and lists. Do not add any other sections, preamble, or sign-off.

## Bottom Line
One or two sentences (BLUF) naming the opportunity with the largest euro figure in context and the specific decision being asked for. Bold the headline euro figure.

## What Changed
2–3 bullets ("- ") on the most important movement since the prior period. Use portfolioTrend (recent vs. prior margin, direction, delta) and any newly surfaced risk/opportunity. If trend data is thin, say so explicitly.

## Customer Health & Whitespace
2–3 bullets: composite Customer Score (CI-04) distribution + any high-tier/low-score accounts; and Total Addressable Market whitespace (portfolio addressable vs. captured, top expansion targets with $/yr).

## Pricing & Market / Weather Pricing Power
2–3 bullets: quoting exposure, NTE escalation friction (operational visibility only), AND weather-driven pricing-power windows (name the region, event window, and recommended surcharge/crew-staging action where pricing power is high).
NTE FRAMING (mandatory): the NTE is a cap the customer sets before dispatch and ACME cannot change it. Jobs that exceed it get re-authorized and still bill, so the dollar "overage" is NOT lost revenue, NOT unauthorized, and NOT a profit threat — never frame it that way and never make it the Bottom Line as recoverable/at-risk margin. Treat NTE as an operational-friction and cycle-time problem (re-auth loop: tech → dispatch → approver → customer; return trips, idle time, dispatch labor, customer-trust risk). Quantify friction cost for visibility and recommend internal workflow mitigations only — do NOT recommend NTE threshold changes, raises, or customer renegotiation.

## Process Velocity
1–2 bullets on invoice-lag / cash conversion if present.

## Operating Loop — Action Register
A numbered list of 4–6 items, ordered by dollar impact, built from the mission action register in context. Write EACH on a single line in exactly this format:
**<Action: imperative verb + what>** — Impact: **$X/yr** · Owner: <role or team> · Horizon: <timeframe>

## Risks & Watch Items
2–3 bullets on execution risk or downside exposure.

## Assumptions & Data Sources
1–2 bullets citing the data sources used (Internal job data, BLS, Census, EIA, NOAA weather) and flagging any MOCKED/SIMULATED inputs (e.g. TAM recon/OSINT signals, weather-urgency model, simulated AR/DSO collections signal) so the reader knows confidence levels.

Rules: every recommendation MUST include a specific euro figure; use ONLY figures present in the provided context (never invent data); no filler, no "as an AI", no closing pleasantries; keep the entire briefing under ~430 words. Every claim sentence must contain a number, date, or named comparison. Do not use unquantified magnitude, hype, or hedging words.`

export function BiDashboardDrawer() {
  const { biOpen, setBiOpen, data, allFindings, tenderStages, locale } = useStore()
  const t = useT()

  const briefing = React.useMemo(() => buildChatBriefing(data), [data])
  const signals = React.useMemo(() => locale === "fr" ? [] : parseSignals(briefing), [briefing, locale])
  const roi = React.useMemo(() => {
    const { missions, closed } = buildDiamondMissions(tenderStages, locale)
    return buildPortfolioRoi(missions, closed)
  }, [tenderStages, locale])

  const v = data.portfolioSummary.validated
  const scored = data.customers.filter(c => c.customerScore)
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((s, c) => s + (c.customerScore?.score ?? 0), 0) / scored.length)
    : 0
  const highSeverity = allFindings.filter(f => f.severity === "critical" || f.severity === "high").length

  const [narrative, setNarrative] = React.useState("")
  const [generatedAt, setGeneratedAt] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const statusTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const flashStatus = React.useCallback((msg: string) => {
    setStatus(msg)
    if (statusTimer.current) clearTimeout(statusTimer.current)
    statusTimer.current = setTimeout(() => setStatus(null), 4000)
  }, [])

  const generate = React.useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setNarrative("")
    setGeneratedAt(new Date().toLocaleDateString(localeTag(locale), { year: "numeric", month: "long", day: "numeric" }))

    const dataContext = buildPortfolioContext(data, {
      page: "customer-intel",
      drillLevel: "macro",
      selectedRegion: null,
      selectedCity: null,
      selectedCustomer: null,
      selectedJobType: null,
    })

    // Action register from the Operating Loop so the report and the loop stay consistent.
    const { missions } = buildDiamondMissions(tenderStages, locale)
    const horizonFor = (c: string) => (c === "days" ? "0-2 weeks" : c === "weeks" ? "4-6 weeks" : "this quarter")
    dataContext.operatingLoop = {
      realizedToDate: fmtUsd(roi.realizedToDate),
      blendedRoi: `${roi.blendedRoi.toFixed(1)}x`,
      inFlightProjected: fmtUsd(roi.inFlightProjected),
      actionRegister: [...missions]
        .sort((a, b) => b.projectedValue - a.projectedValue)
        .slice(0, 6)
        .map(m => ({
          action: m.recommendation,
          mission: m.name,
          impactPerYear: fmtUsd(m.realizedValue ?? m.projectedValue),
          owner: m.owner,
          horizon: horizonFor(m.cadence),
          stage: m.stage,
        })),
    }

    fetch("/api/acme/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: locale === "fr" ? `${outputLanguageInstruction("fr")}\n\n${EXEC_PROMPT}` : EXEC_PROMPT }],
        dataContext,
        chatBriefing: briefing,
        locale,
      }),
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.ok || !res.body) {
          setNarrative(t("bi.unable"))
          setLoading(false)
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          setNarrative(acc)
        }
        setLoading(false)
      })
      .catch(err => {
        if ((err as Error).name !== "AbortError") {
          setNarrative(t("bi.error"))
          setLoading(false)
        }
      })
  }, [data, briefing, roi, locale, t, tenderStages])

  React.useEffect(() => {
    abortRef.current?.abort()
    setNarrative("")
    setLoading(false)
  }, [locale])

  const buildReportText = React.useCallback(() => {
    return [
      locale === "fr" ? "═══ Synthèse BI de direction BluePilot — Future Energy ═══" : "═══ BluePilot Executive BI Summary — Future Energy ═══",
      "",
      `${locale === "fr" ? "Date" : "Date"}: ${new Date().toLocaleString(localeTag(locale))}`,
      "",
      locale === "fr" ? "── KPI du portefeuille ──" : "── Portfolio KPIs ──",
      `${locale === "fr" ? "Chiffre d’affaires validé" : "Revenue (validated)"}: ${fmtUsd(v.totalRevenue)}`,
      `${locale === "fr" ? "Marge moyenne" : "Avg margin"}: ${fmtPct(v.avgMarginPct)}`,
      `${locale === "fr" ? "Score client moyen (CI-04)" : "Avg Customer Score (CI-04)"}: ${avgScore}/100`,
      `${locale === "fr" ? "Centre d’actions — réalisé à ce jour" : "Operating Loop — realized to date"}: ${fmtUsd(roi.realizedToDate)} (${roi.blendedRoi.toFixed(1)}× ROI)`,
      `${locale === "fr" ? "Centre d’actions — pipeline en cours" : "Operating Loop — in-flight pipeline"}: ${fmtUsd(roi.inFlightProjected)} · ${roi.inFlightCount} missions`,
      `${locale === "fr" ? "Constats de gravité élevée" : "High-severity findings"}: ${highSeverity}`,
      "",
      locale === "fr" ? "── Signaux transversaux ──" : "── Cross-Page Signals ──",
      ...signals.map(s => `• ${s.label}: ${s.body}`),
      "",
      locale === "fr" ? "── Synthèse de direction ──" : "── Executive Briefing ──",
      narrative ? markdownToPlainText(narrative) : locale === "fr" ? "(pas encore générée)" : "(not yet generated)",
      "",
      locale === "fr" ? "── Propulsé par BluePilot / Future Energy ──" : "── Powered by BluePilot / Future Energy ──",
    ].join("\n")
  }, [v, avgScore, roi, highSeverity, signals, narrative, locale])

  // Pull a "## Heading" section's body out of the generated markdown.
  const getSection = React.useCallback((heading: string): string[] => {
    if (!narrative) return []
    const lines = narrative.split("\n")
    const out: string[] = []
    let capturing = false
    for (const line of lines) {
      const h = line.match(/^##\s+(.*)$/)
      if (h) { capturing = h[1].trim().toLowerCase().startsWith(heading.toLowerCase()); continue }
      if (capturing && line.trim()) out.push(markdownToPlainText(line).trim())
    }
    return out
  }, [narrative])

  const topSignal = signals[0]

  const buildEmailText = React.useCallback(() => {
    const bottomLine = getSection("Bottom Line")
    const recs = getSection("Operating Loop").filter(l => /\d|\$/.test(l)).slice(0, 3)
    if (locale === "fr") {
      return [
        "À : Direction de Future Energy",
        "Objet : Synthèse BI de direction — actions prioritaires",
        "",
        "Bonjour,",
        "",
        bottomLine.length > 0
          ? bottomLine.join(" ")
          : `Portefeuille à ${fmtUsd(v.totalRevenue)} de chiffre d’affaires et ${fmtPct(v.avgMarginPct)} de marge. ${topSignal ? `${topSignal.label} : ${topSignal.body}` : ""}`,
        "",
        "Actions prioritaires :",
        ...(recs.length > 0 ? recs.map((r, i) => `${i + 1}. ${r}`) : [`1. Pipeline du Centre d’actions : ${fmtUsd(roi.inFlightProjected)} sur ${roi.inFlightCount} missions.`]),
        "",
        `Le Centre d’actions a réalisé ${fmtUsd(roi.realizedToDate)} à ce jour (${roi.blendedRoi.toFixed(1)}× de ROI combiné).`,
        "",
        "Synthèse complète dans le résumé BI. — BluePilot",
      ].join("\n")
    }
    return [
      "To: Future Energy Leadership",
      "Subject: Executive BI Summary — Prioritized Actions",
      "",
      "Team,",
      "",
      bottomLine.length > 0
        ? bottomLine.join(" ")
        : `Portfolio at ${fmtUsd(v.totalRevenue)} revenue / ${fmtPct(v.avgMarginPct)} margin. ${topSignal ? `${topSignal.label}: ${topSignal.body}` : ""}`,
      "",
      "Top actions:",
      ...(recs.length > 0 ? recs.map((r, i) => `${i + 1}. ${r}`) : [`1. Operating Loop in-flight pipeline: ${fmtUsd(roi.inFlightProjected)} across ${roi.inFlightCount} missions.`]),
      "",
      `Operating Loop has realized ${fmtUsd(roi.realizedToDate)} to date (${roi.blendedRoi.toFixed(1)}x blended ROI).`,
      "",
      "Full briefing in the BI Summary. — BluePilot",
    ].join("\n")
  }, [getSection, v, topSignal, roi, locale])

  const buildAudioScript = React.useCallback(() => {
    const bottomLine = getSection("Bottom Line")
    const findings = [...getSection("What Changed"), ...getSection("Customer Health")].slice(0, 4)
    if (locale === "fr") {
      return [
        "[Script de narration — environ 45 secondes]",
        "",
        "Bonjour. Voici votre synthèse de direction Future Energy.",
        bottomLine.length > 0 ? bottomLine.join(" ") : `Le portefeuille atteint ${fmtUsd(v.totalRevenue)} de chiffre d’affaires validé et ${fmtPct(v.avgMarginPct)} de marge.`,
        "",
        "Les points clés :",
        ...(findings.length > 0 ? findings.map(f => `… ${f}`) : signals.slice(0, 3).map(s => `… ${s.label} : ${s.body}`)),
        "",
        `Dans le Centre d’actions, ${fmtUsd(roi.realizedToDate)} ont été réalisés et ${fmtUsd(roi.inFlightProjected)} sont en cours. Fin de la synthèse.`,
      ].join("\n")
    }
    return [
      "[Narration script — ~45 seconds]",
      "",
      "Good morning. Here's your Future Energy executive brief.",
      bottomLine.length > 0 ? bottomLine.join(" ") : `The portfolio is running at ${fmtUsd(v.totalRevenue)} in validated revenue and ${fmtPct(v.avgMarginPct)} margin.`,
      "",
      "The headlines:",
      ...(findings.length > 0 ? findings.map(f => `... ${f}`) : signals.slice(0, 3).map(s => `... ${s.label}: ${s.body}`)),
      "",
      `Across the operating loop, we've realized ${fmtUsd(roi.realizedToDate)} to date, with ${fmtUsd(roi.inFlightProjected)} in flight. That's your brief.`,
    ].join("\n")
  }, [getSection, v, signals, roi, locale])

  const buildTextDigest = React.useCallback(() => {
    const lead = topSignal ? `${topSignal.label}` : locale === "fr" ? "Portefeuille stable" : "Portfolio stable"
    if (locale === "fr") {
      return [
        `BI ACME : ${fmtUsd(v.totalRevenue)} CA · ${fmtPct(v.avgMarginPct)} marge · SC ${avgScore}/100`,
        `Signal principal : ${lead}`,
        `Boucle : ${fmtUsd(roi.realizedToDate)} réalisés, ${fmtUsd(roi.inFlightProjected)} en cours (${roi.inFlightCount} missions)`,
      ].join("\n")
    }
    return [
      `ACME BI: ${fmtUsd(v.totalRevenue)} rev · ${fmtPct(v.avgMarginPct)} margin · CS ${avgScore}/100`,
      `Top signal: ${lead}`,
      `Loop: ${fmtUsd(roi.realizedToDate)} realized, ${fmtUsd(roi.inFlightProjected)} in flight (${roi.inFlightCount} missions)`,
    ].join("\n")
  }, [topSignal, v, avgScore, roi, locale])

  const onExport = React.useCallback((kind: "report" | "audio" | "email" | "text") => {
    if (kind === "report") {
      navigator.clipboard.writeText(buildReportText())
      flashStatus(locale === "fr" ? "Rapport de direction copié dans le presse-papiers." : "Executive report copied to clipboard.")
      return
    }
    if (kind === "audio") {
      navigator.clipboard.writeText(buildAudioScript())
      flashStatus(locale === "fr" ? "Script de narration copié — briefing audio préparé pour la direction (simulation)." : "Narration script copied — audio brief queued for leadership (simulated).")
      return
    }
    if (kind === "email") {
      navigator.clipboard.writeText(buildEmailText())
      flashStatus(locale === "fr" ? "Brouillon d’e-mail copié pour la liste de diffusion de la direction (simulation)." : "Email draft copied to clipboard for the leadership distribution list (simulated).")
      return
    }
    if (kind === "text") {
      navigator.clipboard.writeText(buildTextDigest())
      flashStatus(locale === "fr" ? "Synthèse SMS copiée — envoyée au responsable d’astreinte (simulation)." : "SMS digest copied — sent to the on-call principal (simulated).")
      return
    }
  }, [buildReportText, buildAudioScript, buildEmailText, buildTextDigest, flashStatus, locale])

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape" && biOpen) setBiOpen(false) }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [biOpen, setBiOpen])

  if (!biOpen) return null

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/98 backdrop-blur-xl shadow-[0_8px_30px_rgba(26,38,64,0.08)]"
      style={{ height: "62vh", animation: "biSlideDown 250ms ease-out" }}
    >
      <style>{`
        @keyframes biSlideDown {
          from { transform: translateY(-100%); opacity: 0.8; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <SafeIcon name="LayoutDashboard" className="h-4 w-4 shrink-0 text-brand-strong" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground">{t("bi.title")}</span>
            <p className="text-[12px] text-muted-foreground">{t("bi.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={generate} disabled={loading}>
            <SafeIcon name="Sparkles" className="h-3 w-3" />
            {loading ? t("bi.generating") : narrative ? t("bi.regenerate") : t("bi.generate")}
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => onExport("report")}>
              <SafeIcon name="Copy" className="h-3 w-3" /> {t("bi.report")}
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => onExport("audio")}>
              <SafeIcon name="Volume2" className="h-3 w-3" /> {t("bi.audio")}
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => onExport("email")}>
              <SafeIcon name="Mail" className="h-3 w-3" /> {t("bi.email")}
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => onExport("text")}>
              <SafeIcon name="MessageSquare" className="h-3 w-3" /> {t("bi.text")}
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBiOpen(false)}>
            <SafeIcon name="X" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {status && (
        <div className="flex items-center gap-2 border-b border-border bg-tint-positive px-5 py-2 text-[12px] text-accent-positive-text">
          <SafeIcon name="CircleCheck" className="h-3.5 w-3.5" />
          {status}
        </div>
      )}

      {/* Body */}
      <div className="grid h-[calc(100%-52px)] grid-cols-1 gap-0 divide-x divide-border lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] overflow-hidden">
        {/* Left: KPIs + calm Signals rail */}
        <div className="overflow-y-auto px-5 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi label={t("bi.revenue")} value={fmtUsd(v.totalRevenue)} sub={t("bi.validatedJobs", { count: v.jobCount })} icon="DollarSign" />
            <Kpi label={t("bi.avgMargin")} value={fmtPct(v.avgMarginPct)} tone="blue" sub={t("bi.customers", { count: data.portfolioSummary.totalCustomers })} icon="Percent" />
            <Kpi label={t("bi.avgCustomerScore")} value={`${avgScore}/100`} tone="green" sub={t("bi.composite")} icon="Gauge" />
            <Kpi label={t("bi.roiRealized")} value={fmtUsd(roi.realizedToDate)} tone="green" sub={t("bi.blended", { value: roi.blendedRoi.toFixed(1) })} icon="TrendingUp" />
            <Kpi label={t("bi.inFlight")} value={fmtUsd(roi.inFlightProjected)} tone="blue" sub={t("bi.missions", { count: roi.inFlightCount })} icon="Rocket" />
            <Kpi label={t("bi.needsAttention")} value={String(highSeverity)} tone={highSeverity > 0 ? "amber" : "default"} sub={t("bi.priorityItems")} icon="TriangleAlert" />
          </div>

          <section className="space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">{t("bi.signals")}</p>
              <p className="text-[12px] text-muted-foreground">
                {t("bi.signalCount", { count: signals.length })}
              </p>
            </div>
            <div className="space-y-5">
              {signals.map((s, i) => {
                const severity = inferSignalSeverity(s.label)
                return (
                  <article key={i} className="flex gap-3 border-b border-border/60 pb-5 last:border-0 last:pb-0">
                    <span
                      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-background", SEV_DOT[severity])}
                      title={severity}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[14px] font-medium leading-snug text-foreground">{toPlainLabel(s.label)}</p>
                      <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-1">{s.body}</p>
                    </div>
                  </article>
                )
              })}
              {signals.length === 0 && (
                <p className="text-[13px] text-muted-foreground">{t("bi.noSignals")}</p>
              )}
            </div>
          </section>
        </div>

        {/* Right: narrative */}
        <div className="overflow-y-auto px-5 py-5">
          <div className="mb-4 flex items-center gap-1.5">
            <SafeIcon name="BrainCircuit" className="h-3.5 w-3.5 text-brand-strong" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">{t("bi.narrative")}</span>
            {loading && (
              <span className="ml-1 inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-strong animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-strong animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-strong animate-pulse" style={{ animationDelay: "300ms" }} />
              </span>
            )}
          </div>
          {narrative ? (
            <div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold tracking-tight text-foreground">{t("bi.briefing")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("bi.intelligence")}</div>
                </div>
                <div className="shrink-0 text-right">
                  {generatedAt && <div className="text-[11px] font-medium text-muted-foreground">{generatedAt}</div>}
                  <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">{t("bi.confidential")}</div>
                </div>
              </div>
              <div className="p-5">
                <ReportBody md={narrative} />
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-3 rounded bg-muted/60" style={{ width: `${85 - i * 8}%` }} />
              ))}
            </div>
          ) : (
            <div className="flex h-[70%] flex-col items-center justify-center gap-4 px-6 text-center">
              <SafeIcon name="Sparkles" className="h-8 w-8 text-muted-foreground/30" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">{t("bi.emptyTitle")}</p>
                <p className="text-[13px] leading-relaxed text-muted-foreground/80">
                  {t("bi.emptyBody")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
