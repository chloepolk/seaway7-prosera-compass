/* ------------------------------------------------------------------ */
/*  Tender register → Action Centre adapter                             */
/*                                                                     */
/*  Promotes Meridian OWF procurement packages into generic 5-gate     */
/*  missions (Scoped → Specified → Approved → Issued → Awarded) so     */
/*  the Action Centre carries the live tender pipeline with owners,     */
/*  deadlines and savings targets.                                     */
/* ------------------------------------------------------------------ */

import type { MissionStage } from "./stages"
import { STAGE_META, STAGE_ORDER, stageIndex, statusForStage } from "./stages"
import type { ClosedRecord, DiamondMission, MissionHealth, MissionHorizon, MissionReasoningMeta, GateTask, GateTaskStatus } from "./types"
import { personForRole } from "./org"
import { agentFor, type MissionTheme } from "./agents"
import { TODAY, PROJECT, type TenderPackage } from "../data/future-energy/_tenders"
import { componentById } from "../data/future-energy/_documents"
import type { Locale } from "../_i18n/types"
import { localizedClosedPackages, localizedTenderPackages } from "../_i18n/domain"
import { createT, localeTag } from "../_i18n"
import { formatCompactEur, formatEur } from "../_i18n/currency"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000))
}

/** Bucket a package by its remaining window onto the matrix rows:
 *  shock = <24h (immediate), near = 1-30 days, long = >30 days. */
function horizonFor(totalDays: number): MissionHorizon {
  if (totalDays <= 1) return "shock"
  if (totalDays <= 30) return "near"
  return "long"
}

function cadenceFor(totalDays: number): "days" | "weeks" | "quarter" {
  if (totalDays >= 60) return "quarter"
  if (totalDays >= 21) return "weeks"
  return "days"
}

/* ------------------------------------------------------------------ */
/*  Per-gate task synthesis (human vs. agent responsibility)           */
/* ------------------------------------------------------------------ */

function statusFor(stageIdxForTask: number, missionStageIdx: number, isFirst: boolean): GateTaskStatus {
  if (stageIdxForTask < missionStageIdx) return "done"
  if (stageIdxForTask > missionStageIdx) return "pending"
  return isFirst ? "in_progress" : "pending"
}

/** Plain-language "how to do it" steps for a human-owned gate task. */
function humanInstructions(stage: MissionStage, theme: MissionTheme, subject: string, locale: Locale): string[] {
  if (locale === "fr") {
    if (stage === "understand") {
      return theme === "charter"
        ? [
            `Examinez les caractéristiques de la charte et la synthèse d’exposition préparées pour ${subject}.`,
            "Confirmez le planning du navire par rapport au programme d’installation.",
            "Signalez toute contrainte d’assurance maritime qui modifie le dossier commercial.",
            "Validez le périmètre afin d’ouvrir la porte d’approbation.",
          ]
        : [
            `Ouvrez le dossier d’exigences extrait pour ${subject} — paramètres, normes et conditions.`,
            "Confirmez les paramètres techniques par rapport à la dernière révision contrôlée.",
            "Vérifiez l’applicabilité des normes avec l’ingénieure qualité principale.",
            "Validez la baseline des exigences afin de lancer la rédaction.",
          ]
    }
    if (stage === "decide") return [
      "Examinez le projet d’AO et le certificat d’audit par rapport aux documents sources.",
      "Résolvez les écarts signalés par rapport aux conditions standard.",
      "Enregistrez l’approbation et autorisez l’émission via le portail SCM.",
    ]
    if (stage === "execute") return theme === "charter"
      ? [
          `Signifiez l’avis d’option dans le délai contractuel pour ${subject}.`,
          "Confirmez la location, la mobilisation et la livraison avec les Propriétaires.",
          "Enregistrez l’avenant signé dans le dossier de charte.",
        ]
      : [
          `Répondez aux clarifications des soumissionnaires pour ${subject} dans le délai de 7 jours.`,
          "Examinez le dépouillement normalisé et les résultats de conformité technique.",
          "Préparez la recommandation d’attribution pour approbation.",
        ]
    if (stage === "outcome_roi") return [
      `Confirmez avec le responsable commercial les économies comptabilisées pour ${subject}.`,
      "Informez la directrice SCM et clôturez le lot.",
    ]
    return [
      `Confirmez l’objectif, la quantité et la baseline budgétaire du lot ${subject}.`,
      "Nommez le responsable et l’approbateur.",
    ]
  }
  if (stage === "understand") {
    if (theme === "charter") return [
      `Review the charter particulars and exposure summary assembled for ${subject}.`,
      "Confirm the vessel schedule against the installation programme.",
      "Flag any marine assurance constraints that change the commercial case.",
      "Sign off the scope so the approval gate can open.",
    ]
    return [
      `Open the extracted requirements pack for ${subject} — parameters, standards and terms.`,
      "Confirm the technical parameters against the latest controlled spec revision.",
      "Check the standards applicability with the Lead Quality Engineer.",
      "Sign off the requirements baseline so drafting can proceed.",
    ]
  }
  if (stage === "decide") return [
    "Review the draft ITT and the audit certificate against source documents.",
    "Resolve any flagged deviations from standard terms.",
    "Record approval and authorise issue via the SCM Portal.",
  ]
  if (stage === "execute") {
    if (theme === "charter") return [
      `Serve the option notice inside the contractual window for ${subject}.`,
      "Confirm hire, mobilisation and delivery particulars with the Owners.",
      "Log the executed amendment against the charter file.",
    ]
    return [
      `Answer bidder clarifications for ${subject} inside the 7-day window.`,
      "Review the normalised bid tabulation and technical conformity results.",
      "Prepare the award recommendation for approval.",
    ]
  }
  if (stage === "outcome_roi") return [
    `Confirm the savings booked for ${subject} with the Commercial Manager.`,
    "Brief the SCM Director and close the package.",
  ]
  // mission_created
  return [
    `Confirm the package objective, quantity and budget baseline for ${subject}.`,
    "Name the accountable owner and approver.",
  ]
}

