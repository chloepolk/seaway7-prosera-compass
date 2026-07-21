/* ------------------------------------------------------------------ */
/*  Seaway7 SCM document repository                                     */
/*                                                                     */
/*  Controlled-document register for the Meridian offshore wind        */
/*  programme: engineering specifications, the corporate QA manual,    */
/*  procurement terms, the vessel charter party, and the ITT template. */
/*  Full text is indexed for agent retrieval and citation.             */
/* ------------------------------------------------------------------ */

export type DocumentCategory = "technical" | "quality" | "legal" | "commercial" | "template"

export interface S7Document {
  id: string
  docRef: string
  title: string
  category: DocumentCategory
  revision: string
  effectiveDate: string
  owner: string
  classification: string
  /** PDF served from /seaway7/ in public. */
  fileName: string
  pages: number
  summary: string
  /** Cleaned full text used for agent retrieval and citation. */
  fullText: string
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  technical: "Engineering Specifications",
  quality: "Quality & HSEQ",
  legal: "Legal & Maritime",
  commercial: "Commercial & Procurement",
  template: "Controlled Templates",
}

/* ------------------------------------------------------------------ */
/*  Standards matrix (QA-MAN-2026-EPCI §3)                             */
/* ------------------------------------------------------------------ */

export interface StandardRow {
  authority: string
  ref: string
  scope: string
}

export const STANDARDS_MATRIX: StandardRow[] = [
  { authority: "DNV", ref: "DNV-ST-0126", scope: "Support structures for wind turbines — design, materials, fabrication and quality control of monopiles, transition pieces and jacket foundations." },
  { authority: "DNV", ref: "DNV-OS-H101", scope: "Marine operations (VMO standard) — quality and safety requirements for load-out, transport and offshore installation (lifting) of components." },
  { authority: "NORSOK", ref: "NORSOK M-501", scope: "Surface preparation and protective coating — subsea components and splash-zone structures in saline environments." },
  { authority: "NORSOK", ref: "NORSOK N-004", scope: "Design of steel structures — secondary steel work, boat landings and offshore lifting appliances." },
  { authority: "IMCA", ref: "IMCA M 140 / M 103", scope: "Dynamic positioning operations — QA and FMEA requirements for DP2/DP3 heavy-lift and cable-lay vessels." },
  { authority: "API", ref: "API Spec 17J", scope: "Unbonded flexible pipe — cross-reference standard for dynamic subsea power cables and umbilicals." },
]

export const BASELINE_STANDARDS: StandardRow[] = [
  { authority: "ISO", ref: "ISO 9001:2015", scope: "Quality management systems — required for all structural suppliers." },
  { authority: "ISO", ref: "ISO/TS 29001", scope: "Sector-specific QMS for petroleum, petrochemical and natural gas industries — applicable to subsea tooling." },
  { authority: "ISO", ref: "ISO 14001:2015", scope: "Environmental management systems." },
  { authority: "ISO", ref: "ISO 45001:2018", scope: "Occupational health and safety management systems." },
]

export const FAT_TRACEABILITY_CLAUSES = [
  "All critical components must undergo Factory Acceptance Testing (FAT) before shipment; the Supplier shall submit an Inspection and Test Plan (ITP) to Seaway7 Quality Control at least 30 days prior to manufacturing.",
  "Complete material traceability (EN 10204 Type 3.1 or 3.2 certificates) is required for all primary steel and load-bearing components; uncertified materials will be rejected at the mobilisation port.",
  "Welding and fabrication quality shall be verified via NDT (radiographic, ultrasonic, magnetic particle or dye penetrant) in accordance with DNV-CG-0051; all NDT operators certified to ISO 9712 Level II minimum.",
]

/* ------------------------------------------------------------------ */
/*  Component specification register (the 5 engineering specs)         */
/* ------------------------------------------------------------------ */

export interface SpecParameter {
  parameter: string
  requirement: string
}

export interface ComponentSpec {
  id: string
  docId: string
  docRef: string
  name: string
  shortName: string
  overview: string
  parameters: SpecParameter[]
  /** Prompt-resolution keywords (lowercase). */
  keywords: string[]
  /** Standard refs pulled from the QA matrix for this component. */
  applicableStandards: string[]
  unit: string
  defaultQuantity: string
  /** Whether installation involves vessel operations (triggers charter clauses). */
  involvesVessel: boolean
}

