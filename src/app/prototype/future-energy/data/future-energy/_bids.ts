/* ------------------------------------------------------------------ */
/*  Bid returns across Meridian OWF ITTs                                */
/*                                                                     */
/*  Curated supplier inputs for the demo scoring engine. Scores are     */
/*  never stored here — always derived via evaluateBids().              */
/* ------------------------------------------------------------------ */

export interface BidInput {
  id: string
  supplier: string
  packageId: string
  ittRef: string
  /** Total bid price in USD for the package scope. */
  totalPrice: number
  /** Valid ISO 9001 certificate on file. */
  hasValidIso9001: boolean
  /** Accepts mutual knock-for-knock liability flow-down. */
  acceptsKfk: boolean
  /** Agrees DDP Rotterdam Incoterms. */
  acceptsDdpRotterdam: boolean
  /**
   * Technical conformity points before capping.
   * Full compliance = 25; partial / unapproved material subs = 0–20.
   */
  techCompliancePts: number
  /** ISO compliance & materials traceability (0–10). */
  isoTraceabilityPts: number
  /** FAT / ITP notice period offered (days). Standard alignment = 30. */
  fatNoticeDays: number
  /** Post-installation warranty offered (months). Standard = 24. */
  warrantyMonths: number
  /** Whether supplier accepts standard Future Energy warranty wording (when duration is adequate). */
  acceptsStandardWarranty: boolean
  /** Response PDF when available in /public/future-energy; null for lighter demo packages. */
  pdfPath: string | null
  /** Short insight used on the baseball card (augmented by the scorer). */
  insight: string
}

export const EVAL_PACKAGE_ID = "PKG-2101"
export const ITT_REF = "ITT-MER-SCM-2101"

/**
 * PKG-2101 — 66kV array cable (full PDF set):
 * - Prysmatic → hard gate fail (refuses DDP Rotterdam)
 * - Viking → warranty 12 mo → Legal −15 + high commercial risk
 * - J-Tech / NexCore → competitive passers
 */
export const BIDS_ITT_MER_SCM_2101: BidInput[] = [
  {
    id: "bid-jtech",
    supplier: "J-Tech",
    packageId: "PKG-2101",
    ittRef: "ITT-MER-SCM-2101",
    totalPrice: 2_964_000,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 25,
    isoTraceabilityPts: 10,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: "/future-energy/J-Tech_Proposal_ITT-MER-SCM-2101.pdf",
    insight:
      "Full technical conformity to TS-CBL-66KV-001 with aligned FAT notice and standard warranty. Slightly above the low bid but strongest overall package quality.",
  },
  {
    id: "bid-nexcore",
    supplier: "NexCore",
    packageId: "PKG-2101",
    ittRef: "ITT-MER-SCM-2101",
    totalPrice: 2_795_000,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 18,
    isoTraceabilityPts: 10,
    fatNoticeDays: 45,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: "/future-energy/NexCore_Tender_Response_ITT-MER-SCM-2101.pdf",
    insight:
      "Lowest compliant price. Partial technical conformity (unapproved fibre-optic sub) and FAT notice stretched to 45 days — price leadership is real but not clean-sheet.",
  },
  {
    id: "bid-prysmatic",
    supplier: "Prysmatic",
    packageId: "PKG-2101",
    ittRef: "ITT-MER-SCM-2101",
    totalPrice: 2_665_000,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: false,
    techCompliancePts: 25,
    isoTraceabilityPts: 10,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: "/future-energy/Prysmatic_Bid_ITT-MER-SCM-2101.pdf",
    insight:
      "Attractive headline price but fails the DDP Rotterdam Incoterms gate — not evaluable under S7-SCM-TC-2026 §4.1.",
  },
  {
    id: "bid-viking",
    supplier: "Viking",
    packageId: "PKG-2101",
    ittRef: "ITT-MER-SCM-2101",
    totalPrice: 2_886_000,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 20,
    isoTraceabilityPts: 8,
    fatNoticeDays: 30,
    warrantyMonths: 12,
    acceptsStandardWarranty: false,
    pdfPath: "/future-energy/Viking_Response_ITT-MER-SCM-2101.pdf",
    insight:
      "Passes hard gates with solid tech, but warranty cut to 12 months post-installation (>25% below the 24-month standard) — high commercial risk even if composite remains competitive.",
  },
]

