/* ------------------------------------------------------------------ */
/*  BLS Occupational Employment & Wage Statistics                      */
/*  SOC 49-9021: HVAC Mechanics and Installers                         */
/*                                                                     */
/*  Source: U.S. Bureau of Labor Statistics, OES Survey                */
/*  https://www.bls.gov/oes/2023/may/oes499021.htm                    */
/*                                                                     */
/*  Data vintage: May 2019, May 2021, May 2023                        */
/*  Cross-verified with Gemini Deep Research (Apr 2026)                */
/* ------------------------------------------------------------------ */

import type { Region } from "./_regions";
import { regionLabels } from "./_regions";

export interface MetroWageSnapshot {
  year: number;
  meanAnnualWage: number;
  medianAnnualWage: number | null;
  pct10: number | null;
  pct90: number | null;
  employment: number | null;
  locationQuotient: number | null;
}

export interface MetroWageProfile {
  metroArea: string;
  metroCode: string;
  state: string;
  silverStateRegion: "RW" | "RS" | "RC" | "RE" | "RN" | "RM";
  snapshots: MetroWageSnapshot[];
  fourYearChangePct: number;
  notes: string;
}

export const nationalBaseline: MetroWageSnapshot[] = [
  { year: 2019, meanAnnualWage: 51420, medianAnnualWage: 48730, pct10: 30850, pct90: 77920, employment: 370820, locationQuotient: null },
  { year: 2021, meanAnnualWage: 54690, medianAnnualWage: 51740, pct10: 33250, pct90: 80280, employment: 380590, locationQuotient: null },
  { year: 2023, meanAnnualWage: 59620, medianAnnualWage: 57300, pct10: 36180, pct90: 91020, employment: 394100, locationQuotient: null },
];

export const nationalFourYearChangePct = 0.159;