export const COMPONENT_SPECS: ComponentSpec[] = [
  {
    id: "cable-66kv",
    docId: "ts-cbl-66kv-001",
    docRef: "TS-CBL-66KV-001",
    name: "66kV Subsea Array Cable",
    shortName: "66kV Array Cable",
    overview: "Three-core submarine power cable with XLPE insulation and integrated fibre optic cable for the offshore wind farm inter-array grid.",
    parameters: [
      { parameter: "Rated Voltage (Uo/U)", requirement: "36/66 kV" },
      { parameter: "Maximum System Voltage (Um)", requirement: "72.5 kV" },
      { parameter: "Conductor Material", requirement: "Copper or Aluminium (water-blocked)" },
      { parameter: "Cross-Sectional Area", requirement: "400 – 800 mm²" },
      { parameter: "Insulation", requirement: "Cross-linked Polyethylene (XLPE)" },
      { parameter: "Armour", requirement: "Single wire armour (galvanised steel) with bitumen" },
      { parameter: "Integrated Fibre Optic", requirement: "48-core Single Mode (SM)" },
      { parameter: "Minimum Bending Radius (Dynamic)", requirement: "3.5 metres" },
      { parameter: "Weight in Air", requirement: "Approx. 35 – 50 kg/m (depending on cross-section)" },
      { parameter: "Design Life", requirement: "25 years" },
    ],
    keywords: ["cable", "66kv", "array", "subsea power", "xlpe", "inter-array", "power cable"],
    applicableStandards: ["API Spec 17J", "DNV-OS-H101", "IMCA M 140 / M 103", "ISO 9001:2015"],
    unit: "metres",
    defaultQuantity: "5,000 metres",
    involvesVessel: true,
  },
  {
    id: "transition-piece",
    docId: "ts-str-tp-002",
    docRef: "TS-STR-TP-002",
    name: "Monopile Transition Piece (TP)",
    shortName: "Transition Piece",
    overview: "Primary structural interface between the driven monopile foundation and the wind turbine generator tower, including secondary steel outfitting.",
    parameters: [
      { parameter: "Base Material", requirement: "Grade S355G10+M / S460G2+M structural steel" },
      { parameter: "Outer Diameter (Bottom/Top)", requirement: "6.5 m / 4.5 m (typical)" },
      { parameter: "Overall Height", requirement: "20 – 25 metres" },
      { parameter: "Total Weight (Outfitted)", requirement: "350 – 500 tonnes" },
      { parameter: "Flange Flatness Tolerance", requirement: "Max 2.0 mm over entire circumference" },
      { parameter: "Corrosion Protection (Internal)", requirement: "Dehumidification system ready" },
      { parameter: "Corrosion Protection (External)", requirement: "NORSOK M-501 System 7 (splash zone)" },
      { parameter: "Secondary Steel", requirement: "External boat landing, internal ladders, platforms" },
      { parameter: "Grout Seal System", requirement: "Active / passive dual seal combination" },
      { parameter: "Design Standard", requirement: "DNV-ST-0126" },
    ],
    keywords: ["transition piece", "tp", "monopile", "secondary steel", "foundation", "structural steel"],
    applicableStandards: ["DNV-ST-0126", "NORSOK M-501", "NORSOK N-004", "DNV-OS-H101", "ISO 9001:2015"],
    unit: "units",
    defaultQuantity: "24 units",
    involvesVessel: true,
  },
  {
    id: "crane-hook-block",
    docId: "ts-hl-cb-003",
    docRef: "TS-HL-CB-003",
    name: "3000T Heavy Lift Crane Hook Block",
    shortName: "Crane Hook Block",
    overview: "Main hoist hook block designed for DP3 heavy lift crane vessels utilised in offshore foundation and topside installations.",
    parameters: [
      { parameter: "Safe Working Load (SWL)", requirement: "3,000 tonnes" },
      { parameter: "Test Load", requirement: "3,300 tonnes (1.1 × SWL)" },
      { parameter: "Hook Type", requirement: "Ramshorn forged hook (DIN 15402)" },
      { parameter: "Sheave Diameter", requirement: "2,200 mm" },
      { parameter: "Number of Sheaves", requirement: "12 to 16" },
      { parameter: "Wire Rope Diameter", requirement: "60 mm – 76 mm" },
      { parameter: "Block Weight", requirement: "Approx. 95 tonnes" },
      { parameter: "Material Certification", requirement: "EN 10204 Type 3.2 (DNV/Lloyd's)" },
      { parameter: "Operating Temperature Range", requirement: "−20°C to +45°C" },
      { parameter: "Design Standard", requirement: "DNV-OS-H101 / API Spec 2C" },
    ],
    keywords: ["hook block", "crane", "heavy lift", "3000t", "hoist", "lifting"],
    applicableStandards: ["DNV-OS-H101", "NORSOK N-004", "IMCA M 140 / M 103", "ISO 9001:2015"],
    unit: "units",
    defaultQuantity: "1 unit",
    involvesVessel: true,
  },
  {
    id: "sacrificial-anode",
    docId: "ts-cp-sacp-004",
    docRef: "TS-CP-SACP-004",
    name: "Sacrificial Anode (Al-Zn-In) Bracelet",
    shortName: "Sacrificial Anodes",
    overview: "Galvanic cathodic protection anode bracelet designed for submerged subsea structures and monopiles.",
    parameters: [
      { parameter: "Alloy Composition", requirement: "Aluminium-Zinc-Indium (Al-Zn-In)" },
      { parameter: "Net Anode Weight", requirement: "150 – 300 kg (per half bracelet)" },
      { parameter: "Electrochemical Capacity", requirement: "2,500 Ah/kg (minimum)" },
      { parameter: "Closed Circuit Potential", requirement: "−1.05 V vs. Ag/AgCl seawater reference" },
      { parameter: "Utilisation Factor", requirement: "0.80" },
      { parameter: "Insert Material", requirement: "Carbon steel (weldable to primary structure)" },
      { parameter: "Installation Method", requirement: "Welded or bolted directly to submerged steel" },
      { parameter: "Design Life", requirement: "25 – 30 years" },
      { parameter: "Applicable Environment", requirement: "Full immersion (seawater & mudline)" },
      { parameter: "Design Standard", requirement: "DNV-RP-B401" },
    ],
    keywords: ["anode", "sacrificial", "cathodic", "corrosion protection", "al-zn-in", "bracelet"],
    applicableStandards: ["NORSOK M-501", "ISO 9001:2015"],
    unit: "units",
    defaultQuantity: "480 units",
    involvesVessel: false,
  },
  {
    id: "j-tube-seal",
    docId: "ts-sub-jts-005",
    docRef: "TS-SUB-JTS-005",
    name: "Subsea J-Tube Seal",
    shortName: "J-Tube Seals",
    overview: "Diverless installation mechanical seal used to secure and protect the 66kV array cable entry into the foundation J-tube.",
    parameters: [
      { parameter: "Cable Outer Diameter Range", requirement: "120 mm – 180 mm" },
      { parameter: "J-Tube Inner Diameter Range", requirement: "300 mm – 450 mm" },
      { parameter: "Pressure Rating", requirement: "3.0 bar (minimum internal/external)" },
      { parameter: "Primary Seal Material", requirement: "High-grade polyurethane (hydrolysis resistant)" },
      { parameter: "Hardware Material", requirement: "Super duplex stainless steel / Inconel 625" },
      { parameter: "Installation Method", requirement: "Diverless pull-in (ROV actuable)" },
      { parameter: "Centralisation", requirement: "Integrated internal centralisers" },
      { parameter: "Corrosion Protection", requirement: "Inherent material properties + small CP anodes" },
      { parameter: "Design Life", requirement: "25 years" },
      { parameter: "Testing", requirement: "Hyperbaric pressure tested prior to delivery" },
    ],
    keywords: ["j-tube", "jtube", "seal", "cable entry", "diverless", "rov"],
    applicableStandards: ["ISO/TS 29001", "DNV-OS-H101", "ISO 9001:2015"],
    unit: "units",
    defaultQuantity: "60 units",
    involvesVessel: false,
  },
]

