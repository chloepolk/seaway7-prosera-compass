/* ------------------------------------------------------------------ */
/*  Data adapter seam — per-tenant data behind a stable ComputedData   */
/*                                                                     */
/*  Pages + agents only ever read the domain's `ComputedData` shape.   */
/*  WHERE that data comes from is a tenant concern: a baked-in static   */
/*  dataset today, a warehouse / API connector tomorrow. This seam     */
/*  lets a tenant swap the source without touching pages, agents, or    */
/*  the DomainPack — the ComputedData contract is the firewall.        */
/* ------------------------------------------------------------------ */

import type { DomainDataAdapter } from "../domain-contract"

/** Runtime context handed to a connector (resolved server-side). */
export interface DataContext {
  tenantId: string
  parameters?: Record<string, number | string | boolean>
  /** Connection identifiers (URLs/handles) resolved from env, never inline. */
  connections?: Record<string, string>
}

/**
 * A source of `ComputedData`. `load` may be sync (static fixtures) or async
 * (warehouse/API). Everything downstream awaits it uniformly.
 */
export interface DataConnector<TComputed> {
  id: string
  load: (ctx: DataContext) => Promise<TComputed> | TComputed
}

/** Wrap a DomainPack's synchronous `compute` as the default static connector. */
export function staticConnector<TComputed>(
  adapter: Pick<DomainDataAdapter<TComputed>, "compute">,
  id = "static",
): DataConnector<TComputed> {
  return { id, load: () => adapter.compute() }
}

/** Load computed data through any connector, normalizing sync/async. */
export async function loadComputed<TComputed>(
  connector: DataConnector<TComputed>,
  ctx: DataContext,
): Promise<TComputed> {
  return await connector.load(ctx)
}

/**
 * Pick the connector a tenant should use. Falls back to the static default
 * when no named connector is registered for the tenant's data connection.
 * This is the single decision point routes call to get their data source.
 */
export function resolveConnector<TComputed>(opts: {
  staticAdapter: Pick<DomainDataAdapter<TComputed>, "compute">
  /** Optional registry of named connectors (e.g. { warehouse: pgConnector }). */
  connectors?: Record<string, DataConnector<TComputed>>
  /** Which named connection to prefer, e.g. tenant.dataConnections?.warehouse. */
  prefer?: string
}): DataConnector<TComputed> {
  const { staticAdapter, connectors, prefer } = opts
  if (prefer && connectors && connectors[prefer]) return connectors[prefer]
  return staticConnector(staticAdapter)
}
