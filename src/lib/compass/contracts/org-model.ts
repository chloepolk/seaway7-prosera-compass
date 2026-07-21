/* ------------------------------------------------------------------ */
/*  OrgModel — the ORG-STRUCTURE layer                                */
/*                                                                     */
/*  Who uses the cockpit and what they can see/do: personas, their     */
/*  entitlements, and RACI across the workflow. Varies per enterprise. */
/* ------------------------------------------------------------------ */

export interface PermissionSet {
  /** May approve at workflow decision gates. */
  canApprove?: boolean
  /** May execute / trigger actions and automations. */
  canExecute?: boolean
  /** May change tenant parameters/configuration. */
  canConfigure?: boolean
  /** May see financial figures (ROI, margin, cost). */
  canViewFinancials?: boolean
}

export interface Persona {
  /** Stable id, e.g. "analyst" | "exec" | "store-manager" | "tms". */
  id: string
  /** Display label. */
  label: string
  /** Capability ids this persona can access, or "*" for all enabled. */
  capabilities: string[] | "*"
  /** Page ids visible to this persona, or "*" for all. */
  visiblePages?: string[] | "*"
  /** Default landing page id. */
  defaultPage?: string
  /** What this persona may do. */
  permissions?: PermissionSet
}

export interface RaciAssignment {
  /** Workflow stage id this assignment applies to. */
  stage: string
  responsible?: string[]
  accountable?: string[]
  consulted?: string[]
  informed?: string[]
}

export interface OrgModel {
  /** Stable id, e.g. "retail-eu-grocery". */
  id: string
  label: string
  personas: Persona[]
  /** RACI across workflow stages, by persona id. */
  raci?: RaciAssignment[]
}
