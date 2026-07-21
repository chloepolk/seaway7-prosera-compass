/* ------------------------------------------------------------------ */
/*  WorkflowConfig — the WORKFLOW layer                               */
/*                                                                     */
/*  The operating loop / PMO flow: the mission-to-ROI stages, their    */
/*  gates, who approves, and what automations fire. Configurable per   */
/*  enterprise rather than hardcoded in the Diamond.                   */
/* ------------------------------------------------------------------ */

export interface WorkflowStageDef {
  /** Stable id, e.g. "understand" | "decide" | "execute" | "outcome_roi". */
  id: string
  /** Display label. */
  label: string
  /** Checklist items that gate advancing past this stage. */
  gate?: string[]
  /** Persona ids whose approval is required to advance. */
  approvers?: string[]
  /** Automation ids triggered on entering this stage. */
  automations?: string[]
}

export interface WorkflowConfig {
  /** Stable id, e.g. "standard-operating-loop". */
  id: string
  label: string
  /** Ordered stages of the operating loop / PMO flow. */
  stages: WorkflowStageDef[]
  /** Require explicit human approval at decision gates (no silent automation). */
  requireHumanApproval?: boolean
}

/**
 * The default 5-gate operating loop, mirroring the generic Mission Diamond
 * (`_diamond/stages.ts`). Tenants can override stages/gates/approvers.
 */
export const DEFAULT_OPERATING_LOOP: WorkflowConfig = {
  id: "standard-operating-loop",
  label: "Mission-to-ROI Operating Loop",
  requireHumanApproval: true,
  stages: [
    { id: "mission_created", label: "Mission Created", gate: ["Objective created", "Sponsor assigned", "Baseline captured", "Success metric selected"] },
    { id: "understand", label: "Understand", gate: ["Agents collect evidence", "Constraints discovered", "Data quality assessed", "SMEs consulted"] },
    { id: "decide", label: "Decide", gate: ["Recommendation generated", "Tradeoffs shown", "Confidence scored", "Human approval recorded"] },
    { id: "execute", label: "Execute", gate: ["Work items created", "Owners assigned", "Deadlines visible", "Progress tracked"] },
    { id: "outcome_roi", label: "Outcome / ROI", gate: ["Outcome measured", "KPI movement captured", "Financial impact calculated", "ROI validated"] },
  ],
}
