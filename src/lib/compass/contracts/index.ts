/* Compass layered contracts — the multi-tenant scaling model.
 *
 *   Engine (shared) → TenantConfig → DomainPack + CapabilityModule[]
 *                                    + OrgModel + WorkflowConfig
 *
 * See ../README.md for the full architecture + sequencing. */
export * from "./domain-pack"
export * from "./capability-module"
export * from "./org-model"
export * from "./workflow-config"
export * from "./tenant-config"
