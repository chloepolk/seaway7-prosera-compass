/* ------------------------------------------------------------------ */
/*  Agent context builders — Seaway7 Meridian OWF procurement          */
/*                                                                     */
/*  Serializes the tender register, controlled document repository,    */
/*  standards matrix and charter particulars into the payloads each    */
/*  agent receives. Signatures are kept stable for the store.          */
/* ------------------------------------------------------------------ */

import type { ComputedData } from "../data/_transform"
import type { DrillState, OrchestratorOutput, SpecialistOutput } from "./_types"
import { TENDER_PACKAGES, CLOSED_PACKAGES, PROJECT, TODAY } from "../data/seaway7/_tenders"
import {
  COMPONENT_SPECS,
  DOCUMENTS,
  STANDARDS_MATRIX,
  BASELINE_STANDARDS,
  FAT_TRACEABILITY_CLAUSES,
  PROCUREMENT_CLAUSES,
  CHARTER,
  CATEGORY_LABELS,
} from "../data/seaway7/_documents"

/* ------------------------------------------------------------------ */
/*  Shared serializers                                                 */
/* ------------------------------------------------------------------ */

function serializePipeline() {
  return TENDER_PACKAGES.map(p => ({
    package: p.id,
    ref: p.packageRef,
    title: p.title,
    quantity: p.quantity,
    stage: p.stage,
    budgetUsd: p.budget,
    savingsTargetUsd: p.targetSavings,
    realisedSavingsUsd: p.realisedSavings ?? null,
    tenderCostUsd: p.tenderCost,
    owner: p.ownerRole,
    bidders: p.bidders,
    submissionDeadline: p.submissionDeadline,
    openedAt: p.openedAt,
    involvesVessel: p.involvesVessel,
    risk: p.risk,
  }))
}

function serializeDocumentRegister() {
  return DOCUMENTS.map(d => ({
    docRef: d.docRef,
    title: d.title,
    category: CATEGORY_LABELS[d.category],
    revision: d.revision,
    effectiveDate: d.effectiveDate,
    summary: d.summary,
  }))
}

function serializeStandards() {
  return {
    offshoreMatrix: STANDARDS_MATRIX,
    baselineCertifications: BASELINE_STANDARDS,
    fatAndTraceability: FAT_TRACEABILITY_CLAUSES,
  }
}

function serializeCharter() {
  return {
    codeName: CHARTER.codeName,
    vessel: CHARTER.vessel,
    vesselType: CHARTER.vesselType,
    charterPeriod: CHARTER.charterPeriod,
    hireRateUsdPerDay: CHARTER.hireRate,
    mobilisationFeeUsd: CHARTER.mobilisationFee,
    law: CHARTER.law,
  }
}

function ledgerSummary() {
  const realised = CLOSED_PACKAGES.reduce((s, c) => s + c.realisedSavings, 0)
  const invested = CLOSED_PACKAGES.reduce((s, c) => s + c.cost, 0)
  return {
    closedPackages: CLOSED_PACKAGES.length,
    realisedSavingsUsd: realised,
    tenderCostsUsd: invested,
    blendedReturn: invested > 0 ? Math.round((realised / invested) * 10) / 10 : 0,
    entries: CLOSED_PACKAGES,
  }
}

/* ------------------------------------------------------------------ */
/*  Specialist contexts                                                */
/* ------------------------------------------------------------------ */

/** Procurement portfolio specialist: the pipeline itself — stages, deadlines, owners. */
export function buildPortfolioContext(_data: ComputedData, drill: DrillState): Record<string, unknown> {
  return {
    programme: PROJECT,
    asOf: TODAY,
    view: drill.page,
    tenderPipeline: serializePipeline(),
    savingsLedger: ledgerSummary(),
    processRules: {
      tenderWindowDays: 21,
      clarificationCutoffDays: 7,
      submissionChannel: "Seaway7 SCM Portal — late submissions are not evaluated",
      approvalAuthority: "SCM Director approval required before ITT issue; deviations from standard terms need written SCM Director agreement (S7-SCM-TC-2026 §2.2)",
    },
  }
}

/** Commercial specialist: budgets, savings economics, terms exposure. */
export function buildPricingContext(_data: ComputedData, drill: DrillState): Record<string, unknown> {
  return {
    programme: PROJECT.name,
    asOf: TODAY,
    view: drill.page,
    packages: TENDER_PACKAGES.map(p => ({
      package: p.id,
      title: p.title,
      budgetUsd: p.budget,
      savingsTargetUsd: p.targetSavings,
      savingsTargetPct: Math.round((p.targetSavings / p.budget) * 1000) / 10,
      bidders: p.bidders,
      valueType: p.valueType,
      stage: p.stage,
    })),
    commercialTerms: PROCUREMENT_CLAUSES.filter(c => ["4.1", "6.2", "7.1", "7.2"].includes(c.ref)),
    charterEconomics: {
      ...serializeCharter(),
      spotMarketAssessmentUsdPerDay: { low: 96_000, high: 99_500, window: "Q3 2026" },
    },
    savingsLedger: ledgerSummary(),
  }
}

