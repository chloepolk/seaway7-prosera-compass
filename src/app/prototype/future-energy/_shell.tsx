"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/prosera/avatar"
import { Button } from "@/components/ui/prosera/button"
import { Badge } from "@/components/ui/prosera/badge"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/prosera/tooltip"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/prosera/popover"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/prosera/sheet"
import { useStore, type Page, type IntelRailSection, type ChatMessage } from "./_store"
import { useT } from "./_i18n/use-t"
import { localeTag, type Locale } from "./_i18n"
import { localizedClosedPackages, localizedTenderPackages } from "./_i18n/domain"
import { localizeLegacyCopy } from "./_i18n/legacy"
import { SandboxDrawer } from "./_sandbox/SandboxDrawer"
import { BiDashboardDrawer } from "./_bi/BiDashboardDrawer"
import { DOCUMENTS, CATEGORY_LABELS, CHARTER, type DocumentCategory } from "./data/future-energy/_documents"
import { TENDER_PACKAGES, CLOSED_PACKAGES, PROJECT, TODAY } from "./data/future-energy/_tenders"
import type { BPFinding, Severity } from "./data/_insights"
import type { OrchestratorFinding, ReasoningStep, SpecialistId } from "./agents/_types"
import { fadeCrossMotion, findingMotion, pcmButton, pcmCard, pcmTab, drawerSlideMotion, thinkingPhaseMotion } from "./_components/motion"
import { ReasoningTooltip } from "./_components/reasoning-disclosure"
import { reasoningFromFinding } from "./_components/reasoning-helpers"
import { ChatMessageBody } from "./_components/chat-message-body"
import { ACTIVE_USER } from "./_components/hub/active-user"
import { avatarSrcById } from "./_components/hub/avatar-color"
/** Light logo = dark ink (light UI). Dark logo = white ink (dark UI). */
const FE_LOGO_FOR_LIGHT_UI = "/future-energy/logo-light.svg"
const FE_LOGO_FOR_DARK_UI = "/future-energy/logo-dark.svg"
const ACTIVE_USER_AVATAR = avatarSrcById(ACTIVE_USER.id)

const HEADER_HEIGHT = 56
const TOP_NAV_HEIGHT = 66
/** Shared horizontal bounds: wider on large screens, min gutters on smaller viewports. */
const SHELL_CONTENT_CLASS =
  "mx-auto w-full max-w-[min(1600px,calc(100%-2rem))] px-6 sm:px-8"

/* ------------------------------------------------------------------ */
/*  Top nav tabs (maps to existing Page routes)                        */
/* ------------------------------------------------------------------ */

type TopNavTab = {
  id: string
  labelKey: "nav.actionCentre" | "nav.tenderStudio" | "nav.bidEvaluation"
  pages: Page[]
  defaultPage: Page
}

const TOP_NAV_TABS: TopNavTab[] = [
  { id: "action-board", labelKey: "nav.actionCentre", pages: ["operating-loop"], defaultPage: "operating-loop" },
  { id: "tender-studio", labelKey: "nav.tenderStudio", pages: ["tender-studio"], defaultPage: "tender-studio" },
  { id: "bid-evaluation", labelKey: "nav.bidEvaluation", pages: ["bid-evaluation"], defaultPage: "bid-evaluation" },
]

function activeTabForPage(page: Page): TopNavTab {
  return TOP_NAV_TABS.find(t => t.pages.includes(page)) ?? TOP_NAV_TABS[0]
}

/* ------------------------------------------------------------------ */
/*  Theme Toggle                                                       */
/* ------------------------------------------------------------------ */

function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const t = useT()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isDark = theme === "system" ? systemTheme === "dark" : theme === "dark"
  const toggle = React.useCallback(() => setTheme(isDark ? "light" : "dark"), [isDark, setTheme])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label={t("common.toggleTheme")} disabled>
        <SafeIcon name="Loader2" className="size-4 animate-spin" />
      </Button>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.toggleTheme")} onClick={toggle} className={cn(pcmButton, "border border-border/60")}>
          <SafeIcon name={isDark ? "Moon" : "Sun"} className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t("common.toggleTheme")}</TooltipContent>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------ */
/*  Language Toggle (EN / FR)                                          */
/* ------------------------------------------------------------------ */

