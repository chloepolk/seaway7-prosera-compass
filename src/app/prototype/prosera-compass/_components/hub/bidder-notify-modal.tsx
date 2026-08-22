"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import { ACTIVE_USER } from "./active-user"
import { PROJECT } from "../../data/seaway7/_tenders"
import { GATE_LABELS, type BidEvaluationResult } from "../../data/seaway7/_bid-scoring"
import { awardGovCopy } from "@/lib/compass/award-governance"

type Outcome = "award" | "unsuccessful" | "disqualified"

function outcomeFor(r: BidEvaluationResult): Outcome {
  if (r.finalRank === 1) return "award"
  if (r.gatingStatus === "Fail") return "disqualified"
  return "unsuccessful"
}

/** Synthesised tender-office contact for the demo (suppliers have no email on file). */
function supplierEmail(supplier: string): string {
  const slug = supplier.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `tenders@${slug}.com`
}

const OUTCOME_META: Record<Outcome, { label: string; cls: string }> = {
  award: { label: "Award", cls: "bg-[var(--color-tint-positive)] text-[var(--color-accent-positive-text)]" },
  unsuccessful: { label: "Unsuccessful", cls: "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]" },
  disqualified: { label: "Disqualified", cls: "bg-[var(--color-tint-critical)] text-[var(--color-accent-critical-text)]" },
}

const SIGN_OFF = `Yours faithfully,
${ACTIVE_USER.name}
${ACTIVE_USER.role}
Seaway7 — Supply Chain Management`

function subjectFor(outcome: Outcome, ittRef: string): string {
  return outcome === "award"
    ? `Notification of Award — ${ittRef}`
    : `Outcome of your tender — ${ittRef}`
}

/** Formal, European-register correspondence — no casual openers. */
function bodyFor(r: BidEvaluationResult, ittRef: string, packageTitle: string): string {
  const outcome = outcomeFor(r)
  const s = r.supplier

  if (outcome === "award") {
    return `Dear ${s} Tender Team,

Further to the evaluation of the returns received against ${ittRef} — ${packageTitle} — for the ${PROJECT.name}, Seaway7 intends to award this package to ${s}.

Your submission achieved the leading composite score under the published evaluation model (Price, Technical, QA/HSEQ and Legal) and met each mandatory gating requirement.

The commercial team will contact you to progress the purchase order and confirm DDP Rotterdam delivery (Incoterms 2020).

Thank you for your submission.

${SIGN_OFF}`
  }

  if (outcome === "disqualified") {
    const gates = r.gateFailures.map((g) => GATE_LABELS[g]).join(", ")
    return `Dear ${s} Tender Team,

Thank you for your submission in response to ${ittRef} — ${packageTitle} — for the ${PROJECT.name}.

Following the compliance review, your tender could not be progressed to commercial evaluation because it did not meet one or more mandatory requirements of the invitation to tender${gates ? ` (${gates})` : ""}.

A fully compliant submission from ${s} can be considered in future procurement exercises. Contact us if you want to discuss this outcome.

${SIGN_OFF}`
  }

  return `Dear ${s} Tender Team,

Thank you for your submission in response to ${ittRef} — ${packageTitle} — for the ${PROJECT.name}.

After evaluation of compliant returns against the published criteria (Price, Technical, QA/HSEQ and Legal), your tender has not been selected for award.

Contact us if you want feedback on your submission.

${SIGN_OFF}`
}

type Draft = { to: string; subject: string; body: string }

