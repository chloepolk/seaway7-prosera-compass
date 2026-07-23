import type { Region } from "./_regions";

export interface EIAFuelPrice {
  weekEnding: string;
  pricePerGallon: number;
}

export type PADDRegion = "PADD3" | "PADD4" | "PADD5";

const REGION_TO_PADD: Record<Region, PADDRegion> = {
  RE: "PADD3",
  RM: "PADD3",
  RN: "PADD4",
  RW: "PADD5",
  RC: "PADD5",
  RS: "PADD5",
};

export const paddLabels: Record<PADDRegion, string> = {
  PADD3: "Gulf Coast",
  PADD4: "Rocky Mountain",
  PADD5: "West Coast",
};

/** PADD 3 — Gulf Coast (RE, RM). Source: EIA Weekly Retail Fuel Prices. */
const padd3Fuel: EIAFuelPrice[] = [
  { weekEnding: "2025-08-04", pricePerGallon: 3.442 },
  { weekEnding: "2025-08-11", pricePerGallon: 3.397 },
  { weekEnding: "2025-08-18", pricePerGallon: 3.340 },
  { weekEnding: "2025-08-25", pricePerGallon: 3.328 },
  { weekEnding: "2025-09-01", pricePerGallon: 3.367 },
  { weekEnding: "2025-09-08", pricePerGallon: 3.404 },
  { weekEnding: "2025-09-15", pricePerGallon: 3.389 },
  { weekEnding: "2025-09-22", pricePerGallon: 3.400 },
  { weekEnding: "2025-09-29", pricePerGallon: 3.413 },
  { weekEnding: "2025-10-06", pricePerGallon: 3.364 },
  { weekEnding: "2025-10-13", pricePerGallon: 3.299 },
  { weekEnding: "2025-10-20", pricePerGallon: 3.256 },
  { weekEnding: "2025-10-27", pricePerGallon: 3.350 },
  { weekEnding: "2025-11-03", pricePerGallon: 3.374 },
  { weekEnding: "2025-11-10", pricePerGallon: 3.436 },
  { weekEnding: "2025-11-17", pricePerGallon: 3.490 },
  { weekEnding: "2025-11-24", pricePerGallon: 3.459 },
  { weekEnding: "2025-12-01", pricePerGallon: 3.415 },
  { weekEnding: "2025-12-08", pricePerGallon: 3.327 },
  { weekEnding: "2025-12-15", pricePerGallon: 3.267 },
  { weekEnding: "2025-12-22", pricePerGallon: 3.214 },
  { weekEnding: "2025-12-29", pricePerGallon: 3.184 },
  { weekEnding: "2026-01-05", pricePerGallon: 3.172 },
  { weekEnding: "2026-01-12", pricePerGallon: 3.160 },
  { weekEnding: "2026-01-19", pricePerGallon: 3.248 },
  { weekEnding: "2026-01-26", pricePerGallon: 3.325 },
  { weekEnding: "2026-02-02", pricePerGallon: 3.379 },
  { weekEnding: "2026-02-09", pricePerGallon: 3.377 },
  { weekEnding: "2026-02-16", pricePerGallon: 3.412 },
  { weekEnding: "2026-02-23", pricePerGallon: 3.489 },
  { weekEnding: "2026-03-02", pricePerGallon: 3.598 },
  { weekEnding: "2026-03-09", pricePerGallon: 4.627 },
  { weekEnding: "2026-03-16", pricePerGallon: 4.835 },
  { weekEnding: "2026-03-23", pricePerGallon: 5.134 },
  { weekEnding: "2026-03-30", pricePerGallon: 5.105 },
  { weekEnding: "2026-04-06", pricePerGallon: 5.415 },
  { weekEnding: "2026-04-13", pricePerGallon: 5.310 },
  { weekEnding: "2026-04-20", pricePerGallon: 5.069 },
];