function LanguageToggle() {
  const { locale, setLocale } = useStore()
  const t = useT()

  const select = (next: Locale) => {
    if (next !== locale) setLocale(next)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="group"
          aria-label={t("common.language")}
          className={cn(
            pcmButton,
            "inline-flex h-9 items-center rounded-[9px] border border-border/60 p-0.5 text-[11px] font-semibold",
          )}
        >
          {([
            { id: "en" as const, label: "EN" },
            { id: "fr" as const, label: "FR" },
          ]).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => select(opt.id)}
              aria-pressed={locale === opt.id}
              className={cn(
                "rounded-[7px] px-2 py-1 transition-colors",
                locale === opt.id
                  ? "bg-[var(--color-tint-neutral)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t("common.language")}</TooltipContent>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------ */
/*  Data Scope Badge                                                   */
/* ------------------------------------------------------------------ */

function DataScopeBadge() {
  const t = useT()
  const categoryCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of DOCUMENTS) counts.set(d.category, (counts.get(d.category) ?? 0) + 1)
    return counts
  }, [])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(pcmButton, "flex items-center gap-1.5 rounded-[9px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-3 py-2 text-[12px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]")}
        >
          <span className="tabular-nums">{PROJECT.shortName}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 pt-3 pb-2 border-b">
          <p className="text-sm font-semibold">{PROJECT.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t("scope.projectDescription")}</p>
        </div>
        <div className="px-4 py-3 space-y-2.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("scope.client")}</span>
            <span className="font-medium">{PROJECT.client}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("scope.mobilisationPort")}</span>
            <span className="font-medium">{t("scope.portValue")}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("scope.livePackages")}</span>
            <span className="font-medium tabular-nums">{TENDER_PACKAGES.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("scope.controlledDocuments")}</span>
            <span className="font-medium tabular-nums">{DOCUMENTS.length}</span>
          </div>
          {Array.from(categoryCounts.entries()).map(([cat, count]) => (
            <div key={cat} className="flex justify-between pl-3">
              <span className="text-muted-foreground">{t(`categories.${cat}`) || CATEGORY_LABELS[cat as DocumentCategory] || cat}</span>
              <span className="font-medium tabular-nums">{count}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 bg-muted/40 border-t rounded-b-md">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t("scope.registerNote")}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ------------------------------------------------------------------ */
/*  Data Integrity Badge                                               */
/* ------------------------------------------------------------------ */

function DataIntegrityBadge() {
  const { setIntelRailSection, setIntelPanelOpen } = useStore()
  const t = useT()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => {
            setIntelRailSection("findings")
            setIntelPanelOpen(true)
          }}
          className={cn(
            pcmButton,
            "flex items-center gap-1.5 rounded-[9px] border px-3 py-2 text-[12px] font-medium tabular-nums",
            "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400",
          )}
        >
          <SafeIcon name="ShieldCheck" className="h-3.5 w-3.5" />
          <span>{DOCUMENTS.length}/{DOCUMENTS.length}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {t("scope.integrityTooltip", { count: DOCUMENTS.length })}
      </TooltipContent>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------ */
/*  Header Bar with Drill Breadcrumbs                                  */
/* ------------------------------------------------------------------ */

function DrillBreadcrumbBar() {
  const { breadcrumbs, drillLevel, activePage, setPage } = useStore()
  const t = useT()
  const hubPages: Page[] = ["operating-loop", "commercial-center", "market-position", "process-velocity"]
  const showIntelHubBack =
    (activePage === "customer-intel" || activePage === "pricing-intel") && drillLevel === "macro"
  const showBack =
    (breadcrumbs.length > 0 || showIntelHubBack) &&
    !(hubPages.includes(activePage) && drillLevel === "macro")

  if (!showBack) return null

  return (
    <header
      className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-sm"
    >
      <div className={cn(SHELL_CONTENT_CLASS, "flex h-11 items-center gap-2")}>
      {(activePage === "customer-intel" || activePage === "pricing-intel") && drillLevel === "macro" && (
        <button
          type="button"
          onClick={() => setPage("commercial-center")}
          className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <SafeIcon name="ArrowLeft" className="h-4 w-4 shrink-0" />
          {t("common.back")}
        </button>
      )}
      {breadcrumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <SafeIcon name="ChevronRight" className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
          {c.onClick ? (
            <button type="button" onClick={c.onClick} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              {c.label}
            </button>
          ) : (
            <span className="font-semibold text-[var(--color-text-primary)]">{c.label}</span>
          )}
        </React.Fragment>
      ))}
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/*  Top horizontal nav (replaces left sidebar)                         */
/* ------------------------------------------------------------------ */

function TopNavBar() {
  const {
    activePage,
    setPage,
    intelPanelOpen,
    setIntelPanelOpen,
    setIntelRailSection,
  } = useStore()
  const t = useT()
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isDark = mounted && (theme === "system" ? systemTheme === "dark" : theme === "dark")
  const activeTab = activeTabForPage(activePage)

  return (
    <header
      className="shrink-0 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)]"
    >
      <div
        className={cn(SHELL_CONTENT_CLASS, "flex items-center justify-between")}
        style={{ height: TOP_NAV_HEIGHT }}
      >
      <div className="flex min-w-0 items-center gap-7">
        <img
          src={isDark ? FE_LOGO_FOR_DARK_UI : FE_LOGO_FOR_LIGHT_UI}
          alt="Future Energy"
          className="h-9 w-auto shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
        />
        <nav className="flex items-center gap-1.5 overflow-x-auto">
          {TOP_NAV_TABS.map((tab) => {
            const isActive = tab.id === activeTab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (!tab.pages.includes(activePage)) setPage(tab.defaultPage)
                }}
                className={cn(
                  pcmTab,
                  "shrink-0 whitespace-nowrap rounded-[9px] px-3.5 py-2 text-[13px]",
                  isActive
                    ? "bg-[var(--color-tint-neutral)] font-semibold text-[var(--color-text-primary)]"
                    : "font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {t(tab.labelKey)}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <DataScopeBadge />
        <DataIntegrityBadge />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIntelRailSection("findings")
            setIntelPanelOpen(true)
          }}
          className={cn(
            pcmButton,
            "h-auto gap-1.5 rounded-[10px] border border-[var(--color-border-default)] px-3 py-2 text-[12px] font-semibold",
            intelPanelOpen && "border-[var(--color-brand-primary)] bg-[var(--color-tint-brand)] text-[var(--color-brand-strong)]",
          )}
        >
          <SafeIcon name="BrainCircuit" className="h-3.5 w-3.5" />
          {t("nav.intelligencePanel")}
        </Button>
        <LanguageToggle />
        <ThemeToggle />
        <Avatar className="h-9 w-9 border border-[var(--color-border-default)]">
          {ACTIVE_USER_AVATAR ? (
            <AvatarImage src={ACTIVE_USER_AVATAR} alt={ACTIVE_USER.name} />
          ) : null}
          <AvatarFallback className="bg-[var(--color-bg-inverse)] text-xs font-semibold text-[var(--color-text-inverse)]">DH</AvatarFallback>
        </Avatar>
      </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */
/*  BP Finding Card (for rail)                                         */
/* ------------------------------------------------------------------ */

/*
 * Severity styling for the Intelligence rail deliberately avoids the hero
 * pages' BCG tier palette (Stars=amber, Cash Cows=blue, Question Marks=yellow,
 * Dogs=red) so a finding never reads as "correlated" to a tier. We use a
 * monochrome zinc ramp plus an icon + label tag — an ops/alert idiom distinct
 * from the hero's flat color blocks.
 */
const severityBorder: Record<Severity, string> = {
  critical: "border-l-zinc-700 dark:border-l-zinc-300",
  high: "border-l-zinc-500 dark:border-l-zinc-400",
  medium: "border-l-zinc-400 dark:border-l-zinc-600",
  info: "border-l-zinc-300 dark:border-l-zinc-700",
}

const severityTag: Record<Severity, { labelKey: string; icon: string; cls: string }> = {
  critical: { labelKey: "severity.critical", icon: "OctagonAlert", cls: "bg-foreground text-background" },
  high: { labelKey: "severity.high", icon: "TriangleAlert", cls: "bg-muted-foreground/20 text-foreground" },
  medium: { labelKey: "severity.medium", icon: "Info", cls: "bg-muted text-muted-foreground" },
  info: { labelKey: "severity.info", icon: "CircleDot", cls: "bg-muted/60 text-muted-foreground" },
}

function SeverityTag({ severity }: { severity: Severity }) {
  const translate = useT()
  const meta = severityTag[severity] ?? severityTag.info
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", meta.cls)}>
      <SafeIcon name={meta.icon} className="h-2.5 w-2.5" />
      {translate(meta.labelKey)}
    </span>
  )
}

const categoryLabelKeys: Record<string, string> = {
  "pipeline-health": "findingCategory.pipeline-health",
  "deadline-risk": "findingCategory.deadline-risk",
  "savings-signal": "findingCategory.savings-signal",
  "compliance-flag": "findingCategory.compliance-flag",
  "charter-interface": "findingCategory.charter-interface",
  "supplier-signal": "findingCategory.supplier-signal",
  "data-quality": "findingCategory.data-quality",
}

function FindingCard({ finding, index }: { finding: BPFinding; index: number }) {
  const t = useT()
  const { locale } = useStore()
  const motion = findingMotion(index)
  const localizedTitle = localizeLegacyCopy(finding.title, locale)
  const localizedNarrative = localizeLegacyCopy(finding.narrative, locale)
  const rawReasoning = reasoningFromFinding(finding)
  const reasoning = {
    ...rawReasoning,
    summary: rawReasoning.summary ? localizeLegacyCopy(rawReasoning.summary, locale) : undefined,
    steps: rawReasoning.steps?.map((step) => localizeLegacyCopy(step, locale)),
    evidence: rawReasoning.evidence?.map((item) => localizeLegacyCopy(item, locale)),
    conclusion: rawReasoning.conclusion ? localizeLegacyCopy(rawReasoning.conclusion, locale) : undefined,
    sources: rawReasoning.sources?.map((source) => localizeLegacyCopy(source, locale)),
  }

  return (
    <article
      className={cn(
        motion.className,
        pcmCard,
        "w-full rounded-lg border border-l-[3px] bg-background p-3 space-y-1.5",
        severityBorder[finding.severity],
      )}
      style={motion.style}
    >
      <div className="flex items-center gap-1.5">
        <SeverityTag severity={finding.severity} />
        <span className="ml-auto shrink-0 inline-flex items-center rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          {categoryLabelKeys[finding.category] ? t(categoryLabelKeys[finding.category]) : finding.category}
        </span>
      </div>
      <p className="flex items-center gap-1 text-xs font-semibold leading-snug">
        {localizedTitle}
        <ReasoningTooltip reasoning={reasoning} label={t("intel.whyPrefix", { title: localizedTitle })} />
      </p>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
        {localizedNarrative}
      </p>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  Findings Panel                                                     */
/* ------------------------------------------------------------------ */

function FindingsPanel() {
  const { contextFindings, bpFindings, isThinking, isAgentLoading, useStaticFallback, agentPhase, verifierResult, locale } = useStore()
  const t = useT()

  const annotationsMap = React.useMemo(() => {
    const map = new Map<string, string[]>()
    if (verifierResult?.annotations) {
      for (const a of verifierResult.annotations) {
        const existing = map.get(a.findingId) ?? []
        existing.push(a.note)
        map.set(a.findingId, existing)
      }
    }
    return map
  }, [verifierResult])

  const shimmerBg = "linear-gradient(90deg, var(--color-muted) 25%, var(--color-muted-foreground) 37%, var(--color-muted) 63%)"

  const phaseLabels = React.useMemo(() => {
    if (agentPhase === "specialists") return [t("agent.pipelineAnalysis"), t("agent.commercialAnalysis"), t("agent.supplyMarketSignals")]
    if (agentPhase === "orchestrating") return [t("agent.synthesisingFindings"), t("agent.crossReferencing"), ""]
    if (agentPhase === "verifying") return [t("agent.verifyingClaimsShort"), t("agent.auditingCalculations"), ""]
    return ["", "", ""]
  }, [agentPhase, t])

  if (isAgentLoading || (isThinking && bpFindings.length === 0)) {
    return (
      <div className="flex flex-col gap-2">
        {phaseLabels.filter(Boolean).map((label, i) => {
          const phase = thinkingPhaseMotion(i)
          return (
          <div
            key={i}
            className={cn(phase.className, "rounded-lg border border-l-4 border-l-muted/50 bg-background p-3")}
            style={phase.style}
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-[10px] text-muted-foreground/60 font-medium">{label}</p>
            </div>
          </div>
          )
        })}
      </div>
    )
  }

  const validAgentFindings = bpFindings.filter(f => f.title && f.title.trim().length > 0)
  const hasAgent = validAgentFindings.length > 0
  const hasStatic = locale === "en" && useStaticFallback && contextFindings.length > 0

  if (!hasAgent && !hasStatic) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <SafeIcon name="SearchCheck" className="h-6 w-6 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground/60">{t("intel.noFindingsCurrent")}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {hasAgent && validAgentFindings.map((f, i) => (
        <AgentFindingCard
          key={f.id}
          finding={f}
          annotations={annotationsMap.get(f.id)}
          index={i}
        />
      ))}
      {hasStatic && contextFindings.map((f, i) => (
        <FindingCard key={f.id} finding={f} index={validAgentFindings.length + i} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Reasoning Panel                                                    */
/* ------------------------------------------------------------------ */

function ReasoningPanel() {
  const { activePage, bpReasoning, isThinking, isAgentLoading, useStaticFallback, agentPhase, verifierResult, isVerified, locale } = useStore()
  const t = useT()
  const specialistLabels: Record<SpecialistId, string> = {
    portfolio: t("agent.specialistPipeline"),
    pricing: t("agent.specialistCommercial"),
    market: t("agent.specialistSupplyMarket"),
  }

  const hasAgentReasoning = bpReasoning.length > 0

  const staticReasoning = React.useMemo(() => {
    const packages = localizedTenderPackages(locale)
    const closed = localizedClosedPackages(locale)
    if (locale === "fr") {
      if (activePage === "tender-studio") {
        return {
          chain: [
            "Résolution du lot vers sa spécification technique contrôlée et sa quantité",
            "Récupération des obligations DNV / NORSOK / ISO applicables depuis QA-MAN-2026-EPCI",
            "Assemblage des conditions commerciales et juridiques de S7-SCM-TC-2026, avec obligations issues de la charte pour les opérations maritimes",
            "Composition des sections de l’AO et préparation de l’audit contradictoire de chaque source citée",
          ],
          sources: [`${DOCUMENTS.length} documents contrôlés au registre projet`, `${packages.length} lots actifs sur le pipeline ${PROJECT.shortName}`, "Particularités de la charte SUPPLYTIME 2026"],
        }
      }
      if (activePage === "bid-evaluation") {
        return {
          chain: [
            "Application des portes éliminatoires : ISO 9001, knock-for-knock mutuel, DDP Rotterdam",
            "Normalisation des prix éligibles par rapport à l’offre conforme la plus basse (Prix 35)",
            "Notation Technique 25, QA/HSEQ 20 et Juridique 20 — signalement des réductions de garantie supérieures à 25 %",
            "Classement des réponses conformes dans une matrice de recommandation d’attribution",
          ],
          sources: ["Quatre réponses à ITT-MER-SCM-2101", "S7-SCM-TC-2026 §4.1 — Incoterms et garantie de référence", "QA-MAN-2026-EPCI — alignement des préavis FAT / ITP"],
        }
      }
      return {
        chain: [
          "Chargement du registre des appels d’offres et application de l’avancement de session à chaque lot",
          "Calcul des jours restants pour chaque fenêtre d’appel d’offres de 21 jours",
          "Rattachement des lots aux documents contrôlés, normes et interfaces de charte",
          "Classement par date limite de soumission, objectif d’économies et chemin critique d’installation",
        ],
        sources: [`${packages.length} lots actifs sur le pipeline ${PROJECT.shortName}`, `${closed.length} lots attribués dans le registre des économies`, `${DOCUMENTS.length} documents contrôlés au registre projet`],
      }
    }
    if (activePage === "tender-studio") {
      return {
        chain: [
          "Resolved the package to its controlled technical specification and quantity",
          "Retrieved applicable DNV / NORSOK / ISO obligations from QA-MAN-2026-EPCI",
          "Assembled commercial and legal terms from S7-SCM-TC-2026, including charter flow-downs where vessel operations apply",
          "Composed the ITT sections and queued the adversarial audit against every cited source",
        ],
        sources: [
          `${DOCUMENTS.length} controlled documents in the project register`,
          `${TENDER_PACKAGES.length} live packages on the ${PROJECT.shortName} pipeline`,
          "SUPPLYTIME 2026 charter particulars",
        ],
      }
    }
    if (activePage === "bid-evaluation") {
      return {
        chain: [
          "Applied hard gates: ISO 9001, mutual knock-for-knock, DDP Rotterdam",
          "Normalised eligible prices against the lowest compliant bid (Price 35)",
          "Scored Tech 25, QA/HSEQ 20 and Legal 20 — flagged warranty cuts above 25%",
          "Ranked gate-passing returns into an award recommendation matrix",
        ],
        sources: [
          "Four returns against ITT-MER-SCM-2101",
          "S7-SCM-TC-2026 §4.1 Incoterms and warranty baseline",
          "QA-MAN-2026-EPCI FAT / ITP notice alignment",
        ],
      }
    }
    return {
      chain: [
        "Loaded the tender register and applied session progress for each package",
        "Computed days remaining against each 21-day tender window",
        "Mapped packages to controlled documents, standards and charter interfaces",
        "Ranked by submission deadline, savings target and installation critical path",
      ],
      sources: [
        `${TENDER_PACKAGES.length} live packages on the ${PROJECT.shortName} pipeline`,
        `${CLOSED_PACKAGES.length} awarded packages in the savings ledger`,
        `${DOCUMENTS.length} controlled documents in the project register`,
      ],
    }
  }, [activePage, locale])

  const activeSpecialists = React.useMemo(() => {
    if (!hasAgentReasoning) return []
    const ids = new Set<SpecialistId>()
    for (const step of bpReasoning) {
      if (step.sourceSpecialist) ids.add(step.sourceSpecialist)
    }
    return Array.from(ids)
  }, [bpReasoning, hasAgentReasoning])

  return (
    <div className="space-y-4">
      {/* Orchestration summary */}
      {hasAgentReasoning && (
        <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 mb-1">
            <SafeIcon name="Workflow" className="h-3 w-3 text-blue-500" />
            <span className="font-medium text-foreground">{t("intel.synthesis")}</span>
          </div>
          {locale === "fr" ? "BluePilot a synthétisé les analyses " : "BluePilot synthesized "}
          {activeSpecialists.map((sid, i) => (
            <React.Fragment key={sid}>
              {i > 0 && (i === activeSpecialists.length - 1 ? ` ${t("intel.and")} ` : ", ")}
              <span className="inline-flex items-center gap-0.5">
                <span className={cn("inline-block h-1.5 w-1.5 rotate-45", specialistMeta[sid].color)} />
                {specialistLabels[sid]}
              </span>
            </React.Fragment>
          ))}{" "}
          {locale === "fr" ? " pour cette vue." : " analysis for this view."}
        </div>
      )}

      {/* Chain of thought */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <SafeIcon name="Link" className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("intel.chainOfThought")}</p>
        </div>
        {isAgentLoading || (isThinking && !hasAgentReasoning) ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex gap-2" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="shrink-0 h-4 w-4 rounded-full" style={{ background: "linear-gradient(90deg, var(--color-muted) 25%, color-mix(in srgb, var(--color-muted-foreground) 30%, var(--color-muted)) 37%, var(--color-muted) 63%)", backgroundSize: "200% 100%", animation: `shimmer 1.5s ease-in-out infinite ${i * 120}ms` }} />
                <div className="h-3 flex-1 rounded" style={{ background: "linear-gradient(90deg, var(--color-muted) 25%, color-mix(in srgb, var(--color-muted-foreground) 30%, var(--color-muted)) 37%, var(--color-muted) 63%)", backgroundSize: "200% 100%", animation: `shimmer 1.5s ease-in-out infinite ${i * 120 + 60}ms` }} />
              </div>
            ))}
          </div>
        ) : hasAgentReasoning ? (
          bpReasoning.map((step) => (
            <div key={step.step} className="flex gap-2 text-[11px]">
              <span className={cn(
                "shrink-0 mt-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold tabular-nums",
                step.sourceSpecialist
                  ? `${specialistMeta[step.sourceSpecialist].color.replace("bg-", "bg-")}/20 text-${specialistMeta[step.sourceSpecialist].color.replace("bg-", "").replace("-400", "-600")}`
                  : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
              )}>
                {step.step}
              </span>
              <div>
                <p className="text-muted-foreground leading-relaxed">{step.text}</p>
                {step.sourceSpecialist && (
                  <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground/50">
                    <SafeIcon name={specialistMeta[step.sourceSpecialist].icon} className="h-2.5 w-2.5" />
                    {specialistLabels[step.sourceSpecialist]}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : useStaticFallback ? (
          staticReasoning.chain.map((step, i) => (
            <div key={i} className="flex gap-2 text-[11px]">
              <span className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-[9px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">{i + 1}</span>
              <p className="text-muted-foreground leading-relaxed">{step}</p>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-muted-foreground/60">{t("intel.reasoningPending")}</p>
        )}
      </div>

      {/* Data sources (static, always shown) */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <SafeIcon name="Database" className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("intel.dataSources")}</p>
        </div>
        {staticReasoning.sources.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <SafeIcon name="FileText" className="h-3 w-3 shrink-0" />
            {s}
          </div>
        ))}
      </div>

      {/* Verifier status */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <SafeIcon name="ShieldCheck" className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("intel.verification")}</p>
        </div>
        {agentPhase === "verifying" ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span style={{ backgroundImage: "linear-gradient(90deg, var(--color-muted-foreground) 25%, var(--color-foreground) 50%, var(--color-muted-foreground) 75%)", backgroundSize: "200% 100%", animation: "shimmer 2s ease-in-out infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t("agent.verifyingClaims")}</span>
          </div>
        ) : verifierResult ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px]">
              {isVerified ? (
                <>
                  <SafeIcon name="CheckCircle2" className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t("intel.verified")}</span>
                </>
              ) : (
                <>
                  <SafeIcon name="AlertCircle" className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">{t("intel.correctionsApplied")}</span>
                </>
              )}
            </div>
            {verifierResult.overallAssessment && (
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{verifierResult.overallAssessment}</p>
            )}
            {verifierResult.corrections.length > 0 && (
              <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                {t("intel.correctionCount", { count: verifierResult.corrections.length })}
              </div>
            )}
          </div>
        ) : hasAgentReasoning ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted" />
            {t("intel.awaitingVerification")}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted" />
            {t("intel.staticVerification")}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Context Panel                                                      */
/* ------------------------------------------------------------------ */

function ContextPanel() {
  const { locale } = useStore()
  const t = useT()
  const localizedPackages = React.useMemo(() => localizedTenderPackages(locale), [locale])
  const localizedClosed = React.useMemo(() => localizedClosedPackages(locale), [locale])
  const daysTo = React.useCallback((iso: string) => {
    return Math.round((new Date(iso).getTime() - new Date(TODAY).getTime()) / (1000 * 60 * 60 * 24))
  }, [])

  const upcoming = React.useMemo(
    () => [...localizedPackages].sort((a, b) => a.submissionDeadline.localeCompare(b.submissionDeadline)).slice(0, 4),
    [localizedPackages],
  )

  const realisedTotal = React.useMemo(
    () => localizedClosed.reduce((s, c) => s + c.realisedSavings, 0),
    [localizedClosed],
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <SafeIcon name="CalendarClock" className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("intel.submissionDeadlines")}</p>
        </div>
        <div className="rounded-lg border bg-background p-3 space-y-2">
          {upcoming.map(t => {
            const d = daysTo(t.submissionDeadline)
            return (
              <div key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate text-muted-foreground">{t.title}</span>
                <span className={cn("shrink-0 font-mono font-medium", d <= 21 ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                  {d}{locale === "fr" ? " j" : "d"}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <SafeIcon name="Ship" className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("intel.vesselCharter")}</p>
        </div>
        <div className="rounded-lg border bg-background p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="shrink-0 text-muted-foreground">{t("intel.vessel")}</span>
            <span className="min-w-0 truncate font-medium">{CHARTER.vessel}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t("intel.form")}</span>
            <span className="font-medium">{CHARTER.codeName}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t("intel.hireRate")}</span>
            <span className="font-mono font-medium">{new Intl.NumberFormat(localeTag(locale), { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(CHARTER.hireRate)}{t("intel.perDay")}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t("intel.period")}</span>
            <span className="font-medium">{locale === "fr" ? "180 jours fermes, plus 30 jours en option" : CHARTER.charterPeriod}</span>
          </div>
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            {t("intel.charterFlowdown")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <SafeIcon name="PiggyBank" className="h-3 w-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("intel.savingsLedger")}</p>
        </div>
        <div className="rounded-lg border bg-background p-3 space-y-1">
          <p className="text-[11px] text-muted-foreground">
            {t("intel.awardedPackages", { count: localizedClosed.length, project: PROJECT.shortName })}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("intel.savingsBooked", { amount: `$${(realisedTotal / 1_000_000).toFixed(1)}M` })}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("intel.livePackagesLoop", { count: localizedPackages.length })}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Agent Activity Indicator                                           */
/* ------------------------------------------------------------------ */

const specialistMeta: Record<SpecialistId, { color: string; icon: string; label: string }> = {
  portfolio: { color: "bg-violet-400", icon: "Briefcase", label: "Pipeline" },
  pricing:   { color: "bg-cyan-400",   icon: "Coins", label: "Commercial" },
  market:    { color: "bg-rose-400",   icon: "TrendingUp", label: "Supply Market" },
}

function AgentStatusStrip() {
  const { agentPhase, isVerified, bpFindings } = useStore()
  const t = useT()
  const [showComplete, setShowComplete] = React.useState(false)
  const [specialistsDone, setSpecialistsDone] = React.useState<Set<SpecialistId>>(new Set())

  React.useEffect(() => {
    if (agentPhase === "complete") {
      setShowComplete(true)
      const timer = setTimeout(() => setShowComplete(false), 2500)
      return () => clearTimeout(timer)
    }
    setShowComplete(false)
    if (agentPhase === "specialists") {
      setSpecialistsDone(new Set())
      const t1 = setTimeout(() => setSpecialistsDone(s => new Set([...s, "portfolio"])), 1200)
      const t2 = setTimeout(() => setSpecialistsDone(s => new Set([...s, "pricing"])), 2400)
      const t3 = setTimeout(() => setSpecialistsDone(s => new Set([...s, "market"])), 3200)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
  }, [agentPhase])

  const isActive = agentPhase === "specialists" || agentPhase === "orchestrating" || agentPhase === "verifying"

  if (agentPhase === "idle" && !showComplete) return null

  const phaseText: Record<string, string> = {
    specialists: t("agent.analyzing"),
    orchestrating: t("agent.synthesizing"),
    verifying: t("agent.verifying"),
  }

  const specialistLabels: Record<SpecialistId, string> = {
    portfolio: t("agent.specialistPipeline"),
    pricing: t("agent.specialistCommercial"),
    market: t("agent.specialistSupplyMarket"),
  }

  return (
    <div className={cn(
      "overflow-hidden transition-all duration-300",
      isActive || showComplete ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
    )}>
      {isActive && (
        <div
          className="h-[3px] w-full rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      )}
      {showComplete && (
        <div className="h-[3px] w-full rounded-full bg-emerald-400 transition-all duration-300" />
      )}
      <div className="px-3 py-1.5 flex items-center gap-2">
        {isActive && (
          <>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] text-white/70 font-medium">{phaseText[agentPhase] ?? ""}</span>
            {agentPhase === "specialists" && (
              <div className="flex items-center gap-1 ml-auto">
                {(["portfolio", "pricing", "market"] as SpecialistId[]).map(sid => (
                  <span key={sid} className={cn(
                    "inline-block h-2 w-2 rotate-45 transition-all duration-500",
                    specialistMeta[sid].color,
                    specialistsDone.has(sid) ? "opacity-100 scale-100" : "opacity-30 scale-75",
                  )} />
                ))}
              </div>
            )}
          </>
        )}
        {showComplete && !isActive && (
          <>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-white/70 font-medium">
              {t("intel.findingsCount", { count: bpFindings.length })}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Agent Finding Card (orchestrator-sourced)                          */
/* ------------------------------------------------------------------ */

function AgentFindingCard({ finding, annotations, index }: { finding: OrchestratorFinding; annotations?: string[]; index: number }) {
  const t = useT()
  const { locale } = useStore()
  const specialistLabels: Record<SpecialistId, string> = {
    portfolio: t("agent.specialistPipeline"),
    pricing: t("agent.specialistCommercial"),
    market: t("agent.specialistSupplyMarket"),
  }
  const motion = findingMotion(index)
  const reasoning = React.useMemo(() => {
    const base = reasoningFromFinding(finding)
    const localized = {
      ...base,
      summary: base.summary ? localizeLegacyCopy(base.summary, locale) : undefined,
      steps: base.steps?.map((step) => localizeLegacyCopy(step, locale)),
      evidence: base.evidence?.map((item) => localizeLegacyCopy(item, locale)),
      conclusion: base.conclusion ? localizeLegacyCopy(base.conclusion, locale) : undefined,
      sources: base.sources?.map((source) => localizeLegacyCopy(source, locale)),
    }
    if (annotations?.length) {
      return {
        ...localized,
        evidence: [...(localized.evidence ?? []), ...annotations.map((n) => `${t("intel.verifierPrefix")}: ${localizeLegacyCopy(n, locale)}`)],
      }
    }
    return localized
  }, [finding, annotations, locale, t])
  const localizedTitle = localizeLegacyCopy(finding.title, locale)
  const localizedNarrative = localizeLegacyCopy(finding.narrative, locale)

  return (
    <article
      className={cn(
        motion.className,
        pcmCard,
        "w-full rounded-lg border border-l-[3px] bg-background p-3 space-y-1.5",
        severityBorder[finding.severity as Severity] ?? severityBorder.info,
      )}
      style={motion.style}
    >
      <div className="flex items-center gap-1.5">
        <SeverityTag severity={finding.severity as Severity} />
        <span className="ml-auto shrink-0 inline-flex items-center rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          {categoryLabelKeys[finding.category] ? t(categoryLabelKeys[finding.category]) : finding.category}
        </span>
      </div>
      <p className="flex items-center gap-1 text-xs font-semibold leading-snug">
        {localizedTitle}
        <ReasoningTooltip reasoning={reasoning} label={t("intel.whyPrefix", { title: localizedTitle })} />
      </p>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
        {localizedNarrative}
      </p>
      {/* Attribution row: specialists + data sources */}
      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
        {finding.sourceSpecialists && finding.sourceSpecialists.length > 0 && (
          <>
            <span className="text-[9px] text-muted-foreground/60">{t("intel.via")}</span>
            {finding.sourceSpecialists.map(sid => (
              <span key={sid} className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                <SafeIcon name={specialistMeta[sid].icon} className="h-3 w-3" />
                {specialistLabels[sid]}
              </span>
            ))}
          </>
        )}
        {finding.dataSources && finding.dataSources.filter(s => s !== "Internal").length > 0 && (
          <>
            {finding.sourceSpecialists && finding.sourceSpecialists.length > 0 && (
              <span className="text-[9px] text-muted-foreground/30 mx-0.5">·</span>
            )}
            {finding.dataSources.filter(s => s !== "Internal").map(src => (
              <span key={src} className={cn(
                "inline-flex items-center rounded px-1 py-px text-[8px] font-medium tracking-wide",
                src === "Spec" && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
                src === "QA" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                src === "Terms" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                src === "Charter" && "bg-sky-500/10 text-sky-600 dark:text-sky-400",
              )}>
                {t(`sourceType.${src}`)}
              </span>
            ))}
          </>
        )}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/*  Dynamic Prompts Hook                                               */
/* ------------------------------------------------------------------ */

function useDynamicPrompts(): string[] {
  const { activePage } = useStore()
  const t = useT()

  return React.useMemo(() => {
    if (activePage === "tender-studio") {
      return [
        t("askSuggestions.standards"),
        t("askSuggestions.charter"),
        t("askSuggestions.fat"),
        t("askSuggestions.warranty"),
      ]
    }
    if (activePage === "bid-evaluation") {
      return [
        t("askSuggestions.jtechScore"),
        t("askSuggestions.readyToScore"),
        t("askSuggestions.ranksFirst"),
        t("askSuggestions.riskFlag"),
      ]
    }
    return [
      t("askSuggestions.jtechScore"),
      t("askSuggestions.criticalPath"),
      t("askSuggestions.savings"),
      t("askSuggestions.knockForKnock"),
    ]
  }, [activePage, t])
}


function ChatPanel() {
  const { chatMessages, chatLoading, sendChatMessage, clearChat } = useStore()
  const t = useT()
  const prompts = useDynamicPrompts()
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSubmit = (text?: string) => {
    const msg = text ?? input
    if (!msg.trim()) return
    sendChatMessage(msg)
    setInput("")
  }

  return (
    <div className="flex flex-col h-full -m-3">
      {chatMessages.length > 0 && (
        <div className="shrink-0 flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">{t("intel.conversation")}</span>
          <button
            type="button"
            onClick={clearChat}
            disabled={chatLoading}
            className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-40"
          >
            <SafeIcon name="RotateCcw" className="h-3 w-3" />
            {t("intel.clearChat")}
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <div className="space-y-3">
            <div className="text-center py-4">
              <SafeIcon name="MessageCircle" className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-[var(--color-text-muted)]">{t("intel.emptyPrompt")}</p>
            </div>
            <div className="space-y-1.5">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSubmit(p)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div key={i} className={cn("text-xs leading-relaxed", msg.role === "user" ? "text-right" : "")}>
            {msg.role === "user" ? (
              <div className="inline-block max-w-[85%] rounded-lg bg-primary px-3 py-2 text-left text-primary-foreground">
                {msg.content}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">BluePilot</span>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  {msg.content.trim() ? (
                    <ChatMessageBody content={msg.content} />
                  ) : chatLoading && i === chatMessages.length - 1 ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
                      <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "150ms" }} />
                      <span className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {chatMessages.length > 0 && !chatLoading && (
        <div className="shrink-0 flex gap-1 overflow-x-auto px-3 py-1.5 border-t border-border/30">
          {prompts.slice(0, 2).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleSubmit(p)}
              className="shrink-0 text-[9px] px-2 py-1 rounded-full border border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="shrink-0 border-t border-border/40 p-2">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
          className="flex gap-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("intel.askPlaceholder")}
            disabled={chatLoading}
            className="flex-1 rounded-lg border border-border/60 bg-transparent px-3 py-1.5 text-xs placeholder:text-muted-foreground/50 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={chatLoading || !input.trim()}
            className="h-7 w-7 shrink-0"
          >
            <SafeIcon name="SendHorizontal" className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Intelligence Panel — slide-out right drawer (Silver State pattern) */
/* ------------------------------------------------------------------ */

type RailSectionKey = IntelRailSection

function IntelligencePanelDrawer({
  open,
  onOpenChange,
  activeSection,
  onSectionChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeSection: RailSectionKey
  onSectionChange: (k: RailSectionKey) => void
}) {
  const t = useT()
  const items: { key: RailSectionKey; label: string; icon: string }[] = [
    { key: "findings", label: t("intel.findings"), icon: "SearchCheck" },
    { key: "reasoning", label: t("intel.reasoning"), icon: "BrainCircuit" },
    { key: "context", label: t("intel.context"), icon: "Globe" },
    { key: "ask", label: t("intel.ask"), icon: "MessageCircle" },
  ]

  const { contextFindings, isThinking, isAgentLoading, useStaticFallback, bpFindings } = useStore()
  const criticalCount = bpFindings.length > 0
    ? bpFindings.filter(f => f.severity === "critical").length
    : useStaticFallback
      ? contextFindings.filter(f => f.severity === "critical").length
      : 0

  const slide = drawerSlideMotion(
    "flex h-full w-[380px] max-w-[380px] flex-col gap-0 border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-0 shadow-[0_8px_30px_rgba(26,38,64,0.12)] sm:max-w-[380px] [&>button]:hidden",
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={slide.className}>
        <div className="shrink-0 border-b border-[var(--color-border-default)] bg-[var(--color-bg-inverse)]">
          <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0 px-4 py-3">
            <div className="flex items-center gap-2">
              <SafeIcon name="BrainCircuit" className="h-4 w-4 text-[var(--color-brand-primary)]" />
              <SheetTitle className="text-[14px] font-semibold text-[var(--color-text-inverse)]">
                {t("nav.intelligencePanel")}
              </SheetTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className={cn(pcmButton, "h-8 w-8 text-[var(--color-text-inverse)]/80 hover:bg-white/10 hover:text-[var(--color-text-inverse)]")}
              aria-label={t("nav.closeIntelPanel")}
            >
              <SafeIcon name="PanelRightClose" className="h-4 w-4" />
            </Button>
          </SheetHeader>
          <AgentStatusStrip />
        </div>

        <div className="shrink-0 grid grid-cols-4 gap-1 border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-2">
          {items.map((it) => {
            const active = activeSection === it.key
            return (
              <button
                key={it.key}
                type="button"
                onClick={() => onSectionChange(it.key)}
                className={cn(
                  pcmTab,
                  "relative flex flex-col items-center gap-0.5 rounded-[8px] px-1 py-1.5 text-[10px] font-medium",
                  active
                    ? "bg-[var(--color-bg-surface)] font-semibold text-[var(--color-brand-strong)] shadow-[0_1px_3px_rgba(26,38,64,0.08)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                )}
              >
                <SafeIcon name={it.icon} className="h-3.5 w-3.5" />
                <span className="truncate">{it.label}</span>
                {it.key === "reasoning" && (isThinking || isAgentLoading) && (
                  <span
                    className="pcm-sonar pointer-events-none absolute inset-0 rounded-[8px]"
                    style={{
                      boxShadow: "0 0 0 2px color-mix(in srgb, var(--color-brand-primary) 50%, transparent)",
                      animation: "sonar 1.5s ease-out infinite",
                    }}
                  />
                )}
                {it.key === "findings" && criticalCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--color-accent-critical)] text-[8px] font-bold text-white">
                    {criticalCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3">
            {activeSection === "findings" && <FindingsPanel />}
            {activeSection === "reasoning" && <ReasoningPanel />}
            {activeSection === "context" && <ContextPanel />}
            {activeSection === "ask" && <ChatPanel />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Login Screen                                                       */
/* ------------------------------------------------------------------ */

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const t = useT()
  const [email, setEmail] = React.useState("d.hoffmann@future-energy.com")
  const [password, setPassword] = React.useState("••••••••")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError(t("common.credentialsError")); return }
    setError("")
    setLoading(true)
    setTimeout(() => { setLoading(false); onLogin() }, 800)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center" style={{ background: "linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-strong) 50%, var(--color-bg-inverse) 100%)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
      </div>
      <div className="relative z-10 w-full max-w-[420px] px-6">
        <div className="mb-8 flex flex-col items-center gap-5">
          <img src={FE_LOGO_FOR_DARK_UI} alt="Future Energy" className="h-11 w-auto drop-shadow-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Future Energy Compass</h1>
            <p className="mt-1.5 text-sm text-white/50">{t("login.subtitle")}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-white/60">{t("common.email")}</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@future-energy.com" autoComplete="email" autoFocus className="w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/40 focus:bg-white/15 focus:ring-1 focus:ring-white/20" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-white/60">{t("common.password")}</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" className="w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/40 focus:bg-white/15 focus:ring-1 focus:ring-white/20" />
            </div>
            {error && <p className="text-xs text-red-300 text-center">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-primary transition hover:bg-white/90 disabled:opacity-60">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                  {t("login.loading")}
                </span>
              ) : t("common.signIn")}
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-[11px] text-white/30">{t("login.footer")}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Layout Shell                                                       */
/* ------------------------------------------------------------------ */

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const {
    activePage, drillLevel, selectedRegion, selectedCity, selectedCustomer, selectedJob, selectedJobType,
    intelRailSection, setIntelRailSection, intelPanelOpen, setIntelPanelOpen,
    authenticated, login,
  } = useStore()

  const mainRef = React.useRef<HTMLElement>(null)
  const navKey = `${activePage}:${drillLevel}:${selectedRegion ?? ""}:${selectedCity ?? ""}:${selectedCustomer ?? ""}:${selectedJob ?? ""}:${selectedJobType ?? ""}`
  React.useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
    mainRef.current?.scrollTo({ top: 0, left: 0 })
  }, [navKey])

  const mainEnter = fadeCrossMotion()

  if (!authenticated) {
    return <LoginScreen onLogin={login} />
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-bg-canvas)]">
      <div className="sticky top-0 z-50 shrink-0">
        <TopNavBar />
        <DrillBreadcrumbBar />
      </div>
      <main
        key={navKey}
        ref={mainRef}
        className={cn(mainEnter.className, SHELL_CONTENT_CLASS, "flex-1 py-7")}
        style={mainEnter.style}
      >
        {children}
      </main>
      <IntelligencePanelDrawer
        open={intelPanelOpen}
        onOpenChange={setIntelPanelOpen}
        activeSection={intelRailSection}
        onSectionChange={setIntelRailSection}
      />
      <SandboxDrawer />
      <BiDashboardDrawer />
    </div>
  )
}
