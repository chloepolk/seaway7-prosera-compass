/* ------------------------------------------------------------------ */
/*  Award Action Centre notes — intake, confirmation, before/after     */
/* ------------------------------------------------------------------ */

import {
  USD_TO_EUR,
  formatEurFigure,
  formatUsdAsEur,
  type DisplayLocale,
  usdToEur,
} from "./locale-display"

export type AwardNoteKind = "instruction" | "response" | "confirmation" | "approver_comment"

export type AwardTeamNote = {
  id: string
  at: string
  actorName: string
  actorRole: string
  kind: AwardNoteKind
  body: string
  confirmedAt: string | null
  confirmedByName: string | null
}

export type AwardNoteImpact = {
  sourceText: string
  discountPct: number | null
  deltaUsd: number
  originalAwardUsd: number
  revisedAwardUsd: number
  originalVarianceUsd: number
  revisedVarianceUsd: number
  summary: string
  foundNumericChange: boolean
}

export type AwardSnapshotLike = {
  proposedAwardUsd: number
  budgetUsd: number
  varianceUsd: number
}

const INCREASE_RE =
  /\b(increase|increased|uplift|raise|raised|augmenter|augmenté|hausse)\b/i
const DECREASE_RE =
  /\b(discount|reduction|reduce|reduced|cut|off|negotiate|negotiated|lower|drop|remise|rabais|baisse|réduction|réduit|négocie|négocié)\b/i

function parseLocaleNumber(raw: string): number | null {
  const compact = raw.replace(/\s/g, "").replace(/,/g, ".")
  const n = Number(compact)
  return Number.isFinite(n) ? n : null
}

function lastPctMatch(text: string): { pct: number; index: number } | null {
  const re = /(\d+(?:[.,]\d+)?)\s*%/g
  let last: { pct: number; index: number } | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const pct = parseLocaleNumber(m[1])
    if (pct != null && pct > 0 && pct < 100) last = { pct, index: m.index }
  }
  return last
}

function lastMoneyMatch(text: string): { eur: number; index: number } | null {
  const re = /(?:€\s*([\d\s.,]+)|([\d\s.,]+)\s*€)/g
  let last: { eur: number; index: number } | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const raw = m[1] ?? m[2]
    if (!raw) continue
    const n = parseLocaleNumber(raw)
    if (n != null && n > 0) last = { eur: n, index: m.index }
  }
  return last
}

function windowPolarity(text: string, index: number): 1 | -1 {
  const start = Math.max(0, index - 48)
  const end = Math.min(text.length, index + 48)
  const window = text.slice(start, end)
  if (INCREASE_RE.test(window) && !DECREASE_RE.test(window)) return 1
  return -1
}

export function formatNoteImpactSummary(impact: AwardNoteImpact, locale: DisplayLocale = "en"): string {
  if (!impact.foundNumericChange) {
    return locale === "fr"
      ? "Aucun changement chiffré trouvé dans ces notes."
      : "No numeric change found in these notes."
  }
  const from = formatUsdAsEur(impact.originalAwardUsd, locale)
  const to = formatUsdAsEur(impact.revisedAwardUsd, locale)
  const abs = formatUsdAsEur(Math.abs(impact.deltaUsd), locale)
  const varFrom = formatUsdAsEur(Math.abs(impact.originalVarianceUsd), locale)
  const varTo = formatUsdAsEur(Math.abs(impact.revisedVarianceUsd), locale)
  const varDir = (v: number, loc: DisplayLocale) => {
    if (v < 0) return loc === "fr" ? `${formatUsdAsEur(Math.abs(v), loc)} en dessous du budget` : `${formatUsdAsEur(Math.abs(v), loc)} under budget`
    if (v > 0) return loc === "fr" ? `${formatUsdAsEur(Math.abs(v), loc)} au-dessus du budget` : `${formatUsdAsEur(Math.abs(v), loc)} over budget`
    return loc === "fr" ? "égal au budget" : "equals budget"
  }
  const pctBit =
    impact.discountPct != null
      ? locale === "fr"
        ? ` de ${formatFixedPct(impact.discountPct, locale)}`
        : ` by ${formatFixedPct(impact.discountPct, locale)}`
      : ""
  const priceSentence =
    impact.deltaUsd < 0
      ? locale === "fr"
        ? `L’attribution proposée baisse${pctBit} : ${from} → ${to} (−${abs}).`
        : `Proposed award falls${pctBit}: ${from} → ${to} (−${abs}).`
      : impact.deltaUsd > 0
        ? locale === "fr"
          ? `L’attribution proposée augmente${pctBit} : ${from} → ${to} (+${abs}).`
          : `Proposed award rises${pctBit}: ${from} → ${to} (+${abs}).`
        : locale === "fr"
          ? `L’attribution proposée reste ${from}.`
          : `Proposed award stays ${from}.`
  const varianceSentence =
    locale === "fr"
      ? `L’écart budgétaire passe de ${varDir(impact.originalVarianceUsd, locale)} à ${varDir(impact.revisedVarianceUsd, locale)} (${varFrom} → ${varTo}).`
      : `Budget variance moves from ${varDir(impact.originalVarianceUsd, locale)} to ${varDir(impact.revisedVarianceUsd, locale)} (${varFrom} → ${varTo}).`
  return `${priceSentence} ${varianceSentence}`
}

