"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import {
  REVISION_REASON_ORDER,
  type AwardApprovalRecord,
  type AwardApprovalSnapshot,
  type AwardGovernanceStatus,
  type AwardRevision,
  type AwardSupportingDocument,
  type AwardTeamNote,
  type RevisionReasonCategory,
  applyRecommendedRow,
  awardGovCopy,
  awardGovTone,
  buildResubmitComparison,
  canConfirmSupplierAward,
  eligibleSupplierRows,
  formatBudgetVariance,
  formatDisplayDate,
  formatScoreAndRank,
  needsNoteConfirmation,
  recommendationUnchanged,
  revisionReasonLabel,
  withProposedAwardUsd,
} from "./award-governance"
import { computeAwardNoteImpact, hasCompletedAwardRoundTrip, type AwardNoteImpact } from "./award-notes"
import { USD_TO_EUR, formatDateTimeDMY, formatUsdAsEur, usdToEur, type DisplayLocale } from "./locale-display"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/prosera/collapsible"
import { DateInputDMY } from "./date-input-dmy"

type SendPhase = "idle" | "sending" | "sent"

const TONE_CLS = {
  neutral: "border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]",
  warning: "border border-[var(--color-accent-warning-text)] bg-[var(--color-bg-surface)] text-[var(--color-accent-warning-text)]",
  positive: "border border-[var(--color-accent-positive-text)] bg-[var(--color-bg-surface)] text-[var(--color-accent-positive-text)]",
  critical: "border border-[var(--color-accent-critical-text)] bg-[var(--color-bg-surface)] text-[var(--color-accent-critical-text)]",
} as const

const NOTE_FIELD_CLS =
  "w-full resize-none rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-primary)]"
const INPUT_FIELD_CLS =
  "w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-primary)]"
const BTN_SECONDARY =
  "rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-canvas)]"
const BTN_CANCEL =
  "rounded-md border border-[var(--color-border-default)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-canvas)]"
const BTN_PRIMARY =
  "rounded-md bg-[var(--color-brand-primary)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-brand-onPrimary)] hover:opacity-90 disabled:opacity-50"
const BTN_INVERSE =
  "rounded-md bg-[var(--color-bg-inverse)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] disabled:opacity-50"

function useAwardNoteImpact(
  snapshot: AwardApprovalSnapshot | null | undefined,
  notes: string,
  locale: DisplayLocale,
): AwardNoteImpact | null {
  const local = React.useMemo(
    () => (snapshot ? computeAwardNoteImpact(snapshot, notes, locale) : null),
    [snapshot, notes, locale],
  )
  const [remote, setRemote] = React.useState<AwardNoteImpact | null>(null)
  React.useEffect(() => {
    if (!snapshot || !notes.trim()) {
      setRemote(null)
      return
    }
    const t = window.setTimeout(() => {
      fetch("/api/acme/award-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot, notes, locale }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j?.data) setRemote(j.data as AwardNoteImpact)
        })
        .catch(() => {})
    }, 450)
    return () => window.clearTimeout(t)
  }, [snapshot, notes, locale])
  return remote ?? local
}

function visibleTeamNotes(notes: AwardTeamNote[] | undefined): AwardTeamNote[] {
  return (notes ?? []).filter((n) => n.kind !== "confirmation" && n.body.trim().length > 0)
}

function buildImpactOverview(record: AwardApprovalRecord | undefined, locale: DisplayLocale): string {
  if (!record) return ""
  const notes = visibleTeamNotes(record.teamNotes)
  const latest = notes[notes.length - 1]
  const revision = record.revision
  const clarification = record.clarification

  if (revision?.instructions) {
    const reason = revisionReasonLabel(revision.reasonCategory, locale)
    const head =
      locale === "fr"
        ? `Révision demandée (${reason}) : ${revision.instructions}`
        : `Revision requested (${reason}): ${revision.instructions}`
    if (latest && latest.body !== revision.instructions) {
      return locale === "fr"
        ? `${head} Dernière note — ${latest.actorName}: ${latest.body}`
        : `${head} Latest note — ${latest.actorName}: ${latest.body}`
    }
    return head
  }

  if (clarification?.question) {
    const head =
      locale === "fr"
        ? `Clarification : ${clarification.question}`
        : `Clarification: ${clarification.question}`
    if (clarification.response) {
      return locale === "fr"
        ? `${head} Réponse — ${clarification.response}`
        : `${head} Response — ${clarification.response}`
    }
    if (latest && latest.body !== clarification.question) {
      return locale === "fr"
        ? `${head} Dernière note — ${latest.actorName}: ${latest.body}`
        : `${head} Latest note — ${latest.actorName}: ${latest.body}`
    }
    return head
  }

  if (latest) {
    return locale === "fr"
      ? `${latest.actorName} (${latest.actorRole}) : ${latest.body}`
      : `${latest.actorName} (${latest.actorRole}): ${latest.body}`
  }
  return ""
}

