# Compass Library — Scaffold & Domain Contract

The reusable starting point for any new **Prosera Compass** project.

Compass is an AI operating cockpit: a 3-stage agent pipeline (Specialists →
Orchestrator/BluePilot → Verifier), a Mission-to-ROI **Diamond**, a modular
**app OS** (app-architect/composer + spec-renderer), a **What-If** sandbox, a
**Summarize/BI** drawer, and a drill-down data model.

Everything that makes Compass *Compass* is the **engine**. Everything that makes
it about a specific business is the **domain**. This folder defines the seam
between them so a new project = implement one [`DomainConfig`](./domain-contract.ts).

> Status: the contract + worked example are the source of truth to refer to.
> The two existing prototypes (`prosera-compass` = Field Services,
> `transportation`) still inline their domain inside the engine files; migrating
> them to import the engine and pass a `DomainConfig` is the next phase.

---

## Files

| File | Purpose |
| --- | --- |
| `domain-contract.ts` | The `DomainConfig` interface + generic agent envelopes + schema builders. **The contract.** |
| `example-domain.ts` | A neutral, compiling reference `DomainConfig` to copy field-by-field. |
| `engine/llm.ts` | Domain-agnostic provider plumbing (OpenAI/Anthropic clients, retry/fallback, streaming, JSON extraction). **Server-only.** |
| `engine/schemas.ts` | Shared modular-OS schema (`ARCHITECT_SCHEMA`). |
| `engine/data-adapter.ts` | `DataConnector` seam — swap static fixtures → warehouse/API behind `ComputedData`. |
| `contracts/*` | Multi-tenant layers: `DomainPack`, `CapabilityModule`, `OrgModel`, `WorkflowConfig`, `TenantConfig` + `resolveTenant`. |
| `version.ts` | `COMPASS_CONTRACT_VERSION` + `tenantManifest()` for provenance/upgrades. |
| `evals/*` | Domain-agnostic golden-set harness (types, invariants, runner). |
| `README.md` | This map + the new-project recipe. |

> **Import discipline:** the top barrel `@/lib/compass` re-exports `engine` (which imports the LLM SDKs). **Client-reachable** modules must import types from the submodules (`@/lib/compass/domain-contract`, `@/lib/compass/contracts`) — never the top barrel — so no provider SDK leaks into the browser bundle.

---

## Framework vs Domain map

Inventory of `src/app/prototype/prosera-compass/**`. **Engine** files are reused
verbatim; **Domain** files are what you replace per project (and what the
`DomainConfig` contract abstracts).

### Engine — reuse as-is (do not edit per project)

- `_store.tsx` — orchestration store (pipeline, drill, sandbox, OS state)
- `_shell.tsx` — layout chrome, sidebar, right rail, login *(nav list is domain)*
- `_diamond/` — `MissionDiamond`, `DiamondBaseNode`, `ROIValue`, `StageTimeline`,
  `ProfitabilityMatrix`, `AccumulatedRoiStrip`, `types.ts`, `stages.ts` *(generic geometry)*
- `_modules/` — `spec.ts`, `types.ts` (AppSpec model) + `_components/spec-renderer.tsx`,
  `create-app-modal.tsx` (modular OS engine)
- `_sandbox/SandboxDrawer.tsx`, `_sandbox/types.ts` — What-If shell
- `_bi/BiDashboardDrawer.tsx`, `_components/bluepilot-summary.tsx` — Summarize/BI
- `_components/intel-board.tsx`, `stripa-scaffold.tsx` — right-rail intelligence
- `layout.tsx`, `page.tsx`

### Domain — replace per project (abstracted by `DomainConfig`)

| Domain file(s) | Contract field |
| --- | --- |
| `agents/_types.ts` (SpecialistId, DataSource, categories, schemas) | `specialists[].id`, `dataSources`, `categories` + `buildSpecialistSchema` / `buildOrchestratorSchema` |
| `agents/_context.ts` (`build*Context`, `buildChatBriefing`) | `specialists[].buildContext`, `buildOrchestratorContext`, `buildVerifierContext`, `data.buildChatBriefing` |
| `agents/_prompts.ts` (all prompts) | `specialists[].systemPrompt`, `prompts.*` |
| `data/**` (raw, transform, validate, insights, benchmarks, …) | `data.compute()` (→ `TComputed`), `knowledgeBase` |
| `_modules/catalog.ts` (selectors, external sources) | `catalog` |
| `_pages/**` + `NAV_ITEMS` in `_shell.tsx` | `pages` |
| `_sandbox/projections.ts`, `_sandbox/prompt.ts` (domain math/prompt) | `prompts.sandbox` + domain projection logic |
| `_diamond/org.ts`, `adapter.ts`, `agents.ts` (domain wiring) | drives Diamond from domain data |
| `meta` (name/subtitle/brand), drill dims | `meta`, `drillDimensions` |

### API routes — `src/app/api/<slug>/**`