/**
 * PKG-2104 — sacrificial anode bracelets (issued; lighter demo set, no PDFs).
 * Galvano fails ISO gate; NordAnode leads on composite.
 */
export const BIDS_ITT_MER_SCM_2104: BidInput[] = [
  {
    id: "bid-2104-nordanode",
    supplier: "NordAnode",
    packageId: "PKG-2104",
    ittRef: "ITT-MER-SCM-2104",
    totalPrice: 1_618_500,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 25,
    isoTraceabilityPts: 10,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: null,
    insight:
      "Full electrochemical capacity certificates (≥2,500 Ah/kg) and clean DDP landing. Strong award candidate on anodes.",
  },
  {
    id: "bid-2104-marinecast",
    supplier: "MarineCast",
    packageId: "PKG-2104",
    ittRef: "ITT-MER-SCM-2104",
    totalPrice: 1_557_400,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 18,
    isoTraceabilityPts: 9,
    fatNoticeDays: 45,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: null,
    insight:
      "Lowest price but partial alloy conformity and stretched FAT notice — competitive commercially, thinner on tech/QA.",
  },
  {
    id: "bid-2104-galvano",
    supplier: "Galvano",
    packageId: "PKG-2104",
    ittRef: "ITT-MER-SCM-2104",
    totalPrice: 1_508_000,
    hasValidIso9001: false,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 20,
    isoTraceabilityPts: 7,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: null,
    insight:
      "ISO 9001 certificate expired at tender close — hard gate fail. Headline price is not evaluable.",
  },
  {
    id: "bid-2104-alloybay",
    supplier: "AlloyBay",
    packageId: "PKG-2104",
    ittRef: "ITT-MER-SCM-2104",
    totalPrice: 1_657_500,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 22,
    isoTraceabilityPts: 10,
    fatNoticeDays: 30,
    warrantyMonths: 16,
    acceptsStandardWarranty: false,
    pdfPath: null,
    insight:
      "Solid tech package but warranty offered at 16 months — Legal shortfall and high commercial-risk flag if pushed toward award.",
  },
]

/**
 * PKG-2103 — crane hook block (weak competition: 2 returns).
 */
export const BIDS_ITT_MER_SCM_2103: BidInput[] = [
  {
    id: "bid-2103-forgenord",
    supplier: "ForgeNord",
    packageId: "PKG-2103",
    ittRef: "ITT-MER-SCM-2103",
    totalPrice: 8_346_000,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 25,
    isoTraceabilityPts: 10,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: null,
    insight:
      "Only fully conforming Type 3.2 / DNV package of the two returns. Limited competition still favours ForgeNord on quality.",
  },
  {
    id: "bid-2103-heavyhook",
    supplier: "HeavyHook",
    packageId: "PKG-2103",
    ittRef: "ITT-MER-SCM-2103",
    totalPrice: 7_995_000,
    hasValidIso9001: true,
    acceptsKfk: false,
    acceptsDdpRotterdam: true,
    techCompliancePts: 18,
    isoTraceabilityPts: 8,
    fatNoticeDays: 60,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: null,
    insight:
      "Lower price but refuses mutual knock-for-knock flow-down required for vessel-side hook exchange — hard gate fail.",
  },
]

/** All curated returns across Meridian ITTs. */
export const ALL_BIDS: BidInput[] = [
  ...BIDS_ITT_MER_SCM_2101,
  ...BIDS_ITT_MER_SCM_2104,
  ...BIDS_ITT_MER_SCM_2103,
]

export function bidsForPackage(packageId: string): BidInput[] {
  return ALL_BIDS.filter((b) => b.packageId === packageId)
}

export function packagesWithBids(): string[] {
  return [...new Set(ALL_BIDS.map((b) => b.packageId))]
}
