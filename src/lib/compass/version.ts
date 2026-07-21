/* ------------------------------------------------------------------ */
/*  Versioning + provenance                                            */
/*                                                                     */
/*  Every resolved tenant can emit a manifest of the exact contract,   */
/*  pack, and capability versions it ran. Log it alongside agent       */
/*  outputs so a result is always traceable to the config that         */
/*  produced it — the basis for safe upgrades + eval baselines.        */
/* ------------------------------------------------------------------ */

import type { ResolvedTenant } from "./contracts"

/** Bumped when the contract interfaces change in a breaking way. */
export const COMPASS_CONTRACT_VERSION = "1.0.0"

export interface TenantManifest {
  contractVersion: string
  tenantId: string
  domainPack: { id: string; version: string }
  capabilities: { id: string; version: string }[]
  orgModelId: string
  workflowId: string
  resolvedAt: string
}

export function tenantManifest(resolved: ResolvedTenant): TenantManifest {
  return {
    contractVersion: COMPASS_CONTRACT_VERSION,
    tenantId: resolved.tenant.id,
    domainPack: { id: resolved.domainPack.id, version: resolved.domainPack.version },
    capabilities: resolved.capabilities.map((c) => ({ id: c.id, version: c.version })),
    orgModelId: resolved.orgModel.id,
    workflowId: resolved.workflow.id,
    resolvedAt: new Date().toISOString(),
  }
}
