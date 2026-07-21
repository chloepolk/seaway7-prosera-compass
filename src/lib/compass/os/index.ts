/* ------------------------------------------------------------------ */
/*  Compass OS — the reusable modular-OS UI subpackage.                 */
/*                                                                     */
/*  Import from "@/lib/compass/os" (NOT the top "@/lib/compass" barrel) */
/*  so provider SDKs from the engine never leak into the client bundle. */
/*  A host app supplies state via <CompassOSProvider> / useCompassOS.   */
/* ------------------------------------------------------------------ */

export * from "./module-contract"
export * from "./app-spec"
export * from "./os-context"
export * from "./stripa-scaffold"
export { IntelBoard } from "./IntelBoard"
export { TickerBar } from "./TickerBar"
export { SpecRenderer, summarizeSpec, resolvePath } from "./SpecRenderer"
export { CreateAppModal } from "./CreateAppModal"