/** Supply market specialist: documents, standards and supplier-facing obligations. */
export function buildMarketContext(_data: ComputedData, drill: DrillState): Record<string, unknown> {
  return {
    programme: PROJECT.name,
    asOf: TODAY,
    view: drill.page,
    documentRegister: serializeDocumentRegister(),
    standards: serializeStandards(),
    componentClasses: COMPONENT_SPECS.map(s => ({
      component: s.name,
      docRef: s.docRef,
      applicableStandards: s.applicableStandards,
      involvesVessel: s.involvesVessel,
    })),
    charter: serializeCharter(),
    supplierConstraints: [
      "Only two forging houses hold DNV/Lloyd's EN 10204 Type 3.2 approval at 3,000 t SWL (PKG-2103).",
      "European fabrication yard slots for transition pieces are contested through Q1 2027 (PKG-2102).",
      "Aluminium alloy pricing volatility pressures fixed-price terms on anode packages (PKG-2104).",
      "Cable lead times are the programme critical path — Q2 2027 lay campaign window (PKG-2101).",
    ],
  }
}

/* ------------------------------------------------------------------ */
/*  Orchestrator context                                               */
/* ------------------------------------------------------------------ */

export function buildOrchestratorContext(
  _specialistOutputs: SpecialistOutput[],
  drill: DrillState,
  pageContext: string,
  _data: ComputedData,
): Record<string, unknown> {
  return {
    programme: PROJECT,
    asOf: TODAY,
    view: { page: drill.page, description: pageContext },
    knowledgeBase: {
      procurementProcess: {
        gates: "Scoped → Specified → Approved → Issued → Awarded",
        tenderWindowDays: 21,
        clarificationCutoffDays: 7,
        approvalAuthority: "SCM Director approves ITT issue; deviations from S7-SCM-TC-2026 need written agreement",
      },
      governingTerms: PROCUREMENT_CLAUSES.map(c => `§${c.ref} ${c.heading}: ${c.text}`),
      standardsMatrix: STANDARDS_MATRIX.map(s => `${s.authority} ${s.ref} — ${s.scope}`),
      charter: serializeCharter(),
    },
    tenderPipeline: serializePipeline(),
    savingsLedger: ledgerSummary(),
  }
}

/* ------------------------------------------------------------------ */
/*  Verifier context                                                   */
/* ------------------------------------------------------------------ */

export function buildVerifierContext(
  _orchestratorOutput: OrchestratorOutput,
  _data: ComputedData,
  drill: DrillState,
): { sourceData: Record<string, unknown>; verifiableBenchmarks: Record<string, unknown> } {
  return {
    sourceData: {
      view: drill.page,
      asOf: TODAY,
      tenderPipeline: serializePipeline(),
      documentRegister: serializeDocumentRegister(),
      savingsLedger: ledgerSummary(),
    },
    verifiableBenchmarks: {
      standardsMatrix: STANDARDS_MATRIX,
      baselineCertifications: BASELINE_STANDARDS,
      governingTerms: PROCUREMENT_CLAUSES,
      charter: serializeCharter(),
      processRules: {
        tenderWindowDays: 21,
        clarificationCutoffDays: 7,
        submissionChannel: "SCM Portal",
      },
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Chat briefing                                                      */
/* ------------------------------------------------------------------ */

export function buildChatBriefing(_data: ComputedData): string {
  const pipeline = TENDER_PACKAGES.map(p =>
    `- ${p.id} ${p.title} (${p.quantity}): stage ${p.stage}, budget $${p.budget.toLocaleString()}, savings target $${p.targetSavings.toLocaleString()}, ${p.bidders} bidders, submissions close ${p.submissionDeadline}, owner ${p.ownerRole}.`,
  ).join("\n")

  const docs = DOCUMENTS.map(d => `- ${d.docRef} — ${d.title} (${d.revision})`).join("\n")

  const ledger = ledgerSummary()

  return `PROGRAMME: ${PROJECT.name} — ${PROJECT.scope}. Mobilisation port: ${PROJECT.mobilisationPort}. As of ${TODAY}.

TENDER PIPELINE:
${pipeline}

SAVINGS LEDGER: ${ledger.closedPackages} packages awarded to date, $${ledger.realisedSavingsUsd.toLocaleString()} realised savings against $${ledger.tenderCostsUsd.toLocaleString()} of tender costs (${ledger.blendedReturn}× blended return).

CONTROLLED DOCUMENT REGISTER:
${docs}

STANDARDS MATRIX (QA-MAN-2026-EPCI §3): ${STANDARDS_MATRIX.map(s => `${s.ref} (${s.scope.split("—")[0].trim()})`).join("; ")}.

GOVERNING TERMS (S7-SCM-TC-2026-v1.0): DDP Incoterms 2020 to the mobilisation port; knock-for-knock maritime indemnities; 24-month warranty from commissioning or 36 from delivery; fixed firm pricing; 60-day payment; English law with LCIA arbitration.

CHARTER: ${CHARTER.vessel} (${CHARTER.vesselType}) on ${CHARTER.codeName} terms — ${CHARTER.charterPeriod} at $${CHARTER.hireRate.toLocaleString()}/day.`
}