function TeamNotesList({ notes, locale }: { notes: AwardTeamNote[]; locale: DisplayLocale }) {
  const copy = awardGovCopy(locale)
  return (
    <ol className="space-y-2">
      {notes.map((note) => (
        <li key={note.id} className="border-b border-[var(--color-border-default)] pb-2 last:border-b-0 last:pb-0">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {formatDateTimeDMY(note.at)} · {note.actorName}, {note.actorRole}
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--color-text-primary)]">{note.body}</p>
          {note.confirmedAt ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent-positive-text)]">
              <SafeIcon name="CheckCircle2" className="size-3.5 shrink-0" />
              <span>
                {copy.notesConfirmed}
                {note.confirmedByName ? ` — ${note.confirmedByName}` : ""}
                {` · ${formatDateTimeDMY(note.confirmedAt)}`}
              </span>
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function BluePilotImpactCard({
  record,
  impact,
  locale,
  defaultNotesOpen = false,
}: {
  record?: AwardApprovalRecord
  impact?: AwardNoteImpact | null
  locale: DisplayLocale
  defaultNotesOpen?: boolean
}) {
  const copy = awardGovCopy(locale)
  const notes = visibleTeamNotes(record?.teamNotes)
  const overview = buildImpactOverview(record, locale)
  const result = impact?.summary?.trim() || record?.noteImpact?.summary?.trim() || ""
  const [notesOpen, setNotesOpen] = React.useState(defaultNotesOpen)

  if (!overview && !result && notes.length === 0) return null

  return (
    <div className="space-y-2 rounded-[10px] border border-[var(--color-brand-strong)]/40 bg-[var(--color-bg-surface)] px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{copy.bluePilotImpact}</p>
      {overview ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {copy.impactActionOverview}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-text-primary)]">{overview}</p>
        </div>
      ) : null}
      {result ? <p className="text-[12px] leading-relaxed text-[var(--color-text-primary)]">{result}</p> : null}
      {notes.length > 0 ? (
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--color-border-default)] px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]">
            <span>
              {copy.teamNotesExpand}
              <span className="ml-1 tabular-nums text-[var(--color-text-muted)]">({notes.length})</span>
            </span>
            <SafeIcon name={notesOpen ? "ChevronUp" : "ChevronDown"} className="size-3.5 shrink-0" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <TeamNotesList notes={notes} locale={locale} />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}

function StatusChip({ status, locale }: { status: AwardGovernanceStatus; locale: DisplayLocale }) {
  const copy = awardGovCopy(locale)
  return (
    <span className={cn("rounded-[8px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", TONE_CLS[awardGovTone(status)])}>
      {copy.status[status]}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-3 border-b border-[var(--color-border-default)] px-4 py-2.5 last:border-b-0">
      <dt className="text-[12px] font-medium text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-[13px] text-[var(--color-text-primary)]">{children}</dd>
    </div>
  )
}