/** Short "what the agent does" steps for an automated gate task. */
function agentInstructions(stage: MissionStage, theme: MissionTheme, subject: string, locale: Locale): string[] {
  if (locale === "fr") {
    if (stage === "mission_created") return [
      `Récupérer la baseline budgétaire et les documents contrôlés pour ${subject}.`,
      "Rédiger la fiche du lot et le plan de recherche.",
      "Planifier la fenêtre d’AO par rapport au programme d’installation.",
    ]
    if (stage === "understand") return theme === "charter"
      ? [
          "Récupérer les caractéristiques de la charte signée et les références tarifaires.",
          "Quantifier l’exposition sur la fenêtre d’option.",
          "Préparer le dossier commercial avec les clauses citées.",
        ]
      : [
          "Récupérer la spécification technique contrôlée.",
          "Cartographier les normes DNV / NORSOK / ISO applicables depuis le manuel QA.",
          "Assembler les conditions commerciales et les clauses de charte, avec citations.",
        ]
    if (stage === "decide") return [
      "Assembler le projet d’AO complet à partir des exigences extraites.",
      "Exécuter l’audit contradictoire sur chaque document source.",
      "Mettre le projet audité en attente d’approbation.",
    ]
    if (stage === "execute") return theme === "charter"
      ? ["Préparer l’avis d’option et l’avenant.", "Suivre l’accusé de réception de la contrepartie.", "Classer les documents signés dans le dossier de charte."]
      : ["Émettre le dossier d’AO via le portail SCM et enregistrer les accusés.", "Suivre les clarifications par rapport au délai de 7 jours.", "Normaliser les offres reçues dans le modèle de dépouillement."]
    return [
      `Rapprocher la valeur attribuée de la baseline budgétaire de ${subject}.`,
      "Affecter les économies à ce lot.",
      "Comptabiliser le résultat dans le ledger des économies.",
    ]
  }
  if (stage === "mission_created") return [
    `Pull the budget baseline and controlled documents for ${subject}.`,
    "Draft the package brief and retrieval plan.",
    "Schedule the tender window against the installation programme.",
  ]
  if (stage === "understand") {
    if (theme === "charter") return [
      "Pull the executed charter particulars and rate benchmarks.",
      "Quantify the exposure across the option window.",
      "Assemble the commercial case with cited clauses.",
    ]
    return [
      "Retrieve the controlled engineering specification.",
      "Map the applicable DNV / NORSOK / ISO standards from the QA manual.",
      "Assemble commercial terms and any charter flow-downs, with citations.",
    ]
  }
  if (stage === "decide") return [
    "Assemble the full ITT draft from the extracted requirements.",
    "Run the adversarial audit pass against every source document.",
    "Queue the audited draft for approval.",
  ]
  if (stage === "execute") {
    if (theme === "charter") return [
      "Prepare the option notice and amendment paperwork.",
      "Track counterparty acknowledgement.",
      "Queue the executed documents for the charter file.",
    ]
    return [
      "Issue the ITT pack via the SCM Portal and log acknowledgements.",
      "Track clarification requests against the 7-day deadline.",
      "Normalise returned bids into the tabulation model.",
    ]
  }
  // outcome_roi
  return [
    `Reconcile awarded value against the ${subject} budget baseline.`,
    "Attribute the savings to this package.",
    "Post the result to the savings ledger.",
  ]
}

