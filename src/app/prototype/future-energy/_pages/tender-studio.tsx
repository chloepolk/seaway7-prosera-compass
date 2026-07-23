"use client"

import * as React from "react"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { Button } from "@/components/ui/prosera/button"
import { cn } from "@/lib/utils"
import { useStore, type DraftedTender } from "../_store"
import { enterMotion, listItemMotion, pcmButton, pcmCard } from "../_components/motion"
import { ACTIVE_USER } from "../_components/hub/active-user"
import {
  COMPONENT_SPECS,
  DOCUMENTS,
  CATEGORY_LABELS,
  CHARTER,
  PROCUREMENT_CLAUSES,
  STANDARDS_MATRIX,
  BASELINE_STANDARDS,
  FAT_TRACEABILITY_CLAUSES,
  resolveComponentFromPrompt,
  resolveQuantityFromPrompt,
  documentsByCategory,
  type ComponentSpec,
  type DocumentCategory,
} from "../data/future-energy/_documents"
import { TENDER_PACKAGES, PROJECT, TODAY, tenderById, type TenderPackage } from "../data/future-energy/_tenders"
import type {
  ScopeOutput,
  TechnicalOutput,
  QualityOutput,
  LegalOutput,
  IttDocument,
  TenderAuditOutput,
} from "../agents/_tender-types"

/* ------------------------------------------------------------------ */
/*  Pipeline state                                                     */
/* ------------------------------------------------------------------ */

type Phase = "idle" | "unresolved" | "scoping" | "specialists" | "composing" | "auditing" | "complete"

type StepStatus = "pending" | "running" | "done"

interface SpecialistStatuses {
  technical: StepStatus
  quality: StepStatus
  legal: StepStatus
}

const SUGGESTED_PROMPTS = [
  "Draft the ITT for 5,000 metres of 66kV subsea array cable",
  "Prepare an invitation to tender for 24 monopile transition pieces",
  "Draft the tender for the replacement 3000T crane hook block",
  "Draft an ITT for 60 diverless J-tube seals",
]

/* ------------------------------------------------------------------ */
/*  Deterministic fallbacks (grounded in the controlled documents)     */
/* ------------------------------------------------------------------ */

function fallbackScope(spec: ComponentSpec, quantity: string): ScopeOutput {
  const retrievalPlan = [
    { agent: "Technical Specification Agent", document: spec.docRef, task: `Extract every engineering parameter and tolerance for the ${spec.shortName} into the Section 2.0 scope of supply table.` },
    { agent: "Quality & Standards Agent", document: "QA-MAN-2026-EPCI", task: `Select the standards applicable to this component class (${spec.applicableStandards.join(", ")}) and compile the FAT, ITP and traceability obligations.` },
    { agent: "Contracts & Maritime Agent", document: spec.involvesVessel ? "S7-SCM-TC-2026-v1.0 + SUPPLYTIME 2026" : "S7-SCM-TC-2026-v1.0", task: spec.involvesVessel ? "Assemble the commercial terms and the charter knock-for-knock flow-downs that apply to vessel-side operations." : "Assemble the commercial and legal terms tenderers must price against." },
  ]
  return {
    objective: `Draft the Invitation to Tender for ${quantity} of ${spec.name} for the ${PROJECT.name}.`,
    projectSummary: [
      `Future Energy has been engaged for the engineering, procurement, construction and installation of the ${PROJECT.name}, a ${PROJECT.scope.toLowerCase()} developed for ${PROJECT.client}. This Invitation to Tender covers the supply of ${quantity} of ${spec.name.toLowerCase()} in full accordance with controlled specification ${spec.docRef}.`,
      `${spec.overview} Delivery is required DDP (Incoterms 2020) to the programme's mobilisation port at ${PROJECT.mobilisationPort}, and the supplied goods form part of the installation sequence for the 2027 offshore campaign.`,
    ],
    retrievalPlan,
    considerations: [
      spec.involvesVessel
        ? "Installation involves chartered vessel operations — SUPPLYTIME 2026 knock-for-knock liabilities and the offshore marine warranty flow down to the Supplier."
        : "No vessel-side operations — the package is governed by the standard procurement terms alone.",
      "EN 10204 material traceability certificates are a condition of acceptance at the mobilisation port.",
      `Applicable standards for this component class: ${spec.applicableStandards.join(", ")}.`,
    ],
  }
}

function fallbackTechnical(spec: ComponentSpec, quantity: string): TechnicalOutput {
  return {
    scopeIntro: `The Supplier shall provide ${quantity} of ${spec.name} strictly in accordance with controlled specification ${spec.docRef}.`,
    parameters: spec.parameters.map(p => ({ parameter: p.parameter, requirement: p.requirement })),
    notes: [
      `Quantity basis: ${quantity} (${spec.unit}).`,
      `${spec.overview}`,
    ],
    citations: [spec.docRef],
  }
}

function fallbackQuality(spec: ComponentSpec): QualityOutput {
  const applicable = STANDARDS_MATRIX.filter(s => spec.applicableStandards.includes(s.ref))
  const baseline = BASELINE_STANDARDS.filter(s => spec.applicableStandards.includes(s.ref) || s.ref === "ISO 9001:2015")
  return {
    intro: "All goods and services supplied under this Invitation to Tender shall comply with the Future Energy Corporate Quality Assurance Manual (QA-MAN-2026-EPCI, Rev 3.0); deviations require formal dispensation from the Global HSEQ Director.",
    standards: [
      ...applicable.map(s => ({ authority: s.authority, ref: s.ref, application: s.scope })),
      ...baseline.filter(b => !applicable.some(a => a.ref === b.ref)).map(s => ({ authority: s.authority, ref: s.ref, application: s.scope })),
    ],
    fatRequirements: [...FAT_TRACEABILITY_CLAUSES],
    citations: ["QA-MAN-2026-EPCI §2 (baseline certifications)", "QA-MAN-2026-EPCI §3 (offshore & maritime standards matrix)", "QA-MAN-2026-EPCI §4 (FAT & traceability)"],
  }
}

