/* ------------------------------------------------------------------ */
/*  Bid returns for ITT-MER-SCM-2101 (66kV Subsea Array Cable)         */
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
  /** Whether supplier accepts standard Seaway7 warranty wording (when duration is adequate). */
  acceptsStandardWarranty: boolean
  pdfPath: string
  /** Short insight used on the baseball card (augmented by the scorer). */
  insight: string
}

export const ITT_REF = "ITT-MER-SCM-2101"
export const EVAL_PACKAGE_ID = "PKG-2101"

/**
 * Demo spread:
 * - Prysmatic → hard gate fail (refuses DDP Rotterdam)
 * - Viking → passes gates but warranty 12 mo → Legal −15 + high commercial risk
 * - J-Tech / NexCore → competitive passers; NexCore lowest price, J-Tech stronger tech/QA
 */
export const BIDS_ITT_MER_SCM_2101: BidInput[] = [
  {
    id: "bid-jtech",
    supplier: "J-Tech",
    packageId: EVAL_PACKAGE_ID,
    ittRef: ITT_REF,
    totalPrice: 2_280_000,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 25,
    isoTraceabilityPts: 10,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: "/seaway7/J-Tech_Proposal_ITT-MER-SCM-2101.pdf",
    insight:
      "Full technical conformity to TS-CBL-66KV-001 with aligned FAT notice and standard warranty. Slightly above the low bid but strongest overall package quality.",
  },
  {
    id: "bid-nexcore",
    supplier: "NexCore",
    packageId: EVAL_PACKAGE_ID,
    ittRef: ITT_REF,
    totalPrice: 2_150_000,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 18,
    isoTraceabilityPts: 10,
    fatNoticeDays: 45,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: "/seaway7/NexCore_Tender_Response_ITT-MER-SCM-2101.pdf",
    insight:
      "Lowest compliant price. Partial technical conformity (unapproved fibre-optic sub) and FAT notice stretched to 45 days — price leadership is real but not clean-sheet.",
  },
  {
    id: "bid-prysmatic",
    supplier: "Prysmatic",
    packageId: EVAL_PACKAGE_ID,
    ittRef: ITT_REF,
    totalPrice: 2_050_000,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: false,
    techCompliancePts: 25,
    isoTraceabilityPts: 10,
    fatNoticeDays: 30,
    warrantyMonths: 24,
    acceptsStandardWarranty: true,
    pdfPath: "/seaway7/Prysmatic_Bid_ITT-MER-SCM-2101.pdf",
    insight:
      "Attractive headline price but fails the DDP Rotterdam Incoterms gate — not evaluable under S7-SCM-TC-2026 §4.1.",
  },
  {
    id: "bid-viking",
    supplier: "Viking",
    packageId: EVAL_PACKAGE_ID,
    ittRef: ITT_REF,
    totalPrice: 2_220_000,
    hasValidIso9001: true,
    acceptsKfk: true,
    acceptsDdpRotterdam: true,
    techCompliancePts: 20,
    isoTraceabilityPts: 8,
    fatNoticeDays: 30,
    warrantyMonths: 12,
    acceptsStandardWarranty: false,
    pdfPath: "/seaway7/Viking_Response_ITT-MER-SCM-2101.pdf",
    insight:
      "Passes hard gates with solid tech, but warranty cut to 12 months post-installation (>25% below the 24-month standard) — high commercial risk even if composite remains competitive.",
  },
]

export function bidsForPackage(packageId: string): BidInput[] {
  return BIDS_ITT_MER_SCM_2101.filter((b) => b.packageId === packageId)
}