export function componentById(id: string): ComponentSpec | undefined {
  return COMPONENT_SPECS.find(c => c.id === id)
}

/** Resolve a free-text prompt to a component spec by keyword match. */
export function resolveComponentFromPrompt(prompt: string): ComponentSpec | null {
  const lower = prompt.toLowerCase()
  let best: { spec: ComponentSpec; hits: number } | null = null
  for (const spec of COMPONENT_SPECS) {
    const hits = spec.keywords.filter(k => lower.includes(k)).length
    if (hits > 0 && (!best || hits > best.hits)) best = { spec, hits }
  }
  return best?.spec ?? null
}

/** Extract a quantity like "5,000 metres" / "24 units" from a prompt, else the spec default. */
export function resolveQuantityFromPrompt(prompt: string, spec: ComponentSpec): string {
  const m = prompt.match(/([\d,]+(?:\.\d+)?)\s*(metres|meters|m\b|units?|off\b|sets?|pcs)/i)
  if (m) {
    const qty = m[1]
    const rawUnit = m[2].toLowerCase()
    const unit = rawUnit.startsWith("met") || rawUnit === "m" ? "metres" : "units"
    return `${qty} ${unit}`
  }
  return spec.defaultQuantity
}

/* ------------------------------------------------------------------ */
/*  Charter party (SUPPLYTIME 2026) — key particulars & clauses        */
/* ------------------------------------------------------------------ */