function buildTasksForMission(opts: {
  missionId: string
  theme: MissionTheme
  stage: MissionStage
  humanRole: string
  sponsorRole: string
  subject: string
  openedAt: string
  totalDays: number
  locale: Locale
}): Record<MissionStage, GateTask[]> {
  const { missionId, theme, stage, humanRole, sponsorRole, subject, openedAt, totalDays, locale } = opts
  const missionIdx = stageIndex(stage)
  const human = personForRole(humanRole, locale)
  const sponsor = personForRole(sponsorRole, locale)
  const out = {} as Record<MissionStage, GateTask[]>

  const fr = locale === "fr"
  const understandLabel = theme === "charter"
    ? (fr ? `Assembler les caractéristiques de charte et l’exposition pour ${subject}` : `Assemble charter particulars & exposure case for ${subject}`)
    : (fr ? `Extraire les paramètres, normes et conditions pour ${subject}` : `Extract spec parameters, standards & terms for ${subject}`)
  const executeLabel = theme === "charter"
    ? (fr ? `Préparer l’avis d’option et l’avenant pour ${subject}` : `Prepare option notice and amendment for ${subject}`)
    : (fr ? `Émettre l’AO via le portail SCM et dépouiller les offres pour ${subject}` : `Issue ITT via SCM Portal and tabulate bids for ${subject}`)

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = STAGE_ORDER[i]
    const agent = agentFor(s, theme, locale)
    const tasks: GateTask[] = []
    // Stagger a due date per gate across the tender window.
    const gateDue = addDays(openedAt, Math.round(totalDays * ((i + 1) / STAGE_ORDER.length)))

    const agentTask = (label: string, why: string, doneWhen: string, objective: string): GateTask => ({
      id: `${missionId}-${s}-a`,
      stage: s,
      label,
      ownerType: "agent",
      owner: agent.name,
      ownerRole: agent.capability,
      agentIcon: agent.icon,
      status: statusFor(i, missionIdx, tasks.length === 0),
      why,
      doneWhen,
      instructions: agentInstructions(s, theme, subject, locale),
      dueAt: gateDue,
      agentObjective: objective,
    })
    const humanTask = (who: typeof human, label: string, why: string, doneWhen: string): GateTask => ({
      id: `${missionId}-${s}-h`,
      stage: s,
      label,
      ownerType: "human",
      owner: who.name,
      ownerRole: who.role,
      status: statusFor(i, missionIdx, tasks.length === 0),
      why,
      doneWhen,
      instructions: humanInstructions(s, theme, subject, locale),
      dueAt: gateDue,
    })

    if (s === "mission_created") {
      tasks.push(agentTask(
        fr ? `Assembler la fiche du lot et le plan de recherche pour ${subject}` : `Assemble package brief & retrieval plan for ${subject}`,
        fr ? "Cadrer le lot avec les bons documents contrôlés avant le début de la rédaction." : "Frame the package with the right controlled documents before drafting begins.",
        fr ? "Fiche approuvée et baseline budgétaire saisie." : "Brief approved and budget baseline captured.",
        fr ? `Compiler la fiche du lot ${subject} : baseline budgétaire, documents contrôlés et fenêtre d’AO.` : `Compile the package brief for ${subject}: budget baseline, controlled document set, and tender window.`,
      ))
    } else if (s === "understand") {
      tasks.push(agentTask(
        understandLabel,
        fr ? "Chaque exigence doit renvoyer à un document contrôlé avant son intégration à l’AO." : "Every requirement must trace to a controlled document before it enters the ITT.",
        fr ? "Exigences extraites avec citations documentaires." : "Requirements extracted with document citations.",
        fr ? `Extraire la baseline complète des exigences pour ${subject}, en citant chaque document source et révision.` : `Extract the complete requirements baseline for ${subject}, citing every source document and revision.`,
      ))
      tasks.push(humanTask(human, fr ? "Valider la baseline des exigences" : "Validate the requirements baseline", fr ? "L’extraction est sourcée, mais le jugement sur le périmètre reste humain." : "Extraction is grounded, but scope judgement stays human.", fr ? "Le responsable valide la baseline des exigences." : "Owner signs off the requirements baseline."))
    } else if (s === "decide") {
      tasks.push(agentTask(
        fr ? "Assembler le projet d’AO et exécuter l’audit" : "Assemble the draft ITT and run the audit pass",
        fr ? "Le projet doit réussir la vérification contradictoire avant d’être soumis à l’approbateur." : "The draft must survive adversarial verification before it reaches an approver.",
        fr ? "Projet audité en attente avec certificat conforme." : "Audited draft queued with a clean certificate.",
        fr ? `Assembler l’AO complet pour ${subject} et vérifier chaque clause par rapport aux documents sources.` : `Assemble the full ITT for ${subject} and verify every clause against the source documents.`,
      ))
      tasks.push(humanTask(sponsor, fr ? "Approuver l’AO et autoriser son émission" : "Approve the ITT and authorise issue", fr ? "L’autorité d’approbation et l’acceptation des écarts restent humaines." : "Approval authority and deviation acceptance stay human.", fr ? "Approbation enregistrée ; émission autorisée." : "Approval recorded; issue authorised."))
    } else if (s === "execute") {
      tasks.push(agentTask(
        executeLabel,
        fr ? "Transformer le projet approuvé en AO actif avec suivi des offres." : "Turn the approved draft into a live tender with tracked returns.",
        fr ? "Offres dépouillées et conformité vérifiée." : "Bids tabulated and conformity checked.",
        fr ? `Gérer l’AO actif pour ${subject} : émission, accusés, clarifications et dépouillement.` : `Run the live tender for ${subject}: issue, acknowledgements, clarifications and bid tabulation.`,
      ))
      tasks.push(humanTask(human, fr ? `Gérer les clarifications et la recommandation d’attribution pour ${subject}` : `Run clarifications and the award recommendation for ${subject}`, fr ? "La négociation fournisseur et le jugement d’évaluation restent humains." : "Supplier negotiation and evaluation judgement stay human.", fr ? "Recommandation d’attribution soumise." : "Award recommendation submitted."))
    } else {
      tasks.push(agentTask(
        fr ? "Rapprocher la valeur attribuée et comptabiliser les économies" : "Reconcile awarded value and book the savings",
        fr ? "Démontrer la valeur créée par l’AO et l’affecter au lot." : "Prove the tender created value and attribute it to the package.",
        fr ? "Économies comptabilisées dans le ledger." : "Savings booked to the ledger.",
        fr ? `Rapprocher la valeur attribuée du budget pour ${subject} et comptabiliser les économies.` : `Reconcile awarded value against budget for ${subject} and post the savings attribution.`,
      ))
    }

    out[s] = tasks
  }
  return out
}