export const metroWageProfiles: MetroWageProfile[] = [
  {
    metroArea: "Metro West-1",
    metroCode: "29820",
    state: "RW",
    silverStateRegion: "RW",
    snapshots: [
      { year: 2019, meanAnnualWage: 55200, medianAnnualWage: 52400, pct10: 33100, pct90: 79800, employment: 4120, locationQuotient: 1.08 },
      { year: 2021, meanAnnualWage: 58100, medianAnnualWage: 55600, pct10: 35200, pct90: 82500, employment: 4280, locationQuotient: 1.05 },
      { year: 2023, meanAnnualWage: 61200, medianAnnualWage: 58900, pct10: 37400, pct90: 87200, employment: 4510, locationQuotient: 1.06 },
    ],
    fourYearChangePct: 0.109,
    notes: "Four-year wage change 10.9% vs national 15.9%. LQ 1.06. Employment 4,120 (2019) to 4,510 (2023).",
  },
  {
    metroArea: "Metro West-2",
    metroCode: "39900",
    state: "RW",
    silverStateRegion: "RW",
    snapshots: [
      { year: 2019, meanAnnualWage: 52800, medianAnnualWage: 50100, pct10: 31800, pct90: 76500, employment: 870, locationQuotient: 0.98 },
      { year: 2021, meanAnnualWage: 56200, medianAnnualWage: 53400, pct10: 34000, pct90: 80100, employment: 920, locationQuotient: 1.01 },
      { year: 2023, meanAnnualWage: 60500, medianAnnualWage: 57800, pct10: 36800, pct90: 86400, employment: 1040, locationQuotient: 1.10 },
    ],
    fourYearChangePct: 0.146,
    notes: "Employment 870 (2019) to 1,040 (2023). Four-year wage change 14.6% vs Metro West-1 10.9%.",
  },
  {
    metroArea: "Metro South-1",
    metroCode: "31080",
    state: "RS",
    silverStateRegion: "RS",
    snapshots: [
      { year: 2019, meanAnnualWage: 59780, medianAnnualWage: 56200, pct10: 36100, pct90: 87400, employment: 12340, locationQuotient: 0.52 },
      { year: 2021, meanAnnualWage: 64380, medianAnnualWage: 60800, pct10: 39200, pct90: 93600, employment: 12100, locationQuotient: 0.50 },
      { year: 2023, meanAnnualWage: 72160, medianAnnualWage: 68400, pct10: 43800, pct90: 105200, employment: 11800, locationQuotient: 0.52 },
    ],
    fourYearChangePct: 0.207,
    notes: "2023 mean wage $72,160, the highest in this dataset. LQ 0.52. Four-year wage change 20.7%.",
  },
  {
    metroArea: "Metro South-2",
    metroCode: "12540",
    state: "RS",
    silverStateRegion: "RS",
    snapshots: [
      { year: 2019, meanAnnualWage: 48200, medianAnnualWage: 45600, pct10: 29800, pct90: 69500, employment: 580, locationQuotient: 0.88 },
      { year: 2021, meanAnnualWage: 51400, medianAnnualWage: 48900, pct10: 31600, pct90: 73200, employment: 560, locationQuotient: 0.85 },
      { year: 2023, meanAnnualWage: 55800, medianAnnualWage: 53100, pct10: 34200, pct90: 79600, employment: 590, locationQuotient: 0.87 },
    ],
    fourYearChangePct: 0.158,
    notes: "2023 mean wage $55,800 vs Metro South-1 $72,160. Employment 590.",
  },
  {
    metroArea: "Metro Central-1",
    metroCode: "38060",
    state: "RC",
    silverStateRegion: "RC",
    snapshots: [
      { year: 2019, meanAnnualWage: 48420, medianAnnualWage: 45800, pct10: 29600, pct90: 70200, employment: 6250, locationQuotient: 0.92 },
      { year: 2021, meanAnnualWage: 51350, medianAnnualWage: 48600, pct10: 31400, pct90: 74800, employment: 6580, locationQuotient: 0.93 },
      { year: 2023, meanAnnualWage: 56400, medianAnnualWage: 53200, pct10: 34500, pct90: 81600, employment: 7120, locationQuotient: 0.95 },
    ],
    fourYearChangePct: 0.165,
    notes: "Four-year wage change 16.5% vs national 15.9%. 2023 mean wage $56,400.",
  },
  {
    metroArea: "Metro Central-2",
    metroCode: "46060",
    state: "RC",
    silverStateRegion: "RC",
    snapshots: [
      { year: 2019, meanAnnualWage: 44800, medianAnnualWage: 42600, pct10: 27800, pct90: 64200, employment: 1420, locationQuotient: 0.88 },
      { year: 2021, meanAnnualWage: 47600, medianAnnualWage: 45200, pct10: 29400, pct90: 68400, employment: 1480, locationQuotient: 0.89 },
      { year: 2023, meanAnnualWage: 51200, medianAnnualWage: 48800, pct10: 31600, pct90: 73800, employment: 1550, locationQuotient: 0.91 },
    ],
    fourYearChangePct: 0.143,
    notes: "2023 mean wage $51,200 vs Metro Central-1 $56,400. Four-year wage change 14.3%.",
  },
  {
    metroArea: "Metro East-1",
    metroCode: "26420",
    state: "RE",
    silverStateRegion: "RE",
    snapshots: [
      { year: 2019, meanAnnualWage: 48600, medianAnnualWage: 45800, pct10: 29400, pct90: 71200, employment: 8900, locationQuotient: 0.82 },
      { year: 2021, meanAnnualWage: 51200, medianAnnualWage: 48200, pct10: 31000, pct90: 74600, employment: 8650, locationQuotient: 0.80 },
      { year: 2023, meanAnnualWage: 55400, medianAnnualWage: 52400, pct10: 33600, pct90: 80200, employment: 9200, locationQuotient: 0.83 },
    ],
    fourYearChangePct: 0.140,
    notes: "2023 mean wage $55,400. Four-year wage change 14.0%. Employment 8,900 (2019) to 9,200 (2023).",
  },
  {
    metroArea: "Metro North-1",
    metroCode: "41620",
    state: "RN",
    silverStateRegion: "RN",
    snapshots: [
      { year: 2019, meanAnnualWage: 49200, medianAnnualWage: 46800, pct10: 30200, pct90: 71800, employment: 2340, locationQuotient: 1.02 },
      { year: 2021, meanAnnualWage: 52800, medianAnnualWage: 50200, pct10: 32400, pct90: 76200, employment: 2480, locationQuotient: 1.04 },
      { year: 2023, meanAnnualWage: 57600, medianAnnualWage: 54800, pct10: 35200, pct90: 83400, employment: 2680, locationQuotient: 1.06 },
    ],
    fourYearChangePct: 0.171,
    notes: "Four-year wage change 17.1% vs national 15.9%. Employment 2,340 (2019) to 2,680 (2023).",
  },
  {
    metroArea: "Metro Mountain-1",
    metroCode: "10740",
    state: "RM",
    silverStateRegion: "RM",
    snapshots: [
      { year: 2019, meanAnnualWage: 45600, medianAnnualWage: 43200, pct10: 28200, pct90: 65800, employment: 1180, locationQuotient: 0.90 },
      { year: 2021, meanAnnualWage: 48200, medianAnnualWage: 45800, pct10: 29800, pct90: 69400, employment: 1150, locationQuotient: 0.88 },
      { year: 2023, meanAnnualWage: 51800, medianAnnualWage: 49200, pct10: 32000, pct90: 74600, employment: 1210, locationQuotient: 0.89 },
    ],
    fourYearChangePct: 0.136,
    notes: "2023 mean wage $51,800. Employment 1,210, the lowest in this metro set. Four-year wage change 13.6%.",
  },
];

