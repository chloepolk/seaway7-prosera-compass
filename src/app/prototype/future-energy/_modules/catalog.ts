/* ------------------------------------------------------------------ */
/*  Data catalog — what the app-architect agent is allowed to see.     */
/*                                                                     */
/*  INTERNAL selectors are hard bindings: they must resolve against    */
/*  ComputedData or the SpecRenderer skips the block (no broken UI).   */
/*  EXTERNAL sources are the discoverable palette: the agent surfaces  */
/*  them freely and bakes a snapshot into the spec (provenance-tagged).*/
/* ------------------------------------------------------------------ */

export interface SelectorDescriptor {
  selector: string
  kind: "kpi" | "series" | "table"
  describe: string
  fields?: string[]
}

/** Curated, safe internal bindings for commercial-field-services pricing. */
export const INTERNAL_SELECTORS: SelectorDescriptor[] = [
  { selector: "salesPerformance", kind: "kpi", describe: "Quote conversion performance", fields: ["overallWinRate", "totalQuotes", "medianDaysToConvert"] },
  { selector: "quotingProfile", kind: "kpi", describe: "Quoted vs NTE-dispatch mix", fields: ["quotedPct", "dispatchPct", "quoteWinRate"] },
  { selector: "portfolioSummary", kind: "kpi", describe: "Portfolio totals", fields: ["totalRevenue", "totalMargin", "avgMarginPct", "totalJobs"] },
  { selector: "fuelExposure.actuals", kind: "kpi", describe: "Fleet fuel actuals", fields: ["totalAnnualSpend", "latestMonthSpend", "spikeImpactDollars", "unleadedPctOfVolume"] },
  { selector: "quoteAnalysis.byJobType", kind: "series", describe: "Win rate & volume by job type", fields: ["jobType", "overallWinRate", "totalQuotes", "ceilingAmount"] },
  { selector: "pricingBandInsights", kind: "table", describe: "Sweet-spot / ceiling economics per job type", fields: ["jobType", "sweetSpotWinRate", "aboveCeilingWinRate", "expectedLossAboveCeiling", "repricingOpportunityValue", "pendingAboveCeiling"] },
  { selector: "quoteAnalysis.atRiskQuotes", kind: "table", describe: "Quotes likely to be lost", fields: ["jobNumber", "customerName", "jobType", "totalAmountQuoted", "quoteAgeDays", "riskScore", "aboveCeiling"] },
  { selector: "dispatchAuthEvents", kind: "table", describe: "NTE-authorized dispatch & escalations", fields: ["jobNumber", "customerName", "jobType", "totalAmount", "amountNTE", "revenueToNteRatio", "visitCount", "workflowOutcome"] },
  { selector: "fuelExposure.actuals.combinedMonthly", kind: "series", describe: "Monthly fleet fuel spend", fields: ["label", "spend"] },
]

export interface ExternalSourceDescriptor {
  id: string
  label: string
  provider: string
  summary: string
  /** Whether the figures are wired into the prototype today. */
  wired: boolean
}

/**
 * The discoverable external palette for commercial field services. The agent
 * surfaces these as options without the user naming them; figures are baked
 * into the spec as a provenance-tagged snapshot at creation time.
 */
export const EXTERNAL_SOURCES: ExternalSourceDescriptor[] = [
  { id: "eia-fuel", label: "Retail fuel prices", provider: "EIA", summary: "Weekly retail diesel/gasoline by PADD region — fleet cost & surcharge timing.", wired: true },
  { id: "noaa-weather", label: "Weather severity & extremes", provider: "NOAA", summary: "Storm history + degree-day severity driving emergency demand (STRIPA).", wired: true },
  { id: "bls-wages", label: "Trade labor wages", provider: "BLS OES", summary: "HVAC/plumbing/electrical/maintenance wages by metro — labor-cost floor for billing rates.", wired: true },
  { id: "census-permits", label: "Building permits", provider: "Census BPS", summary: "New-construction permit velocity by metro — install/retrofit demand leading indicator.", wired: true },
  { id: "bls-ppi-materials", label: "Equipment & commodity PPI", provider: "BLS PPI", summary: "HVAC/refrigeration equipment, copper, steel & refrigerant input-cost indices — margin erosion & pricing power.", wired: true },
  { id: "eia-energy", label: "Commercial energy prices", provider: "EIA", summary: "Commercial electricity & natural gas by region — efficiency-upsell ROI and seasonal demand.", wired: true },
  { id: "noaa-degree-days", label: "Heating/Cooling degree-day normals", provider: "NOAA", summary: "Monthly HDD/CDD climatology per region — hardens seasonal demand forecasts.", wired: true },
  { id: "epa-aim-refrigerant", label: "Refrigerant phasedown timeline", provider: "EPA AIM Act", summary: "HFC GWP caps and R-410A→R-454B transition — regulatory retrofit-demand catalyst.", wired: true },
]

/** Compact description injected into the architect/composer prompts. */
export function buildCatalogPromptContext(): string {
  const internal = INTERNAL_SELECTORS
    .map(s => `  - ${s.selector} (${s.kind}): ${s.describe}${s.fields ? ` [fields: ${s.fields.join(", ")}]` : ""}`)
    .join("\n")
  const external = EXTERNAL_SOURCES
    .map(s => `  - ${s.id} — ${s.label} (${s.provider}): ${s.summary}`)
    .join("\n")
  return [
    "INTERNAL DATA (hard bindings — selector dot-paths into the portfolio dataset; only these resolve live):",
    internal,
    "",
    "EXTERNAL SOURCES (discoverable palette for commercial field services — you surface the relevant ones; provide a baked figure snapshot for any you use):",
    external,
  ].join("\n")
}