/** Build entry dates for each reached gate; null for gates not yet reached. */
function buildStageDates(stage: MissionStage, openedAt: string, elapsedDays: number, completedAt?: string): Record<MissionStage, string | null> {
  const idx = stageIndex(stage)
  const dates = {} as Record<MissionStage, string | null>
  const spacing = idx > 0 ? Math.max(1, Math.floor(elapsedDays / idx)) : elapsedDays
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = STAGE_ORDER[i]
    if (i > idx) { dates[s] = null; continue }
    if (s === "outcome_roi" && completedAt) { dates[s] = completedAt; continue }
    dates[s] = addDays(openedAt, i * spacing)
  }
  return dates
}

/** Reached gates fully complete; current gate partial; future gates empty. */
function buildGateProgress(stage: MissionStage): Record<MissionStage, { done: number; total: number }> {
  const idx = stageIndex(stage)
  const out = {} as Record<MissionStage, { done: number; total: number }>
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = STAGE_ORDER[i]
    const total = STAGE_META[s].checklist.length
    if (i < idx) out[s] = { done: total, total }
    else if (i === idx) out[s] = { done: stage === "outcome_roi" && idx === 4 ? total : Math.max(1, Math.round(total * 0.5)), total }
    else out[s] = { done: 0, total }
  }
  return out
}

