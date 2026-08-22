/* ------------------------------------------------------------------ */
/*  Award approval governance                                          */
/*                                                                     */
/*  Rule: a proposed award above €200,000 requires recorded approval   */
/*  before the package can move to Approved for Award. Seed amounts    */
/*  stay USD; the check converts with USD_TO_EUR dated 21 August 2026. */
/* ------------------------------------------------------------------ */

import {
  FX_RATE_DATE,
  USD_TO_EUR,
  type DisplayLocale,
  formatEurFigure,
  formatUsdAsEur,
  usdToEur,
} from "./locale-display"

export const AWARD_APPROVAL_THRESHOLD_EUR = 200_000
export const AWARD_APPROVAL_FX_DATE = FX_RATE_DATE
export const STANDARD_WARRANTY_MONTHS = 24
export const STANDARD_FAT_NOTICE_DAYS = 30

export type AwardGovernanceStatus =
  | "procurement_review"
  | "approval_required"
  | "awaiting_approver"
  | "clarification_requested"
  | "approved_for_award"
  | "rejected"
  | "awarded"

export type AwardDecision = "approve" | "reject" | "clarification"

export type AwardActor = {
  name: string
  role: string
}

export type AwardSupportingDocument = {
  label: string
  href?: string | null
}

export type AwardComparisonRow = {
  supplier: string
  totalPriceUsd: number
  rank: number | null
  compositeScore: number | null
  gatingStatus: "Pass" | "Fail"
  priceDeltaUsd: number
}

export type AwardEvalBid = {
  bidId: string
  supplier: string
  pdfPath: string | null
  totalPrice: number
  gatingStatus: "Pass" | "Fail"
  gateFailures: string[]
  compositeScore: number | null
  finalRank: number | null
  highCommercialRisk: boolean
  warrantyMonths: number
  fatNoticeDays: number
  recommendation: string
}

export type AwardApprovalSnapshot = {
  packageId: string
  packageRef: string
  packageTitle: string
  projectName: string
  ittRef: string
  recommendedBidId: string
  recommendedSupplier: string
  proposedAwardUsd: number
  budgetUsd: number
  varianceUsd: number
  rank: number | null
  compositeScore: number | null
  recommendation: string
  otherCompliantBids: AwardComparisonRow[]
  failedGates: string[]
  deviations: string[]
  riskFlags: string[]
  otherFailedBids: { supplier: string; failedGates: string[] }[]
  requiredApproverRole: string
  requiredApproverName: string
  requiredApproverEmail: string
  supportingDocuments: AwardSupportingDocument[]
  sourceReferences: string[]
  requiresDirectorApproval: boolean
}

export type AwardAuditEntry = {
  id: string
  at: string
  actorName: string
  actorRole: string
  action: string
  comments: string
  statusFrom: AwardGovernanceStatus
  statusTo: AwardGovernanceStatus
}

export type AwardApprovalRecord = {
  packageId: string
  status: AwardGovernanceStatus
  snapshot: AwardApprovalSnapshot | null
  requestedAt: string | null
  decidedAt: string | null
  comments: string
  audit: AwardAuditEntry[]
}

export type AwardEmailCopy = {
  subject: string
  body: string
}

export function requiresAwardApproval(proposedAwardUsd: number): boolean {
  return usdToEur(proposedAwardUsd) > AWARD_APPROVAL_THRESHOLD_EUR
}

export function emptyAwardRecord(packageId: string): AwardApprovalRecord {
  return {
    packageId,
    status: "procurement_review",
    snapshot: null,
    requestedAt: null,
    decidedAt: null,
    comments: "",
    audit: [],
  }
}

export function awardGovernanceStatusFor(
  stage: string | null | undefined,
  record: AwardApprovalRecord | undefined,
): AwardGovernanceStatus | null {
  if (stage === "outcome_roi") return "awarded"
  if (record) return record.status
  if (stage === "execute") return "procurement_review"
  return null
}