/** PADD 4 — Rocky Mountain (RN). Source: EIA Weekly Retail Fuel Prices. */
const padd4Fuel: EIAFuelPrice[] = [
  { weekEnding: "2025-08-04", pricePerGallon: 3.793 },
  { weekEnding: "2025-08-11", pricePerGallon: 3.776 },
  { weekEnding: "2025-08-18", pricePerGallon: 3.757 },
  { weekEnding: "2025-08-25", pricePerGallon: 3.748 },
  { weekEnding: "2025-09-01", pricePerGallon: 3.753 },
  { weekEnding: "2025-09-08", pricePerGallon: 3.754 },
  { weekEnding: "2025-09-15", pricePerGallon: 3.722 },
  { weekEnding: "2025-09-22", pricePerGallon: 3.747 },
  { weekEnding: "2025-09-29", pricePerGallon: 3.732 },
  { weekEnding: "2025-10-06", pricePerGallon: 3.671 },
  { weekEnding: "2025-10-13", pricePerGallon: 3.658 },
  { weekEnding: "2025-10-20", pricePerGallon: 3.585 },
  { weekEnding: "2025-10-27", pricePerGallon: 3.686 },
  { weekEnding: "2025-11-03", pricePerGallon: 3.676 },
  { weekEnding: "2025-11-10", pricePerGallon: 3.803 },
  { weekEnding: "2025-11-17", pricePerGallon: 3.813 },
  { weekEnding: "2025-11-24", pricePerGallon: 3.723 },
  { weekEnding: "2025-12-01", pricePerGallon: 3.665 },
  { weekEnding: "2025-12-08", pricePerGallon: 3.498 },
  { weekEnding: "2025-12-15", pricePerGallon: 3.385 },
  { weekEnding: "2025-12-22", pricePerGallon: 3.304 },
  { weekEnding: "2025-12-29", pricePerGallon: 3.233 },
  { weekEnding: "2026-01-05", pricePerGallon: 3.222 },
  { weekEnding: "2026-01-12", pricePerGallon: 3.185 },
  { weekEnding: "2026-01-19", pricePerGallon: 3.246 },
  { weekEnding: "2026-01-26", pricePerGallon: 3.367 },
  { weekEnding: "2026-02-02", pricePerGallon: 3.419 },
  { weekEnding: "2026-02-09", pricePerGallon: 3.539 },
  { weekEnding: "2026-02-16", pricePerGallon: 3.607 },
  { weekEnding: "2026-02-23", pricePerGallon: 3.683 },
  { weekEnding: "2026-03-02", pricePerGallon: 3.737 },
  { weekEnding: "2026-03-09", pricePerGallon: 4.397 },
  { weekEnding: "2026-03-16", pricePerGallon: 4.796 },
  { weekEnding: "2026-03-23", pricePerGallon: 5.174 },
  { weekEnding: "2026-03-30", pricePerGallon: 5.270 },
  { weekEnding: "2026-04-06", pricePerGallon: 5.412 },
  { weekEnding: "2026-04-13", pricePerGallon: 5.256 },
  { weekEnding: "2026-04-20", pricePerGallon: 5.213 },
];

