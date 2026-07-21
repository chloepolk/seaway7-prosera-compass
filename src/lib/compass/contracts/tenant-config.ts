/* ------------------------------------------------------------------ */
/*  TenantConfig — the ENTERPRISE-INSTANCE layer (the glue)           */
/*                                                                     */
/*  An enterprise is a COMPOSITION, not a fork: pick a DomainPack,     */
/*  enable a set of CapabilityModules, attach an OrgModel and a         */
/*  WorkflowConfig, set branding + tunable parameters + data           */
/*  connections. Onboarding a new client = a new TenantConfig + data.  */
/* ------------------------------------------------------------------ */

import type {
  ExternalSourceDescriptor,
  PageDef,
  SelectorDescriptor,
} from "../domain-contract"
import type { DomainPack } from "./domain-pack"
import type { CapabilityModule } from "./capability-module"
import type { OrgModel } from "./org-model"
import type { WorkflowConfig } from "./workflow-config"

export interface BrandTokens {
  primary?: string
  border?: string
  accent?: string
  logo?: string
}

/** A longitudinal "platform improvement" index tracked over time. */
export interface PlatformIndexConfig {
  id: string
  label: string
  /** Metric key the index tracks, e.g. "jitArrivalRate". */
  metric: string
  baseline?: number
  target?: number
  /** Whether higher or lower is better. */
  direction?: "increase" | "decrease"
}

export interface TenantConfig {
  /** Tenant slug + registry id. */
  id: string
  /** Display name. */
  name: string
  subtitle?: string
  brand?: BrandTokens

  /** Which DomainPack (by id) this tenant runs. */
  domainPackId: string
  /** Which CapabilityModules (by id) are enabled. */
  enabledCapabilities: string[]
  /** OrgModel id. */
  orgModelId: string
  /** WorkflowConfig id. */
  workflowId: string

  /** Tunable business rules / thresholds (e.g. dwell tolerance, NTE caps). */
  parameters?: Record<string, number | string | boolean>
  /** Longitudinal improvement indices. */
  indices?: PlatformIndexConfig[]
  /** Data-source connection identifiers (resolved server-side, never inline). */
  dataConnections?: Record<string, string>
}

/* ------------------------------------------------------------------ */
/*  Registry — the catalog the engine resolves tenants against        */
/* ------------------------------------------------------------------ */

export interface CompassRegistry {
  domainPacks: Record<string, DomainPack>
  capabilities: Record<string, CapabilityModule>
  orgModels: Record<string, OrgModel>
  workflows: Record<string, WorkflowConfig>
}

/* ------------------------------------------------------------------ */
/*  ResolvedTenant — the fully-composed runtime object                */
/* ------------------------------------------------------------------ */

export interface ResolvedTenant {
  tenant: TenantConfig
  domainPack: DomainPack
  capabilities: CapabilityModule[]
  orgModel: OrgModel
  workflow: WorkflowConfig
  /** Merged, de-duped finding categories across enabled capabilities. */
  categories: string[]
  /** Merged pages (domain ordering preserved, capabilities appended). */
  pages: PageDef[]
  /** Merged modular-OS selectors (domain base + capabilities). */
  selectors: SelectorDescriptor[]
  /** Merged external sources (domain base + capabilities). */
  externalSources: ExternalSourceDescriptor[]
}

function uniqueBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const k = key(item)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}

/**
 * Compose a TenantConfig into a runtime object, validating that every
 * referenced pack/capability/org/workflow exists and that enabled
 * capabilities belong to the selected domain. Throws on misconfiguration —
 * config errors should fail loudly at load, not silently at render.
 */
export function resolveTenant(
  tenant: TenantConfig,
  registry: CompassRegistry,
): ResolvedTenant {
  const domainPack = registry.domainPacks[tenant.domainPackId]
  if (!domainPack) {
    throw new Error(`[compass] Tenant "${tenant.id}" references unknown domainPackId "${tenant.domainPackId}"`)
  }

  const orgModel = registry.orgModels[tenant.orgModelId]
  if (!orgModel) {
    throw new Error(`[compass] Tenant "${tenant.id}" references unknown orgModelId "${tenant.orgModelId}"`)
  }

  const workflow = registry.workflows[tenant.workflowId]
  if (!workflow) {
    throw new Error(`[compass] Tenant "${tenant.id}" references unknown workflowId "${tenant.workflowId}"`)
  }

  const capabilities = tenant.enabledCapabilities.map((capId) => {
    const cap = registry.capabilities[capId]
    if (!cap) {
      throw new Error(`[compass] Tenant "${tenant.id}" enables unknown capability "${capId}"`)
    }
    if (cap.domainPackId !== domainPack.id) {
      throw new Error(
        `[compass] Capability "${capId}" targets domain "${cap.domainPackId}" but tenant "${tenant.id}" runs domain "${domainPack.id}"`,
      )
    }
    return cap
  })

  const knownDimensions = new Set(domainPack.drillDimensions.map((d) => d.key))
  for (const cap of capabilities) {
    for (const dim of cap.requiresDimensions ?? []) {
      if (!knownDimensions.has(dim)) {
        throw new Error(`[compass] Capability "${cap.id}" requires drill dimension "${dim}" not provided by domain "${domainPack.id}"`)
      }
    }
  }

  const categories = uniqueBy(
    capabilities.flatMap((c) => [...c.categories]),
    (c) => c,
  )

  const pages = uniqueBy(
    capabilities.flatMap((c) => c.pages),
    (p) => p.id,
  )

  const selectors = uniqueBy(
    [...domainPack.catalog.internalSelectors, ...capabilities.flatMap((c) => c.selectors ?? [])],
    (s) => s.selector,
  )

  const externalSources = uniqueBy(
    [...domainPack.catalog.externalSources, ...capabilities.flatMap((c) => c.externalSources ?? [])],
    (s) => s.id,
  )

  return { tenant, domainPack, capabilities, orgModel, workflow, categories, pages, selectors, externalSources }
}
