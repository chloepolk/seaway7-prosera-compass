"use client"

import { formatDateTimeDMY } from "@/lib/compass/locale-display"
import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import type { AuditEntry } from "./hub-types"
import { useT } from "../../_i18n/use-t"
import { useStore } from "../../_store"
import { localeTag, type Locale } from "../../_i18n"

function formatTimestamp(iso: string, _locale: Locale): string {
  return formatDateTimeDMY(iso)
}

export function AuditLogModal({
  missionName,
  entries,
  onClose,
}: {
  missionName: string
  entries: AuditEntry[]
  onClose: () => void
}) {
  const t = useT()
  const { locale } = useStore()
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" aria-label={t("modals.close")} className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <SafeIcon name="History" className="h-4 w-4 text-[var(--color-brand-strong)]" />
            <h3 className="text-sm font-semibold">{t("modals.auditLog", { name: missionName })}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted">
            <SafeIcon name="X" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-3 overflow-y-auto p-5">
          {entries.length === 0 ? (
            <p className="text-center text-[13px] text-muted-foreground">{t("modals.noChanges")}</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-lg border bg-muted/20 p-3">
                <p className="text-[11px] font-medium text-muted-foreground">{formatTimestamp(entry.timestamp, locale)}</p>
                <p className="mt-1 text-[12px] font-semibold text-foreground">
                  {entry.field === "completion"
                    ? t("modals.missionConfirmation")
                    : entry.field === "award_governance"
                      ? t("modals.awardGovernance")
                      : t("modals.recommendation")}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground line-through">{entry.oldValue}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-foreground">{entry.newValue}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-muted"
          >
            {t("modals.close")}
          </button>
        </div>
      </div>
    </div>
  )
}