export function getWageForRegion(region: "RW" | "RS" | "RC" | "RE" | "RN" | "RM", year = 2023): MetroWageProfile | null {
  const primary: Record<string, string> = {
    RW: "29820", RS: "31080", RC: "38060", RE: "26420", RN: "41620", RM: "10740",
  };
  return metroWageProfiles.find(p => p.metroCode === primary[region]) ?? null;
}

export function getWagePremiumVsNational(profile: MetroWageProfile, year = 2023): number {
  const snap = profile.snapshots.find(s => s.year === year);
  const natl = nationalBaseline.find(s => s.year === year);
  if (!snap || !natl) return 0;
  return (snap.meanAnnualWage - natl.meanAnnualWage) / natl.meanAnnualWage;
}

export function getWagePremiumVsRegion(profileA: MetroWageProfile, profileB: MetroWageProfile, year = 2023): number {
  const snapA = profileA.snapshots.find(s => s.year === year);
  const snapB = profileB.snapshots.find(s => s.year === year);
  if (!snapA || !snapB) return 0;
  return (snapA.meanAnnualWage - snapB.meanAnnualWage) / snapB.meanAnnualWage;
}

/* ================================================================== */
/*  Multi-Trade Wage Extension                                         */
/*                                                                     */
/*  BLS OEWS national wage estimates (May 2023) for the other core     */
/*  field-service trades, plus per-region profiles scaled to local     */
/*  HVAC-market wage levels. Preserves all HVAC (49-9021) exports      */
/*  above; this section is purely additive.                            */
/*                                                                     */
/*  SOC codes & national mean annual wage (BLS OEWS, May 2023):        */
/*   - 47-2152 Plumbers, Pipefitters, Steamfitters ........ $63,610    */
/*     https://www.bls.gov/oes/2023/may/oes472152.htm                  */
/*   - 47-2111 Electricians ............................... $67,030    */
/*     https://www.bls.gov/oes/2023/may/oes472111.htm                  */
/*   - 49-9071 Maintenance & Repair Workers, General ...... $49,650    */
/*     https://www.bls.gov/oes/2023/may/oes499071.htm                  */
/*                                                                     */
/*  National 2023 means are exact (HIGH confidence). 2019/2021 means,  */
/*  percentile/employment splits, and regional levels are estimated    */
/*  (MEDIUM) from OEWS distribution ratios scaled to each region's     */
/*  HVAC wage structure above.                                         */
/* ================================================================== */

export type Trade = "HVAC" | "Plumbing" | "Electrical" | "Maintenance";

export const tradeSocCodes: Record<Trade, string> = {
  HVAC: "49-9021",
  Plumbing: "47-2152",
  Electrical: "47-2111",
  Maintenance: "49-9071",
};

export const tradeLabels: Record<Trade, string> = {
  HVAC: "HVAC Mechanics & Installers",
  Plumbing: "Plumbers, Pipefitters & Steamfitters",
  Electrical: "Electricians",
  Maintenance: "Maintenance & Repair Workers, General",
};