export function BidderNotifyModal({
  ittRef,
  packageTitle,
  results,
  awardUnlocked = true,
  onClose,
}: {
  ittRef: string
  packageTitle: string
  results: BidEvaluationResult[]
  awardUnlocked?: boolean
  onClose: () => void
}) {
  const ordered = React.useMemo(() => {
    const rank = (r: BidEvaluationResult) => {
      const o = outcomeFor(r)
      return o === "award" ? 0 : o === "unsuccessful" ? 1 : 2
    }
    return [...results].sort((a, b) => {
      const ra = rank(a)
      const rb = rank(b)
      if (ra !== rb) return ra - rb
      return (a.finalRank ?? 99) - (b.finalRank ?? 99)
    })
  }, [results])

  const [drafts, setDrafts] = React.useState<Record<string, Draft>>(() => {
    const map: Record<string, Draft> = {}
    for (const r of ordered) {
      map[r.bidId] = {
        to: supplierEmail(r.supplier),
        subject: subjectFor(outcomeFor(r), ittRef),
        body: bodyFor(r, ittRef, packageTitle),
      }
    }
    return map
  })

  const [activeId, setActiveId] = React.useState<string | null>(ordered[0]?.bidId ?? null)
  const [sentIds, setSentIds] = React.useState<Set<string>>(new Set())
  const [sendPhase, setSendPhase] = React.useState<"idle" | "sending">("idle")

  const active = activeId ? ordered.find((r) => r.bidId === activeId) ?? null : null
  const activeDraft = activeId ? drafts[activeId] : null
  const activeSent = activeId ? sentIds.has(activeId) : false

  const updateActive = (patch: Partial<Draft>) => {
    if (!activeId) return
    setDrafts((prev) => ({ ...prev, [activeId]: { ...prev[activeId], ...patch } }))
  }

  const advanceToNextUnsent = (justSent: string) => {
    const next = ordered.find((r) => r.bidId !== justSent && !sentIds.has(r.bidId))
    if (next) setActiveId(next.bidId)
  }

  const sendActive = () => {
    if (!activeId || activeSent || sendPhase !== "idle") return
    if (!awardUnlocked && active && outcomeFor(active) === "award") return
    setSendPhase("sending")
    const id = activeId
    window.setTimeout(() => {
      setSentIds((prev) => new Set(prev).add(id))
      setSendPhase("idle")
      advanceToNextUnsent(id)
    }, 650)
  }

  const sendAllRemaining = () => {
    if (sendPhase !== "idle") return
    setSendPhase("sending")
    window.setTimeout(() => {
      const allowed = ordered.filter((r) => awardUnlocked || outcomeFor(r) !== "award").map((r) => r.bidId)
      setSentIds((prev) => new Set([...prev, ...allowed]))
      setSendPhase("idle")
    }, 800)
  }

  const sentCount = sentIds.size
  const allSent = sentCount === ordered.length && ordered.length > 0

  const fieldRowClass = "flex items-center gap-3 border-b border-[var(--color-border-default)] px-4 py-2.5"
  const fieldLabelClass = "w-16 shrink-0 text-[12px] font-medium text-[var(--color-text-muted)]"
  const fieldInputClass =
    "min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"

  if (ordered.length === 0) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-2xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <SafeIcon name="Mail" className="h-4 w-4 text-[var(--color-text-muted)]" />
            <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Notify bidders</h2>
            <span className="text-[11px] text-[var(--color-text-muted)]">· {ittRef}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
              {sentCount} of {ordered.length} notified
            </span>
            {!allSent && (
              <button
                type="button"
                onClick={sendAllRemaining}
                disabled={sendPhase !== "idle"}
                className="rounded-md border border-[var(--color-border-default)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-canvas)] disabled:opacity-50"
              >
                Send all remaining
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--color-bg-canvas)]"
            >
              <SafeIcon name="X" className="h-4 w-4 text-[var(--color-text-muted)]" />
            </button>
          </div>
        </div>
        {!awardUnlocked && (
          <div className="border-b border-[var(--color-border-default)] bg-[var(--color-tint-warning)] px-4 py-2 text-[12px] text-[var(--color-accent-warning-text)]">
            {awardGovCopy("en").notifyHeld}
          </div>
        )}

        <div className="flex min-h-0 flex-col sm:flex-row">
          {/* Recipient list */}
          <div className="shrink-0 border-b border-[var(--color-border-default)] sm:w-56 sm:border-b-0 sm:border-r">
            <ul className="max-h-[26vh] overflow-y-auto p-1.5 sm:max-h-[70vh]">
              {ordered.map((r) => {
                const outcome = outcomeFor(r)
                const meta = OUTCOME_META[outcome]
                const isActive = r.bidId === activeId
                const isSent = sentIds.has(r.bidId)
                return (
                  <li key={r.bidId}>
                    <button
                      type="button"
                      onClick={() => setActiveId(r.bidId)}
                      className={cn(
                        "w-full rounded-[10px] px-2.5 py-2 text-left transition-colors",
                        isActive ? "bg-[var(--color-tint-brand)]" : "hover:bg-[var(--color-bg-subtle)]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                          {r.supplier}
                        </span>
                        {isSent && <SafeIcon name="CheckCircle2" className="size-3.5 shrink-0 text-emerald-500" />}
                      </div>
                      <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", meta.cls)}>
                        {meta.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Compose */}
          {active && activeDraft && (
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]/50 px-4 py-2.5">
                <button
                  type="button"
                  onClick={sendActive}
                  disabled={activeSent || sendPhase !== "idle" || (!awardUnlocked && outcomeFor(active) === "award")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[12px] font-semibold transition-all",
                    activeSent
                      ? "bg-emerald-600 text-white"
                      : "bg-[var(--color-brand-primary)] text-[var(--color-brand-onPrimary)] hover:opacity-90 disabled:opacity-70",
                  )}
                >
                  {sendPhase === "sending" && !activeSent && <SafeIcon name="Loader" className="h-3.5 w-3.5 animate-spin" />}
                  {activeSent && <SafeIcon name="Check" className="h-3.5 w-3.5" />}
                  {!activeSent && sendPhase === "idle" && <SafeIcon name="Send" className="h-3.5 w-3.5" />}
                  {activeSent ? "Sent" : sendPhase === "sending" ? "Sending…" : "Send"}
                </button>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {OUTCOME_META[outcomeFor(active)].label} notification to {active.supplier}
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className={fieldRowClass}>
                  <span className={fieldLabelClass}>From</span>
                  <span className="text-[13px] text-[var(--color-text-secondary)]">You &lt;{ACTIVE_USER.email}&gt;</span>
                </div>
                <div className={fieldRowClass}>
                  <label htmlFor="bidder-to" className={fieldLabelClass}>To</label>
                  <input
                    id="bidder-to"
                    type="email"
                    value={activeDraft.to}
                    onChange={(e) => updateActive({ to: e.target.value })}
                    disabled={activeSent}
                    className={fieldInputClass}
                  />
                </div>
                <div className={fieldRowClass}>
                  <label htmlFor="bidder-subject" className={fieldLabelClass}>Subject</label>
                  <input
                    id="bidder-subject"
                    type="text"
                    value={activeDraft.subject}
                    onChange={(e) => updateActive({ subject: e.target.value })}
                    disabled={activeSent}
                    className={cn(fieldInputClass, "font-medium")}
                  />
                </div>
                <textarea
                  value={activeDraft.body}
                  onChange={(e) => updateActive({ body: e.target.value })}
                  disabled={activeSent}
                  rows={16}
                  className="w-full resize-none bg-transparent px-4 py-4 text-[13px] leading-relaxed text-[var(--color-text-primary)] outline-none disabled:opacity-70"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
