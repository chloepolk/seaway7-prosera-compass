"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { cn } from "@/lib/utils"
import { formatCurrency } from "../../_diamond/stages"
import { personForRole } from "../../_diamond/org"
import type { DiamondMission } from "../../_diamond/types"
import { emailForPerson, type ActionTimelineEntry } from "./hub-types"
import { ACTIVE_USER, NOTIFY_DELEGATE } from "./active-user"
import { employeeForCurrentTimelineStep } from "./mission-timeline-helpers"

function buildDefaultBody(mission: DiamondMission, narrative: string): string {
  return `Dear colleague,

I am writing with regard to ${mission.name}, currently active on the Action Centre.

${narrative}

The target is ${formatCurrency(mission.projectedValue)}, due by ${new Date(mission.targetCompletionAt).toLocaleDateString("en-GB")}.

Please review this and confirm the next steps. You can contact me if you need more information.

Kind regards,
[Your name]`
}

type SendPhase = "idle" | "sending" | "sent"

export function EmailPreviewModal({
  mission,
  narrative,
  timelineEntries,
  onClose,
}: {
  mission: DiamondMission
  narrative: string
  timelineEntries: ActionTimelineEntry[]
  onClose: () => void
}) {
  const [to, setTo] = React.useState(() => {
    const assignee = employeeForCurrentTimelineStep(timelineEntries)
    if (assignee) {
      return assignee.id === ACTIVE_USER.id ? NOTIFY_DELEGATE.email : assignee.email
    }
    return emailForPerson(personForRole(mission.owner).name)
  })
  const [subject, setSubject] = React.useState(() => `Action needed: ${mission.name}`)
  const [body, setBody] = React.useState(() => buildDefaultBody(mission, narrative))
  const [sendPhase, setSendPhase] = React.useState<SendPhase>("idle")

  const handleSend = () => {
    if (sendPhase !== "idle") return
    setSendPhase("sending")
    window.setTimeout(() => {
      setSendPhase("sent")
      window.setTimeout(onClose, 900)
    }, 700)
  }

  const fieldRowClass = "flex items-center gap-3 border-b border-[var(--color-border-default)] px-4 py-2.5"
  const fieldLabelClass = "w-14 shrink-0 text-[12px] font-medium text-[var(--color-text-muted)]"
  const fieldInputClass =
    "min-w-0 flex-1 bg-transparent text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={sendPhase !== "idle"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[12px] font-semibold transition-all",
                sendPhase === "sent"
                  ? "bg-emerald-600 text-white"
                  : "bg-[var(--color-brand-primary)] text-[var(--color-brand-onPrimary)] hover:opacity-90 disabled:opacity-70",
              )}
            >
              {sendPhase === "sending" && <SafeIcon name="Loader" className="h-3.5 w-3.5 animate-spin" />}
              {sendPhase === "sent" && <SafeIcon name="Check" className="h-3.5 w-3.5" />}
              {sendPhase === "idle" && <SafeIcon name="Send" className="h-3.5 w-3.5" />}
              {sendPhase === "sending" ? "Sending…" : sendPhase === "sent" ? "Sent" : "Send"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={sendPhase === "sending"}
              className="rounded-md px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-canvas)] disabled:opacity-50"
            >
              Discard
            </button>
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

        <div className="max-h-[72vh] overflow-y-auto">
          <div className={fieldRowClass}>
            <span className={fieldLabelClass}>From</span>
            <span className="text-[13px] text-[var(--color-text-secondary)]">You &lt;{ACTIVE_USER.email}&gt;</span>
          </div>

          <div className={fieldRowClass}>
            <label htmlFor="email-to" className={fieldLabelClass}>To</label>
            <input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={sendPhase !== "idle"}
              className={fieldInputClass}
            />
          </div>

          <div className={fieldRowClass}>
            <label htmlFor="email-subject" className={fieldLabelClass}>Subject</label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sendPhase !== "idle"}
              className={cn(fieldInputClass, "font-medium")}
            />
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={sendPhase !== "idle"}
            rows={14}
            className="w-full resize-none bg-transparent px-4 py-4 text-[13px] leading-relaxed text-[var(--color-text-primary)] outline-none disabled:opacity-70"
          />
        </div>
      </div>
    </div>
  )
}
