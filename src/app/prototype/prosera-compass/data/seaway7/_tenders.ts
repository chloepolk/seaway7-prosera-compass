/* ------------------------------------------------------------------ */
/*  Meridian OWF procurement package register                           */
/*                                                                     */
/*  The live tender pipeline for the Meridian offshore wind programme. */
/*  Each package moves through the 5-gate procurement loop:            */
/*  Scoped → Specified → Approved → Issued → Awarded.                  */
/* ------------------------------------------------------------------ */

import type { MissionStage } from "../../_diamond/stages"

export const PROJECT = {
  name: "Meridian Offshore Wind Farm",
  shortName: "Meridian OWF",
  scope: "72-turbine EPCI programme — UK North Sea",
  client: "Meridian Energy Partners",
  mobilisationPort: "Rotterdam, The Netherlands",
} as const

export const TODAY = "2026-07-13"

export interface TenderPackage {
  id: string
  packageRef: string
  title: string
  /** Component spec id from _documents (null for vessel/charter packages). */
  componentId: string | null
  quantity: string
  stage: MissionStage
  /** Estimated package value going to market. */
  budget: number
  /** Negotiated savings target vs budget (projected value on the board). */
  targetSavings: number
  /** Realised savings, set once awarded. */
  realisedSavings?: number
  /** Cost of running the tender (internal effort + external review). */
  tenderCost: number
  ownerRole: string
  sponsorRole: string
  confidence: number
  /** ITT submission deadline (21-day window once issued). */
  submissionDeadline: string
  openedAt: string
  bidders: number
  narrative: string
  risk: string
  evidence: string[]
  /** True when installation involves chartered vessel operations. */
  involvesVessel: boolean
  /** protection = cost/exposure avoided; creation = competitive savings captured. */
  valueType: "protection" | "creation"
}