/* ------------------------------------------------------------------ */
/*  Tender packages → missions                                         */
/* ------------------------------------------------------------------ */

function missionFromPackage(pkg: TenderPackage, locale: Locale, stageOverride?: MissionStage): DiamondMission {
  const t = createT(locale)
  const fr = locale === "fr"
  const stage = stageOverride ?? pkg.stage
  const idx = stageIndex(stage)
  const theme: MissionTheme = pkg.componentId ? "supply" : "charter"
  const spec = pkg.componentId ? componentById(pkg.componentId) : undefined

  const totalDays = daysBetween(pkg.openedAt, pkg.submissionDeadline)
  const elapsedDays = Math.min(totalDays, daysBetween(pkg.openedAt, TODAY))
  const remaining = totalDays - elapsedDays

  const projectedValue = pkg.targetSavings
  const realizedValue = stage === "outcome_roi" ? (pkg.realisedSavings ?? pkg.targetSavings) : undefined
  const roiMultiple = realizedValue ? Math.round((realizedValue / pkg.tenderCost) * 10) / 10 : undefined
  const completedAt = stage === "outcome_roi" ? pkg.submissionDeadline : undefined

  const health: MissionHealth =
    stage === "outcome_roi" ? "on_track"
      : remaining <= 3 && idx < 3 ? "overdue"
        : pkg.confidence >= 0.84 ? "on_track"
          : pkg.confidence >= 0.76 ? "at_risk"
            : "overdue"

  const subject = locale === "fr" ? pkg.title : spec?.shortName ?? pkg.title

  const number = (value: number) => value.toLocaleString(localeTag(locale))
  const money = (value: number) => formatEur(value, locale)
  const date = (value: string) => new Date(value).toLocaleDateString(localeTag(locale))
  const reasoningMeta: MissionReasoningMeta = {
    theme,
    steps: fr
      ? theme === "charter"
        ? [
            "Récupération des caractéristiques de la charte signée (taux, période ferme, fenêtre d’option)",
            "Comparaison du taux d’option au marché spot HLCV évalué",
            "Quantification de l’exposition évitée sur la fenêtre d’option de 30 jours",
            "Planification de l’avis d’option dans le délai contractuel",
          ]
        : [
            `Récupération de la spécification contrôlée ${spec?.docRef ?? ""} et verrouillage de la baseline des paramètres`,
            "Cartographie des normes applicables depuis la matrice QA-MAN-2026-EPCI",
            "Ajout des conditions d’achat (S7-SCM-TC-2026) et des clauses de charte",
            "Dimensionnement de l’objectif d’économies selon le budget et la concurrence",
          ]
      : theme === "charter"
      ? [
        "Pulled executed charter particulars (hire rate, firm period, option window)",
        "Benchmarked the option rate against the assessed spot HLCV market",
        "Quantified the exposure avoided across the 30-day option window",
        "Sequenced the option notice inside the contractual deadline",
      ]
      : [
        `Retrieved the controlled specification ${spec?.docRef ?? ""} and locked the parameter baseline`,
        "Mapped applicable standards from the QA-MAN-2026-EPCI matrix to this component class",
        "Attached governing procurement terms (S7-SCM-TC-2026) and any charter flow-downs",
        "Sized the savings target from the budget baseline and bidder competition",
      ],
    equations: [
      fr ? `Baseline budgétaire = ${money(pkg.budget)} (${pkg.quantity})` : `Budget baseline = ${money(pkg.budget)} (${pkg.quantity})`,
      realizedValue
        ? (fr ? `Économies comptabilisées = ${money(realizedValue)} vs objectif ${money(pkg.targetSavings)}` : `Savings booked = ${money(realizedValue)} vs. target ${money(pkg.targetSavings)}`)
        : (fr ? `Objectif d’économies = ${money(pkg.targetSavings)} (${number((pkg.targetSavings / pkg.budget) * 100)} % du budget, ${pkg.bidders} soumissionnaires)` : `Savings target = ${money(pkg.targetSavings)} (${((pkg.targetSavings / pkg.budget) * 100).toFixed(1)}% of budget across ${pkg.bidders} bidders)`),
      fr ? `Coût de l’AO = ${money(pkg.tenderCost)} — retour ${(projectedValue / pkg.tenderCost).toLocaleString(localeTag(locale), { maximumFractionDigits: 1 })}× si l’objectif est atteint` : `Tender cost = ${money(pkg.tenderCost)} — return ${(projectedValue / pkg.tenderCost).toFixed(1)}× if target holds`,
      fr ? `Fenêtre : ouverture ${date(pkg.openedAt)}, clôture des offres ${date(pkg.submissionDeadline)} (${remaining > 0 ? `${remaining} jours restants` : "clôturée"})` : `Window: opened ${date(pkg.openedAt)}, submissions close ${date(pkg.submissionDeadline)} (${remaining > 0 ? `${remaining} days remaining` : "closed"})`,
    ],
    sources: theme === "charter"
      ? [
        fr ? "SUPPLYTIME 2026 — Charte signée (Juridique & maritime)" : "SUPPLYTIME 2026 — Executed charter party (Legal & Maritime)",
        fr ? "S7-SCM-TC-2026-v1.0 — Conditions d’achat standard" : "S7-SCM-TC-2026-v1.0 — Standard procurement terms",
        fr ? "Interne — Évaluation du marché HLCV T3 2026" : "Internal — Q3 2026 HLCV market assessment",
      ]
      : [
        fr
          ? `${spec?.docRef ?? "Spécification technique"} — Spécification technique contrôlée : ${pkg.title}`
          : `${spec?.docRef ?? "Engineering specification"} — ${spec?.name ?? pkg.title}`,
        fr ? "QA-MAN-2026-EPCI — Manuel QA, matrice des normes §3" : "QA-MAN-2026-EPCI — Corporate QA manual, standards matrix §3",
        fr ? "S7-SCM-TC-2026-v1.0 — Conditions d’achat standard" : "S7-SCM-TC-2026-v1.0 — Standard procurement terms",
        ...(pkg.involvesVessel ? [fr ? "SUPPLYTIME 2026 — Clauses découlant de la charte" : "SUPPLYTIME 2026 — Charter flow-down clauses"] : []),
      ],
  }

  const critical = stage === "outcome_roi" ? null : {
    owner: pkg.ownerRole,
    label: t(`stages.${stage}.checklist${Math.min(2, STAGE_META[stage].checklist.length - 1)}`),
    status: (health === "overdue" ? "blocked" : idx >= 1 ? "in_progress" : "pending") as "blocked" | "in_progress" | "pending",
  }

  const currentMetric = stage === "outcome_roi" ? realizedValue! : stage === "execute" ? Math.round(projectedValue * 0.45) : 0

  return {
    id: pkg.id,
    name: `${pkg.title} · ${pkg.quantity}`,
    objective: fr
      ? `Conduire ${pkg.packageRef} du cadrage à l’attribution pour ${PROJECT.shortName} — ${pkg.quantity}, budget de ${money(pkg.budget)}, objectif de ${money(pkg.targetSavings)} d’économies négociées.`
      : `Take ${pkg.packageRef} from scope to award for ${PROJECT.shortName} — ${pkg.quantity} against a ${formatCompactEur(pkg.budget, locale)} budget, targeting ${formatCompactEur(pkg.targetSavings, locale)} in negotiated savings.`,
    source: { page: "tender-studio", label: fr ? "Ouvrir dans le Studio d’appels d’offres" : "Open in Tender Studio" },
    stage,
    status: statusForStage[stage],
    health,
    owner: pkg.ownerRole,
    sponsor: pkg.sponsorRole,
    cost: pkg.tenderCost,
    projectedValue,
    realizedValue,
    roiMultiple,
    confidence: pkg.confidence,
    recommendation: pkg.narrative,
    risk: pkg.risk,
    evidence: pkg.evidence,
    successMetric: {
      label: theme === "charter" ? (fr ? "Exposition de charte évitée" : "Charter exposure avoided") : (fr ? "Économies négociées vs budget" : "Negotiated savings vs. budget"),
      baseline: 0,
      target: projectedValue,
      current: currentMetric,
      unit: locale === "fr" ? "€" : "$",
      direction: "increase",
    },
    openedAt: pkg.openedAt,
    targetCompletionAt: pkg.submissionDeadline,
    completedAt,
    cadence: cadenceFor(totalDays),
    horizon: horizonFor(Math.max(1, remaining)),
    valueType: pkg.valueType,
    elapsedDays,
    totalDays,
    stageDates: buildStageDates(stage, pkg.openedAt, elapsedDays, completedAt),
    critical,
    gateProgress: buildGateProgress(stage),
    tasksByStage: buildTasksForMission({
      missionId: pkg.id,
      theme,
      stage,
      humanRole: pkg.ownerRole,
      sponsorRole: pkg.sponsorRole,
      subject,
      openedAt: pkg.openedAt,
      totalDays,
      locale,
    }),
    reasoningMeta,
  }
}