export const CHARTER = {
  codeName: "SUPPLYTIME 2026",
  vessel: "HeavyLift Installer I (IMO 9876543)",
  vesselType: "DP3 Heavy Lift Crane Vessel (HLCV)",
  owners: "Global Offshore Marine Ltd., Aberdeen",
  charterPeriod: "180 days (firm), plus 30 days (option)",
  deliveryPort: "Rotterdam, The Netherlands",
  hireRate: 85_000,
  mobilisationFee: 250_000,
  law: "English law; arbitration in London (Arbitration Act 1996)",
  knockForKnock: {
    charterers: "The Charterers shall be responsible for and shall save, indemnify, defend and hold harmless the Owners from and against all claims, losses, damages, costs and expenses arising out of injury to or death of any person belonging to the Charterers' Group, and damage to or loss of property of the Charterers' Group, howsoever caused, even if caused by the negligence or fault of the Owners.",
    owners: "The Owners shall be responsible for and shall save, indemnify, defend and hold harmless the Charterers from and against all claims, losses, damages, costs and expenses arising out of injury to or death of any person belonging to the Owners' Group, and damage to or loss of property of the Owners' Group, howsoever caused, even if caused by the negligence or fault of the Charterers.",
  },
  marineWarranty: "The Owners warrant that the Vessel complies with all applicable international maritime conventions, including SOLAS and MARPOL, and holds a valid classification certificate. The Vessel shall be maintained in a thoroughly efficient state in hull and machinery, fully equipped and supplied to meet the demands of offshore wind farm construction operations.",
} as const

/* ------------------------------------------------------------------ */
/*  Procurement terms (S7-SCM-TC-2026-v1.0) — clause register          */
/* ------------------------------------------------------------------ */

export interface TermsClause {
  ref: string
  heading: string
  text: string
}

export const PROCUREMENT_CLAUSES: TermsClause[] = [
  { ref: "3.1", heading: "HSEQ Compliance", text: "The Supplier warrants that all Goods and Services will strictly adhere to the highest offshore maritime standards, including but not limited to ISO 9001 (Quality Management) and ISO 14001 (Environmental Management)." },
  { ref: "3.3", heading: "Audit Rights", text: "The Company reserves the right to audit the Supplier's manufacturing facilities and quality assurance documentation with 48 hours' prior written notice." },
  { ref: "4.1", heading: "Delivery", text: "Unless otherwise specified in the Purchase Order, delivery of Goods shall be DDP (Delivered Duty Paid) (Incoterms 2020) to the Company's designated mobilisation port or shipyard." },
  { ref: "4.2", heading: "Title & Risk", text: "Title to the Goods, and all associated risks, shall pass to the Company only upon physical delivery, inspection, and formal written acceptance by a Company representative." },
  { ref: "4.3", heading: "Technical Document Package", text: "The Supplier must provide a comprehensive Technical Document Package (TDP), including material certificates, user manuals, and lifting plans, no later than 14 days prior to delivery." },
  { ref: "5.1–5.3", heading: "Maritime Liabilities & Indemnities (Knock-for-Knock)", text: "Both Company and Supplier agree to a mutual knock-for-knock liability regime. The Supplier shall save, indemnify, defend and hold harmless the Company Group from any claims concerning injury to or death of any personnel of the Supplier Group, and loss of or damage to any property of the Supplier Group, regardless of fault or negligence. Conversely, the Company shall indemnify the Supplier against injury, death, or property damage relating to the Company Group's personnel and property." },
  { ref: "6.2", heading: "Warranty Period", text: "The Warranty Period shall be twenty-four (24) months from the date of final installation and commissioning at the offshore wind farm, or thirty-six (36) months from the date of delivery, whichever expires later." },
  { ref: "7.1", heading: "Fixed Pricing", text: "All prices are fixed, firm, and not subject to escalation unless expressly tied to an agreed commodities index in the Purchase Order." },
  { ref: "7.2", heading: "Payment Terms", text: "Payment shall be made sixty (60) days from the end of the month in which a correct and fully documented invoice is received by the Company's accounts payable department." },
  { ref: "9.1–9.2", heading: "Governing Law & Disputes", text: "This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Any dispute shall be finally resolved by arbitration under the LCIA Rules; the seat of arbitration shall be London, England." },
]

