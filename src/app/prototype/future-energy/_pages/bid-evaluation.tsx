"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { useT } from "../_i18n/use-t"
import { localeTag, type Locale } from "../_i18n"
import { localizedTenderPackages } from "../_i18n/domain"
import { enterMotion, listItemMotion, pcmCard } from "../_components/motion"
import { formatCurrency, type MissionStage } from "../_diamond/stages"
import { EVAL_PACKAGE_ID, bidsForPackage } from "../data/future-energy/_bids"
import {
  evaluateBids,
  sortEvaluationForDisplay,
  PRICE_MAX,
  TECH_MAX,
  QA_MAX,
  LEGAL_MAX,
  type BidEvaluationResult,
  type GateId,
} from "../data/future-energy/_bid-scoring"
import {
  tenderById,
  PROJECT,
  type TenderPackage,
} from "../data/future-energy/_tenders"
import { BidderNotifyModal } from "../_components/hub/bidder-notify-modal"

type EvalStatus = "ready" | "awaiting_returns" | "not_issued" | "awarded"

function evalStatusFor(pkg: TenderPackage, bidCount: number): EvalStatus {
  if (pkg.stage === "outcome_roi") return "awarded"
  if (bidCount > 0) return "ready"
  if (pkg.stage === "execute") return "awaiting_returns"
  return "not_issued"
}

const STATUS_KEYS: Record<EvalStatus, "bidEval.ready" | "bidEval.awaitingReturns" | "bidEval.notIssued" | "bidEval.awarded"> = {
  ready: "bidEval.ready",
  awaiting_returns: "bidEval.awaitingReturns",
  not_issued: "bidEval.notIssued",
  awarded: "bidEval.awarded",
}

const GATE_KEYS: Record<GateId, "bidEval.gateIso" | "bidEval.gateKfk" | "bidEval.gateDdp"> = {
  iso9001: "bidEval.gateIso",
  knockForKnock: "bidEval.gateKfk",
  ddpRotterdam: "bidEval.gateDdp",
}

const STATUS_CLS: Record<EvalStatus, string> = {
  ready: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]",
  awaiting_returns: "bg-[var(--color-tint-warning)] text-[var(--color-accent-warning-text)]",
  not_issued: "bg-[var(--color-tint-neutral)] text-[var(--color-text-muted)]",
  awarded: "bg-[var(--color-tint-neutral)] text-[var(--color-text-secondary)]",
}