export function canEnterApprovedForAward(record: AwardApprovalRecord | undefined): boolean {
  if (!record?.snapshot) return false
  if (!record.snapshot.requiresDirectorApproval) return record.status === "approved_for_award"
  return record.status === "approved_for_award"
}

export function canConfirmSupplierAward(record: AwardApprovalRecord | undefined): boolean {
  return record?.status === "approved_for_award"
}

export function awardNotificationHeld(record: AwardApprovalRecord | undefined, stage: string): boolean {
  if (stage === "outcome_roi" || record?.status === "awarded") return false
  return record?.status !== "approved_for_award"
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `awd-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function appendAudit(
  record: AwardApprovalRecord,
  actor: AwardActor,
  action: string,
  comments: string,
  statusTo: AwardGovernanceStatus,
  at: string,
): AwardApprovalRecord {
  return {
    ...record,
    status: statusTo,
    audit: [
      ...record.audit,
      {
        id: newId(),
        at,
        actorName: actor.name,
        actorRole: actor.role,
        action,
        comments,
        statusFrom: record.status,
        statusTo,
      },
    ],
  }
}

export function buildAwardSnapshot(args: {
  packageId: string
  packageRef: string
  packageTitle: string
  projectName: string
  ittRef: string
  budgetUsd: number
  evidence: string[]
  selected: AwardEvalBid
  allResults: AwardEvalBid[]
  gateLabel: (id: string) => string
  approver: { name: string; role: string; email: string }
}): AwardApprovalSnapshot {
  const { selected, allResults, gateLabel, budgetUsd } = args
  const failedGates = selected.gateFailures.map(gateLabel)
  const deviations: string[] = []
  if (selected.warrantyMonths !== STANDARD_WARRANTY_MONTHS) {
    deviations.push(
      `Warranty offered ${selected.warrantyMonths} months vs the ${STANDARD_WARRANTY_MONTHS}-month standard.`,
    )
  }
  if (selected.fatNoticeDays !== STANDARD_FAT_NOTICE_DAYS) {
    deviations.push(
      `FAT notice offered ${selected.fatNoticeDays} days vs the ${STANDARD_FAT_NOTICE_DAYS}-day standard.`,
    )
  }

  const riskFlags: string[] = []
  if (selected.highCommercialRisk) {
    riskFlags.push(
      `Warranty offered ${selected.warrantyMonths} months vs the ${STANDARD_WARRANTY_MONTHS}-month standard (cut exceeds 25%).`,
    )
  }
  if (selected.gatingStatus === "Fail") {
    riskFlags.push(
      failedGates.length > 0
        ? `Recommended return failed hard gates: ${failedGates.join("; ")}.`
        : "Recommended return failed one or more hard gates.",
    )
  }

  const otherCompliantBids: AwardComparisonRow[] = allResults
    .filter((r) => r.bidId !== selected.bidId && r.gatingStatus === "Pass")
    .map((r) => ({
      supplier: r.supplier,
      totalPriceUsd: r.totalPrice,
      rank: r.finalRank,
      compositeScore: r.compositeScore,
      gatingStatus: r.gatingStatus,
      priceDeltaUsd: r.totalPrice - selected.totalPrice,
    }))
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

  const otherFailedBids = allResults
    .filter((r) => r.bidId !== selected.bidId && r.gatingStatus === "Fail")
    .map((r) => ({
      supplier: r.supplier,
      failedGates: r.gateFailures.map(gateLabel),
    }))

  const supportingDocuments: AwardSupportingDocument[] = []
  if (selected.pdfPath) {
    supportingDocuments.push({
      label: `${selected.supplier} response PDF`,
      href: selected.pdfPath,
    })
  }

  return {
    packageId: args.packageId,
    packageRef: args.packageRef,
    packageTitle: args.packageTitle,
    projectName: args.projectName,
    ittRef: args.ittRef,
    recommendedBidId: selected.bidId,
    recommendedSupplier: selected.supplier,
    proposedAwardUsd: selected.totalPrice,
    budgetUsd,
    varianceUsd: selected.totalPrice - budgetUsd,
    rank: selected.finalRank,
    compositeScore: selected.compositeScore,
    recommendation: selected.recommendation,
    otherCompliantBids,
    failedGates,
    deviations,
    riskFlags,
    otherFailedBids,
    requiredApproverRole: args.approver.role,
    requiredApproverName: args.approver.name,
    requiredApproverEmail: args.approver.email,
    supportingDocuments,
    sourceReferences: args.evidence,
    requiresDirectorApproval: requiresAwardApproval(selected.totalPrice),
  }
}

export function selectRecommendedSupplier(
  prev: AwardApprovalRecord | undefined,
  snapshot: AwardApprovalSnapshot,
  actor: AwardActor,
  at = new Date().toISOString(),
): AwardApprovalRecord {
  const base = prev ?? emptyAwardRecord(snapshot.packageId)
  if (base.status === "awarded") return base

  const nextStatus: AwardGovernanceStatus = snapshot.requiresDirectorApproval
    ? "approval_required"
    : "approved_for_award"
  const comments = snapshot.requiresDirectorApproval
    ? `Proposed award ${formatUsdAsEur(snapshot.proposedAwardUsd)} exceeds the ${formatEurFigure(AWARD_APPROVAL_THRESHOLD_EUR)} threshold.`
    : `Proposed award ${formatUsdAsEur(snapshot.proposedAwardUsd)} is at or below the ${formatEurFigure(AWARD_APPROVAL_THRESHOLD_EUR)} threshold, so the award remains within procurement authority.`

  const withSnapshot: AwardApprovalRecord = {
    ...base,
    snapshot,
    requestedAt: snapshot.requiresDirectorApproval ? base.requestedAt : at,
    decidedAt: snapshot.requiresDirectorApproval ? null : at,
    comments,
  }
  return appendAudit(
    withSnapshot,
    actor,
    snapshot.requiresDirectorApproval ? "Recommended supplier selected" : "Recommended supplier selected — within procurement authority",
    comments,
    nextStatus,
    at,
  )
}

export function submitAwardApprovalRequest(
  prev: AwardApprovalRecord,
  actor: AwardActor,
  at = new Date().toISOString(),
): AwardApprovalRecord {
  if (!prev.snapshot?.requiresDirectorApproval) return prev
  if (prev.status !== "approval_required" && prev.status !== "clarification_requested") return prev
  return {
    ...appendAudit(
      prev,
      actor,
      "Approval request assigned",
      `Request assigned to ${prev.snapshot.requiredApproverName}, ${prev.snapshot.requiredApproverRole}.`,
      "awaiting_approver",
      at,
    ),
    requestedAt: at,
  }
}

export function recordAwardDecision(
  prev: AwardApprovalRecord,
  decision: AwardDecision,
  comments: string,
  actor: AwardActor,
  at = new Date().toISOString(),
): AwardApprovalRecord {
  if (prev.status !== "awaiting_approver" && prev.status !== "clarification_requested") return prev
  const statusTo: AwardGovernanceStatus =
    decision === "approve" ? "approved_for_award" : decision === "reject" ? "rejected" : "clarification_requested"
  const action =
    decision === "approve"
      ? "Award recommendation approved"
      : decision === "reject"
        ? "Award recommendation rejected"
        : "Clarification requested"
  return {
    ...appendAudit(prev, actor, action, comments.trim(), statusTo, at),
    decidedAt: decision === "clarification" ? null : at,
    comments: comments.trim(),
  }
}

export function confirmSupplierAward(
  prev: AwardApprovalRecord,
  actor: AwardActor,
  at = new Date().toISOString(),
): AwardApprovalRecord {
  if (prev.status !== "approved_for_award") return prev
  const supplier = prev.snapshot?.recommendedSupplier ?? "the recommended supplier"
  return {
    ...appendAudit(
      prev,
      actor,
      "Supplier award completed",
      `Award recorded for ${supplier}.`,
      "awarded",
      at,
    ),
    decidedAt: prev.decidedAt ?? at,
  }
}

export type AwardGovTone = "neutral" | "warning" | "positive" | "critical"

export function awardGovTone(status: AwardGovernanceStatus): AwardGovTone {
  switch (status) {
    case "approved_for_award":
    case "awarded":
      return "positive"
    case "rejected":
      return "critical"
    case "approval_required":
    case "awaiting_approver":
    case "clarification_requested":
      return "warning"
    default:
      return "neutral"
  }
}

export const AWARD_GOV_COPY = {
  en: {
    status: {
      procurement_review: "Procurement review",
      approval_required: "Approval required",
      awaiting_approver: "Awaiting approver",
      clarification_requested: "Clarification requested",
      approved_for_award: "Approval for award",
      rejected: "Rejected",
      awarded: "Awarded",
    } satisfies Record<AwardGovernanceStatus, string>,
    definition: {
      procurement_review: "Evaluation is still being completed.",
      approval_required: "Award exceeds €200k.",
      awaiting_approver: "Request has been assigned.",
      clarification_requested: "Approver requires additional information.",
      approved_for_award: "Required authority has approved.",
      rejected: "Recommendation cannot proceed.",
      awarded: "Supplier award has been completed.",
    } satisfies Record<AwardGovernanceStatus, string>,
    requestApproval: "Request approval",
    reviewApproval: "Review approval",
    respondClarification: "Respond to clarification",
    confirmAward: "Confirm award",
    evaluateBids: "Evaluate bids",
    recommendForAward: "Recommend for award",
    recommended: "Recommended",
    withinAuthority:
      "Proposed award is €200,000 or less, so it remains within procurement authority.",
    exceedsThreshold: "Proposed award is above €200,000, so Compass has opened an approval request on this action.",
    gateBlocked:
      "This bid package cannot move to Approved for Award until the required approval is recorded.",
    selectSupplierFirst: "Select a recommended supplier in Bid Evaluation before requesting approval.",
    openBidEvaluation: "Open Bid Evaluation",
    title: "Award approval",
    emailTitle: "Award approval request",
    projectBidRef: "Project and bid reference",
    recommendedSupplier: "Recommended supplier",
    proposedAwardValue: "Proposed award value",
    budgetVariance: "Budget and variance",
    rankingScore: "Evaluation ranking and composite score",
    procurementRecommendation: "Procurement recommendation",
    otherBids: "Other compliant bids and price differences",
    gatesRisks: "Failed gates, deviations and risk flags",
    requiredApprover: "Required approver",
    supportingDocs: "Supporting documents and source references",
    approve: "Approve",
    reject: "Reject",
    requestClarification: "Request clarification",
    comments: "Comments",
    commentsHint: "Recorded with the decision, supporting comparison and timestamp.",
    sendRequest: "Send approval request",
    sending: "Sending…",
    sent: "Sent",
    from: "From",
    to: "To",
    subject: "Subject",
    noOtherCompliant: "No other gate-passing bids on this ITT.",
    noFailedGates: "Recommended supplier: no failed hard gates.",
    noDeviations: "No recorded deviations against the 24-month warranty or 30-day FAT notice standards.",
    noRiskFlags: "No warranty-cut or gate-fail flags on the recommended return.",
    none: "None recorded.",
    auditField: "Award governance",
    ruleNote:
      "Awards of €200,000 or less remain within procurement authority. Awards above €200,000 generate an approval request inside this procurement action.",
    notifyHeld: "Award notification is held until the required approval is recorded.",
  },
  fr: {
    status: {
      procurement_review: "Revue achats",
      approval_required: "Approbation requise",
      awaiting_approver: "En attente de l’approbateur",
      clarification_requested: "Clarification demandée",
      approved_for_award: "Approbation d’attribution",
      rejected: "Rejeté",
      awarded: "Attribué",
    } satisfies Record<AwardGovernanceStatus, string>,
    definition: {
      procurement_review: "L’évaluation est encore en cours.",
      approval_required: "L’attribution dépasse 200 k€.",
      awaiting_approver: "La demande a été assignée.",
      clarification_requested: "L’approbateur a besoin d’informations supplémentaires.",
      approved_for_award: "L’autorité requise a approuvé.",
      rejected: "La recommandation ne peut pas aboutir.",
      awarded: "L’attribution fournisseur est close.",
    } satisfies Record<AwardGovernanceStatus, string>,
    requestApproval: "Demander l’approbation",
    reviewApproval: "Examiner l’approbation",
    respondClarification: "Répondre à la clarification",
    confirmAward: "Confirmer l’attribution",
    evaluateBids: "Évaluer les offres",
    recommendForAward: "Recommander pour attribution",
    recommended: "Recommandé",
    withinAuthority:
      "La proposition d’attribution est de 200 000 € ou moins, elle reste donc dans l’autorité des achats.",
    exceedsThreshold:
      "La proposition d’attribution dépasse 200 000 € : Compass a ouvert une demande d’approbation sur cette action.",
    gateBlocked:
      "Ce dossier ne peut pas passer à « Approuvé pour attribution » tant que l’approbation requise n’est pas enregistrée.",
    selectSupplierFirst:
      "Sélectionnez un fournisseur recommandé dans l’évaluation des offres avant de demander l’approbation.",
    openBidEvaluation: "Ouvrir l’évaluation des offres",
    title: "Approbation d’attribution",
    emailTitle: "Demande d’approbation d’attribution",
    projectBidRef: "Projet et référence d’offre",
    recommendedSupplier: "Fournisseur recommandé",
    proposedAwardValue: "Valeur d’attribution proposée",
    budgetVariance: "Budget et écart",
    rankingScore: "Classement et score composite",
    procurementRecommendation: "Recommandation achats",
    otherBids: "Autres offres conformes et écarts de prix",
    gatesRisks: "Portes en échec, écarts et alertes",
    requiredApprover: "Approbateur requis",
    supportingDocs: "Pièces jointes et références sources",
    approve: "Approuver",
    reject: "Rejeter",
    requestClarification: "Demander une clarification",
    comments: "Commentaires",
    commentsHint: "Enregistrés avec la décision, la comparaison et l’horodatage.",
    sendRequest: "Envoyer la demande d’approbation",
    sending: "Envoi…",
    sent: "Envoyé",
    from: "De",
    to: "À",
    subject: "Objet",
    noOtherCompliant: "Aucune autre offre ayant franchi les portes sur cet AO.",
    noFailedGates: "Fournisseur recommandé : aucune porte dure en échec.",
    noDeviations:
      "Aucun écart enregistré par rapport à la garantie de 24 mois ou au préavis FAT de 30 jours.",
    noRiskFlags: "Aucune alerte de réduction de garantie ni d’échec de porte sur la réponse recommandée.",
    none: "Aucun élément enregistré.",
    auditField: "Gouvernance d’attribution",
    ruleNote:
      "Les attributions de 200 000 € ou moins restent dans l’autorité des achats. Au-dessus de 200 000 €, une demande d’approbation est créée dans cette action d’achat.",
    notifyHeld:
      "La notification d’attribution est retenue jusqu’à l’enregistrement de l’approbation requise.",
  },
} as const

export function awardGovCopy(locale: DisplayLocale = "en") {
  return AWARD_GOV_COPY[locale]
}

function signedDelta(usd: number, locale: DisplayLocale): string {
  const abs = formatUsdAsEur(Math.abs(usd), locale)
  if (usd > 0) return locale === "fr" ? `${abs} au-dessus de l’offre recommandée` : `${abs} above the recommended bid`
  if (usd < 0) return locale === "fr" ? `${abs} en dessous de l’offre recommandée` : `${abs} below the recommended bid`
  return locale === "fr" ? "même prix que l’offre recommandée" : "same price as the recommended bid"
}

export function buildAwardApprovalEmail(
  snapshot: AwardApprovalSnapshot,
  locale: DisplayLocale = "en",
): AwardEmailCopy {
  const awardEur = formatUsdAsEur(snapshot.proposedAwardUsd, locale)
  const budgetEur = formatUsdAsEur(snapshot.budgetUsd, locale)
  const varianceAbs = formatUsdAsEur(Math.abs(snapshot.varianceUsd), locale)
  const threshold = formatEurFigure(AWARD_APPROVAL_THRESHOLD_EUR, locale)
  const overBy = formatEurFigure(Math.max(0, usdToEur(snapshot.proposedAwardUsd) - AWARD_APPROVAL_THRESHOLD_EUR), locale)
  const rank =
    snapshot.rank != null
      ? locale === "fr"
        ? `Rang n°${snapshot.rank}`
        : `Rank #${snapshot.rank}`
      : locale === "fr"
        ? "Sans rang (porte en échec)"
        : "Unranked (hard-gate fail)"
  const score =
    snapshot.compositeScore != null
      ? locale === "fr"
        ? `score composite ${snapshot.compositeScore.toFixed(1)} sur 100`
        : `composite score ${snapshot.compositeScore.toFixed(1)} of 100`
      : locale === "fr"
        ? "score composite non calculé"
        : "composite score not calculated"

  const varianceSentence =
    snapshot.varianceUsd < 0
      ? locale === "fr"
        ? `Le budget du lot est de ${budgetEur}. L’attribution proposée est inférieure au budget de ${varianceAbs}.`
        : `Package budget is ${budgetEur}. Proposed award is ${varianceAbs} under budget.`
      : snapshot.varianceUsd > 0
        ? locale === "fr"
          ? `Le budget du lot est de ${budgetEur}. L’attribution proposée dépasse le budget de ${varianceAbs}.`
          : `Package budget is ${budgetEur}. Proposed award is ${varianceAbs} over budget.`
        : locale === "fr"
          ? `Le budget du lot est de ${budgetEur}. L’attribution proposée est égale au budget.`
          : `Package budget is ${budgetEur}. Proposed award equals the budget.`

  const awardSentence = snapshot.requiresDirectorApproval
    ? locale === "fr"
      ? `L’attribution proposée est de ${awardEur} (montant source ${snapshot.proposedAwardUsd.toLocaleString("fr-FR")} USD × ${USD_TO_EUR}, ${FX_RATE_DATE}). Elle dépasse le seuil d’approbation de ${threshold} de ${overBy}.`
      : `Proposed award value is ${awardEur} (USD seed ${snapshot.proposedAwardUsd.toLocaleString("en-GB")} × ${USD_TO_EUR}, ${FX_RATE_DATE}). This exceeds the ${threshold} approval threshold by ${overBy}.`
    : locale === "fr"
      ? `L’attribution proposée est de ${awardEur} (montant source ${snapshot.proposedAwardUsd.toLocaleString("fr-FR")} USD × ${USD_TO_EUR}, ${FX_RATE_DATE}). Elle est inférieure ou égale au seuil de ${threshold} et reste dans l’autorité des achats.`
      : `Proposed award value is ${awardEur} (USD seed ${snapshot.proposedAwardUsd.toLocaleString("en-GB")} × ${USD_TO_EUR}, ${FX_RATE_DATE}). This is at or below the ${threshold} threshold and remains within procurement authority.`

  const otherBids =
    snapshot.otherCompliantBids.length === 0
      ? locale === "fr"
        ? "Aucune autre offre conforme."
        : "No other compliant bids."
      : snapshot.otherCompliantBids
          .map((row) => {
            const r = row.rank != null ? (locale === "fr" ? `rang n°${row.rank}` : `Rank #${row.rank}`) : "—"
            const c =
              row.compositeScore != null
                ? locale === "fr"
                  ? `composite ${row.compositeScore.toFixed(1)}`
                  : `composite ${row.compositeScore.toFixed(1)}`
                : "—"
            return locale === "fr"
              ? `${row.supplier} — ${r}, ${c}, offre ${formatUsdAsEur(row.totalPriceUsd, locale)}, ${signedDelta(row.priceDeltaUsd, locale)}.`
              : `${row.supplier} — ${r}, ${c}, bid ${formatUsdAsEur(row.totalPriceUsd, locale)}, ${signedDelta(row.priceDeltaUsd, locale)}.`
          })
          .join("\n")

  const gates: string[] = []
  if (snapshot.failedGates.length === 0) {
    gates.push(locale === "fr" ? "Fournisseur recommandé : aucune porte dure en échec." : "Recommended supplier: no failed hard gates.")
  } else {
    gates.push(
      locale === "fr"
        ? `Fournisseur recommandé — portes en échec : ${snapshot.failedGates.join("; ")}.`
        : `Recommended supplier — failed gates: ${snapshot.failedGates.join("; ")}.`,
    )
  }
  gates.push(...snapshot.deviations)
  gates.push(...snapshot.riskFlags)
  for (const failed of snapshot.otherFailedBids) {
    gates.push(
      locale === "fr"
        ? `${failed.supplier} a échoué aux portes : ${failed.failedGates.join("; ") || "non précisé"}.`
        : `${failed.supplier} failed gates: ${failed.failedGates.join("; ") || "not specified"}.`,
    )
  }

  const docs = [
    ...snapshot.supportingDocuments.map((d) => d.label),
    ...snapshot.sourceReferences,
  ]
  const docsBlock = docs.length > 0 ? docs.map((d) => `• ${d}`).join("\n") : locale === "fr" ? "Aucune pièce jointe enregistrée." : "No supporting documents on file."

  const subject =
    locale === "fr"
      ? `Approbation d’attribution requise — ${snapshot.packageRef} / ${snapshot.ittRef}`
      : `Award approval required — ${snapshot.packageRef} / ${snapshot.ittRef}`

  const body =
    locale === "fr"
      ? `Projet et référence d’offre
${snapshot.projectName} · ${snapshot.packageRef} · ${snapshot.ittRef} — ${snapshot.packageTitle}

Fournisseur recommandé
${snapshot.recommendedSupplier}

Valeur d’attribution proposée
${awardSentence}

Budget et écart
${varianceSentence}

Classement et score composite
${rank} · ${score}.

Recommandation achats
${snapshot.recommendation}

Autres offres conformes et écarts de prix
${otherBids}

Portes en échec, écarts et alertes
${gates.join("\n")}

Approbateur requis
${snapshot.requiredApproverName}, ${snapshot.requiredApproverRole} (${snapshot.requiredApproverEmail})

Pièces jointes et références sources
${docsBlock}

Actions : Approuver · Rejeter · Demander une clarification`
      : `Project and bid reference
${snapshot.projectName} · ${snapshot.packageRef} · ${snapshot.ittRef} — ${snapshot.packageTitle}

Recommended supplier
${snapshot.recommendedSupplier}

Proposed award value
${awardSentence}

Budget and variance
${varianceSentence}

Evaluation ranking and composite score
${rank} · ${score}.

Procurement recommendation
${snapshot.recommendation}

Other compliant bids and price differences
${otherBids}

Failed gates, deviations and risk flags
${gates.join("\n")}

Required approver
${snapshot.requiredApproverName}, ${snapshot.requiredApproverRole} (${snapshot.requiredApproverEmail})

Supporting documents and source references
${docsBlock}

Actions: Approve · Reject · Request clarification`

  return { subject, body }
}

export function awardSnapshotLines(snapshot: AwardApprovalSnapshot, locale: DisplayLocale = "en") {
  const email = buildAwardApprovalEmail(snapshot, locale)
  return email
}

export function formatAwardAuditLine(entry: AwardAuditEntry, locale: DisplayLocale = "en"): string {
  const copy = awardGovCopy(locale)
  const from = copy.status[entry.statusFrom]
  const to = copy.status[entry.statusTo]
  const when = new Date(entry.at).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  const comments = entry.comments ? ` ${entry.comments}` : ""
  return `${when} — ${entry.actorName} (${entry.actorRole}): ${entry.action}. ${from} → ${to}.${comments}`
}