One set per project (architect, compose, orchestrate, specialist/*, verify,
sandbox, chat). They import the domain prompts/context. With the contract these
become thin handlers that read the active `DomainConfig`.

---

## New-project recipe (today)

Until the engine consumes `DomainConfig` directly, a new project is a faithful
clone + domain swap. The contract tells you exactly *what* to swap.

1. **Clone the engine.** Copy `prototype/prosera-compass/` →
   `prototype/<slug>/` and `api/acme/` → `api/<slug>/`.
2. **Rewire paths.** Replace `@/app/prototype/prosera-compass` → `.../<slug>`
   and `/api/acme/` → `/api/<slug>/` across the copy.
3. **Register.** Add `<slug>` to `src/lib/prototypes.ts` and `src/proxy.ts`.
4. **Implement the `DomainConfig`** (see `example-domain.ts`) and swap the
   **Domain** files above to match it — data, prompts, context, catalog, pages,
   types, meta. Leave every **Engine** file untouched.
5. **Verify.** `npx tsc --noEmit` clean; load `/prototype/<slug>`; smoke-test
   sandbox / app-architect / chat endpoints.

## New-project recipe (target)

Once the engine is refactored to accept a `DomainConfig`:

1. Create `src/domains/<slug>.ts` exporting a `DomainConfig`.
2. Register it; the shared engine renders it. No engine files copied.

---

## Why a contract, not just a clone

A clone drifts: every engine fix has to be re-applied to each copy, and divesting
a domain means hunting changes across ~10 interleaved files. The `DomainConfig`
makes the seam explicit — one object to fill, one engine to maintain.

---

## Scaling model (multi-tenant) — `contracts/`

`DomainConfig` is the v1 (single-prototype) seam. To scale across **many
enterprises × domains × use cases × org structures × workflows**, those axes vary
independently and are split into five layered contracts in `contracts/`:

| Layer | File | Owns | Varies by |
| --- | --- | --- | --- |
| **DomainPack** | `domain-pack.ts` | Vertical knowledge: specialists, prompts, knowledge base, data shape, sources | Vertical |
| **CapabilityModule** | `capability-module.ts` | A composable use case: pages, finding categories, selectors, context slice | Plug-in (many per domain) |
| **OrgModel** | `org-model.ts` | Personas, RACI, permissions/entitlements | Enterprise |
| **WorkflowConfig** | `workflow-config.ts` | Operating-loop stages, gates, approvals, automations | Enterprise |
| **TenantConfig** (glue) | `tenant-config.ts` | Branding, enabled domain + capabilities, params/thresholds, indices, data connections | Enterprise instance |

Composition model:

```
Engine (shared) → TenantConfig → DomainPack + CapabilityModule[] + OrgModel + WorkflowConfig
```

`resolveTenant(tenant, registry)` (in `tenant-config.ts`) validates every
reference, checks capabilities belong to the domain, and merges categories /
pages / selectors / external sources across the enabled capabilities into a
`ResolvedTenant` the engine consumes. Config errors throw at load, not render.
See `contracts/example-tenant.ts` for a full worked composition.

**Principle: the engine is the product; a domain is a pack; a use case is a
module; an enterprise is a config + a data connection.** Onboarding a client is a
new `TenantConfig` + data wiring, never a fork.

### Recommended sequencing — status

1. ✅ Collapse to one engine (`api/acme` + `api/transportation` both on `engine/`; per-prototype `_openai.ts` deleted).
2. ✅ Push the contract into the UI (transportation nav + branding read from `DomainConfig`; store data enters via the data adapter).
3. ✅ Split `DomainConfig` into `DomainPack` + `CapabilityModule`s (`DomainConfig` is now a thin assembly).
4. ✅ Stored registry + `resolveTenant` (transportation tenant composes pack + capabilities + org + workflow; composition is load-bearing — it drives the live nav/categories). Next: move the registry to config-as-data (DB/Edge Config).
5. ✅ Per-tenant data adapter seam behind `ComputedData` (`engine/data-adapter.ts` + a server connector; static today, warehouse-ready). Next: implement a real warehouse connector + a server data route.
6. ✅ Versioning + golden-set eval scaffold (`version.ts` manifest + `evals/` harness + a transportation golden set). Next: capture live outputs into the golden set + wire into CI.

### Reference implementation — `src/app/prototype/transportation/`

The transportation prototype is the worked example of the full stack. Copy this layout for a new project:

| File | Layer |
| --- | --- |
| `_domain/pack.ts` | `DomainPack` — vertical knowledge (specialists, prompts, KB, data, catalog, drill). |
| `_domain/capabilities.ts` | `CapabilityModule[]` — one per cockpit page (pages + finding categories). |
| `_domain/tenant.ts` | Registry + `OrgModel` + `TenantConfig` → `resolveTenant`. |
| `_domain/data.server.ts` | Server data connector (static → warehouse). |
| `_domain/golden.ts` | Golden set + eval context for CI. |
| `domain.ts` | Thin `DomainConfig` assembly the routes + shell consume. |

> Note: transportation still carries the inherited Field Services *content* (it began as a faithful clone). Phase 2 swaps the data/prompts inside the pack — none of the wiring above changes.
