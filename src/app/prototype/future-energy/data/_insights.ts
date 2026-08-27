export type FindingCategory =
  | "pipeline-health"
  | "deadline-risk"
  | "savings-signal"
  | "compliance-flag"
  | "charter-interface"
  | "supplier-signal"
  | "data-quality"

export type Severity = "critical" | "high" | "medium" | "info"

export interface BPFinding {
  id: string
  category: FindingCategory
  severity: Severity
  title: string
  narrative: string
  evidence: string[]
  recommendation: string
  drillPath?: {
    page: string
    region?: string
    customer?: string
    jobType?: string
  }
  page: "operating-loop" | "tender-studio" | "bid-evaluation"
  drillLevel: "macro" | "region" | "customer"
  regionScope?: string
  customerScope?: string
}

function procurementFindings(): BPFinding[] {
  return [
    {
      id: "s7-cable-critical-path",
      category: "deadline-risk",
      severity: "critical",
      title: "66 kV array cable ITT is on the programme critical path",
      narrative:
        "PKG-2101 has a 21-day tender window. Issue it this week so the Q2 2027 cable-lay campaign still holds. Cable lead times set the installation sequence: each week of tender slip moves the lay window by the same amount.",
      evidence: [
        "Submission deadline 03 Aug 2026 — 21 days from issue.",
        "Five pre-qualified suppliers confirmed capacity for Q1 2027 delivery.",
        "PKG-2105 (J-tube seals) is sequenced behind the cable award for OD confirmation.",
      ],
      recommendation: "Draft and issue the PKG-2101 ITT via Tender Management, then route to the SCM Director for approval.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "s7-tp-fabrication-slot",
      category: "supplier-signal",
      severity: "high",
      title: "European TP fabrication slots are contested",
      narrative:
        "PKG-2102 (24 transition pieces) holds a reserved Q1 2027 fabrication slot. If the ITT is late, that slot can go to another developer. The Batch 1 benchmark of $1.99M per unit landed DDP anchors the negotiation.",
      evidence: [
        "Batch 1 award benchmark: $1.99M per unit landed DDP.",
        "Three yards on the bidder list, submission deadline 17 Aug 2026.",
      ],
      recommendation: "Complete requirements extraction against TS-STR-TP-002 and issue inside the reserved-slot window.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "s7-anode-fixed-pricing",
      category: "savings-signal",
      severity: "medium",
      title: "Anode tender exposed to aluminium alloy volatility",
      narrative:
        "PKG-2104 closes 24 July with four bidders. Clause 7.1 fixed pricing must hold without a commodities-index rider, or the $118k savings target erodes on award.",
      evidence: [
        "S7-SCM-TC-2026 §7.1: fixed firm pricing, no escalation without an agreed commodities index.",
        "4 of 4 bidders acknowledged receipt; two clarifications answered inside the 7-day window.",
      ],
      recommendation: "Hold clause 7.1 in negotiation; reject index riders unless offset by unit-price concessions.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "s7-charter-flowdown",
      category: "charter-interface",
      severity: "high",
      title: "Charter flow-downs required on vessel-side packages",
      narrative:
        "Packages with vessel operations (cable, transition pieces, hook block) carry the SUPPLYTIME 2026 knock-for-knock regime and offshore marine warranty in Section 4.0. Without that flow-down, vessel-interface liability is uninsured.",
      evidence: [
        "SUPPLYTIME 2026 Clauses 4.1/4.2 — mutual knock-for-knock indemnities.",
        "Clause 2.2 — SOLAS/MARPOL marine warranty and classification requirement.",
      ],
      recommendation: "The Contracts & Maritime Agent applies the flow-down automatically; the audit pass verifies it before approval.",
      page: "tender-studio",
      drillLevel: "macro",
    },
    {
      id: "s7-traceability-gate",
      category: "compliance-flag",
      severity: "medium",
      title: "EN 10204 traceability is a hard acceptance gate",
      narrative:
        "Type 3.1/3.2 material certificates are a condition of acceptance at the Rotterdam mobilisation port — uncertified load-bearing materials are rejected on arrival. Every ITT must state this in Section 3.0.",
      evidence: [
        "QA-MAN-2026-EPCI §4.1: EN 10204 Type 3.1/3.2 mandatory for primary steel and load-bearing components.",
        "ITP submission required 30 days prior to manufacturing.",
      ],
      recommendation: "Confirm the traceability clause survives any supplier mark-up during clarifications.",
      page: "tender-studio",
      drillLevel: "macro",
    },
  ]
}

export function generateFindings(): BPFinding[] {
  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, info: 3 }
  return procurementFindings().sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