/* ------------------------------------------------------------------ */
/*  Closed ledger (awarded package history)                            */
/* ------------------------------------------------------------------ */

function closedHistory(locale: Locale): ClosedRecord[] {
  return localizedClosedPackages(locale).map(c => ({
  id: c.id,
  name: c.name,
  source: "tender-studio",
  cost: c.cost,
  realizedValue: c.realisedSavings,
  roiMultiple: Math.round((c.realisedSavings / c.cost) * 10) / 10,
  completionDate: c.completionDate,
  decisionMaker: c.decisionMaker,
  }))
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface DiamondData {
  missions: DiamondMission[]
  closed: ClosedRecord[]
}

/**
 * Build the Action Centre from the tender register.
 * `stageOverrides` carries session progress (e.g. an ITT drafted in
 * Tender Studio advances its package to the approval gate).
 */
export function buildDiamondMissions(stageOverrides?: Record<string, MissionStage>, locale: Locale = "en"): DiamondData {
  const missions = localizedTenderPackages(locale).map(pkg => missionFromPackage(pkg, locale, stageOverrides?.[pkg.id]))

  // Stable display order: furthest-progressed active work first, awarded last.
  missions.sort((a, b) => stageIndex(b.stage) - stageIndex(a.stage))

  return { missions, closed: closedHistory(locale) }
}

/* ------------------------------------------------------------------ */
/*  Portfolio savings roll-up (for the accumulated strip)              */
/* ------------------------------------------------------------------ */

export interface PortfolioRoi {
  missionsClosed: number
  realizedToDate: number
  totalInvested: number
  blendedRoi: number
  inFlightProjected: number
  inFlightCount: number
  cumulative: { label: string; total: number }[]
  ledger: ClosedRecord[]
}

export function buildPortfolioRoi(missions: DiamondMission[], closed: ClosedRecord[]): PortfolioRoi {
  const closedMissions = missions.filter(m => m.stage === "outcome_roi" && m.realizedValue)
  const closedRealized = closedMissions.reduce((s, m) => s + (m.realizedValue ?? 0), 0)
  const closedCost = closedMissions.reduce((s, m) => s + m.cost, 0)

  const historyRealized = closed.reduce((s, c) => s + c.realizedValue, 0)
  const historyCost = closed.reduce((s, c) => s + c.cost, 0)

  const realizedToDate = closedRealized + historyRealized
  const totalInvested = closedCost + historyCost
  const inFlight = missions.filter(m => m.stage !== "outcome_roi")

  const ledger: ClosedRecord[] = [
    ...closedMissions.map(m => ({
      id: m.id,
      name: m.name,
      source: m.source.page,
      cost: m.cost,
      realizedValue: m.realizedValue ?? 0,
      roiMultiple: m.roiMultiple ?? 0,
      completionDate: m.completedAt ?? m.targetCompletionAt,
      decisionMaker: m.owner,
    })),
    ...closed,
  ].sort((a, b) => a.completionDate.localeCompare(b.completionDate))

  let running = 0
  const cumulative = ledger.map(e => {
    running += e.realizedValue
    return { label: e.completionDate, total: running }
  })

  return {
    missionsClosed: ledger.length,
    realizedToDate,
    totalInvested,
    blendedRoi: totalInvested > 0 ? realizedToDate / totalInvested : 0,
    inFlightProjected: inFlight.reduce((s, m) => s + m.projectedValue, 0),
    inFlightCount: inFlight.length,
    cumulative,
    ledger,
  }
}
