"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import { useStore } from "../_store"
import { enterMotion, listItemMotion, pcmCard } from "../_components/motion"
import { formatCurrency } from "../_diamond/stages"
import { BIDS_ITT_MER_SCM_2101, EVAL_PACKAGE_ID, ITT_REF, bidsForPackage } from "../data/seaway7/_bids"
import {
  evaluateBids,
  sortEvaluationForDisplay,
  PRICE_MAX,
  TECH_MAX,
  QA_MAX,
  LEGAL_MAX,
  GATE_LABELS,
  type BidEvaluationResult,
  type GateId,
} from "../data/seaway7/_bid-scoring"
import { tenderById, PROJECT } from "../data/seaway7/_tenders"

function formatPriceFull(n: number): string {
  return new Intl.NumberFormat("en-US", {
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
      {GATE_LABELS[id]}
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
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-tint-brand)] text-[15px] font-semibold tabular-nums text-[var(--color-brand-strong)]">
      #{rank}
    </span>
  )
}

function BidBaseballCard({
  result,
  selected,
  onSelect,
  index,
}: {
  result: BidEvaluationResult
  selected: boolean
  onSelect: () => void
  index: number
}) {
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
          ? "ring-2 ring-[var(--color-brand-primary)]"
          : "hover:border-[var(--color-brand-strong)]/40",
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
                {formatPriceFull(result.totalPrice)}
                {result.compositeScore != null && (
                  <span className="ml-2 text-[var(--color-text-secondary)]">
                    · Composite {result.compositeScore.toFixed(1)}
                  </span>
                )}
              </p>
            </div>
            <a
              href={result.pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border-default)] px-2 py-1 text-[11px] font-medium text-[var(--color-brand-strong)] hover:bg-[var(--color-tint-brand)]"
            >
              <SafeIcon name="FileText" className="size-3" />
              Response PDF
            </a>
          </div>

          {result.highCommercialRisk && (
            <div className="flex items-start gap-2 rounded-md bg-[var(--color-tint-warning)] px-2.5 py-2 text-[11px] text-[var(--color-accent-warning-text)]">
              <SafeIcon name="AlertTriangle" className="mt-0.5 size-3.5 shrink-0" />
              <span>
                High commercial risk — warranty reduced more than 25% below the 24-month Seaway7 standard
                ({result.warrantyMonths} months offered).
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {allGates.map((g) => (
              <GateChip key={g} id={g} passed={!result.gateFailures.includes(g)} />
            ))}
          </div>

          {!failed && (
            <div className="grid gap-2 sm:grid-cols-2">
              <ScoreBar label="Price" value={result.priceScore} max={PRICE_MAX} />
              <ScoreBar label="Technical" value={result.techScore} max={TECH_MAX} />
              <ScoreBar label="QA / HSEQ" value={result.qaScore} max={QA_MAX} />
              <ScoreBar label="Legal" value={result.legalScore} max={LEGAL_MAX} />
            </div>
          )}

          <div className="rounded-md bg-[var(--color-bg-subtle)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Insight / recommendation
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

export function BidEvaluationPage() {
  const { focusEvalPackageId } = useStore()
  const packageId = focusEvalPackageId ?? EVAL_PACKAGE_ID
  const pkg = tenderById(packageId)
  const bids = React.useMemo(() => {
    const scoped = bidsForPackage(packageId)
    return scoped.length > 0 ? scoped : BIDS_ITT_MER_SCM_2101
  }, [packageId])

  const results = React.useMemo(
    () => sortEvaluationForDisplay(evaluateBids(bids)),
    [bids],
  )

  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const top = results.find((r) => r.finalRank === 1) ?? results[0]
    setSelectedId(top?.bidId ?? null)
  }, [results])

  const weightChips = [
    { label: "Price", max: PRICE_MAX },
    { label: "Tech", max: TECH_MAX },
    { label: "QA / HSEQ", max: QA_MAX },
    { label: "Legal", max: LEGAL_MAX },
  ]

  const pageMotion = enterMotion(0)

  return (
    <div className={cn("space-y-6", pageMotion.className)} style={pageMotion.style}>
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Bid evaluation · {pkg?.packageRef ?? "MER-SCM-2101"} · {ITT_REF}
            </p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {pkg?.title ?? "66kV Subsea Array Cable — Supply"}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-[var(--color-text-secondary)]">
              Four returns normalised against hard gates, then scored out of 100 for {PROJECT.shortName}.
              Price uses lowest eligible bid; operational deviation penalties are held for a later revision.
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
      </header>

      <section className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
        <div className="border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            Evaluation matrix
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Composite = Price + Tech + QA + Legal among gate-passing suppliers only.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Total bid price</th>
                <th className="px-3 py-2.5">Price</th>
                <th className="px-3 py-2.5">Technical</th>
                <th className="px-3 py-2.5">QA / HSEQ</th>
                <th className="px-3 py-2.5">Legal</th>
                <th className="px-3 py-2.5">Gating</th>
                <th className="px-3 py-2.5">Composite</th>
                <th className="px-3 py-2.5">Rank</th>
                <th className="px-3 py-2.5">Risk</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const selected = selectedId === r.bidId
                return (
                  <tr
                    key={r.bidId}
                    onClick={() => setSelectedId(r.bidId)}
                    className={cn(
                      "cursor-pointer border-b border-[var(--color-border-default)] last:border-b-0 transition-colors",
                      selected
                        ? "bg-[var(--color-tint-brand)]"
                        : "hover:bg-[var(--color-bg-subtle)]",
                    )}
                  >
                    <MatrixCell className="font-medium">{r.supplier}</MatrixCell>
                    <MatrixCell>{formatPriceFull(r.totalPrice)}</MatrixCell>
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
                        {r.gatingStatus === "Pass" ? "Pass" : "Fail"}
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
                          High
                        </span>
                      ) : r.gatingStatus === "Pass" ? (
                        <span className="text-[var(--color-text-muted)]">—</span>
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
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            Bid cards
          </h2>
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Rank, score breakdown, and award insight per return
            {pkg ? ` · budget baseline ${formatCurrency(pkg.budget)}` : ""}.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {results.map((r, i) => (
            <BidBaseballCard
              key={r.bidId}
              result={r}
              index={i}
              selected={selectedId === r.bidId}
              onSelect={() => setSelectedId(r.bidId)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