/** PADD 5 — West Coast (RW, RC, RS). Source: EIA Weekly Retail Fuel Prices. */
const padd5Fuel: EIAFuelPrice[] = [
  { weekEnding: "2025-08-04", pricePerGallon: 4.540 },
  { weekEnding: "2025-08-11", pricePerGallon: 4.492 },
  { weekEnding: "2025-08-18", pricePerGallon: 4.455 },
  { weekEnding: "2025-08-25", pricePerGallon: 4.461 },
  { weekEnding: "2025-09-01", pricePerGallon: 4.484 },
  { weekEnding: "2025-09-08", pricePerGallon: 4.533 },
  { weekEnding: "2025-09-15", pricePerGallon: 4.523 },
  { weekEnding: "2025-09-22", pricePerGallon: 4.524 },
  { weekEnding: "2025-09-29", pricePerGallon: 4.532 },
  { weekEnding: "2025-10-06", pricePerGallon: 4.499 },
  { weekEnding: "2025-10-13", pricePerGallon: 4.464 },
  { weekEnding: "2025-10-20", pricePerGallon: 4.421 },
  { weekEnding: "2025-10-27", pricePerGallon: 4.485 },
  { weekEnding: "2025-11-03", pricePerGallon: 4.499 },
  { weekEnding: "2025-11-10", pricePerGallon: 4.545 },
  { weekEnding: "2025-11-17", pricePerGallon: 4.559 },
  { weekEnding: "2025-11-24", pricePerGallon: 4.514 },
  { weekEnding: "2025-12-01", pricePerGallon: 4.441 },
  { weekEnding: "2025-12-08", pricePerGallon: 4.370 },
  { weekEnding: "2025-12-15", pricePerGallon: 4.294 },
  { weekEnding: "2025-12-22", pricePerGallon: 4.205 },
  { weekEnding: "2025-12-29", pricePerGallon: 4.156 },
  { weekEnding: "2026-01-05", pricePerGallon: 4.128 },
  { weekEnding: "2026-01-12", pricePerGallon: 4.110 },
  { weekEnding: "2026-01-19", pricePerGallon: 4.189 },
  { weekEnding: "2026-01-26", pricePerGallon: 4.301 },
  { weekEnding: "2026-02-02", pricePerGallon: 4.377 },
  { weekEnding: "2026-02-09", pricePerGallon: 4.376 },
  { weekEnding: "2026-02-16", pricePerGallon: 4.383 },
  { weekEnding: "2026-02-23", pricePerGallon: 4.465 },
  { weekEnding: "2026-03-02", pricePerGallon: 4.534 },
  { weekEnding: "2026-03-09", pricePerGallon: 5.556 },
  { weekEnding: "2026-03-16", pricePerGallon: 5.856 },
  { weekEnding: "2026-03-23", pricePerGallon: 6.310 },
  { weekEnding: "2026-03-30", pricePerGallon: 6.596 },
  { weekEnding: "2026-04-06", pricePerGallon: 6.924 },
  { weekEnding: "2026-04-13", pricePerGallon: 6.822 },
  { weekEnding: "2026-04-20", pricePerGallon: 6.620 },
];

const paddSeries: Record<PADDRegion, EIAFuelPrice[]> = {
  PADD3: padd3Fuel,
  PADD4: padd4Fuel,
  PADD5: padd5Fuel,
};

export function getPADDForRegion(region: Region): PADDRegion {
  return REGION_TO_PADD[region];
}

export function getEIAFuelForRegion(region: Region): EIAFuelPrice[] {
  return paddSeries[REGION_TO_PADD[region]];
}

export function getEIAFuelSummaryForRegion(region: Region): {
  padd: PADDRegion;
  paddLabel: string;
  baselineAvg: number;
  recentAvg: number;
  latestPrice: number;
  deltaFromBaseline: number;
  deltaPct: number;
} {
  const series = getEIAFuelForRegion(region);
  const padd = REGION_TO_PADD[region];
  const baseline = series.slice(0, 8);
  const recent = series.slice(-8);
  const baselineAvg = baseline.reduce((s, d) => s + d.pricePerGallon, 0) / baseline.length;
  const recentAvg = recent.reduce((s, d) => s + d.pricePerGallon, 0) / recent.length;
  const latestPrice = series[series.length - 1]?.pricePerGallon ?? recentAvg;
  return {
    padd,
    paddLabel: paddLabels[padd],
    baselineAvg,
    recentAvg,
    latestPrice,
    deltaFromBaseline: recentAvg - baselineAvg,
    deltaPct: (recentAvg - baselineAvg) / baselineAvg,
  };
}

/** @deprecated Use getEIAFuelForRegion for region-specific data */
export const eiaWeeklyFuel: EIAFuelPrice[] = padd5Fuel;
