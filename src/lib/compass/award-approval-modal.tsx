"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import {
  type AwardApprovalRecord,
  type AwardDecision,
  type AwardGovernanceStatus,
  awardGovCopy,
  awardGovTone,
  buildAwardApprovalEmail,
  canConfirmSupplierAward,
} from "./award-governance"
import type { DisplayLocale } from "./locale-display"

type SendPhase = "idle" | "sending" | "sent"

const TONE_CLS = {
  neutral: "border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]",
  warning: "border border-[var(--color-accent-warning-text)] bg-[var(--color-bg-surface)] text-[var(--color-accent-warning-text)]",
  positive: "border border-[var(--color-accent-positive-text)] bg-[var(--color-bg-surface)] text-[var(--color-accent-positive-text)]",
  critical: "border border-[var(--color-accent-critical-text)] bg-[var(--color-bg-surface)] text-[var(--color-accent-critical-text)]",
} as const

function StatusChip({ status, locale }: { status: AwardGovernanceStatus; locale: DisplayLocale }) {
  const copy = awardGovCopy(locale)
  return (
    <span className={cn("rounded-[8px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", TONE_CLS[awardGovTone(status)])}>
      {copy.status[status]}
    </span>
  )
}

export function AwardApprovalModal({
  record,
  locale = "en",
  fromName,
  fromEmail,
  onClose,
  onOpenBidEvaluation,
  onSendRequest,
  onDecide,
  onConfirmAward,
}: {
  record: AwardApprovalRecord | undefined
  locale?: DisplayLocale
  fromName: string
  fromEmail: string
  onClose: () => void
  onOpenBidEvaluation?: () => void
  onSendRequest: () => void
  onDecide: (decision: AwardDecision, comments: string) => void
  onConfirmAward: () => void
}) {
  const copy = awardGovCopy(locale)
  const snapshot = record?.snapshot ?? null
  const status: AwardGovernanceStatus = record?.status ?? "procurement_review"
  const email = snapshot ? buildAwardApprovalEmail(snapshot, locale) : null
  const [sendPhase, setSendPhase] = React.useState<SendPhase>("idle")
  const [comments, setComments] = React.useState("")
  const [subject, setSubject] = React.useState(email?.subject ?? "")
  const [body, setBody] = React.useState(email?.body ?? "")

  React.useEffect(() => {
    if (email) {
      setSubject(email.subject)
      setBody(email.body)
    }
  }, [email?.subject, email?.body])

  const handleSend = () => {
    if (sendPhase !== "idle") return
    setSendPhase("sending")
    window.setTimeout(() => {
      onSendRequest()
      setSendPhase("sent")
    }, 700)
  }

  const canSend =
    snapshot?.requiresDirectorApproval &&
    (status === "approval_required" || status === "clarification_requested")
  const canDecide = status === "awaiting_approver"
  const canConfirm = canConfirmSupplierAward(record)

  const fieldRowClass = "flex items-center gap-3 border-b border-[var(--color-border-default)] px-4 py-2.5"
  const fieldLabelClass = "w-16 shrink-0 text-[12px] font-medium text-[var(--color-text-muted)]"
  const fieldInputClass =
    "min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label={copy.title} className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <SafeIcon name="ShieldCheck" className="size-4 shrink-0 text-[var(--color-brand-strong)]" />
            <h3 className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">{copy.emailTitle}</h3>
            <StatusChip status={status} locale={locale} />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sendPhase === "sending"}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--color-bg-canvas)] disabled:opacity-50"
          >
            <SafeIcon name="X" className="h-4 w-4 text-[var(--color-text-muted)]" />
          </button>
        </div>

        <div className="max-h-[76vh] overflow-y-auto">
          <div className="border-b border-[var(--color-border-default)] px-4 py-3">
            <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
              {copy.definition[status]} {copy.ruleNote}
            </p>
            {(status === "approval_required" || status === "awaiting_approver" || status === "clarification_requested") && (
              <p className="mt-1.5 text-[12px] text-[var(--color-text-muted)]">{copy.gateBlocked}</p>
            )}
          </div>

          {!snapshot ? (
            <div className="space-y-3 px-4 py-10 text-center">
              <p className="text-[13px] text-[var(--color-text-secondary)]">{copy.selectSupplierFirst}</p>
              {onOpenBidEvaluation && (
                <button
                  type="button"
                  onClick={onOpenBidEvaluation}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-bg-inverse)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)]"
                >
                  {copy.openBidEvaluation}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={fieldRowClass}>
                <span className={fieldLabelClass}>{copy.from}</span>
                <span className="text-[13px] text-[var(--color-text-secondary)]">
                  {fromName} &lt;{fromEmail}&gt;
                </span>
              </div>
              <div className={fieldRowClass}>
                <span className={fieldLabelClass}>{copy.to}</span>
                <span className="text-[13px] text-[var(--color-text-secondary)]">
                  {snapshot.requiredApproverName} &lt;{snapshot.requiredApproverEmail}&gt;
                </span>
              </div>
              <div className={fieldRowClass}>
                <span className={fieldLabelClass}>{copy.subject}</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={!canSend || sendPhase !== "idle"}
                  className={cn(fieldInputClass, "font-medium")}
                />
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={!canSend || sendPhase !== "idle"}
                rows={16}
                className="w-full resize-none bg-transparent px-4 py-4 text-[13px] leading-relaxed text-[var(--color-text-primary)] outline-none disabled:opacity-80"
              />

              {snapshot.supportingDocuments.length > 0 && (
                <div className="border-t border-[var(--color-border-default)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {copy.supportingDocs}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {snapshot.supportingDocuments.map((doc) => (
                      <li key={doc.label}>
                        {doc.href ? (
                          <a
                            href={doc.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] text-[var(--color-brand-strong)] hover:underline"
                          >
                            <SafeIcon name="FileText" className="size-3" />
                            {doc.label}
                          </a>
                        ) : (
                          <span className="text-[12px] text-[var(--color-text-secondary)]">{doc.label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {record && record.audit.length > 0 && (
                <div className="border-t border-[var(--color-border-default)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {copy.auditField}
                  </p>
                  <ol className="mt-2 space-y-2">
                    {[...record.audit].reverse().map((entry) => (
                      <li key={entry.id} className="rounded-md bg-[var(--color-bg-subtle)] px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {new Date(entry.at).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {" — "}
                        {entry.actorName} ({entry.actorRole}): {entry.action}
                        {entry.comments ? `. ${entry.comments}` : ""}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {(canDecide || canConfirm) && (
                <div className="border-t border-[var(--color-border-default)] px-4 py-3">
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    {copy.comments}
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    placeholder={copy.commentsHint}
                    className="w-full resize-none rounded-lg border border-[var(--color-border-default)] bg-background px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand-primary)]"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border-default)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--color-border-default)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
          >
            {locale === "fr" ? "Fermer" : "Close"}
          </button>
          {canSend && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sendPhase !== "idle"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold",
                sendPhase === "sent"
                  ? "bg-emerald-600 text-white"
                  : "bg-[var(--color-brand-primary)] text-[var(--color-brand-onPrimary)] hover:opacity-90 disabled:opacity-70",
              )}
            >
              {sendPhase === "sending" && <SafeIcon name="Loader" className="h-3.5 w-3.5 animate-spin" />}
              {sendPhase === "sent" && <SafeIcon name="Check" className="h-3.5 w-3.5" />}
              {sendPhase === "idle" && <SafeIcon name="Send" className="h-3.5 w-3.5" />}
              {sendPhase === "sending" ? copy.sending : sendPhase === "sent" ? copy.sent : copy.sendRequest}
            </button>
          )}
          {canDecide && (
            <>
              <button
                type="button"
                onClick={() => onDecide("clarification", comments || (locale === "fr" ? "Clarification demandée." : "Clarification requested."))}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-default)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              >
                {copy.requestClarification}
              </button>
              <button
                type="button"
                onClick={() => onDecide("reject", comments || (locale === "fr" ? "Recommandation rejetée." : "Recommendation rejected."))}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-accent-critical-text)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-accent-critical-text)] hover:bg-[var(--color-tint-critical)]"
              >
                {copy.reject}
              </button>
              <button
                type="button"
                onClick={() => onDecide("approve", comments || (locale === "fr" ? "Attribution approuvée." : "Award approved."))}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent-positive-text)] px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
              >
                <SafeIcon name="Check" className="h-3.5 w-3.5" />
                {copy.approve}
              </button>
            </>
          )}
          {canConfirm && (
            <button
              type="button"
              onClick={onConfirmAward}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-bg-inverse)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90"
            >
              <SafeIcon name="CircleCheck" className="h-3.5 w-3.5" />
              {copy.confirmAward}
            </button>
          )}
        </div>
      </div>
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