export const TENDER_PACKAGES: TenderPackage[] = [
  {
    id: "PKG-2101",
    packageRef: "MER-SCM-2101",
    title: "66 kV Subsea Array Cable — Supply",
    componentId: "cable-66kv",
    quantity: "5,000 metres",
    stage: "execute",
    budget: 2_400_000,
    targetSavings: 192_000,
    tenderCost: 28_000,
    ownerRole: "Senior Project SCM Manager",
    sponsorRole: "SCM Director",
    confidence: 0.87,
    submissionDeadline: "2026-08-03",
    openedAt: "2026-07-06",
    bidders: 4,
    narrative: "ITT-MER-SCM-2101 is live and four returns are in — J-Tech, NexCore, Prysmatic and Viking. Tabulate against hard gates (ISO 9001, knock-for-knock, DDP Rotterdam), then score Price / Tech / QA / Legal out of 100 for the award recommendation.",
    risk: "Cable lead times are the programme's critical path — every week of evaluation slippage compresses the Q2 2027 lay campaign window.",
    evidence: [
      "TS-CBL-66KV-001: 36/66 kV three-core XLPE, 400–800 mm², 48-core integrated fibre, 25-year design life.",
      "QA-MAN-2026-EPCI §3: API Spec 17J applies to dynamic subsea power cables; IMCA M 140/M 103 governs the DP cable-lay vessel.",
      "S7-SCM-TC-2026 §4.1: DDP Incoterms 2020 to Rotterdam mobilisation port.",
      "Four bid PDFs received against ITT-MER-SCM-2101 and ready for gated evaluation.",
    ],
    involvesVessel: true,
    valueType: "creation",
  },
  {
    id: "PKG-2102",
    packageRef: "MER-SCM-2102",
    title: "Monopile Transition Pieces — Batch 2",
    componentId: "transition-piece",
    quantity: "24 units",
    stage: "understand",
    budget: 44_500_000,
    targetSavings: 1_780_000,
    tenderCost: 65_000,
    ownerRole: "Package Manager — Structures",
    sponsorRole: "SCM Director",
    confidence: 0.82,
    submissionDeadline: "2026-08-17",
    openedAt: "2026-06-29",
    bidders: 3,
    narrative: "Second fabrication batch of 24 outfitted transition pieces against TS-STR-TP-002. Requirements extraction is in progress: DNV-ST-0126 design compliance, NORSOK M-501 System 7 splash-zone coating, and EN 10204 Type 3.2 traceability on all primary steel. Batch 1 fabricator plus two European yards will be invited.",
    risk: "Fabrication slots at European yards are contested — a late ITT risks losing the reserved Q1 2027 slot to a competing developer.",
    evidence: [
      "TS-STR-TP-002: S355G10+M/S460G2+M steel, 350–500 t outfitted, 2.0 mm flange flatness tolerance.",
      "QA-MAN-2026-EPCI §3: DNV-ST-0126 governs transition piece design and fabrication QC; NORSOK N-004 covers boat landings and secondary steel.",
      "QA-MAN-2026-EPCI §4.1: EN 10204 Type 3.1/3.2 certificates mandatory for load-bearing components.",
      "Batch 1 award benchmark: €1.83M per unit landed DDP.",
    ],
    involvesVessel: true,
    valueType: "creation",
  },
  {
    id: "PKG-2103",
    packageRef: "MER-SCM-2103",
    title: "3000T Crane Hook Block — Replacement",
    componentId: "crane-hook-block",
    quantity: "1 unit",
    stage: "execute",
    budget: 6_800_000,
    targetSavings: 408_000,
    tenderCost: 34_000,
    ownerRole: "Vessel & Marine Assurance Lead",
    sponsorRole: "SCM Director",
    confidence: 0.84,
    submissionDeadline: "2026-08-10",
    openedAt: "2026-06-22",
    bidders: 2,
    narrative: "ITT-MER-SCM-2103 is issued and two forging-house returns are in. Weak competition (only two Type 3.2–approved houses) — tabulate gates and score before the vessel option window compresses further.",
    risk: "Only two forging houses hold DNV/Lloyd's Type 3.2 approval at 3,000 t SWL — limited competition weakens pricing leverage.",
    evidence: [
      "TS-HL-CB-003: 3,000 t SWL, 3,300 t test load, Ramshorn forged hook to DIN 15402.",
      "QA-MAN-2026-EPCI §3: DNV-OS-H101 dictates lifting-appliance quality requirements.",
      "SUPPLYTIME 2026 charter: vessel downtime for hook exchange must land inside the 30-day option window.",
      "Two returns received; knock-for-knock flow-down is a hard gate for vessel-side work.",
    ],
    involvesVessel: true,
    valueType: "protection",
  },
  {
    id: "PKG-2104",
    packageRef: "MER-SCM-2104",
    title: "Sacrificial Anode Bracelets — Foundations",
    componentId: "sacrificial-anode",
    quantity: "480 units",
    stage: "execute",
    budget: 1_390_000,
    targetSavings: 118_000,
    tenderCost: 16_000,
    ownerRole: "Package Manager — Cables",
    sponsorRole: "SCM Director",
    confidence: 0.9,
    submissionDeadline: "2026-07-24",
    openedAt: "2026-06-15",
    bidders: 4,
    narrative: "ITT issued to four foundries for 480 Al-Zn-In anode bracelets against TS-CP-SACP-004. All four returns are in — run hard gates (ISO 9001, knock-for-knock, DDP) then Price / Tech / QA / Legal scoring. Electrochemical capacity certificates (≥2,500 Ah/kg) remain a technical conformity focus.",
    risk: "Aluminium alloy pricing is volatile — clause 7.1 fixed pricing must hold without a commodities-index rider.",
    evidence: [
      "TS-CP-SACP-004: Al-Zn-In alloy, 2,500 Ah/kg minimum capacity, −1.05 V closed circuit potential.",
      "ITT issued 03 July via SCM Portal; 4 of 4 returns received.",
      "S7-SCM-TC-2026 §7.1: fixed firm pricing, no escalation without an agreed commodities index.",
      "Two clarification requests answered inside the 7-day window.",
    ],
    involvesVessel: false,
    valueType: "creation",
  },
  {
    id: "PKG-2105",
    packageRef: "MER-SCM-2105",
    title: "Subsea J-Tube Seals — Cable Entries",
    componentId: "j-tube-seal",
    quantity: "60 units",
    stage: "mission_created",
    budget: 1_080_000,
    targetSavings: 86_000,
    tenderCost: 14_000,
    ownerRole: "Package Manager — Cables",
    sponsorRole: "SCM Director",
    confidence: 0.78,
    submissionDeadline: "2026-08-24",
    openedAt: "2026-07-10",
    bidders: 3,
    narrative: "Package opened for 60 diverless J-tube seals against TS-SUB-JTS-005, sequenced to follow the array cable award so seal sizing locks to the awarded cable outer diameter (120–180 mm). Requirements extraction starts once the cable ITT is issued.",
    risk: "Seal bore sizing depends on the awarded cable OD — issuing early risks a variation order after cable award.",
    evidence: [
      "TS-SUB-JTS-005: diverless ROV-actuable seal, super duplex/Inconel 625 hardware, 3.0 bar rating.",
      "Dependency: cable OD confirmation from PKG-2101 award.",
      "Hyperbaric pressure testing required prior to delivery.",
    ],
    involvesVessel: false,
    valueType: "creation",
  },
  {
    id: "PKG-2106",
    packageRef: "MER-SCM-2106",
    title: "HLCV Charter — 30-Day Option Exercise",
    componentId: null,
    quantity: "30 days",
    stage: "outcome_roi",
    budget: 2_550_000,
    targetSavings: 296_000,
    realisedSavings: 311_000,
    tenderCost: 22_000,
    ownerRole: "Vessel & Marine Assurance Lead",
    sponsorRole: "SCM Director",
    confidence: 0.92,
    submissionDeadline: "2026-06-26",
    openedAt: "2026-05-28",
    bidders: 1,
    narrative: "Exercised the 30-day option on HeavyLift Installer I at the firm-period rate of $85,000/day, avoiding the spot-market HLCV rate of ~$96,000/day for the foundation completion window. Knock-for-knock and marine warranty terms carried unchanged from the executed charter.",
    risk: "Closed — option exercised inside the notice window; exposure retired.",
    evidence: [
      "SUPPLYTIME 2026 Box 9: hire USD $85,000/day; Box 7: 180 days firm plus 30-day option.",
      "Spot HLCV market assessed at $96,000–$99,500/day for Q3 2026.",
      "Savings: 30 days × ($96,400 − $85,000) ≈ $342k gross, $311k net of option notice costs.",
      "Charter clause 4.1/4.2 knock-for-knock regime unchanged.",
    ],
    involvesVessel: true,
    valueType: "protection",
  },
]

