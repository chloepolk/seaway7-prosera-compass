/* ------------------------------------------------------------------ */
/*  EPA AIM Act — HFC Phasedown & Technology-Transition Timeline       */
/*  Regulatory DEMAND catalyst for HVAC/refrigeration field services   */
/*                                                                     */
/*  Sources:                                                           */
/*   - EPA, American Innovation and Manufacturing (AIM) Act of 2020:   */
/*     HFC production/consumption phasedown schedule.                  */
/*     https://www.epa.gov/hfcs/frequent-questions-phasedown-hydrofluorocarbons */
/*   - EPA Technology Transitions Program — sector GWP limits & dates. */
/*     https://www.epa.gov/hfcs/technology-transitions-program         */
/*   - EPA Technology Transitions Final Rule Fact Sheet (updated May   */
/*     2026); Holland & Knight analysis of the 2026 amendments.        */
/*                                                                     */
/*  Data vintage: AIM Act (enacted 2020-12-27); 2023 Technology        */
/*  Transitions Rule; May 2026 amendments. GWP values per IPCC AR4.    */
/*  Cross-verified: GWP-700 cap on new residential/light-commercial AC */
/*  effective 2025-01-01; R-410A GWP 2,088; R-454B 466; R-32 675.      */
/*  Retrofit-demand projections are ACME estimates (LOW-MEDIUM         */
/*  confidence) derived from the regulatory schedule + installed base. */
/* ------------------------------------------------------------------ */

export interface RefrigerantProfile {
  name: string;
  /** Global Warming Potential (IPCC AR4 basis). */
  gwp: number;
  safetyClass: "A1" | "A2L" | "A2" | "A3" | "B1";
  status: "phasing-out" | "current-standard" | "legacy-service-only";
  notes: string;
}

export const refrigerants: RefrigerantProfile[] = [
  {
    name: "R-410A",
    gwp: 2088,
    safetyClass: "A1",
    status: "legacy-service-only",
    notes: "Banned for new equipment manufacture/import under the GWP-700 cap (2025-01-01). Existing systems remain legal to operate and service; reclaimed/wholesale price climbing fast as supply tightens.",
  },
  {
    name: "R-454B",
    gwp: 466,
    safetyClass: "A2L",
    status: "current-standard",
    notes: "Primary R-410A replacement for ducted residential and light-commercial systems (Carrier/Trane/Lennox/Goodman). Operates within ~5% of R-410A pressures; requires A2L-rated tools, leak detection and technician training.",
  },
  {
    name: "R-32",
    gwp: 675,
    safetyClass: "A2L",
    status: "current-standard",
    notes: "Single-component A2L used widely in mini-splits (Daikin/Mitsubishi/LG). Slightly higher capacity, can be top-off charged in vapor phase, mature global track record.",
  },
];

export interface AimMilestone {
  /** Effective calendar year of the milestone. */
  year: number;
  /** YYYY-MM-DD if a precise date applies. */
  effectiveDate: string | null;
  category: "phasedown-cap" | "sector-restriction" | "amendment";
  title: string;
  detail: string;
  /** Qualitative field-services demand implication. */
  demandImplication: string;
}

/** Production/consumption allowance caps as a % of the AIM Act baseline. */
export const phasedownSchedule: { period: string; capPctOfBaseline: number }[] = [
  { period: "2020-2023", capPctOfBaseline: 90 },
  { period: "2024-2028", capPctOfBaseline: 60 },
  { period: "2029-2033", capPctOfBaseline: 30 },
  { period: "2034-2035", capPctOfBaseline: 20 },
  { period: "2036+", capPctOfBaseline: 15 },
];