function ModalShell({
  title,
  status,
  locale,
  onClose,
  footer,
  children,
}: {
  title: string
  status?: AwardGovernanceStatus
  locale: DisplayLocale
  onClose: () => void
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label={title} className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-xl overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <SafeIcon name="ShieldCheck" className="size-4 shrink-0 text-[var(--color-brand-strong)]" />
            <h3 className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</h3>
            {status ? <StatusChip status={status} locale={locale} /> : null}
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--color-bg-canvas)]">
            <SafeIcon name="X" className="h-4 w-4 text-[var(--color-text-muted)]" />
          </button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border-default)] px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SnapshotFields({ snapshot, locale, note }: { snapshot: AwardApprovalSnapshot; locale: DisplayLocale; note?: string }) {
  const copy = awardGovCopy(locale)
  return (
    <dl>
      <Field label={copy.recommendedSupplier}>{snapshot.recommendedSupplier}</Field>
      <Field label={copy.proposedAwardValue}>{formatUsdAsEur(snapshot.proposedAwardUsd, locale)}</Field>
      <Field label={copy.rankingScore}>{formatScoreAndRank(snapshot.rank, snapshot.compositeScore, locale)}</Field>
      <Field label={copy.budgetVariance}>{formatBudgetVariance(snapshot.varianceUsd, locale)}</Field>
      <Field label={copy.thresholdTriggered}>
        {snapshot.requiresDirectorApproval ? copy.thresholdYes : copy.thresholdNo}
      </Field>
      <Field label={copy.requiredApprover}>
        {snapshot.requiredApproverName}, {snapshot.requiredApproverRole}
      </Field>
      {note ? <Field label={copy.optionalNote}>{note}</Field> : null}
    </dl>
  )
}