/* ------------------------------------------------------------------ */
/*  Document register                                                   */
/* ------------------------------------------------------------------ */

function specText(spec: ComponentSpec): string {
  return [
    `TECHNICAL SPECIFICATION — ${spec.name.toUpperCase()}`,
    `Doc Ref: ${spec.docRef}`,
    `Overview: ${spec.overview}`,
    "Technical Parameters:",
    ...spec.parameters.map(p => `${p.parameter}: ${p.requirement}`),
  ].join("\n")
}

export const DOCUMENTS: S7Document[] = [
  ...COMPONENT_SPECS.map((spec): S7Document => ({
    id: spec.docId,
    docRef: spec.docRef,
    title: spec.name,
    category: "technical",
    revision: "Rev 2.1",
    effectiveDate: "2026-06-18",
    owner: "Engineering — EPCI Tech Data",
    classification: "Confidential — Internal",
    fileName: `/seaway7/${spec.docId}.pdf`,
    pages: 1,
    summary: spec.overview,
    fullText: specText(spec),
  })),
  {
    id: "qa-man-2026-epci",
    docRef: "QA-MAN-2026-EPCI",
    title: "Corporate Quality Assurance Manual — Offshore & EPCI Operations",
    category: "quality",
    revision: "Rev 3.0",
    effectiveDate: "2026-07-10",
    owner: "Global HSEQ",
    classification: "Strictly Confidential",
    fileName: "/seaway7/qa-man-2026-epci.pdf",
    pages: 3,
    summary: "Defines the core Quality Management System for all EPCI operations, including the offshore & maritime standards matrix (DNV, NORSOK, IMCA, API), baseline ISO certifications, FAT, material traceability and NDT requirements.",
    fullText: [
      "CORPORATE QUALITY ASSURANCE MANUAL — OFFSHORE & EPCI OPERATIONS (QA-MAN-2026-EPCI, Rev 3.0)",
      "1. Scope: QMS applied by Seaway7 for all EPCI operations. All Tier 1 and Tier 2 suppliers are strictly mandated to adhere to the applicable standards referenced in this document; deviations require formal dispensation from the Global HSEQ Director.",
      "2. Fundamental standards: " + BASELINE_STANDARDS.map(s => `${s.ref} — ${s.scope}`).join(" | "),
      "3. Offshore & maritime standards matrix: " + STANDARDS_MATRIX.map(s => `${s.authority} ${s.ref}: ${s.scope}`).join(" | "),
      "4. FAT & traceability: " + FAT_TRACEABILITY_CLAUSES.join(" "),
    ].join("\n"),
  },
  {
    id: "s7-scm-tc-2026",
    docRef: "S7-SCM-TC-2026-v1.0",
    title: "Standard Terms and Conditions of Procurement",
    category: "commercial",
    revision: "v1.0",
    effectiveDate: "2026-05-02",
    owner: "Supply Chain Management",
    classification: "Confidential — Internal / Supplier Use",
    fileName: "/seaway7/s7-scm-tc-2026.pdf",
    pages: 3,
    summary: "Governing terms for all ITTs and Purchase Orders: HSEQ warranties, DDP delivery, title & risk, knock-for-knock maritime indemnities, 24/36-month warranty, fixed pricing, 60-day payment and English law / LCIA arbitration.",
    fullText: [
      "STANDARD TERMS AND CONDITIONS OF PROCUREMENT (S7-SCM-TC-2026-v1.0)",
      ...PROCUREMENT_CLAUSES.map(c => `Clause ${c.ref} — ${c.heading}: ${c.text}`),
    ].join("\n"),
  },
  {
    id: "supplytime-2026-charter",
    docRef: "SUPPLYTIME 2026",
    title: "Standard Time Charter Party for Offshore Service Vessels",
    category: "legal",
    revision: "Executed 2026-07-10",
    effectiveDate: "2026-07-10",
    owner: "Legal & Maritime",
    classification: "Confidential — Commercial",
    fileName: "/seaway7/supplytime-2026-charter.pdf",
    pages: 2,
    summary: `Time charter for ${CHARTER.vessel} (${CHARTER.vesselType}) — ${CHARTER.charterPeriod} at USD $${CHARTER.hireRate.toLocaleString()}/day, knock-for-knock liabilities, SOLAS/MARPOL warranty, English law and London arbitration.`,
    fullText: [
      "STANDARD TIME CHARTER PARTY FOR OFFSHORE SERVICE VESSELS (SUPPLYTIME 2026)",
      `Owners: ${CHARTER.owners}. Charterers: Seaway7. Vessel: ${CHARTER.vessel} — ${CHARTER.vesselType}.`,
      `Charter period: ${CHARTER.charterPeriod}. Delivery: ${CHARTER.deliveryPort}. Hire: USD $${CHARTER.hireRate.toLocaleString()}/day. Mobilisation: USD $${CHARTER.mobilisationFee.toLocaleString()} lump sum.`,
      `Clause 2.2 Marine warranty: ${CHARTER.marineWarranty}`,
      `Clause 4.1 Charterers' Group (knock-for-knock): ${CHARTER.knockForKnock.charterers}`,
      `Clause 4.2 Owners' Group (knock-for-knock): ${CHARTER.knockForKnock.owners}`,
      "Clause 5.1 Offshore wind operations: the Vessel is expressly chartered for EPCI operations at the designated offshore wind farm site, authorised for heavy lifting deployment of turbine foundations and cable lay support equipment.",
      `Clause 6.1 Law: ${CHARTER.law}.`,
    ].join("\n"),
  },
  {
    id: "itt-template",
    docRef: "S7-ITT-TPL-2026",
    title: "Invitation to Tender — Controlled Template",
    category: "template",
    revision: "Rev 4.2",
    effectiveDate: "2026-06-30",
    owner: "Supply Chain Management",
    classification: "Confidential — Internal",
    fileName: "/seaway7/itt-template.pdf",
    pages: 3,
    summary: "Five-section controlled ITT structure: introduction & instructions to tenderers, technical scope of supply, quality assurance & HSEQ requirements, commercial & maritime legal terms, and the pricing schedule & returnables.",
    fullText: [
      "INVITATION TO TENDER — CONTROLLED TEMPLATE (S7-ITT-TPL-2026)",
      "Section 1.0 Introduction & Instructions to Tenderers: project overview and submission guidelines. Tenders must be submitted electronically via the Seaway7 SCM Portal no later than the submission deadline; late submissions will not be evaluated; clarifications at least 7 days prior to the deadline.",
      "Section 2.0 Technical Scope of Supply: goods/services strictly in accordance with the referenced engineering specification, formatted as a parameter/requirement table.",
      "Section 3.0 Quality Assurance & HSEQ Requirements: the exact applicable DNV, NORSOK, IMCA or ISO standards from QA-MAN-2026-EPCI for the tendered component, plus FAT, ITP and traceability obligations.",
      "Section 4.0 Commercial & Maritime Legal Terms: governed by S7-SCM-TC-2026-v1.0; where vessel operations are involved, the knock-for-knock liability clauses and offshore marine warranty requirements apply.",
      "Section 5.0 Pricing Schedule & Returnables: DDP to the designated mobilisation port, excluding VAT.",
    ].join("\n"),
  },
]

export function documentById(id: string): S7Document | undefined {
  return DOCUMENTS.find(d => d.id === id)
}

export function documentsByCategory(category: DocumentCategory): S7Document[] {
  return DOCUMENTS.filter(d => d.category === category)
}

/** Compact register listing for agent context. */
export function documentRegisterSummary(): string {
  return DOCUMENTS.map(d => `${d.docRef} — ${d.title} (${CATEGORY_LABELS[d.category]}, ${d.revision})`).join("\n")
}
