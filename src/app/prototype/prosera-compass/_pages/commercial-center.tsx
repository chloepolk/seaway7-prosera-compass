"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ControlButton } from "../_components/hub/control-button"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { useStore } from "../_store"
import { buildTamRollup } from "../data/_tam"
import { buildWeatherIntelligence } from "../data/_weather_demand"
import { AgenticFocusHero } from "../_components/agentic-hero"
import { KpiStrip } from "../_components/hub/kpi-strip"
import { PriorityCard } from "../_components/hub/priority-card"
import { AppTileGrid, type AppTileItem } from "../_components/hub/app-tile-grid"
import { AddTileModal } from "../_components/hub/add-tile-modal"
import { CreateAppModal } from "../_components/create-app-modal"
import { SpecRenderer, summarizeSpec } from "../_components/spec-renderer"
import { toastMotion } from "../_components/motion"
import { KPI_REASONING } from "../_components/reasoning-helpers"
import { formatGbp } from "../_format"

const BOARD_ID = "commercial-center"

const DEFAULT_TILE_ORDER = [
  "portfolio",
  "score",
  "untapped",
  "winrate",
  "atrisk",
  "sales",
  "regional",
  "weather",
  "nte",
  "fuel",
]

function fmtUsd(n: number): string {
  return formatGbp(n)
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function fmtSignedPct(n: number, digits = 1): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`
}

export function CommercialCenterPage() {
  const {
    data,
    setPage,
    setFocusMission,
    customApps,
    getBoard,
    setBoardOrder,
    setModuleHidden,
    deleteCustomApp,
    restoreCustomApp,
  } = useStore()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [loadingTileId, setLoadingTileId] = React.useState<string | null>(null)
  const [openCustomSpecId, setOpenCustomSpecId] = React.useState<string | null>(null)
  const [undoState, setUndoState] = React.useState<{ title: string; fn: () => void } | null>(null)

  React.useEffect(() => {
    if (!undoState) return
    const t = setTimeout(() => setUndoState(null), 9000)
    return () => clearTimeout(t)
  }, [undoState])

  const { portfolioSummary, customers, pricingBandInsights, regions } = data
  const v = portfolioSummary.validated

  const exitLoss = customers
    .filter((c) => c.tier === "Dogs")
    .reduce((s, c) => s + Math.min(0, c.validated.totalMargin), 0)

  const totalRepricingOpportunity = pricingBandInsights.reduce((s, pb) => s + pb.repricingOpportunityValue, 0)
  const untappedValue = Math.abs(exitLoss) + totalRepricingOpportunity
  const tam = buildTamRollup(customers)
  const topPricing = pricingBandInsights[0]

  const scored = customers.filter((c) => c.customerScore)
  const avgScore =
    scored.length > 0 ? Math.round(scored.reduce((s, c) => s + c.customerScore!.score, 0) / scored.length) : 0

  const wi = buildWeatherIntelligence(data.jobs)
  const weatherMetric =
    wi.series.length < 4 || wi.fit.n < 4 ? "—" : `${fmtSignedPct(wi.fit.slope, 1)}/pt`

  const regionalSpread =
    regions.length > 0
      ? `${(
          (Math.max(...regions.map((r) => r.validated.avgMarginPct)) -
            Math.min(...regions.map((r) => r.validated.avgMarginPct))) *
          100
        ).toFixed(1)}pt`
      : "—"

  const computedHeroBody = `The top ${portfolioSummary.topMarginCustomerPct.toFixed(0)}% of customers bring in ${portfolioSummary.topMarginSharePct}% of your margin, while ${customers.filter((c) => c.tier === "Dogs").length} accounts cost you about ${fmtUsd(Math.abs(exitLoss))} a year. Two moves — protect the key accounts and re-price the unprofitable ones — hold your margin and open up ${fmtUsd(tam.whitespace)} in new revenue.`

  const goActionBoard = () => {
    setFocusMission(null)
    setPage("operating-loop")
  }

  const builtinTiles: AppTileItem[] = React.useMemo(
    () => [
      {
        id: "portfolio",
        label: "Customer Portfolio",
        metric: portfolioSummary.totalCustomers.toLocaleString(),
        icon: "Users",
        onClick: () => setPage("customer-intel"),
      },
      {
        id: "score",
        label: "Customer Score (CI-04)",
        metric: `${avgScore}/100`,
        icon: "Gauge",
        onClick: () => setPage("customer-intel"),
      },
      {
        id: "untapped",
        label: "Untapped Revenue",
        metric: fmtUsd(tam.whitespace),
        icon: "TrendingUp",
        onClick: () => setPage("customer-intel"),
      },
      {
        id: "winrate",
        label: "Win Rate by Price Band",
        metric: topPricing ? `${Math.round(topPricing.sweetSpotWinRate * 100)}%` : "—",
        icon: "TrendingUp",
        onClick: () => setPage("pricing-intel"),
      },
      {
        id: "atrisk",
        label: "At-Risk Quotes",
        metric: String(data.quoteAnalysis.atRiskQuotes.length),
        icon: "AlertTriangle",
        onClick: () => setPage("pricing-intel"),
      },
      {
        id: "sales",
        label: "Sales Performance",
        metric: `${Math.round(data.salesPerformance.overallWinRate * 100)}%`,
        icon: "Users",
        onClick: () => setPage("pricing-intel"),
      },
      {
        id: "regional",
        label: "Regional Performance",
        metric: regionalSpread,
        icon: "Map",
        onClick: () => setPage("customer-intel"),
      },
      {
        id: "weather",
        label: "Weather → Demand",
        metric: weatherMetric,
        icon: "CloudLightning",
        onClick: () => setPage("pricing-intel"),
      },
      {
        id: "nte",
        label: "NTE Escalation Friction",
        metric: String(data.dispatchAuthEvents.length),
        icon: "Gauge",
        onClick: () => setPage("pricing-intel"),
      },
      {
        id: "fuel",
        label: "Fuel & Fleet Cost",
        metric: fmtUsd(data.fuelExposure.actuals.totalAnnualSpend),
        icon: "Fuel",
        onClick: () => setPage("pricing-intel"),
      },
    ],
    [
      portfolioSummary.totalCustomers,
      avgScore,
      tam.whitespace,
      topPricing,
      data.quoteAnalysis.atRiskQuotes.length,
      data.salesPerformance.overallWinRate,
      regionalSpread,
      weatherMetric,
      data.dispatchAuthEvents.length,
      data.fuelExposure.actuals.totalAnnualSpend,
      setPage,
    ],
  )

  const customTiles: AppTileItem[] = React.useMemo(
    () =>
      customApps.map((spec) => ({
        id: `app:${spec.id}`,
        label: spec.title,
        metric: summarizeSpec(spec, data).figures[0]?.value ?? "—",
        icon: spec.icon,
        onClick: () => setOpenCustomSpecId(spec.id),
      })),
    [customApps, data],
  )

  const allTiles = React.useMemo(() => [...builtinTiles, ...customTiles], [builtinTiles, customTiles])
  const tileById = React.useMemo(() => new Map(allTiles.map((t) => [t.id, t])), [allTiles])

  const board = getBoard(BOARD_ID)

  const fullOrder = React.useMemo(() => {
    const ids = new Set(allTiles.map((t) => t.id))
    const known =
      board.order.length > 0
        ? board.order.filter((id) => ids.has(id))
        : DEFAULT_TILE_ORDER.filter((id) => ids.has(id))
    const missing = allTiles.map((t) => t.id).filter((id) => !known.includes(id))
    return [...known, ...missing]
  }, [board.order, allTiles])

  const visibleIds = React.useMemo(
    () => fullOrder.filter((id) => !board.hidden.includes(id)).slice(0, 6),
    [fullOrder, board.hidden],
  )

  const visibleTiles = React.useMemo(
    () => visibleIds.map((id) => tileById.get(id)!).filter(Boolean),
    [visibleIds, tileById],
  )

  const availableTiles = React.useMemo(
    () => allTiles.filter((t) => !visibleIds.includes(t.id)),
    [allTiles, visibleIds],
  )

  const handleReorder = React.useCallback(
    (reorderedVisibleIds: string[]) => {
      const notVisible = fullOrder.filter((id) => !visibleIds.includes(id))
      setBoardOrder(BOARD_ID, [...reorderedVisibleIds, ...notVisible])
    },
    [fullOrder, visibleIds, setBoardOrder],
  )

  const handleAddTile = React.useCallback(
    (id: string) => {
      if (board.hidden.includes(id)) setModuleHidden(BOARD_ID, id, false)
      setBoardOrder(BOARD_ID, [id, ...fullOrder.filter((x) => x !== id)])
      setLibraryOpen(false)
    },
    [board.hidden, fullOrder, setBoardOrder, setModuleHidden],
  )

  const handleRemove = React.useCallback(
    (id: string) => {
      const tile = tileById.get(id)
      if (!tile) return

      if (id.startsWith("app:")) {
        const rawId = id.replace(/^app:/, "")
        deleteCustomApp(rawId)
        setUndoState({
          title: tile.label,
          fn: () => restoreCustomApp(rawId),
        })
      } else {
        setModuleHidden(BOARD_ID, id, true)
        setUndoState({
          title: tile.label,
          fn: () => setModuleHidden(BOARD_ID, id, false),
        })
      }
    },
    [tileById, deleteCustomApp, restoreCustomApp, setModuleHidden],
  )

  const handleCustomAppCreated = React.useCallback(
    (id: string) => {
      const tileId = `app:${id}`
      const prevVisible = fullOrder.filter((x) => !board.hidden.includes(x)).slice(0, 6)
      const prevSixth = prevVisible[5]

      const next = [tileId, ...fullOrder.filter((x) => x !== tileId)]
      setBoardOrder(BOARD_ID, next)

      const newVisible = next.filter((x) => !board.hidden.includes(x))
      if (newVisible.length > 6 && prevSixth) {
        setModuleHidden(BOARD_ID, prevSixth, true)
      }

      setLoadingTileId(tileId)
      setTimeout(() => setLoadingTileId(null), 700)
      setCreateOpen(false)
    },
    [fullOrder, board.hidden, setBoardOrder, setModuleHidden],
  )

  const openCustomSpec = openCustomSpecId ? customApps.find((s) => s.id === openCustomSpecId) : null

  return (
    <div className="space-y-7">
      <AgenticFocusHero
        eyebrow="Portfolio focus · from BluePilot"
        staticHeadline="A few accounts carry most of your margin."
        staticBody={computedHeroBody}
        agentReasoningSummary="BluePilot synthesized portfolio concentration, tier mix, and repricing opportunity from live job and quote data."
        staticReasoning={{
          summary: "Computed from validated job margins, customer tiers, and addressable market (TAM) rollup.",
          evidence: [
            `${portfolioSummary.totalCustomers} customers across ${regions.length} regions`,
            `${customers.filter((c) => c.tier === "Dogs").length} Dogs account for ${fmtUsd(Math.abs(exitLoss))} annual drag`,
            `${fmtUsd(tam.whitespace)} whitespace at ${(tam.sharePct * 100).toFixed(0)}% share capture`,
          ],
        }}
        ctaLabel="See recommended actions"
        onCta={goActionBoard}
        stats={[
          { value: `${portfolioSummary.topMarginSharePct}%`, label: "from top 4%" },
          { value: fmtUsd(tam.whitespace), label: "untapped" },
        ]}
      />

      <KpiStrip
        variant="unified"
        items={[
          {
            label: "Revenue",
            value: fmtUsd(v.totalRevenue),
            reasoning: KPI_REASONING.revenue(v.totalRevenue, v.jobCount),
          },
          {
            label: "Gross margin",
            value: fmtPct(v.avgMarginPct),
            tone: "positive",
            reasoning: KPI_REASONING.grossMargin(v.avgMarginPct),
          },
          {
            label: "Customers",
            value: portfolioSummary.totalCustomers.toLocaleString(),
            reasoning: KPI_REASONING.customers(portfolioSummary.totalCustomers),
          },
          {
            label: "Portfolio health",
            value: `${avgScore}/100`,
            reasoning: KPI_REASONING.portfolioHealth(avgScore),
          },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <PriorityCard
          index={0}
          title="Margin Concentration"
          tag="Watch"
          tagTone="watch"
          headline={`${portfolioSummary.topMarginSharePct}%`}
          headlineSub={`of margin from ${portfolioSummary.topMarginCustomerPct.toFixed(0)}% of accounts`}
          detail={`${portfolioSummary.tierCounts.Stars} Stars anchor the book; ${portfolioSummary.tierCounts.Dogs} Dogs need pricing or exit decisions.`}
          figureValue={`${portfolioSummary.topMarginSharePct}%`}
          figureTone="bad"
          reasoning={{
            summary: "Pareto analysis on validated margin by customer tier.",
            evidence: [
              `Top ${portfolioSummary.topMarginCustomerPct.toFixed(0)}% of accounts generate ${portfolioSummary.topMarginSharePct}% of margin`,
              `${portfolioSummary.tierCounts.Stars} Stars vs ${portfolioSummary.tierCounts.Dogs} Dogs in the book`,
            ],
            conclusion: "Diversification and Dogs remediation reduce single-account concentration risk.",
          }}
        />
        <PriorityCard
          index={1}
          title="Untapped Revenue"
          tag="Growth"
          tagTone="growth"
          headline={fmtUsd(tam.whitespace)}
          headlineSub={`addressable · ${(tam.sharePct * 100).toFixed(0)}% captured`}
          detail={`We already hold ${(tam.sharePct * 100).toFixed(0)}% of addressable spend. Repricing and expansion targets add ${fmtUsd(untappedValue)} combined.`}
          figureValue={fmtUsd(tam.whitespace)}
          figureTone="good"
          reasoning={{
            summary: "TAM rollup from customer spend potential minus current capture, plus repricing upside.",
            evidence: [
              `${fmtUsd(tam.whitespace)} addressable whitespace`,
              `${fmtUsd(untappedValue)} combined repricing + exit recovery opportunity`,
            ],
            conclusion: "Prioritise expansion in high-score regions and re-price underperforming bands.",
          }}
        />
        <PriorityCard
          index={2}
          title="Pricing Sweet-Spot"
          tag="Pricing"
          tagTone="pricing"
          headline={topPricing ? `${Math.round(topPricing.sweetSpotWinRate * 100)}%` : "—"}
          headlineSub="avg win rate"
          detail={
            topPricing
              ? `${topPricing.jobType} wins ${Math.round(topPricing.sweetSpotWinRate * 100)}% in the sweet spot. Price new quotes into the bands to hold conversion.`
              : "Insufficient quote history for sweet-spot analysis."
          }
          figureValue={topPricing ? `${Math.round(topPricing.sweetSpotWinRate * 100)}%` : "—"}
          reasoning={
            topPricing
              ? {
                  summary: "Win-rate curve by price band — sweet spot is the band with highest conversion above 50%.",
                  evidence: [
                    `Job type: ${topPricing.jobType}`,
                    `Sweet-spot win rate: ${Math.round(topPricing.sweetSpotWinRate * 100)}%`,
                    `Repricing opportunity: ${fmtUsd(topPricing.repricingOpportunityValue)}`,
                  ],
                  conclusion: "Quote new work inside the sweet-spot band to protect win rate while lifting average ticket.",
                }
              : undefined
          }
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">All apps</h2>
          <div className="flex gap-2">
            <ControlButton onClick={() => setCreateOpen(true)}>
              Create app
            </ControlButton>
            {!editing ? (
              <ControlButton icon="LayoutGrid" onClick={() => setEditing(true)}>
                Customize
              </ControlButton>
            ) : (
              <>
                <ControlButton icon="Plus" onClick={() => setLibraryOpen(true)}>
                  Add New
                </ControlButton>
                <ControlButton active icon="Check" onClick={() => setEditing(false)}>
                  Save
                </ControlButton>
              </>
            )}
          </div>
        </div>

        <AppTileGrid
          items={visibleTiles}
          editing={editing}
          loadingTileId={loadingTileId}
          onReorder={handleReorder}
          onRemove={handleRemove}
        />

        {editing && (
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Drag to reorder · × remove · layout saves automatically.
          </p>
        )}
      </div>

      {createOpen && (
        <CreateAppModal onClose={() => setCreateOpen(false)} onCreated={handleCustomAppCreated} />
      )}

      {libraryOpen && (
        <AddTileModal
          available={availableTiles}
          onAdd={handleAddTile}
          onClose={() => setLibraryOpen(false)}
        />
      )}

      {openCustomSpec && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpenCustomSpecId(null)}
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-5 py-3">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{openCustomSpec.title}</h3>
              <button
                type="button"
                onClick={() => setOpenCustomSpecId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--color-bg-subtle)]"
              >
                <SafeIcon name="X" className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <SpecRenderer spec={openCustomSpec} />
            </div>
          </div>
        </div>
      )}

      {undoState && (
        <div
          className={cn(
            toastMotion().className,
            "fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-2.5 shadow-2xl",
          )}
        >
          <SafeIcon name="Trash2" className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          <span className="text-[12px] text-[var(--color-text-primary)]">
            Removed <span className="font-medium">{undoState.title}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              undoState.fn()
              setUndoState(null)
            }}
            className="inline-flex items-center gap-1 rounded-[10px] px-2 py-1 text-[12px] font-semibold text-[var(--color-brand-strong)] hover:bg-[var(--color-tint-brand)]"
          >
            <SafeIcon name="Undo2" className="h-3.5 w-3.5" /> Undo
          </button>
        </div>
      )}
    </div>
  )
}

export default CommercialCenterPage