export const aimTimeline: AimMilestone[] = [
  {
    year: 2024,
    effectiveDate: "2024-01-01",
    category: "phasedown-cap",
    title: "HFC supply cut to 60% of baseline",
    detail: "Allowed HFC production & consumption steps down from 90% to 60% of the historic baseline — a 30-point cut that anchors the steepest part of the phasedown.",
    demandImplication: "Virgin R-410A supply tightens sharply; distributor prices begin a sustained climb that raises the cost of every legacy-system recharge.",
  },
  {
    year: 2025,
    effectiveDate: "2025-01-01",
    category: "sector-restriction",
    title: "GWP-700 cap on new AC / heat pumps + GWP-150 on standalone retail refrigeration",
    detail: "New residential & light-commercial AC and heat pump equipment must use refrigerant <700 GWP, ending R-410A (2,088) in new manufacture; new standalone retail-food refrigeration capped at 150 GWP. Comfort-cooling chillers also move to 700 GWP.",
    demandImplication: "All new installs flip to A2L (R-454B/R-32). Drives A2L-tooling, leak-detection and technician-certification spend; widens the install-vs-repair decision on aging R-410A equipment.",
  },
  {
    year: 2026,
    effectiveDate: "2026-01-01",
    category: "sector-restriction",
    title: "GWP-700 cap extends to industrial process chillers (>-30 C exit)",
    detail: "Industrial process refrigeration chillers operating above -30 C/-22 F join the 700 GWP limit for new systems.",
    demandImplication: "Commercial/industrial customers with chiller fleets face A2L conversion planning; opens engineered-retrofit and chiller-replacement project pipeline.",
  },
  {
    year: 2026,
    effectiveDate: "2026-05-01",
    category: "amendment",
    title: "EPA amends Technology Transitions install deadlines",
    detail: "EPA extended several installation deadlines (e.g. cold-storage warehouse systems to 2032 under an interim 700 GWP limit) and removed the install-deadline for legacy residential/light-commercial AC manufactured before 2025-01-01, allowing remaining inventory to be installed.",
    demandImplication: "Relieves stranded-inventory risk and lets contractors install through legacy R-410A stock; softens the near-term retrofit cliff for cold storage while preserving the long-run transition.",
  },
  {
    year: 2028,
    effectiveDate: "2028-01-01",
    category: "sector-restriction",
    title: "Final sector restrictions take effect",
    detail: "The latest of the Technology Transitions sector compliance dates; a 3-year product sell-through window follows manufacture/import compliance dates.",
    demandImplication: "Most new-equipment subsectors fully transitioned; service revenue increasingly concentrated on maintaining/replacing the shrinking legacy R-410A installed base.",
  },
  {
    year: 2029,
    effectiveDate: "2029-01-01",
    category: "phasedown-cap",
    title: "HFC supply cut to 30% of baseline",
    detail: "Allowed HFC production & consumption halves again, to 30% of baseline.",
    demandImplication: "Legacy R-410A becomes scarce and expensive enough that repair-vs-replace economics tip decisively toward A2L replacement — a multi-year replacement-demand catalyst.",
  },
];

/* ------------------------------------------------------------------ */
/*  Projected retrofit / replacement-demand implications by year       */
/*  ACME estimate: share of the legacy R-410A installed base expected  */
/*  to convert to A2L equipment, plus the directional service-cost     */
/*  pressure from refrigerant scarcity. (LOW-MEDIUM confidence.)        */
/* ------------------------------------------------------------------ */

export interface RetrofitOutlookYear {
  year: number;
  /** Est. annual share of legacy R-410A installed base converting to A2L. */
  legacyConversionRate: number;
  /** Directional R-410A service-cost pressure vs prior year. */
  r410aCostPressure: "rising" | "steep" | "severe";
  note: string;
}

export const retrofitOutlook: RetrofitOutlookYear[] = [
  { year: 2025, legacyConversionRate: 0.06, r410aCostPressure: "rising", note: "First full year of A2L-only new equipment; conversions still mostly failure-driven replacements." },
  { year: 2026, legacyConversionRate: 0.08, r410aCostPressure: "steep", note: "R-410A wholesale up ~50-100% over 2024; chiller restriction widens commercial retrofit pipeline." },
  { year: 2027, legacyConversionRate: 0.10, r410aCostPressure: "steep", note: "A2L premiums easing as production scales, but legacy recharge cost keeps tilting toward replacement." },
  { year: 2028, legacyConversionRate: 0.12, r410aCostPressure: "steep", note: "Final sector restrictions land; planned A2L replacement projects accelerate." },
  { year: 2029, legacyConversionRate: 0.15, r410aCostPressure: "severe", note: "30%-of-baseline supply cap makes R-410A scarce; replacement demand peaks." },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface RefrigerantOutlook {
  currentYear: number;
  activePhasedownCapPct: number;
  currentYearMilestones: AimMilestone[];
  legacyRefrigerant: RefrigerantProfile;
  replacementRefrigerants: RefrigerantProfile[];
  currentRetrofitOutlook: RetrofitOutlookYear | null;
  headline: string;
}

/** Summarize the current-year regulatory & demand implications. */
export function getRefrigerantOutlook(currentYear = 2026): RefrigerantOutlook {
  const capRow = phasedownSchedule.find(p => {
    if (p.period.endsWith("+")) return currentYear >= parseInt(p.period, 10);
    const [start, end] = p.period.split("-").map(Number);
    return currentYear >= start && currentYear <= end;
  });
  const legacy = refrigerants.find(r => r.name === "R-410A")!;
  const replacements = refrigerants.filter(r => r.status === "current-standard");
  const outlook = retrofitOutlook.find(r => r.year === currentYear) ?? null;
  const activePhasedownCapPct = capRow?.capPctOfBaseline ?? 60;

  const headline = `AIM Act caps HFC supply at ${activePhasedownCapPct}% of baseline in ${currentYear}; R-410A (GWP ${legacy.gwp}) is service-only as new equipment runs A2L (R-454B GWP 466 / R-32 GWP 675). Rising R-410A scarcity is a structural replacement-demand catalyst — est. ${outlook ? Math.round(outlook.legacyConversionRate * 100) : 8}% of the legacy installed base converting this year.`;

  return {
    currentYear,
    activePhasedownCapPct,
    currentYearMilestones: aimTimeline.filter(m => m.year === currentYear),
    legacyRefrigerant: legacy,
    replacementRefrigerants: replacements,
    currentRetrofitOutlook: outlook,
    headline,
  };
}