function AttachmentEditor({
  attachments,
  onChange,
  locale,
}: {
  attachments: AwardSupportingDocument[]
  onChange: (next: AwardSupportingDocument[]) => void
  locale: DisplayLocale
}) {
  const copy = awardGovCopy(locale)
  const [label, setLabel] = React.useState("")
  const add = () => {
    const next = label.trim()
    if (!next) return
    onChange([...attachments, { label: next }])
    setLabel("")
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">{copy.attachDocuments}</p>
      {attachments.length > 0 ? (
        <ul className="space-y-1">
          {attachments.map((doc, i) => (
            <li key={`${doc.label}-${i}`} className="flex items-center justify-between gap-2 text-[12px] text-[var(--color-text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <SafeIcon name="FileText" className="size-3" />
                {doc.label}
              </span>
              <button
                type="button"
                className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                onClick={() => onChange(attachments.filter((_, j) => j !== i))}
              >
                <SafeIcon name="X" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          placeholder={copy.attachmentHint}
          className={INPUT_FIELD_CLS}
        />
        <button
          type="button"
          onClick={add}
          className={BTN_SECONDARY}
        >
          {copy.addAttachment}
        </button>
      </div>
    </div>
  )
}

export function AwardRecommendPanel({
  snapshot,
  locale = "en",
  onClose,
  onSubmit,
}: {
  snapshot: AwardApprovalSnapshot
  locale?: DisplayLocale
  onClose: () => void
  onSubmit: (noteToApprover: string) => void
}) {
  const copy = awardGovCopy(locale)
  const [note, setNote] = React.useState("")
  const [phase, setPhase] = React.useState<SendPhase>("idle")
  const needsApproval = snapshot.requiresDirectorApproval
  const primary = needsApproval ? copy.submitForApproval : copy.confirmRecommendation

  const handleSubmit = () => {
    if (phase !== "idle") return
    setPhase("sending")
    window.setTimeout(() => {
      onSubmit(note)
      setPhase("sent")
    }, 500)
  }

  return (
    <ModalShell
      title={copy.recommendTitle}
      locale={locale}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={BTN_CANCEL}
          >
            {locale === "fr" ? "Fermer" : "Close"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={phase !== "idle"}
            className={cn(BTN_PRIMARY, "inline-flex items-center gap-1.5 disabled:opacity-70")}
          >
            {phase === "sending" && <SafeIcon name="Loader" className="h-3.5 w-3.5 animate-spin" />}
            {phase === "sent" && <SafeIcon name="Check" className="h-3.5 w-3.5" />}
            {primary}
          </button>
        </>
      }
    >
      <div className="border-b border-[var(--color-border-default)] px-4 py-3">
        <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
          {needsApproval ? copy.exceedsThreshold : copy.withinAuthority} {copy.ruleNote}
        </p>
      </div>
      <SnapshotFields snapshot={snapshot} locale={locale} />
      <div className="px-4 py-3">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {copy.optionalNote}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={copy.optionalNoteHint}
          className={NOTE_FIELD_CLS}
        />
      </div>
    </ModalShell>
  )
}

function ReturnForRevisionForm({
  locale,
  onCancel,
  onSubmit,
}: {
  locale: DisplayLocale
  onCancel: () => void
  onSubmit: (args: {
    reasonCategory: RevisionReasonCategory
    instructions: string
    supportingReference: string
    dueDate: string | null
  }) => void
}) {
  const copy = awardGovCopy(locale)
  const [reason, setReason] = React.useState<RevisionReasonCategory>("price_negotiation")
  const [instructions, setInstructions] = React.useState("")
  const [reference, setReference] = React.useState("")
  const [due, setDue] = React.useState("")
  const canSubmit = instructions.trim().length > 0

  return (
    <div className="space-y-3 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {copy.reasonCategory}
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as RevisionReasonCategory)}
          className={INPUT_FIELD_CLS}
        >
          {REVISION_REASON_ORDER.map((id) => (
            <option key={id} value={id}>
              {copy.revisionReasons[id]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {copy.revisionInstructions}
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder={copy.revisionInstructionsHint}
          className={NOTE_FIELD_CLS}
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {copy.supportingReference}
        </label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className={INPUT_FIELD_CLS}
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {copy.requiredCompletionDate}
        </label>
        <DateInputDMY
          value={due}
          onChange={setDue}
          className={INPUT_FIELD_CLS}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={BTN_CANCEL}
        >
          {locale === "fr" ? "Annuler" : "Cancel"}
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onSubmit({
              reasonCategory: reason,
              instructions,
              supportingReference: reference,
              dueDate: due || null,
            })
          }
          className={BTN_INVERSE}
        >
          {copy.returnToProcurement}
        </button>
      </div>
    </div>
  )
}

function ResubmitComparison({
  original,
  revised,
  locale,
}: {
  original: AwardApprovalSnapshot
  revised: AwardApprovalSnapshot
  locale: DisplayLocale
}) {
  const copy = awardGovCopy(locale)
  const rows = buildResubmitComparison(original, revised, locale)
  return (
    <div className="overflow-x-auto rounded-[10px] border border-[var(--color-border-default)]">
      <table className="w-full min-w-[480px] border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <th className="px-3 py-2">{copy.field}</th>
            <th className="px-3 py-2">{copy.original}</th>
            <th className="px-3 py-2">{copy.revised}</th>
            <th className="px-3 py-2">{copy.change}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} className="border-b border-[var(--color-border-default)] last:border-b-0">
              <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">{row.field}</td>
              <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.original}</td>
              <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.revised}</td>
              <td className="px-3 py-2 text-[var(--color-text-secondary)]">{row.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RevisionCard({
  record,
  locale,
  onResubmit,
}: {
  record: AwardApprovalRecord
  locale: DisplayLocale
  onResubmit: (args: {
    snapshot: AwardApprovalSnapshot
    actionTaken: string
    explanation: string
    attachments: AwardSupportingDocument[]
  }) => void
}) {
  const copy = awardGovCopy(locale)
  const snapshot = record.snapshot
  const revision = record.revision as AwardRevision
  const original = record.originalSnapshot ?? snapshot
  const [actionTaken, setActionTaken] = React.useState(revision.actionTaken)
  const [explanation, setExplanation] = React.useState(revision.explanation)
  const [attachments, setAttachments] = React.useState<AwardSupportingDocument[]>(revision.attachments)
  const [bidId, setBidId] = React.useState(snapshot?.recommendedBidId ?? "")
  const [awardEur, setAwardEur] = React.useState(
    snapshot ? String(Math.round(usdToEur(snapshot.proposedAwardUsd))) : "",
  )
  const [confirming, setConfirming] = React.useState(false)
  const noteText = [actionTaken, explanation].filter(Boolean).join("\n")
  const impact = useAwardNoteImpact(original, noteText, locale)

  if (!snapshot || !original) return null
  const rows = eligibleSupplierRows(snapshot)
  const selectedRow = rows.find((r) => r.bidId === bidId) ?? rows[0]
  const parsedEur = Number(awardEur.replace(/[^\d.-]/g, ""))
  const proposedUsd = Number.isFinite(parsedEur) && parsedEur > 0 ? parsedEur / USD_TO_EUR : snapshot.proposedAwardUsd
  const draft =
    selectedRow && selectedRow.bidId !== snapshot.recommendedBidId
      ? withProposedAwardUsd(applyRecommendedRow(snapshot, selectedRow), proposedUsd)
      : withProposedAwardUsd(snapshot, proposedUsd)
  const unchanged = recommendationUnchanged(original, draft)
  const canResubmit = !unchanged || explanation.trim().length > 0 || Boolean(impact?.foundNumericChange)

  if (confirming) {
    return (
      <div className="space-y-3">
        <BluePilotImpactCard record={record} impact={impact} locale={locale} />
        {unchanged && !impact?.foundNumericChange ? (
          <p className="text-[12px] text-[var(--color-accent-warning-text)]">{copy.explainRequired}</p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirming(false)} className={BTN_CANCEL}>
            {locale === "fr" ? "Retour" : "Back"}
          </button>
          <button
            type="button"
            disabled={!canResubmit}
            onClick={() => {
              const next =
                impact?.foundNumericChange && recommendationUnchanged(original, draft)
                  ? withProposedAwardUsd(draft, impact.revisedAwardUsd)
                  : draft
              onResubmit({ snapshot: next, actionTaken, explanation, attachments })
            }}
            className={BTN_PRIMARY}
          >
            {copy.resubmitForApproval}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[10px] border border-[var(--color-accent-warning-text)]/40 bg-[var(--color-bg-subtle)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
        <p className="font-semibold text-[var(--color-text-primary)]">
          {copy.status.revision_required}
          {record.approvalId ? ` — ${record.approvalId}` : ""}
        </p>
        <p className="mt-1">
          {copy.reason}: {revisionReasonLabel(revision.reasonCategory, locale)}
        </p>
        <p className="mt-1">
          {copy.instructionsFrom} {revision.requestedByName}: {revision.instructions}
        </p>
        {revision.dueDate ? (
          <p className="mt-1">
            {copy.due}: {formatDisplayDate(revision.dueDate, locale)}
          </p>
        ) : null}
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {copy.recommendedSupplier}
        </label>
        <select
          value={bidId}
          onChange={(e) => {
            const next = rows.find((r) => r.bidId === e.target.value)
            setBidId(e.target.value)
            if (next) setAwardEur(String(Math.round(usdToEur(next.totalPriceUsd))))
          }}
          className={INPUT_FIELD_CLS}
        >
          {rows.map((row) => (
            <option key={row.bidId} value={row.bidId}>
              {row.supplier}
              {row.compositeScore != null ? ` · ${row.compositeScore.toFixed(1)}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {copy.proposedAwardValue}
        </label>
        <input
          type="number"
          min={0}
          value={awardEur}
          onChange={(e) => setAwardEur(e.target.value)}
          className={INPUT_FIELD_CLS}
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {copy.actionTaken}
        </label>
        <textarea
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          rows={2}
          className={NOTE_FIELD_CLS}
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
          {copy.explainWhatChanged}
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={2}
          className={NOTE_FIELD_CLS}
        />
        {unchanged && !impact?.foundNumericChange ? (
          <p className="mt-1 text-[11px] text-[var(--color-accent-warning-text)]">{copy.explainRequired}</p>
        ) : null}
      </div>
      <BluePilotImpactCard record={record} impact={impact} locale={locale} />
      {impact?.foundNumericChange ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAwardEur(String(Math.round(usdToEur(impact.revisedAwardUsd))))}
            className={BTN_SECONDARY}
          >
            {copy.applyToProposal}
          </button>
        </div>
      ) : null}
      <AttachmentEditor attachments={attachments} onChange={setAttachments} locale={locale} />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canResubmit}
          onClick={() => setConfirming(true)}
          className={BTN_PRIMARY}
        >
          {copy.resubmitForApproval}
        </button>
      </div>
    </div>
  )
}

export function AwardGovernanceCardBlock({
  record,
  locale = "en",
  onApprove,
  onRequestClarification,
  onReturnForRevision,
  onSubmitClarification,
  onResubmit,
  onConfirmAward,
  onConfirmNotes,
}: {
  record: AwardApprovalRecord
  locale?: DisplayLocale
  onApprove: (comments: string) => void
  onRequestClarification: (question: string) => void
  onReturnForRevision: (args: {
    reasonCategory: RevisionReasonCategory
    instructions: string
    supportingReference: string
    dueDate: string | null
  }) => void
  onSubmitClarification: (args: {
    response: string
    attachments: AwardSupportingDocument[]
    sourceReferences: string[]
    snapshot?: AwardApprovalSnapshot
  }) => void
  onResubmit: (args: {
    snapshot: AwardApprovalSnapshot
    actionTaken: string
    explanation: string
    attachments: AwardSupportingDocument[]
  }) => void
  onConfirmAward: () => void
  onConfirmNotes?: () => void
}) {
  const copy = awardGovCopy(locale)
  const snapshot = record.snapshot
  const original = record.originalSnapshot ?? snapshot
  const status = record.status
  const [comments, setComments] = React.useState("")
  const [showClarify, setShowClarify] = React.useState(false)
  const [showRevision, setShowRevision] = React.useState(false)
  const [question, setQuestion] = React.useState("")
  const [response, setResponse] = React.useState("")
  const [attachments, setAttachments] = React.useState<AwardSupportingDocument[]>([])
  const [sources, setSources] = React.useState<string[]>([])
  const clarificationImpact = useAwardNoteImpact(original, response, locale)
  const viewerName = snapshot?.requiredApproverName ?? ""
  const mustConfirmNotes = needsNoteConfirmation(record, viewerName)
  const proposalChanged = Boolean(original && snapshot && !recommendationUnchanged(original, snapshot))
  const roundTripComplete = hasCompletedAwardRoundTrip(record.audit.map((e) => e.action))
  /** Field comparison only after the next approver has confirmed team notes. */
  const showComparisonTable =
    proposalChanged &&
    Boolean(original) &&
    !mustConfirmNotes &&
    (!roundTripComplete || Boolean(record.notesConfirmedAt))

  // After clarification/revision round-trips, drop secondary forms so the
  // approver lands on Approve / Request clarification / Return for revision.
  React.useEffect(() => {
    setShowClarify(false)
    setShowRevision(false)
    setQuestion("")
    setComments("")
  }, [status, record.audit.length, record.notesConfirmedAt])

  if (!snapshot) return null

  if (status === "clarification_requested" && record.clarification?.status === "open") {
    const q = record.clarification
    const appliedSnapshot =
      clarificationImpact?.foundNumericChange
        ? withProposedAwardUsd(snapshot, clarificationImpact.revisedAwardUsd)
        : snapshot
    return (
      <div className="mt-3 space-y-3 rounded-[10px] border border-[var(--color-accent-warning-text)]/40 bg-[var(--color-bg-subtle)] p-3">
        <BluePilotImpactCard record={record} impact={clarificationImpact} locale={locale} />
        <p className="text-[12px] leading-relaxed text-[var(--color-text-primary)]">
          <span className="font-semibold">
            {copy.clarificationFrom} {q.askedByName}:
          </span>{" "}
          {q.question}
        </p>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            {copy.clarificationResponse}
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={3}
            className={NOTE_FIELD_CLS}
          />
        </div>
        {clarificationImpact?.foundNumericChange ? (
          <p className="text-[12px] text-[var(--color-text-secondary)]">
            {copy.applyToProposal}: {formatUsdAsEur(snapshot.proposedAwardUsd, locale)} →{" "}
            {formatUsdAsEur(clarificationImpact.revisedAwardUsd, locale)}
          </p>
        ) : null}
        <AttachmentEditor attachments={attachments} onChange={setAttachments} locale={locale} />
        {snapshot.sourceReferences.length > 0 ? (
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              {copy.sourceReferences}
            </p>
            <ul className="space-y-1">
              {snapshot.sourceReferences.map((ref) => (
                <li key={ref}>
                  <label className="flex items-start gap-2 text-[12px] text-[var(--color-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={sources.includes(ref)}
                      onChange={() =>
                        setSources((prev) => (prev.includes(ref) ? prev.filter((x) => x !== ref) : [...prev, ref]))
                      }
                    />
                    <span>{ref}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!response.trim()}
            onClick={() =>
              onSubmitClarification({
                response,
                attachments,
                sourceReferences: sources,
                snapshot: appliedSnapshot,
              })
            }
            className={BTN_PRIMARY}
          >
            {copy.submitClarificationResponse}
          </button>
        </div>
      </div>
    )
  }

  if (status === "revision_required" && record.revision) {
    return (
      <div className="mt-3">
        <RevisionCard record={record} locale={locale} onResubmit={onResubmit} />
      </div>
    )
  }

  if (status === "awaiting_approver") {
    return (
      <div className="mt-3 space-y-3 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-3">
        {record.approvalId ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {record.approvalId}
          </p>
        ) : null}
        <SnapshotFields snapshot={snapshot} locale={locale} note={record.noteToApprover} />
        <BluePilotImpactCard record={record} impact={record.noteImpact} locale={locale} />
        {mustConfirmNotes ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2.5">
            <p className="text-[12px] text-[var(--color-text-primary)]">{copy.confirmNotesHint}</p>
            <button type="button" onClick={() => onConfirmNotes?.()} className={BTN_INVERSE}>
              {copy.confirmNotes}
            </button>
          </div>
        ) : null}
        {showComparisonTable && original ? (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {copy.resubmitSummary}
            </p>
            <ResubmitComparison original={original} revised={snapshot} locale={locale} />
          </div>
        ) : null}
        {showClarify ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              {copy.clarificationQuestion}
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder={copy.clarificationQuestionHint}
              className={NOTE_FIELD_CLS}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowClarify(false)} className={BTN_CANCEL}>
                {locale === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={!question.trim()}
                onClick={() => onRequestClarification(question)}
                className={BTN_INVERSE}
              >
                {copy.requestClarification}
              </button>
            </div>
          </div>
        ) : showRevision ? (
          <ReturnForRevisionForm locale={locale} onCancel={() => setShowRevision(false)} onSubmit={onReturnForRevision} />
        ) : (
          <>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              placeholder={copy.comments}
              className={NOTE_FIELD_CLS}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setShowClarify(true)} className={BTN_SECONDARY}>
                {copy.requestClarification}
              </button>
              <button type="button" onClick={() => setShowRevision(true)} className={BTN_SECONDARY}>
                {copy.returnForRevision}
              </button>
              <button
                type="button"
                disabled={mustConfirmNotes}
                title={mustConfirmNotes ? copy.approveDisabledUntilConfirm : undefined}
                onClick={() => onApprove(comments || (locale === "fr" ? "Attribution approuvée." : "Award approved."))}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent-positive-text)] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SafeIcon name="Check" className="h-3.5 w-3.5" />
                {copy.approve}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  if (canConfirmSupplierAward(record)) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-[10px] border border-[var(--color-accent-positive-text)]/40 px-3 py-2.5">
        <p className="text-[12px] text-[var(--color-text-secondary)]">{copy.definition.approved_for_award}</p>
        <button
          type="button"
          onClick={onConfirmAward}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-bg-inverse)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)]"
        >
          <SafeIcon name="CircleCheck" className="h-3.5 w-3.5" />
          {copy.confirmAward}
        </button>
      </div>
    )
  }

  return null
}

export function AwardNotificationToast({
  name,
  locale = "en",
  onDismiss,
}: {
  name: string
  locale?: DisplayLocale
  onDismiss: () => void
}) {
  const copy = awardGovCopy(locale)
  React.useEffect(() => {
    const t = window.setTimeout(onDismiss, 3200)
    return () => window.clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-inverse)] px-4 py-2.5 text-[12px] font-medium text-[var(--color-text-inverse)] shadow-lg">
      {copy.notificationSent} {name}
    </div>
  )
}

export function AwardGovernanceChip({
  status,
  locale = "en",
  className,
}: {
  status: AwardGovernanceStatus
  locale?: DisplayLocale
  className?: string
}) {
  const copy = awardGovCopy(locale)
  return (
    <span
      title={copy.definition[status]}
      className={cn(
        "rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide",
        TONE_CLS[awardGovTone(status)],
        className,
      )}
    >
      {copy.status[status]}
    </span>
  )
}