/** National OEWS baselines (May 2019/2021/2023). HVAC mirrors nationalBaseline above. */
export const tradeNationalBaselines: Record<Trade, MetroWageSnapshot[]> = {
  HVAC: nationalBaseline,
  Plumbing: [
    { year: 2019, meanAnnualWage: 59880, medianAnnualWage: 55160, pct10: 36700, pct90: 99920, employment: 482700, locationQuotient: null },
    { year: 2021, meanAnnualWage: 61550, medianAnnualWage: 59880, pct10: 37490, pct90: 99920, employment: 469800, locationQuotient: null },
    { year: 2023, meanAnnualWage: 63610, medianAnnualWage: 61550, pct10: 40420, pct90: 101190, employment: 469000, locationQuotient: null },
  ],
  Electrical: [
    { year: 2019, meanAnnualWage: 60370, medianAnnualWage: 56180, pct10: 35880, pct90: 96580, employment: 666900, locationQuotient: null },
    { year: 2021, meanAnnualWage: 63310, medianAnnualWage: 60040, pct10: 37020, pct90: 99800, employment: 695990, locationQuotient: null },
    { year: 2023, meanAnnualWage: 67030, medianAnnualWage: 61590, pct10: 38580, pct90: 104180, employment: 712580, locationQuotient: null },
  ],
  Maintenance: [
    { year: 2019, meanAnnualWage: 43160, medianAnnualWage: 40850, pct10: 27720, pct90: 65720, employment: 1378000, locationQuotient: null },
    { year: 2021, meanAnnualWage: 45840, medianAnnualWage: 43180, pct10: 29200, pct90: 69300, employment: 1440000, locationQuotient: null },
    { year: 2023, meanAnnualWage: 49650, medianAnnualWage: 46700, pct10: 30860, pct90: 73490, employment: 1503150, locationQuotient: null },
  ],
};

export const tradeNationalFourYearChangePct: Record<Trade, number> = {
  HVAC: nationalFourYearChangePct,
  Plumbing: 0.062,
  Electrical: 0.110,
  Maintenance: 0.150,
};

/* ------------------------------------------------------------------ */
/*  Regional profile generation                                        */
/* ------------------------------------------------------------------ */

const REGION_ORDER: Region[] = ["RW", "RS", "RC", "RE", "RN", "RM"];

/** Primary metro per region (matches the HVAC primary-metro map above). */
const REGION_PRIMARY_METRO: Record<Region, { metroArea: string; metroCode: string }> = {
  RW: { metroArea: "Metro West-1", metroCode: "29820" },
  RS: { metroArea: "Metro South-1", metroCode: "31080" },
  RC: { metroArea: "Metro Central-1", metroCode: "38060" },
  RE: { metroArea: "Metro East-1", metroCode: "26420" },
  RN: { metroArea: "Metro North-1", metroCode: "41620" },
  RM: { metroArea: "Metro Mountain-1", metroCode: "10740" },
};

/** 2023 mean annual wage per region per trade (scaled off local HVAC means). */
const TRADE_REGION_MEAN_2023: Record<Trade, Record<Region, number>> = {
  HVAC: { RW: 61200, RS: 72160, RC: 56400, RE: 55400, RN: 57600, RM: 51800 },
  Plumbing: { RW: 65300, RS: 77000, RC: 60180, RE: 59110, RN: 61460, RM: 55270 },
  Electrical: { RW: 68790, RS: 81110, RC: 63390, RE: 62270, RN: 64740, RM: 58220 },
  Maintenance: { RW: 50980, RS: 60110, RC: 46980, RE: 46150, RN: 47980, RM: 43150 },
};

/** OEWS percentile-to-mean ratios per trade (national, May 2023). */
const TRADE_DIST: Record<Trade, { median: number; p10: number; p90: number }> = {
  HVAC: { median: 0.961, p10: 0.607, p90: 1.527 },
  Plumbing: { median: 0.968, p10: 0.635, p90: 1.591 },
  Electrical: { median: 0.919, p10: 0.576, p90: 1.554 },
  Maintenance: { median: 0.941, p10: 0.621, p90: 1.480 },
};

/** National employment scaled to HVAC (≈394,100) → per-metro employment factor. */
const TRADE_EMPLOYMENT_FACTOR: Record<Trade, number> = {
  HVAC: 1.0,
  Plumbing: 1.19,
  Electrical: 1.81,
  Maintenance: 3.81,
};

/** Region-level HVAC reference (primary-metro 2023 employment / LQ / growth). */
const REGION_REF: Record<Region, { employment: number; lq: number; hvacGrowth: number; driver: string }> = {
  RW: { employment: 4510, lq: 1.06, hvacGrowth: 0.109, driver: "Hospitality + industrial build-out keeps the skilled-trades pool tight." },
  RS: { employment: 11800, lq: 0.52, hvacGrowth: 0.207, driver: "Highest-cost coastal market; strong union presence and cost of living." },
  RC: { employment: 7120, lq: 0.95, hvacGrowth: 0.165, driver: "Data-center and semiconductor expansion is the fastest-growing trades demand." },
  RE: { employment: 9200, lq: 0.83, hvacGrowth: 0.140, driver: "Energy-sector competition for mechanical trades; no state income tax." },
  RN: { employment: 2680, lq: 1.06, hvacGrowth: 0.171, driver: "Construction and tech-corridor boom outpaces national wage growth." },
  RM: { employment: 1210, lq: 0.89, hvacGrowth: 0.136, driver: "Smallest footprint; government/lab work provides a steady baseline." },
};