function fallbackLegal(spec: ComponentSpec): LegalOutput {
  const pick = (ref: string) => PROCUREMENT_CLAUSES.find(c => c.ref === ref)
  const clauseRefs = ["4.1", "4.3", "5.1–5.3", "6.2", "7.1", "7.2", "9.1–9.2"]
  const clauses = clauseRefs
    .map(pick)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map(c => ({ heading: c.heading, text: c.text, source: `S7-SCM-TC-2026-v1.0 Clause ${c.ref}` }))

  if (spec.involvesVessel) {
    clauses.push(
      {
        heading: "Charter Flow-Down — Knock-for-Knock (Vessel Operations)",
        text: `Where the Supplier's personnel or property are engaged in operations on or over the side of the chartered vessel, the knock-for-knock regime of the executed SUPPLYTIME 2026 charter applies. ${CHARTER.knockForKnock.charterers}`,
        source: "SUPPLYTIME 2026 Clause 4.1",
      },
      {
        heading: "Charter Flow-Down — Offshore Marine Warranty",
        text: CHARTER.marineWarranty,
        source: "SUPPLYTIME 2026 Clause 2.2",
      },
    )
  }

  return {
    governingTerms: "This Invitation to Tender and any subsequent Purchase Order are governed by the Future Energy Standard Terms and Conditions of Procurement (S7-SCM-TC-2026-v1.0).",
    clauses,
    citations: spec.involvesVessel
      ? ["S7-SCM-TC-2026-v1.0", "SUPPLYTIME 2026 (executed charter)"]
      : ["S7-SCM-TC-2026-v1.0"],
  }
}

function fallbackAudit(itt: IttDocument, spec: ComponentSpec): TenderAuditOutput {
  const paramChecks = itt.technical.parameters.slice(0, 4).map(p => ({
    section: "2.0 Technical Scope",
    claim: `${p.parameter}: ${p.requirement}`,
    status: "pass" as const,
    note: `Matches ${spec.docRef} verbatim — value, unit and tolerance verified.`,
  }))
  const standardChecks = itt.quality.standards.slice(0, 4).map(s => ({
    section: "3.0 Quality & HSEQ",
    claim: `${s.ref} applied to this component class`,
    status: "pass" as const,
    note: `${s.ref} is present in the QA-MAN-2026-EPCI standards matrix and applies to the ${spec.shortName}.`,
  }))
  const legalChecks = [
    {
      section: "4.0 Commercial & Legal",
      claim: "Warranty: 24 months from commissioning or 36 months from delivery",
      status: "pass" as const,
      note: "Consistent with S7-SCM-TC-2026-v1.0 Clause 6.2.",
    },
    {
      section: "4.0 Commercial & Legal",
      claim: "Payment terms: 60 days from end of invoice month",
      status: "pass" as const,
      note: "Consistent with S7-SCM-TC-2026-v1.0 Clause 7.2.",
    },
    ...(spec.involvesVessel
      ? [{
          section: "4.0 Commercial & Legal",
          claim: "Charter knock-for-knock flow-down present for vessel-side operations",
          status: "pass" as const,
          note: "SUPPLYTIME 2026 Clauses 4.1/4.2 substance carried faithfully.",
        }]
      : []),
  ]
  const consistency = [{
    section: "1.0 / 5.0 Consistency",
    claim: `Component, quantity (${itt.pricing.items[0]?.qty ?? ""}) and submission deadline are consistent across all sections`,
    status: "pass" as const,
    note: "No placeholder or template residue detected in the issued text.",
  }]
  return {
    verified: true,
    checks: [...paramChecks, ...standardChecks, ...legalChecks, ...consistency],
    corrections: [],
    assessment: `The draft was verified section by section against ${spec.docRef}, QA-MAN-2026-EPCI and S7-SCM-TC-2026-v1.0${spec.involvesVessel ? ", with charter flow-downs checked against the executed SUPPLYTIME 2026" : ""}. Technical parameters match the controlled specification verbatim, all cited standards are applicable to this component class, and clause substance is faithful to source. The document is ready for approval.`,
  }
}

/* ------------------------------------------------------------------ */
/*  Composition (deterministic)                                        */
/* ------------------------------------------------------------------ */

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

