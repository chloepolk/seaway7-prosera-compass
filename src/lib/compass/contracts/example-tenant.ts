/* ------------------------------------------------------------------ */
/*  Worked example — composing one enterprise from the layered model   */
/*                                                                     */
/*  Shows how a DomainPack + CapabilityModules + OrgModel +            */
/*  WorkflowConfig + TenantConfig snap together through resolveTenant. */
/*  Neutral placeholders — replace with real packs/capabilities.       */
/* ------------------------------------------------------------------ */

import type { DomainPack } from "./domain-pack"
import type { CapabilityModule } from "./capability-module"
import type { OrgModel } from "./org-model"
import { DEFAULT_OPERATING_LOOP } from "./workflow-config"
import {
  resolveTenant,
  type CompassRegistry,
  type ResolvedTenant,
  type TenantConfig,
} from "./tenant-config"

/* ---- A minimal domain pack ("logistics") ------------------------- */

interface DemoComputed {
  totals: { shipments: number }
}

const logisticsPack: DomainPack<"operations" | "finance", "Internal" | "Telematics", DemoComputed> = {
  id: "logistics",
  label: "Inbound Logistics",
  version: "0.1.0",
  specialists: [
    {
      id: "operations",
      label: "Operations",
      systemPrompt: "You are the Operations Specialist for inbound logistics.",
      buildContext: (data) => ({ shipments: data.totals.shipments }),
    },
    {
      id: "finance",
      label: "Finance",
      systemPrompt: "You are the Finance Specialist for inbound logistics.",
      buildContext: (data) => ({ shipments: data.totals.shipments }),
    },
  ],
  dataSources: ["Internal", "Telematics"],
  drillDimensions: [
    { key: "region", label: "Region" },
    { key: "dc", label: "Distribution Center", parent: "region" },
  ],
  prompts: {
    orchestrator: "Synthesize specialist findings into ranked recommendations.",
    verifier: "Audit the orchestrator output against source data.",
    chat: "Answer operating questions grounded in the dataset.",
    sandbox: "Run a what-if board exercise.",
    agent: "Execute one task on one mission and report progress.",
    appArchitect: "Propose analytical apps from the available data.",
    appComposer: "Turn one app idea into a single AppSpec JSON object.",
  },
  catalog: {
    internalSelectors: [
      { selector: "totals", kind: "kpi", describe: "Top-line totals", fields: ["shipments"] },
    ],
    externalSources: [],
    buildCatalogPromptContext: () => "INTERNAL DATA:\n  - totals (kpi): Top-line totals",
  },
  data: {
    compute: (): DemoComputed => ({ totals: { shipments: 0 } }),
    buildChatBriefing: (d) => `Snapshot: ${d.totals.shipments} shipments.`,
  },
  buildOrchestratorContext: (data) => ({ shipments: data.totals.shipments }),
  buildVerifierContext: (data) => ({ shipments: data.totals.shipments }),
}

/* ---- Two capability modules -------------------------------------- */

const dwellCapability: CapabilityModule<DemoComputed> = {
  id: "dwell",
  label: "Dwell Time Accuracy",
  version: "0.1.0",
  domainPackId: "logistics",
  pages: [{ id: "dwell", label: "Dwell Time", icon: "Timer" }],
  categories: ["dwell-deviation", "structural-delay"],
  requiresDimensions: ["dc"],
}

const clusteringCapability: CapabilityModule<DemoComputed> = {
  id: "clustering",
  label: "Store Clustering",
  version: "0.1.0",
  domainPackId: "logistics",
  pages: [{ id: "clustering", label: "Clustering", icon: "Network" }],
  categories: ["cluster-signal"],
}

/* ---- An org model ------------------------------------------------- */

const retailOrg: OrgModel = {
  id: "retail-eu-grocery",
  label: "EU Grocery Retail",
  personas: [
    { id: "analyst", label: "Analyst", capabilities: "*", permissions: { canViewFinancials: true } },
    { id: "exec", label: "Executive", capabilities: "*", defaultPage: "dwell", permissions: { canApprove: true, canViewFinancials: true } },
    { id: "store-manager", label: "Store Manager", capabilities: ["dwell"], visiblePages: ["dwell"] },
  ],
  raci: [
    { stage: "decide", accountable: ["exec"], responsible: ["analyst"], informed: ["store-manager"] },
  ],
}

/* ---- The registry + a tenant ------------------------------------- */

export const exampleRegistry: CompassRegistry = {
  domainPacks: { logistics: logisticsPack as DomainPack },
  capabilities: { dwell: dwellCapability as CapabilityModule, clustering: clusteringCapability as CapabilityModule },
  orgModels: { "retail-eu-grocery": retailOrg },
  workflows: { "standard-operating-loop": DEFAULT_OPERATING_LOOP },
}

export const exampleTenant: TenantConfig = {
  id: "northwind-grocery",
  name: "Prosera Compass",
  subtitle: "Transportation · Operating Cockpit",
  brand: { primary: "#004F9A" },
  domainPackId: "logistics",
  enabledCapabilities: ["dwell", "clustering"],
  orgModelId: "retail-eu-grocery",
  workflowId: "standard-operating-loop",
  parameters: { dwellToleranceMinutes: 10, rollingWindowDeliveries: 10 },
  indices: [
    { id: "jit", label: "JIT Arrival Rate", metric: "jitArrivalRate", baseline: 0.72, target: 0.9, direction: "increase" },
  ],
  dataConnections: { warehouse: "env:NORTHWIND_WAREHOUSE_URL" },
}

/** The fully-composed runtime object the engine would consume. */
export const exampleResolved: ResolvedTenant = resolveTenant(exampleTenant, exampleRegistry)