function formatFixedPct(n: number, locale: DisplayLocale): string {
  const digits = Number.isInteger(n) ? 0 : 1
  const tag = locale === "fr" ? "fr-FR" : "en-GB"
  const body = n.toLocaleString(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return locale === "fr" ? `${body} %` : `${body}%`
}

export function computeAwardNoteImpact(
  snapshot: AwardSnapshotLike,
  notes: string | string[],
  locale: DisplayLocale = "en",
): AwardNoteImpact {
  const sourceText = Array.isArray(notes) ? notes.filter(Boolean).join("\n") : notes
  const originalAwardUsd = snapshot.proposedAwardUsd
  const originalVarianceUsd = snapshot.varianceUsd
  const empty: AwardNoteImpact = {
    sourceText,
    discountPct: null,
    deltaUsd: 0,
    originalAwardUsd,
    revisedAwardUsd: originalAwardUsd,
    originalVarianceUsd,
    revisedVarianceUsd: originalVarianceUsd,
    summary: "",
    foundNumericChange: false,
  }

  const pct = lastPctMatch(sourceText)
  const money = lastMoneyMatch(sourceText)
  let revisedAwardUsd = originalAwardUsd
  let discountPct: number | null = null

  if (pct && (!money || pct.index >= money.index)) {
    discountPct = pct.pct
    const sign = windowPolarity(sourceText, pct.index)
    revisedAwardUsd = originalAwardUsd * (1 + sign * (pct.pct / 100))
  } else if (money) {
    const deltaUsd = (money.eur / USD_TO_EUR) * windowPolarity(sourceText, money.index)
    revisedAwardUsd = originalAwardUsd + deltaUsd
  }

  if (!Number.isFinite(revisedAwardUsd) || revisedAwardUsd <= 0) {
    empty.summary = formatNoteImpactSummary(empty, locale)
    return empty
  }

  const deltaUsd = revisedAwardUsd - originalAwardUsd
  const foundNumericChange = Math.abs(deltaUsd) >= 0.5
  const revisedVarianceUsd = revisedAwardUsd - snapshot.budgetUsd
  const impact: AwardNoteImpact = {
    sourceText,
    discountPct,
    deltaUsd,
    originalAwardUsd,
    revisedAwardUsd,
    originalVarianceUsd,
    revisedVarianceUsd,
    summary: "",
    foundNumericChange,
  }
  impact.summary = formatNoteImpactSummary(impact, locale)
  return impact
}

export function mergeNoteImpactFromAgent(
  base: AwardNoteImpact,
  agent: {
    discountPct?: number | null
    deltaUsd?: number | null
    revisedAwardUsd?: number | null
    summary?: string | null
  },
  locale: DisplayLocale,
): AwardNoteImpact {
  const originalAwardUsd = base.originalAwardUsd
  let revisedAwardUsd = base.revisedAwardUsd
  let discountPct = base.discountPct

  if (typeof agent.revisedAwardUsd === "number" && agent.revisedAwardUsd > 0) {
    revisedAwardUsd = agent.revisedAwardUsd
  } else if (typeof agent.discountPct === "number" && agent.discountPct > 0 && agent.discountPct < 100) {
    discountPct = agent.discountPct
    const sign = agent.deltaUsd != null && agent.deltaUsd > 0 ? 1 : -1
    revisedAwardUsd = originalAwardUsd * (1 + sign * (agent.discountPct / 100))
  } else if (typeof agent.deltaUsd === "number" && Number.isFinite(agent.deltaUsd)) {
    revisedAwardUsd = originalAwardUsd + agent.deltaUsd
  }

  if (!Number.isFinite(revisedAwardUsd) || revisedAwardUsd <= 0) return base

  const deltaUsd = revisedAwardUsd - originalAwardUsd
  const next: AwardNoteImpact = {
    ...base,
    discountPct: discountPct ?? base.discountPct,
    deltaUsd,
    revisedAwardUsd,
    revisedVarianceUsd: revisedAwardUsd - (originalAwardUsd - base.originalVarianceUsd),
    foundNumericChange: Math.abs(deltaUsd) >= 0.5,
    summary: "",
  }
  next.summary = agent.summary?.trim() || formatNoteImpactSummary(next, locale)
  return next
}

export function unconfirmedTeamNotes(
  notes: AwardTeamNote[] | undefined,
  viewerName: string,
): AwardTeamNote[] {
  return (notes ?? []).filter(
    (n) =>
      !n.confirmedAt &&
      n.kind !== "confirmation" &&
      n.kind !== "approver_comment" &&
      n.actorName !== viewerName &&
      n.body.trim().length > 0,
  )
}

export function hasCompletedAwardRoundTrip(auditActions: string[] | undefined): boolean {
  return (auditActions ?? []).some((action) => action === "Approval resubmitted")
}

/** Euro figure used when validating agent arithmetic against the USD seed. */
export function eurOfUsd(usd: number): number {
  return usdToEur(usd)
}

export function formatEurOfUsd(usd: number, locale: DisplayLocale): string {
  return formatEurFigure(usdToEur(usd), locale)
}