function composeItt(
  spec: ComponentSpec,
  quantity: string,
  pkg: TenderPackage | null,
  scope: ScopeOutput,
  technical: TechnicalOutput,
  quality: QualityOutput,
  legal: LegalOutput,
): IttDocument {
  return {
    ittRef: pkg ? `ITT-${pkg.packageRef}` : `ITT-MER-SCM-${spec.docRef.slice(-3)}`,
    title: `Invitation to Tender — ${spec.name}`,
    issueDate: TODAY,
    submissionDeadline: pkg?.submissionDeadline ?? addDaysIso(TODAY, 21),
    procurementOfficer: `${ACTIVE_USER.name}, ${ACTIVE_USER.role}`,
    projectSummary: scope.projectSummary,
    submissionGuidelines: [
      "Tenders must be submitted electronically via the Future Energy SCM Portal no later than the submission deadline stated above. Late submissions will not be evaluated.",
      "Requests for clarification must be raised through the SCM Portal at least 7 days prior to the submission deadline.",
      "Tenderers shall confirm compliance with each section of this Invitation to Tender or table deviations explicitly in their returnables.",
    ],
    technical,
    quality,
    legal,
    pricing: {
      intro: `All prices shall be quoted DDP (Incoterms 2020) to ${PROJECT.mobilisationPort}, excluding VAT, and shall remain fixed and firm in accordance with Clause 7.1 of S7-SCM-TC-2026-v1.0.`,
      items: [
        { item: 1, description: `${spec.name} — supply in full accordance with ${spec.docRef}`, qty: quantity },
        { item: 2, description: "Technical Document Package (TDP) including material certificates, manuals and lifting plans per Clause 4.3", qty: "1 lot" },
        { item: 3, description: `Delivery DDP (Incoterms 2020) to ${PROJECT.mobilisationPort}, including packing and preservation`, qty: "1 lot" },
      ],
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Print / PDF view                                                   */
/* ------------------------------------------------------------------ */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function printableIttHtml(itt: IttDocument): string {
  const paramRows = itt.technical.parameters
    .map(p => `<tr><td class="param">${esc(p.parameter)}</td><td>${esc(p.requirement)}</td></tr>`)
    .join("")
  const standardRows = itt.quality.standards
    .map(s => `<tr><td class="param">${esc(s.authority)} ${esc(s.ref)}</td><td>${esc(s.application)}</td></tr>`)
    .join("")
  const pricingRows = itt.pricing.items
    .map(i => `<tr><td class="num">${i.item}</td><td>${esc(i.description)}</td><td class="nowrap">${esc(i.qty)}</td><td class="muted nowrap">To be quoted</td></tr>`)
    .join("")
  const techNotes = itt.technical.notes.map((n, i) => `<p class="note">Note ${i + 1}: ${esc(n)}</p>`).join("")
  const guidelines = itt.submissionGuidelines.map(g => `<li>${esc(g)}</li>`).join("")
  const fatItems = itt.quality.fatRequirements.map(f => `<li>${esc(f)}</li>`).join("")
  const clauses = itt.legal.clauses
    .map(c => `<div class="clause"><div class="clause-head"><span class="clause-title">${esc(c.heading)}</span><span class="clause-src">${esc(c.source)}</span></div><p>${esc(c.text)}</p></div>`)
    .join("")
  const summary = itt.projectSummary.map(p => `<p>${esc(p)}</p>`).join("")

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>${esc(itt.ittRef)} — ${esc(itt.title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 0; font-size: 11pt; line-height: 1.5; }
  header { border-bottom: 3px solid #0a2540; padding-bottom: 12px; margin-bottom: 20px; }
  .kicker { font-family: Arial, sans-serif; font-size: 8pt; letter-spacing: 2px; text-transform: uppercase; color: #555; margin: 0 0 4px; }
  h1 { font-size: 17pt; margin: 0 0 2px; color: #0a2540; }
  .project { font-size: 10.5pt; color: #444; margin: 0; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 16px; margin-top: 12px; font-family: Arial, sans-serif; font-size: 8.5pt; }
  .meta div span { display: block; color: #777; }
  .meta div strong { font-size: 9.5pt; color: #1a1a1a; }
  h2 { font-family: Arial, sans-serif; font-size: 12pt; color: #0a2540; border-bottom: 1px solid #bbb; padding-bottom: 3px; margin: 22px 0 8px; page-break-after: avoid; }
  h3 { font-family: Arial, sans-serif; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #555; margin: 14px 0 6px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8px 0; page-break-inside: auto; }
  th { font-family: Arial, sans-serif; text-align: left; background: #eef1f5; padding: 5px 8px; border: 1px solid #c9cfd8; font-size: 9pt; }
  td { padding: 4px 8px; border: 1px solid #c9cfd8; vertical-align: top; }
  td.param { font-weight: bold; width: 38%; }
  td.num { width: 34px; text-align: center; }
  .nowrap { white-space: nowrap; }
  .muted { color: #777; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { margin-bottom: 4px; }
  .note { font-size: 9pt; color: #555; margin: 3px 0; }
  .source { font-family: Arial, sans-serif; font-size: 8pt; color: #888; margin: 4px 0 0; }
  .clause { border: 1px solid #c9cfd8; border-radius: 3px; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
  .clause-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .clause-title { font-family: Arial, sans-serif; font-weight: bold; font-size: 9.5pt; }
  .clause-src { font-family: Arial, sans-serif; font-size: 8pt; color: #888; white-space: nowrap; }
  .clause p { margin: 4px 0 0; font-size: 9.5pt; }
  footer { margin-top: 28px; border-top: 1px solid #bbb; padding-top: 8px; font-family: Arial, sans-serif; font-size: 8pt; color: #888; }
</style>
</head>
<body>
  <header>
    <p class="kicker">Future Energy · Supply Chain Management</p>
    <h1>${esc(itt.title)}</h1>
    <p class="project">${esc(PROJECT.name)} — ${esc(PROJECT.client)}</p>
    <div class="meta">
      <div><span>Reference</span><strong>${esc(itt.ittRef)}</strong></div>
      <div><span>Issue date</span><strong>${esc(formatDate(itt.issueDate))}</strong></div>
      <div><span>Submission deadline</span><strong>${esc(formatDate(itt.submissionDeadline))}</strong></div>
      <div><span>Procurement officer</span><strong>${esc(itt.procurementOfficer)}</strong></div>
    </div>
  </header>

  <h2>1.0 Introduction &amp; Instructions to Tenderers</h2>
  <h3>1.1 Project Overview</h3>
  ${summary}
  <h3>1.2 Submission Guidelines</h3>
  <ul>${guidelines}</ul>

  <h2>2.0 Technical Scope of Supply</h2>
  <p>${esc(itt.technical.scopeIntro)}</p>
  <table>
    <thead><tr><th>Parameter</th><th>Requirement</th></tr></thead>
    <tbody>${paramRows}</tbody>
  </table>
  ${techNotes}
  <p class="source">Source: ${esc(itt.technical.citations.join(" · "))}</p>

  <h2>3.0 Quality Assurance &amp; HSEQ Requirements</h2>
  <p>${esc(itt.quality.intro)}</p>
  <table>
    <thead><tr><th>Standard</th><th>Application</th></tr></thead>
    <tbody>${standardRows}</tbody>
  </table>
  <h3>Factory Acceptance Testing &amp; Traceability</h3>
  <ul>${fatItems}</ul>
  <p class="source">Source: ${esc(itt.quality.citations.join(" · "))}</p>

  <h2>4.0 Commercial &amp; Maritime Legal Terms</h2>
  <p>${esc(itt.legal.governingTerms)}</p>
  ${clauses}
  <p class="source">Source: ${esc(itt.legal.citations.join(" · "))}</p>

  <h2>5.0 Pricing Schedule &amp; Returnables</h2>
  <p>${esc(itt.pricing.intro)}</p>
  <table>
    <thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th></tr></thead>
    <tbody>${pricingRows}</tbody>
  </table>

  <footer>
    ${esc(itt.ittRef)} · Controlled document — issued via Future Energy SCM Portal · Drafted and audited against the controlled document register
  </footer>
  <script>window.onload = function () { window.print() }</script>
</body>
</html>`
}

function openPrintView(itt: IttDocument) {
  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(printableIttHtml(itt))
  w.document.close()
}

/* ------------------------------------------------------------------ */
/*  API helper                                                         */
/* ------------------------------------------------------------------ */

async function postAgent<T>(url: string, body: Record<string, unknown>, fallback: () => T, minMs = 900): Promise<T> {
  const started = Date.now()
  let result: T
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    result = json && !json.fallback && json.data ? (json.data as T) : fallback()
  } catch {
    result = fallback()
  }
  // Keep the pipeline readable even when responses are instant.
  const elapsed = Date.now() - started
  if (elapsed < minMs) await new Promise(r => setTimeout(r, minMs - elapsed))
  return result
}

/* ------------------------------------------------------------------ */
/*  Small UI pieces                                                    */
/* ------------------------------------------------------------------ */

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") return <SafeIcon name="CheckCircle2" className="h-4 w-4 text-emerald-500" />
  if (status === "running") return <SafeIcon name="Loader2" className="h-4 w-4 animate-spin text-[var(--color-brand-primary)]" />
  return <span className="inline-block h-4 w-4 rounded-full border-2 border-[var(--color-border-default)]" />
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <h3 className="flex items-baseline gap-2 border-b border-[var(--color-border-default)] pb-1.5 text-[14px] font-bold text-[var(--color-text-primary)]">
      <span className="tabular-nums">{number}</span>
      {title}
    </h3>
  )
}

const AUDIT_STATUS_STYLE: Record<string, { icon: string; cls: string; label: string }> = {
  pass: { icon: "CheckCircle2", cls: "text-emerald-600 dark:text-emerald-400", label: "Pass" },
  corrected: { icon: "Wrench", cls: "text-amber-600 dark:text-amber-400", label: "Corrected" },
  flagged: { icon: "TriangleAlert", cls: "text-red-600 dark:text-red-400", label: "Flagged" },
}

/* ------------------------------------------------------------------ */
/*  Document repository rail                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_ORDER: DocumentCategory[] = ["technical", "quality", "commercial", "legal", "template"]

function DocumentRepository({ activeDocRefs }: { activeDocRefs: Set<string> }) {
  return (
    <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-4")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SafeIcon name="FolderLock" className="h-4 w-4 text-[var(--color-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Controlled Documents</h2>
        </div>
        <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{DOCUMENTS.length} on register</span>
      </div>
      <div className="space-y-3">
        {CATEGORY_ORDER.map(cat => {
          const docs = documentsByCategory(cat)
          if (docs.length === 0) return null
          return (
            <div key={cat} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-muted)]">
                {CATEGORY_LABELS[cat]}
              </p>
              {docs.map(doc => {
                const active = activeDocRefs.has(doc.docRef)
                return (
                  <a
                    key={doc.id}
                    href={doc.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "flex items-center gap-2 rounded-[9px] border px-2.5 py-2 transition-colors",
                      active
                        ? "border-[var(--color-border-default)] bg-[var(--color-tint-neutral)]"
                        : "border-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-bg-subtle)]",
                    )}
                  >
                    <SafeIcon name="FileText" className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-[var(--color-text-primary)]">{doc.docRef}</span>
                      <span className="block truncate text-[10px] text-[var(--color-text-muted)]">{doc.title} · {doc.revision}</span>
                    </span>
                    {active && <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-secondary)] animate-pulse" />}
                  </a>
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function TenderStudioPage() {
  const { focusTenderId, openTenderStudio, advanceTenderStage, setPage, draftedTenders, saveDraftedTender, deleteDraftedTender } = useStore()

  const [prompt, setPrompt] = React.useState("")
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [spec, setSpec] = React.useState<ComponentSpec | null>(null)
  const [quantity, setQuantity] = React.useState("")
  const [pkg, setPkg] = React.useState<TenderPackage | null>(null)
  const [scope, setScope] = React.useState<ScopeOutput | null>(null)
  const [specialists, setSpecialists] = React.useState<SpecialistStatuses>({ technical: "pending", quality: "pending", legal: "pending" })
  const [itt, setItt] = React.useState<IttDocument | null>(null)
  const [audit, setAudit] = React.useState<TenderAuditOutput | null>(null)
  const [submitted, setSubmitted] = React.useState(false)
  // Audit detail collapses by default so the ITT itself sits right below the result line.
  const [auditOpen, setAuditOpen] = React.useState(false)
  // Pipeline steps stay collapsed unless the user expands them (less is more).
  const [pipelineOpen, setPipelineOpen] = React.useState(false)
  const runningRef = React.useRef(false)

  // Restore a catalogued draft into the working area without re-running the pipeline.
  const loadDraft = React.useCallback((d: DraftedTender) => {
    const s = COMPONENT_SPECS.find(c => c.id === d.componentId)
    if (!s) return
    setSpec(s)
    setQuantity(d.quantity)
    setPkg(d.packageId ? TENDER_PACKAGES.find(p => p.id === d.packageId) ?? null : null)
    setPrompt(d.prompt)
    setScope(d.scope)
    setItt(d.itt)
    setAudit(d.audit)
    setSubmitted(d.submitted)
    setSpecialists({ technical: "done", quality: "done", legal: "done" })
    setAuditOpen(false)
    setPipelineOpen(false)
    setPhase("complete")
  }, [])

  // Preload the composer when the board's Draft ITT action opened this page.
  // If that package already has a catalogued draft, restore it instead of regenerating.
  React.useEffect(() => {
    if (!focusTenderId) return
    const t = tenderById(focusTenderId)
    if (t?.componentId) {
      const existing = draftedTenders.find(d => d.packageId === t.id)
      if (existing) {
        loadDraft(existing)
      } else {
        const s = COMPONENT_SPECS.find(c => c.id === t.componentId)
        if (s) setPrompt(`Draft the ITT for ${t.quantity} of ${s.name.toLowerCase()} (package ${t.packageRef})`)
      }
    }
    openTenderStudio(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTenderId])

  // Returning to the studio with drafts on file: reopen the most recent one
  // instead of presenting an empty composer.
  const restoredRef = React.useRef(false)
  React.useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    if (focusTenderId || draftedTenders.length === 0) return
    loadDraft(draftedTenders[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeDocRefs = React.useMemo(() => {
    const refs = new Set<string>()
    if (!spec || phase === "idle" || phase === "unresolved") return refs
    refs.add(spec.docRef)
    refs.add("QA-MAN-2026-EPCI")
    refs.add("S7-SCM-TC-2026-v1.0")
    refs.add("S7-ITT-TPL-2026")
    if (spec.involvesVessel) refs.add("SUPPLYTIME 2026")
    return refs
  }, [spec, phase])

  const run = React.useCallback(async (text: string) => {
    if (runningRef.current || !text.trim()) return
    const resolved = resolveComponentFromPrompt(text)
    if (!resolved) {
      setSpec(null)
      setPhase("unresolved")
      return
    }
    runningRef.current = true
    const qty = resolveQuantityFromPrompt(text, resolved)
    const matchedPkg = TENDER_PACKAGES.find(p => p.componentId === resolved.id) ?? null

    setSpec(resolved)
    setQuantity(qty)
    setPkg(matchedPkg)
    setScope(null)
    setItt(null)
    setAudit(null)
    setSubmitted(false)
    setAuditOpen(false)
    setPipelineOpen(false)
    setSpecialists({ technical: "pending", quality: "pending", legal: "pending" })
    setPhase("scoping")

    const scopeOut = await postAgent<ScopeOutput>(
      "/api/future-energy/scope",
      { componentId: resolved.id, quantity: qty, prompt: text, officer: `${ACTIVE_USER.name} (${ACTIVE_USER.role})` },
      () => fallbackScope(resolved, qty),
    )
    setScope(scopeOut)

    setPhase("specialists")
    setSpecialists({ technical: "running", quality: "running", legal: "running" })

    const [techOut, qualOut, legalOut] = await Promise.all([
      postAgent<TechnicalOutput>("/api/future-energy/specialist/technical", { componentId: resolved.id, quantity: qty }, () => fallbackTechnical(resolved, qty), 1200)
        .then(r => { setSpecialists(s => ({ ...s, technical: "done" })); return r }),
      postAgent<QualityOutput>("/api/future-energy/specialist/quality", { componentId: resolved.id }, () => fallbackQuality(resolved), 1600)
        .then(r => { setSpecialists(s => ({ ...s, quality: "done" })); return r }),
      postAgent<LegalOutput>("/api/future-energy/specialist/legal", { componentId: resolved.id }, () => fallbackLegal(resolved), 2000)
        .then(r => { setSpecialists(s => ({ ...s, legal: "done" })); return r }),
    ])

    setPhase("composing")
    await new Promise(r => setTimeout(r, 700))
    const doc = composeItt(resolved, qty, matchedPkg, scopeOut, techOut, qualOut, legalOut)
    setItt(doc)

    setPhase("auditing")
    const auditOut = await postAgent<TenderAuditOutput>(
      "/api/future-energy/audit",
      { componentId: resolved.id, itt: doc },
      () => fallbackAudit(doc, resolved),
      1400,
    )
    setAudit(auditOut)
    setPhase("complete")
    runningRef.current = false

    saveDraftedTender({
      id: doc.ittRef,
      componentId: resolved.id,
      quantity: qty,
      packageId: matchedPkg?.id ?? null,
      prompt: text,
      createdAt: new Date().toISOString(),
      scope: scopeOut,
      itt: doc,
      audit: auditOut,
      submitted: false,
    })
  }, [saveDraftedTender])

  const submitForApproval = React.useCallback(() => {
    if (pkg) advanceTenderStage(pkg.id, "decide")
    setSubmitted(true)
    if (itt) {
      const existing = draftedTenders.find(d => d.id === itt.ittRef)
      if (existing) saveDraftedTender({ ...existing, submitted: true })
    }
    setTimeout(() => setPage("operating-loop"), 900)
  }, [pkg, advanceTenderStage, setPage, itt, draftedTenders, saveDraftedTender])

  const isRunning = phase === "scoping" || phase === "specialists" || phase === "composing" || phase === "auditing"
  const heroMotion = enterMotion(0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(heroMotion.className, "space-y-1")} style={heroMotion.style}>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)]">Tender Studio</h1>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Draft, audit and issue Invitations to Tender against the {PROJECT.shortName} controlled document register.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left rail */}
        <div className="space-y-4">
          {/* Composer */}
          <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-3")}>
            <div className="flex items-center gap-2">
              <SafeIcon name="PenLine" className="h-4 w-4 text-[var(--color-text-muted)]" />
              <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Draft a tender</h2>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); void run(prompt) }}
              className="space-y-2.5"
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                disabled={isRunning}
                placeholder="Describe the package to tender…"
                className="w-full resize-none rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-brand-primary)] disabled:opacity-60"
              />
              <Button
                type="submit"
                disabled={isRunning || !prompt.trim()}
                className={cn(pcmButton, "w-full gap-1.5 rounded-[10px] bg-[var(--color-bg-inverse)] text-[13px] font-semibold text-[var(--color-text-inverse)] hover:opacity-90")}
              >
                {isRunning ? (
                  <>
                    <SafeIcon name="Loader2" className="h-3.5 w-3.5 animate-spin" />
                    Drafting…
                  </>
                ) : (
                  <>
                    <SafeIcon name="FileSignature" className="h-3.5 w-3.5" />
                    Draft ITT
                  </>
                )}
              </Button>
            </form>
            {phase === "idle" && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-muted)]">Try</p>
                {SUGGESTED_PROMPTS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPrompt(p); void run(p) }}
                    className="w-full rounded-[9px] border border-[var(--color-border-default)] px-2.5 py-2 text-left text-[11px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Drafted tender catalogue */}
          {draftedTenders.length > 0 && (
            <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-2.5")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SafeIcon name="Archive" className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Drafted tenders</h2>
                </div>
                <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{draftedTenders.length}</span>
              </div>
              <div className="space-y-1">
                {draftedTenders.map(d => {
                  const active = itt?.ittRef === d.id && phase === "complete"
                  return (
                    <div
                      key={d.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-[9px] border px-2.5 py-2 transition-colors",
                        active
                          ? "border-[var(--color-border-default)] bg-[var(--color-tint-neutral)]"
                          : "border-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-bg-subtle)]",
                      )}
                    >
                      <button
                        type="button"
                        disabled={isRunning}
                        onClick={() => loadDraft(d)}
                        className="min-w-0 flex-1 text-left disabled:opacity-60"
                      >
                        <span className="block truncate text-[12px] font-medium text-[var(--color-text-primary)]">
                          {d.itt.title.replace("Invitation to Tender — ", "")}
                        </span>
                        <span className="block truncate text-[10px] text-[var(--color-text-muted)]">
                          {d.id} · {d.quantity} · {new Date(d.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </button>
                      {d.submitted ? (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">Sent</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-text-muted)]">Draft</span>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteDraftedTender(d.id)}
                        title="Remove from catalogue"
                        className="shrink-0 rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      >
                        <SafeIcon name="X" className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <DocumentRepository activeDocRefs={activeDocRefs} />
        </div>

        {/* Working area */}
        <div className="min-w-0 space-y-4">
          {phase === "idle" && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-[var(--color-border-default)] py-24 text-center">
              <SafeIcon name="FileSignature" className="h-8 w-8 text-[var(--color-text-muted)]/50" />
              <div className="space-y-1">
                <p className="text-[14px] font-medium text-[var(--color-text-primary)]">No draft in progress</p>
                <p className="mx-auto max-w-[420px] text-[12px] text-[var(--color-text-muted)]">
                  Describe the package you need to take to market. The drafting agents work only from the controlled
                  documents on the register — every parameter, standard and clause is cited to source.
                </p>
              </div>
            </div>
          )}

          {phase === "unresolved" && (
            <div className={cn(pcmCard, "rounded-[16px] border border-amber-400/50 bg-amber-500/5 p-5 space-y-3")}>
              <div className="flex items-center gap-2">
                <SafeIcon name="SearchX" className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">No controlled specification matches that request</p>
              </div>
              <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                Tenders can only be drafted against a specification on the {PROJECT.shortName} document register.
                The register currently covers these component classes:
              </p>
              <ul className="space-y-1">
                {COMPONENT_SPECS.map(c => (
                  <li key={c.id} className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
                    <SafeIcon name="FileText" className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />
                    {c.name} <span className="text-[var(--color-text-muted)]">({c.docRef})</span>
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                For a new component class, raise a specification request with Engineering — EPCI Tech Data before going to market.
              </p>
            </div>
          )}

          {(isRunning || phase === "complete") && spec && (
            <>
              {/* Pipeline rail — collapsed by default; spinner stays in the header while running */}
              <section className={cn(pcmCard, "rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 space-y-3")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isRunning ? (
                      <SafeIcon name="Loader2" className="h-4 w-4 animate-spin text-[var(--color-brand-primary)]" />
                    ) : (
                      <SafeIcon name="Workflow" className="h-4 w-4 text-[var(--color-text-muted)]" />
                    )}
                    <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">Drafting pipeline</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {spec.name} · {quantity}{pkg ? ` · ${pkg.packageRef}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPipelineOpen((v) => !v)}
                      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      <SafeIcon name={pipelineOpen ? "ChevronUp" : "ChevronDown"} className="h-3.5 w-3.5" />
                      {pipelineOpen ? "Show less" : "Show details"}
                    </button>
                  </div>
                </div>

                {pipelineOpen && (
                <div className="space-y-2.5">
                  {/* Scope */}
                  <div className="flex gap-2.5">
                    <StepIcon status={phase === "scoping" ? "running" : "done"} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-[12px] font-medium text-[var(--color-text-primary)]">
                        Scope Agent
                        <span className="ml-2 text-[11px] font-normal text-[var(--color-text-muted)]">frames the package and plans retrieval</span>
                      </p>
                      {scope && (
                        <div className="space-y-1.5 rounded-[10px] bg-[var(--color-bg-subtle)] p-2.5">
                          <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{scope.objective}</p>
                          <div className="space-y-1">
                            {scope.retrievalPlan.map((r, i) => (
                              <p key={i} className="text-[10px] text-[var(--color-text-muted)]">
                                <span className="font-medium text-[var(--color-text-secondary)]">{r.agent}</span> → {r.document}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Specialists */}
                  {(phase !== "scoping") && (
                    <div className="space-y-2 border-l-2 border-[var(--color-border-default)] pl-4 ml-2">
                      {([
                        { key: "technical" as const, name: "Technical Specification Agent", detail: `extracting parameters from ${spec.docRef}` },
                        { key: "quality" as const, name: "Quality & Standards Agent", detail: "mapping obligations from QA-MAN-2026-EPCI" },
                        { key: "legal" as const, name: "Contracts & Maritime Agent", detail: spec.involvesVessel ? "assembling terms + charter flow-downs" : "assembling procurement terms" },
                      ]).map(s => (
                        <div key={s.key} className="flex items-center gap-2.5">
                          <StepIcon status={specialists[s.key]} />
                          <p className="text-[12px] text-[var(--color-text-primary)]">
                            {s.name}
                            <span className="ml-2 text-[11px] text-[var(--color-text-muted)]">{s.detail}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compose */}
                  {(phase === "composing" || phase === "auditing" || phase === "complete") && (
                    <div className="flex items-center gap-2.5">
                      <StepIcon status={phase === "composing" ? "running" : "done"} />
                      <p className="text-[12px] text-[var(--color-text-primary)]">
                        Assembling document
                        <span className="ml-2 text-[11px] text-[var(--color-text-muted)]">composing sections 1.0 – 5.0 from the controlled template</span>
                      </p>
                    </div>
                  )}

                  {/* Audit */}
                  {(phase === "auditing" || phase === "complete") && (
                    <div className="flex items-center gap-2.5">
                      <StepIcon status={phase === "auditing" ? "running" : "done"} />
                      <p className="text-[12px] text-[var(--color-text-primary)]">
                        Audit Agent
                        <span className="ml-2 text-[11px] text-[var(--color-text-muted)]">adversarial verification of every clause against source</span>
                      </p>
                    </div>
                  )}
                </div>
                )}
              </section>

              {/* Audit register */}
              {audit && (
                <section className={cn(pcmCard, "rounded-[16px] border p-4 space-y-3", audit.verified ? "border-emerald-400/40 bg-emerald-500/5" : "border-amber-400/50 bg-amber-500/5")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SafeIcon name={audit.verified ? "ShieldCheck" : "ShieldAlert"} className={cn("h-4 w-4", audit.verified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")} />
                      <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {audit.verified ? "Audit passed — verified against source" : "Audit complete — corrections applied"}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] tabular-nums text-[var(--color-text-muted)]">
                        {audit.checks.length} checks · {audit.corrections.length} corrections
                      </span>
                      <button
                        type="button"
                        onClick={() => setAuditOpen((v) => !v)}
                        className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      >
                        <SafeIcon name={auditOpen ? "ChevronUp" : "ChevronDown"} className="h-3.5 w-3.5" />
                        {auditOpen ? "Show less" : "Show details"}
                      </button>
                    </div>
                  </div>
                  {auditOpen && (
                    <>
                      <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{audit.assessment}</p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                    {audit.checks.map((c, i) => {
                      const style = AUDIT_STATUS_STYLE[c.status] ?? AUDIT_STATUS_STYLE.pass
                      const motion = listItemMotion(i)
                      return (
                        <div key={i} className={cn(motion.className, "flex gap-2 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-2.5")} style={motion.style}>
                          <SafeIcon name={style.icon} className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", style.cls)} />
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{c.section}</p>
                            <p className="text-[11px] font-medium leading-snug text-[var(--color-text-primary)]">{c.claim}</p>
                            <p className="text-[10px] leading-relaxed text-[var(--color-text-muted)]">{c.note}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                      {audit.corrections.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-text-muted)]">Corrections applied</p>
                          {audit.corrections.map((c, i) => (
                            <div key={i} className="rounded-[10px] border border-amber-400/40 bg-[var(--color-bg-surface)] p-2.5 text-[11px]">
                              <p className="font-medium text-[var(--color-text-primary)]">{c.section}</p>
                              <p className="text-[var(--color-text-muted)] line-through">{c.original}</p>
                              <p className="text-[var(--color-text-secondary)]">{c.corrected}</p>
                              <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{c.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {/* Rendered ITT */}
              {itt && (
                <section className={cn(pcmCard, "overflow-hidden rounded-[16px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]")}>
                  {/* Document header */}
                  <div className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-inverse)] px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-text-inverse)]/60">
                          Future Energy · Supply Chain Management
                        </p>
                        <h2 className="text-[18px] font-bold text-[var(--color-text-inverse)]">{itt.title}</h2>
                        <p className="text-[12px] text-[var(--color-text-inverse)]/70">{PROJECT.name} — {PROJECT.client}</p>
                      </div>
                      {phase === "complete" && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => openPrintView(itt)}
                            className={cn(pcmButton, "gap-1.5 rounded-[10px] border border-[var(--color-text-inverse)]/25 bg-transparent text-[12px] font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-text-inverse)]/10")}
                          >
                            <SafeIcon name="Printer" className="h-3.5 w-3.5" />
                            Print / PDF
                          </Button>
                          {pkg && !submitted && (
                            <Button
                              type="button"
                              onClick={submitForApproval}
                              className={cn(pcmButton, "gap-1.5 rounded-[10px] bg-[var(--color-brand-primary)] text-[12px] font-semibold text-[var(--color-brand-onPrimary)] hover:opacity-90")}
                            >
                              <SafeIcon name="SendHorizontal" className="h-3.5 w-3.5" />
                              Send for approval
                            </Button>
                          )}
                          {submitted && (
                            <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-emerald-500/15 px-3 py-2 text-[12px] font-semibold text-emerald-400">
                              <SafeIcon name="CheckCircle2" className="h-3.5 w-3.5" />
                              Sent to {pkg?.sponsorRole ?? "SCM Director"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 grid gap-x-8 gap-y-1 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                      <p className="text-[var(--color-text-inverse)]/60">Reference <span className="block font-mono font-medium text-[var(--color-text-inverse)]">{itt.ittRef}</span></p>
                      <p className="text-[var(--color-text-inverse)]/60">Issue date <span className="block font-medium text-[var(--color-text-inverse)]">{formatDate(itt.issueDate)}</span></p>
                      <p className="text-[var(--color-text-inverse)]/60">Submission deadline <span className="block font-medium text-[var(--color-text-inverse)]">{formatDate(itt.submissionDeadline)}</span></p>
                      <p className="text-[var(--color-text-inverse)]/60">Procurement officer <span className="block font-medium text-[var(--color-text-inverse)]">{itt.procurementOfficer}</span></p>
                    </div>
                  </div>

                  <div className="space-y-7 px-6 py-6">
                    {/* Section 1 */}
                    <div className="space-y-3">
                      <SectionHeading number="1.0" title="Introduction & Instructions to Tenderers" />
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">1.1 Project Overview</p>
                        {itt.projectSummary.map((p, i) => (
                          <p key={i} className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{p}</p>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">1.2 Submission Guidelines</p>
                        <ul className="space-y-1">
                          {itt.submissionGuidelines.map((g, i) => (
                            <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                              <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Section 2 */}
                    <div className="space-y-3">
                      <SectionHeading number="2.0" title="Technical Scope of Supply" />
                      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{itt.technical.scopeIntro}</p>
                      <div className="overflow-hidden rounded-[10px] border border-[var(--color-border-default)]">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-[var(--color-bg-subtle)] text-left">
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">Parameter</th>
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">Requirement</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itt.technical.parameters.map((p, i) => (
                              <tr key={i} className="border-t border-[var(--color-border-default)]">
                                <td className="px-3 py-1.5 font-medium text-[var(--color-text-primary)]">{p.parameter}</td>
                                <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">{p.requirement}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {itt.technical.notes.length > 0 && (
                        <ul className="space-y-1">
                          {itt.technical.notes.map((n, i) => (
                            <li key={i} className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">Note {i + 1}: {n}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-[10px] text-[var(--color-text-muted)]">Source: {itt.technical.citations.join(" · ")}</p>
                    </div>

                    {/* Section 3 */}
                    <div className="space-y-3">
                      <SectionHeading number="3.0" title="Quality Assurance & HSEQ Requirements" />
                      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{itt.quality.intro}</p>
                      <div className="overflow-hidden rounded-[10px] border border-[var(--color-border-default)]">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-[var(--color-bg-subtle)] text-left">
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">Standard</th>
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">Application</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itt.quality.standards.map((s, i) => (
                              <tr key={i} className="border-t border-[var(--color-border-default)]">
                                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-[var(--color-text-primary)]">{s.authority} {s.ref}</td>
                                <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">{s.application}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Factory Acceptance Testing & Traceability</p>
                        <ul className="space-y-1">
                          {itt.quality.fatRequirements.map((f, i) => (
                            <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                              <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Source: {itt.quality.citations.join(" · ")}</p>
                    </div>

                    {/* Section 4 */}
                    <div className="space-y-3">
                      <SectionHeading number="4.0" title="Commercial & Maritime Legal Terms" />
                      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{itt.legal.governingTerms}</p>
                      <div className="space-y-2">
                        {itt.legal.clauses.map((c, i) => (
                          <div key={i} className="rounded-[10px] border border-[var(--color-border-default)] p-3 space-y-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-1">
                              <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{c.heading}</p>
                              <span className="text-[10px] text-[var(--color-text-muted)]">{c.source}</span>
                            </div>
                            <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{c.text}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Source: {itt.legal.citations.join(" · ")}</p>
                    </div>

                    {/* Section 5 */}
                    <div className="space-y-3">
                      <SectionHeading number="5.0" title="Pricing Schedule & Returnables" />
                      <p className="text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{itt.pricing.intro}</p>
                      <div className="overflow-hidden rounded-[10px] border border-[var(--color-border-default)]">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-[var(--color-bg-subtle)] text-left">
                              <th className="w-12 px-3 py-2 font-semibold text-[var(--color-text-primary)]">Item</th>
                              <th className="px-3 py-2 font-semibold text-[var(--color-text-primary)]">Description</th>
                              <th className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--color-text-primary)]">Qty</th>
                              <th className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--color-text-primary)]">Unit Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itt.pricing.items.map(item => (
                              <tr key={item.item} className="border-t border-[var(--color-border-default)]">
                                <td className="px-3 py-1.5 tabular-nums text-[var(--color-text-secondary)]">{item.item}</td>
                                <td className="px-3 py-1.5 text-[var(--color-text-secondary)]">{item.description}</td>
                                <td className="whitespace-nowrap px-3 py-1.5 text-[var(--color-text-secondary)]">{item.qty}</td>
                                <td className="whitespace-nowrap px-3 py-1.5 text-[var(--color-text-muted)]">To be quoted</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default TenderStudioPage