export function tenderById(id: string): TenderPackage | undefined {
  return TENDER_PACKAGES.find(t => t.id === id)
}

/* ------------------------------------------------------------------ */
/*  Closed package history (savings ledger)                            */
/* ------------------------------------------------------------------ */

export interface ClosedPackage {
  id: string
  name: string
  cost: number
  realisedSavings: number
  completionDate: string
  decisionMaker: string
}

export const CLOSED_PACKAGES: ClosedPackage[] = [
  { id: "PKG-2087", name: "Monopile Primary Steel — Batch 1", cost: 72_000, realisedSavings: 2_140_000, completionDate: "2026-02-19", decisionMaker: "SCM Director" },
  { id: "PKG-2090", name: "Scour Protection Rock Supply", cost: 31_000, realisedSavings: 640_000, completionDate: "2026-03-12", decisionMaker: "SCM Director" },
  { id: "PKG-2092", name: "Cable Protection Systems", cost: 26_000, realisedSavings: 415_000, completionDate: "2026-04-02", decisionMaker: "Senior Project SCM Manager" },
  { id: "PKG-2095", name: "Marshalling Port Services — Rotterdam", cost: 38_000, realisedSavings: 780_000, completionDate: "2026-05-07", decisionMaker: "SCM Director" },
  { id: "PKG-2098", name: "ROV Survey & Inspection Spread", cost: 24_000, realisedSavings: 356_000, completionDate: "2026-06-04", decisionMaker: "Vessel & Marine Assurance Lead" },
]