function formatPriceFull(n: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string
  value: number | null
  max: number
}) {
  const pct = value == null ? 0 : Math.min(100, (value / max) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-[var(--color-text-muted)]">{label}</span>
        <span className="tabular-nums font-medium text-[var(--color-text-primary)]">
          {value == null ? "—" : `${value.toFixed(1)} / ${max}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--color-brand-primary)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function GateChip({ id, passed }: { id: GateId; passed: boolean }) {
  const t = useT()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        passed
          ? "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]"
          : "bg-[var(--color-tint-critical)] text-[var(--color-accent-critical-text)]",
      )}
    >
      <SafeIcon name={passed ? "Check" : "X"} className="size-2.5" />
      {t(GATE_KEYS[id])}
    </span>
  )
}

function RankBadge({ rank, failed }: { rank: number | null; failed: boolean }) {
  if (failed) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-tint-critical)] text-[10px] font-semibold uppercase text-[var(--color-accent-critical-text)]">
        DQ
      </span>
    )
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-inverse)] text-[15px] font-semibold tabular-nums text-[var(--color-text-inverse)]">
      #{rank}
    </span>
  )
}

function BidBaseballCard({
  result,
  selected,
  onSelect,
  index,
  locale,
}: {
  result: BidEvaluationResult
  selected: boolean
  onSelect: () => void
  index: number
  locale: Locale
}) {
  const t = useT()
  const motion = listItemMotion(index)
  const failed = result.gatingStatus === "Fail"
  const allGates: GateId[] = ["iso9001", "knockForKnock", "ddpRotterdam"]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        pcmCard,
        motion.className,
        "w-full cursor-pointer rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-left",
        selected
          ? "ring-2 ring-[var(--color-text-secondary)]/40"
          : "hover:border-[var(--color-text-secondary)]/40",
      )}
      style={motion.style}
    >
      <div className="flex items-start gap-3 p-4">
        <RankBadge rank={result.finalRank} failed={failed} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                {result.supplier}
              </h3>
              <p className="text-[12px] tabular-nums text-[var(--color-text-muted)]">
                {formatPriceFull(result.totalPrice, locale)}
                {result.compositeScore != null && (
                  <span className="ml-2 text-[var(--color-text-secondary)]">
                    · {t("bidEval.compositeLabel")} {result.compositeScore.toFixed(1)}
                  </span>
                )}
              </p>
            </div>
            {result.pdfPath && (
              <a
                href={result.pdfPath}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border-default)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              >
                <SafeIcon name="FileText" className="size-3" />
                {t("bidEval.responsePdf")}
              </a>
            )}
          </div>

          {result.highCommercialRisk && (
            <div className="flex items-start gap-2 rounded-md bg-[var(--color-tint-warning)] px-2.5 py-2 text-[11px] text-[var(--color-accent-warning-text)]">
              <SafeIcon name="AlertTriangle" className="mt-0.5 size-3.5 shrink-0" />
              <span>{t("bidEval.riskBanner")}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {allGates.map((g) => (
              <GateChip key={g} id={g} passed={!result.gateFailures.includes(g)} />
            ))}
          </div>

          {!failed && (
            <div className="grid gap-2 sm:grid-cols-2">
              <ScoreBar label={t("bidEval.price")} value={result.priceScore} max={PRICE_MAX} />
              <ScoreBar label={t("bidEval.technical")} value={result.techScore} max={TECH_MAX} />
              <ScoreBar label={t("bidEval.qaHseq")} value={result.qaScore} max={QA_MAX} />
              <ScoreBar label={t("bidEval.legal")} value={result.legalScore} max={LEGAL_MAX} />
            </div>
          )}

          <div className="rounded-md bg-[var(--color-bg-subtle)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {t("bidEval.insightRecommendation")}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              {result.recommendation}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}

function MatrixCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={cn("px-3 py-2.5 text-[12px] tabular-nums text-[var(--color-text-primary)]", className)}>
      {children}
    </td>
  )
}

interface PackageEvalRow {
  pkg: TenderPackage
  bidCount: number
  status: EvalStatus
  topScore: number | null
  topSupplier: string | null
  riskCount: number
  dqCount: number
}

function buildPackageRows(tenderStages: Record<string, MissionStage>, locale: Locale): PackageEvalRow[] {
  return localizedTenderPackages(locale)
    .filter((p) => p.stage !== "outcome_roi" || bidsForPackage(p.id, locale).length > 0)
    .map((pkg) => {
      const stage = tenderStages[pkg.id] ?? pkg.stage
      const effective = { ...pkg, stage }
      const bids = bidsForPackage(pkg.id, locale)
      const results = bids.length > 0 ? evaluateBids(bids, locale) : []
      const status = evalStatusFor(effective, bids.length)
      const ranked = results.filter((r) => r.finalRank != null)
      const top = ranked.find((r) => r.finalRank === 1) ?? null
      return {
        pkg: effective,
        bidCount: bids.length,
        status,
        topScore: top?.compositeScore ?? null,
        topSupplier: top?.supplier ?? null,
        riskCount: results.filter((r) => r.highCommercialRisk).length,
        dqCount: results.filter((r) => r.gatingStatus === "Fail").length,
      }
    })
    .sort((a, b) => {
      const order: Record<EvalStatus, number> = {
        ready: 0,
        awaiting_returns: 1,
        not_issued: 2,
        awarded: 3,
      }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return a.pkg.packageRef.localeCompare(b.pkg.packageRef)
    })
}

function EmptyPackageState({ status, pkg }: { status: EvalStatus; pkg: TenderPackage }) {
  const t = useT()
  const copy =
    status === "awaiting_returns"
      ? t("bidEval.awaitingCopy")
      : status === "awarded"
        ? t("bidEval.awardedCopy")
        : t("bidEval.upstreamCopy", { stage: t(`stages.${pkg.stage}.title`) })

  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-6 py-16 text-center">
      <SafeIcon name="Inbox" className="mb-3 size-8 text-[var(--color-text-muted)]" />
      <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
        {t("bidEval.empty")}
      </p>
      <p className="mt-1 max-w-md text-[12px] text-[var(--color-text-secondary)]">{copy}</p>
    </div>
  )
}

export function BidEvaluationPage() {
  const t = useT()
  const { focusEvalPackageId, tenderStages, openBidEvaluation, locale } = useStore()
  const rows = React.useMemo(() => buildPackageRows(tenderStages, locale), [tenderStages, locale])

  const defaultId =
    focusEvalPackageId && rows.some((r) => r.pkg.id === focusEvalPackageId)
      ? focusEvalPackageId
      : rows.find((r) => r.status === "ready")?.pkg.id ??
        rows[0]?.pkg.id ??
        EVAL_PACKAGE_ID

  const [activePackageId, setActivePackageId] = React.useState(defaultId)

  React.useEffect(() => {
    if (focusEvalPackageId && rows.some((r) => r.pkg.id === focusEvalPackageId)) {
      setActivePackageId(focusEvalPackageId)
    }
  }, [focusEvalPackageId, rows])

  const activeRow = rows.find((r) => r.pkg.id === activePackageId) ?? rows[0]
  const pkg = activeRow?.pkg ?? tenderById(activePackageId)
  const bids = React.useMemo(
    () => (activePackageId ? bidsForPackage(activePackageId, locale) : []),
    [activePackageId, locale],
  )
  const results = React.useMemo(
    () => (bids.length > 0 ? sortEvaluationForDisplay(evaluateBids(bids, locale)) : []),
    [bids, locale],
  )

  const [notifyOpen, setNotifyOpen] = React.useState(false)
  const [selectedBidId, setSelectedBidId] = React.useState<string | null>(null)
  React.useEffect(() => {
    const top = results.find((r) => r.finalRank === 1) ?? results[0]
    setSelectedBidId(top?.bidId ?? null)
  }, [results])

  const selectPackage = (id: string) => {
    setActivePackageId(id)
    openBidEvaluation(id)
  }

  const readyCount = rows.filter((r) => r.status === "ready").length
  const riskAcross = rows.reduce((s, r) => s + r.riskCount, 0)
  const returnsAcross = rows.reduce((s, r) => s + r.bidCount, 0)

  const weightChips = [
    { label: t("bidEval.price"), max: PRICE_MAX },
    { label: t("bidEval.tech"), max: TECH_MAX },
    { label: t("bidEval.qaHseq"), max: QA_MAX },
    { label: t("bidEval.legal"), max: LEGAL_MAX },
  ]

  const pageMotion = enterMotion(0)
  const ittRef = bids[0]?.ittRef ?? (pkg ? `ITT-${pkg.packageRef}` : "—")

  return (
    <div className={cn("space-y-5", pageMotion.className)} style={pageMotion.style}>
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {t("bidEval.title")} · {PROJECT.shortName}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {t("bidEval.subtitle")}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-[var(--color-text-secondary)]">
              {t("bidEval.scoringExplain")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-[12px]">
            <span className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 tabular-nums">
              <strong className="text-[var(--color-text-primary)]">{readyCount}</strong>{" "}
              <span className="text-[var(--color-text-muted)]">{t("bidEval.readyCount")}</span>
            </span>
            <span className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 tabular-nums">
              <strong className="text-[var(--color-text-primary)]">{returnsAcross}</strong>{" "}
              <span className="text-[var(--color-text-muted)]">{t("bidEval.returns")}</span>
            </span>
            <span className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1.5 tabular-nums">
              <strong className="text-[var(--color-text-primary)]">{riskAcross}</strong>{" "}
              <span className="text-[var(--color-text-muted)]">{t("bidEval.riskFlags")}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,280px)_1fr]">
        {/* ITT portfolio list */}
        <aside className={cn(pcmCard, "h-fit overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
          <div className="border-b border-[var(--color-border-default)] px-3 py-2.5">
            <h2 className="text-[12px] font-semibold text-[var(--color-text-primary)]">
              {t("bidEval.packages")}
            </h2>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {t("bidEval.issuedAndUpstream")}
            </p>
          </div>
          <ul className="max-h-[70vh] overflow-y-auto p-1.5">
            {rows.map((row) => {
              const active = row.pkg.id === activePackageId
              return (
                <li key={row.pkg.id}>
                  <button
                    type="button"
                    onClick={() => selectPackage(row.pkg.id)}
                    className={cn(
                      "w-full rounded-[12px] px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-[var(--color-tint-neutral)]"
                        : "hover:bg-[var(--color-bg-subtle)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                          {row.pkg.packageRef}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                          {row.pkg.title}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                          STATUS_CLS[row.status],
                        )}
                      >
                        {t(STATUS_KEYS[row.status])}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--color-text-muted)]">
                      <span className="tabular-nums">{row.bidCount} {t("bidEval.returns")}</span>
                      {row.topScore != null && (
                        <span className="tabular-nums">
                          {t("bidEval.top")} {row.topScore.toFixed(1)}
                          {row.topSupplier ? ` · ${row.topSupplier}` : ""}
                        </span>
                      )}
                      {row.riskCount > 0 && (
                        <span className="text-[var(--color-accent-warning-text)]">
                          {row.riskCount} {t("bidEval.risk")}
                        </span>
                      )}
                      {row.dqCount > 0 && (
                        <span className="text-[var(--color-accent-critical-text)]">
                          {row.dqCount} DQ
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* Selected ITT detail */}
        <div className="min-w-0 space-y-4">
          {pkg && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {pkg.packageRef} · {ittRef}
                </p>
                <h2 className="mt-0.5 text-[18px] font-semibold text-[var(--color-text-primary)]">
                  {pkg.title}
                </h2>
                <p className="mt-1 max-w-2xl text-[12px] text-[var(--color-text-secondary)]">
                  {pkg.quantity} · {t("bidEval.budget")} {formatCurrency(pkg.budget)} · {t("bidEval.closes")}{" "}
                  {pkg.submissionDeadline}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {weightChips.map((w) => (
                  <span
                    key={w.label}
                    className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]"
                  >
                    {w.label}{" "}
                    <span className="tabular-nums text-[var(--color-text-primary)]">{w.max}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeRow && activeRow.status !== "ready" ? (
            <EmptyPackageState status={activeRow.status} pkg={activeRow.pkg} />
          ) : (
            <>
              <section className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)] px-4 py-3">
                  <div>
                    <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                      {t("bidEval.evaluationMatrix")}
                    </h3>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {t("bidEval.matrixExplain")}
                    </p>
                  </div>
                  {results.some((r) => r.finalRank === 1) && (
                    <button
                      type="button"
                      onClick={() => setNotifyOpen(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[var(--color-bg-inverse)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90"
                    >
                      <SafeIcon name="Mail" className="size-3.5" />
                      {t("bidEval.notifyBidders")}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                        <th className="px-3 py-2.5">{t("bidEval.supplier")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.totalBidPrice")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.price")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.technical")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.qaHseq")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.legal")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.gating")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.composite")}</th>
                        <th className="px-3 py-2.5">{t("bidEval.rank")}</th>
                        <th className="px-3 py-2.5">{t("missionCard.risk")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => {
                        const selected = selectedBidId === r.bidId
                        return (
                          <tr
                            key={r.bidId}
                            onClick={() => setSelectedBidId(r.bidId)}
                            className={cn(
                              "cursor-pointer border-b border-[var(--color-border-default)] last:border-b-0 transition-colors",
                              selected
                                ? "bg-[var(--color-tint-neutral)]"
                                : "hover:bg-[var(--color-bg-subtle)]",
                            )}
                          >
                            <MatrixCell className="font-medium">{r.supplier}</MatrixCell>
                            <MatrixCell>{formatPriceFull(r.totalPrice, locale)}</MatrixCell>
                            <MatrixCell>{r.priceScore?.toFixed(1) ?? "—"}</MatrixCell>
                            <MatrixCell>{r.techScore?.toFixed(1) ?? "—"}</MatrixCell>
                            <MatrixCell>{r.qaScore?.toFixed(1) ?? "—"}</MatrixCell>
                            <MatrixCell>{r.legalScore?.toFixed(1) ?? "—"}</MatrixCell>
                            <MatrixCell>
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                  r.gatingStatus === "Pass"
                                    ? "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]"
                                    : "bg-[var(--color-tint-critical)] text-[var(--color-accent-critical-text)]",
                                )}
                              >
                                {r.gatingStatus === "Pass" ? t("common.pass") : t("common.fail")}
                              </span>
                            </MatrixCell>
                            <MatrixCell className="font-semibold">
                              {r.compositeScore?.toFixed(1) ?? "—"}
                            </MatrixCell>
                            <MatrixCell className="font-semibold">
                              {r.finalRank != null ? `#${r.finalRank}` : "DQ"}
                            </MatrixCell>
                            <MatrixCell>
                              {r.highCommercialRisk ? (
                                <span className="rounded bg-[var(--color-tint-warning)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-accent-warning-text)]">
                                  {t("bidEval.high")}
                                </span>
                              ) : (
                                <span className="text-[var(--color-text-muted)]">—</span>
                              )}
                            </MatrixCell>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {t("bidEval.bidCards")}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {t("bidEval.bidCardsExplain")}
                    {pkg ? ` · ${t("bidEval.budgetBaseline")} ${formatCurrency(pkg.budget)}` : ""}.
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {results.map((r, i) => (
                    <BidBaseballCard
                      key={r.bidId}
                      result={r}
                      index={i}
                      locale={locale}
                      selected={selectedBidId === r.bidId}
                      onSelect={() => setSelectedBidId(r.bidId)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {notifyOpen && (
        <BidderNotifyModal
          ittRef={ittRef}
          packageTitle={pkg?.title ?? ""}
          results={results}
          onClose={() => setNotifyOpen(false)}
        />
      )}
    </div>
  )
}
