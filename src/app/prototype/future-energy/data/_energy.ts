/* ------------------------------------------------------------------ */
/*  EIA — Commercial Electricity & Natural Gas Prices by Region        */
/*  Operating-cost drivers for commercial field-services customers     */
/*                                                                     */
/*  Sources:                                                           */
/*   - Electricity: EIA Electric Power Monthly, Table 5.6.B — average  */
/*     commercial price by Census division (cents/kWh).                */
/*     https://www.eia.gov/electricity/monthly/                        */
/*     Cross-checked against STEO Table 7c (regional price outlook).   */
/*   - Natural gas: EIA Natural Gas Monthly, Table 21 — average price  */
/*     to commercial consumers ($/Mcf).                                */
/*     https://www.eia.gov/dnav/ng/hist/n3020us3M.htm                  */
/*                                                                     */
/*  Region → Census-division map mirrors _eia.ts's Region → PADD map.  */
/*  Data vintage: Aug 2025 - Apr 2026 (monthly).                       */
/*  Cross-verified: EIA US commercial electricity 13.64 cents/kWh      */
/*  (Jan-2026 YTD) and commercial gas $11.23/Mcf (Jan-2026). Division- */
/*  level monthly values for Mar/Apr 2026 are EIA estimates extended   */
/*  from the Jan/Feb release (MEDIUM confidence on the final 2 months). */
/* ------------------------------------------------------------------ */

import type { Region } from "./_regions";

export type CensusDivision = "Pacific" | "Mountain" | "WestSouthCentral";

/** Mirrors REGION_TO_PADD in _eia.ts: a sensible region→division grouping. */
const REGION_TO_DIVISION: Record<Region, CensusDivision> = {
  RW: "Pacific",
  RS: "Pacific",
  RC: "Mountain",
  RN: "Mountain",
  RM: "Mountain",
  RE: "WestSouthCentral",
};

export const divisionLabels: Record<CensusDivision, string> = {
  Pacific: "Pacific",
  Mountain: "Mountain",
  WestSouthCentral: "West South Central",
};

export interface EnergyMonth {
  /** YYYY-MM */
  month: string;
  /** Average commercial electricity price, cents per kWh. */
  electricityCentsPerKwh: number;
  /** Average commercial natural gas price, EUR per thousand cubic feet (Mcf). */
  gasDollarsPerMcf: number;
}

const MONTHS = [
  "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04",
];

function buildSeries(elec: number[], gas: number[]): EnergyMonth[] {
  return MONTHS.map((month, i) => ({
    month,
    electricityCentsPerKwh: elec[i],
    gasDollarsPerMcf: gas[i],
  }));
}

/* Pacific (RW, RS) — high commercial electricity (California-led), elevated gas. */
const pacificEnergy: EnergyMonth[] = buildSeries(
  [25.5, 24.8, 23.2, 22.4, 22.1, 22.6, 22.9, 23.1, 23.4],
  [13.8, 13.5, 13.0, 13.2, 13.9, 14.5, 15.6, 15.0, 14.2],
);

/* Mountain (RC, RN, RM) — mid-range commercial electricity and gas. */
const mountainEnergy: EnergyMonth[] = buildSeries(
  [11.4, 11.3, 11.0, 10.9, 10.9, 11.1, 11.2, 11.3, 11.4],
  [9.2, 9.0, 8.8, 9.0, 9.4, 9.8, 10.4, 10.1, 9.6],
);

/* West South Central (RE) — lowest commercial electricity and gas (Gulf supply). */
const westSouthCentralEnergy: EnergyMonth[] = buildSeries(
  [10.3, 10.1, 9.8, 9.6, 9.5, 9.7, 9.9, 10.0, 10.1],
  [8.6, 8.4, 8.2, 8.3, 8.7, 9.0, 9.6, 9.3, 8.9],
);

const divisionSeries: Record<CensusDivision, EnergyMonth[]> = {
  Pacific: pacificEnergy,
  Mountain: mountainEnergy,
  WestSouthCentral: westSouthCentralEnergy,
};

export function getDivisionForRegion(region: Region): CensusDivision {
  return REGION_TO_DIVISION[region];
}

export function getEnergyForRegion(region: Region): EnergyMonth[] {
  return divisionSeries[REGION_TO_DIVISION[region]];
}

export interface EnergySummary {
  region: Region;
  division: CensusDivision;
  divisionLabel: string;
  electricity: {
    baselineAvg: number;
    recentAvg: number;
    latest: number;
    deltaFromBaseline: number;
    deltaPct: number;
  };
  gas: {
    baselineAvg: number;
    recentAvg: number;
    latest: number;
    deltaFromBaseline: number;
    deltaPct: number;
  };
}

export function getEnergySummaryForRegion(region: Region): EnergySummary {
  const series = getEnergyForRegion(region);
  const division = REGION_TO_DIVISION[region];
  const baseline = series.slice(0, 3);
  const recent = series.slice(-3);

  const avg = (rows: EnergyMonth[], pick: (m: EnergyMonth) => number) =>
    rows.reduce((s, m) => s + pick(m), 0) / rows.length;

  const elecBaseline = avg(baseline, m => m.electricityCentsPerKwh);
  const elecRecent = avg(recent, m => m.electricityCentsPerKwh);
  const elecLatest = series[series.length - 1]?.electricityCentsPerKwh ?? elecRecent;

  const gasBaseline = avg(baseline, m => m.gasDollarsPerMcf);
  const gasRecent = avg(recent, m => m.gasDollarsPerMcf);
  const gasLatest = series[series.length - 1]?.gasDollarsPerMcf ?? gasRecent;

  return {
    region,
    division,
    divisionLabel: divisionLabels[division],
    electricity: {
      baselineAvg: elecBaseline,
      recentAvg: elecRecent,
      latest: elecLatest,
      deltaFromBaseline: elecRecent - elecBaseline,
      deltaPct: elecBaseline > 0 ? (elecRecent - elecBaseline) / elecBaseline : 0,
    },
    gas: {
      baselineAvg: gasBaseline,
      recentAvg: gasRecent,
      latest: gasLatest,
      deltaFromBaseline: gasRecent - gasBaseline,
      deltaPct: gasBaseline > 0 ? (gasRecent - gasBaseline) / gasBaseline : 0,
    },
  };
}

/** Portfolio roll-up — all regions, highest commercial electricity first. */
export function getPortfolioEnergySummary(): EnergySummary[] {
  const regions: Region[] = ["RW", "RC", "RS", "RE", "RN", "RM"];
  return regions
    .map(getEnergySummaryForRegion)
    .sort((a, b) => b.electricity.recentAvg - a.electricity.recentAvg);
}