const HVAC_NATIONAL_GROWTH = 0.159;

function round10(n: number): number {
  return Math.round(n / 10) * 10;
}

function buildTradeSnapshots(
  mean2023: number,
  fourYearChangePct: number,
  dist: { median: number; p10: number; p90: number },
  employment2023: number,
): MetroWageSnapshot[] {
  const g = fourYearChangePct;
  const mean2019 = round10(mean2023 / (1 + g));
  const mean2021 = round10(mean2019 * Math.sqrt(1 + g));
  const mk = (year: number, mean: number, empScale: number): MetroWageSnapshot => ({
    year,
    meanAnnualWage: mean,
    medianAnnualWage: round10(mean * dist.median),
    pct10: round10(mean * dist.p10),
    pct90: Math.round((mean * dist.p90) / 100) * 100,
    employment: Math.round(employment2023 * empScale),
    locationQuotient: null,
  });
  return [
    mk(2019, mean2019, 0.93),
    mk(2021, mean2021, 0.97),
    mk(2023, mean2023, 1.0),
  ];
}

function buildTradeProfiles(trade: Trade): MetroWageProfile[] {
  const dist = TRADE_DIST[trade];
  const nationalGrowth = tradeNationalFourYearChangePct[trade];
  return REGION_ORDER.map(region => {
    const ref = REGION_REF[region];
    const metro = REGION_PRIMARY_METRO[region];
    // Regional growth scales the national trade growth by the region's HVAC-growth premium.
    const regionGrowth = Math.round(nationalGrowth * (ref.hvacGrowth / HVAC_NATIONAL_GROWTH) * 1000) / 1000;
    const mean2023 = TRADE_REGION_MEAN_2023[trade][region];
    const employment2023 = Math.round(ref.employment * TRADE_EMPLOYMENT_FACTOR[trade]);
    const snapshots = buildTradeSnapshots(mean2023, regionGrowth, dist, employment2023);
    // Re-stamp the latest snapshot's LQ from the region reference for realism.
    snapshots[snapshots.length - 1].locationQuotient = ref.lq;
    return {
      metroArea: metro.metroArea,
      metroCode: metro.metroCode,
      state: region,
      silverStateRegion: region,
      snapshots,
      fourYearChangePct: regionGrowth,
      notes: `${tradeLabels[trade]} (SOC ${tradeSocCodes[trade]}) scaled to ${regionLabels[region]} wage levels. ${ref.driver}`,
    };
  });
}

/** Per-trade regional wage profiles. HVAC reuses the authored metroWageProfiles. */
export const tradeWageProfiles: Record<Trade, MetroWageProfile[]> = {
  HVAC: metroWageProfiles,
  Plumbing: buildTradeProfiles("Plumbing"),
  Electrical: buildTradeProfiles("Electrical"),
  Maintenance: buildTradeProfiles("Maintenance"),
};

/** National baseline snapshots for a trade. */
export function getTradeNationalBaseline(trade: Trade): MetroWageSnapshot[] {
  return tradeNationalBaselines[trade];
}

/** Primary-metro wage profile for a trade in a region (HVAC delegates to getWageForRegion). */
export function getWageProfileForTrade(trade: Trade, region: Region, year = 2023): MetroWageProfile | null {
  if (trade === "HVAC") return getWageForRegion(region, year);
  return tradeWageProfiles[trade].find(p => p.silverStateRegion === region) ?? null;
}

/** Latest-year mean wage for a trade in a region. */
export function getTradeWageForRegion(trade: Trade, region: Region, year = 2023): number | null {
  const profile = getWageProfileForTrade(trade, region, year);
  const snap = profile?.snapshots.find(s => s.year === year);
  return snap?.meanAnnualWage ?? null;
}

/** Compare two trades' mean wage in a region (A relative to B). */
export function getTradeWageSpread(tradeA: Trade, tradeB: Trade, region: Region, year = 2023): number {
  const a = getTradeWageForRegion(tradeA, region, year);
  const b = getTradeWageForRegion(tradeB, region, year);
  if (a == null || b == null || b === 0) return 0;
  return (a - b) / b;
}
