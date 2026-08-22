import type { Job } from "./_transform";
import { formatActiveFuelUnit } from "../_i18n/legacy"
import type { Region } from "./_regions";
import { getEIAFuelForRegion, getEIAFuelSummaryForRegion, paddLabels, type PADDRegion, type EIAFuelPrice } from "./_eia";
import { getWageForRegion } from "./_labor";
import { loadFleetFuelActuals, getAtoBPriceDelta, type FleetFuelActuals, type DivisionFuelSummary } from "./_atob";

export const SERVICE_VAN_MPG = 15;

export const REGION_SERVICE_PROFILES: Record<string, { avgRadiusMiles: number; label: string }> = {
  RC: { avgRadiusMiles: 35, label: "Region Central metro sprawl" },
  RW: { avgRadiusMiles: 25, label: "Region West metro" },
  RS: { avgRadiusMiles: 30, label: "Region South metro" },
  RE: { avgRadiusMiles: 40, label: "Region East multi-city coverage" },
  RN: { avgRadiusMiles: 30, label: "Region North metro" },
  RM: { avgRadiusMiles: 45, label: "Region Mountain rural/suburban" },
};

export interface RegionFuelProfile {
  region: Region;
  paddLabel: string;
  jobs: number;
  totalVisits: number;
  avgVisitsPerJob: number;
  totalRevenue: number;
  serviceRadiusMi: number;
  roundTripMi: number;
  gallonsPerTrip: number;
  baselinePricePerGal: number;
  currentPricePerGal: number;
  latestPricePerGal: number;
  priceIncrease: number;
  priceIncreasePct: number;
  costPerTripBaseline: number;
  costPerTripCurrent: number;
  costIncreasePerTrip: number;
  totalFuelCostBaseline: number;
  totalFuelCostCurrent: number;
  totalUnrecoveredIncrease: number;
  fuelAsRevenuePct: number;
  marginCompressionPts: number;
  recommendedSurcharge: number;
  annualRecoveryFull: number;
}

export interface FuelSensitivityScenario {
  name: string;
  label: string;
  pricePerGal: number;
  annualFleetCost: number;
  deltaVsBaseline: number;
  deltaPct: number;
}

export interface FuelSensitivityAnalysis {
  annualGallons: number;
  baselinePricePerGal: number;
  currentPricePerGal: number;
  baselineAnnualCost: number;
  currentAnnualCost: number;
  currentVsBaselineDelta: number;
  impactPerDime: number;
  scenarios: FuelSensitivityScenario[];
}

export interface MarginErosionFactor {
  factor: string;
  dollarImpact: number;
  marginPtsImpact: number;
  source: string;
}

export interface PortfolioFuelExposure {
  totalJobs: number;
  totalTruckRolls: number;
  avgVisitsPerJob: number;
  totalPortfolioRevenue: number;
  totalFuelCostBaseline: number;
  totalFuelCostCurrent: number;
  totalUnrecoveredDelta: number;
  fuelAsPortfolioRevenuePct: number;
  portfolioMarginCompressionPts: number;
  regions: RegionFuelProfile[];
  weeklyTrend: { week: string; gulfCoast: number; rockyMountain: number; westCoast: number }[];
  sensitivity: FuelSensitivityAnalysis;
  marginErosion: MarginErosionFactor[];
  spikeStartWeek: string;
  actuals: FleetFuelActuals;
  divisionSummaries: DivisionFuelSummary[];
}

function buildRegionProfile(region: Region, regionJobs: Job[], atobPrices: { baselineAvg: number; currentAvg: number }): RegionFuelProfile {
  const fuelSummary = getEIAFuelSummaryForRegion(region);
  const profile = REGION_SERVICE_PROFILES[region] ?? { avgRadiusMiles: 30, label: "Unknown" };

  const totalVisits = regionJobs.reduce((s, j) => s + j.visitCount, 0);
  const totalRevenue = regionJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
  const avgVisitsPerJob = regionJobs.length > 0 ? totalVisits / regionJobs.length : 0;

  const roundTripMi = profile.avgRadiusMiles * 2;
  const gallonsPerTrip = roundTripMi / SERVICE_VAN_MPG;

  const costPerTripBaseline = gallonsPerTrip * atobPrices.baselineAvg;
  const costPerTripCurrent = gallonsPerTrip * atobPrices.currentAvg;
  const costIncreasePerTrip = costPerTripCurrent - costPerTripBaseline;

  const totalFuelCostBaseline = costPerTripBaseline * totalVisits;
  const totalFuelCostCurrent = costPerTripCurrent * totalVisits;
  const totalUnrecoveredIncrease = totalFuelCostCurrent - totalFuelCostBaseline;

  return {
    region,
    paddLabel: fuelSummary.paddLabel,
    jobs: regionJobs.length,
    totalVisits,
    avgVisitsPerJob,
    totalRevenue,
    serviceRadiusMi: profile.avgRadiusMiles,
    roundTripMi,
    gallonsPerTrip,
    baselinePricePerGal: atobPrices.baselineAvg,
    currentPricePerGal: atobPrices.currentAvg,
    latestPricePerGal: atobPrices.currentAvg,
    priceIncrease: atobPrices.currentAvg - atobPrices.baselineAvg,
    priceIncreasePct: atobPrices.baselineAvg > 0 ? (atobPrices.currentAvg - atobPrices.baselineAvg) / atobPrices.baselineAvg : 0,
    costPerTripBaseline,
    costPerTripCurrent,
    costIncreasePerTrip,
    totalFuelCostBaseline,
    totalFuelCostCurrent,
    totalUnrecoveredIncrease,
    fuelAsRevenuePct: totalRevenue > 0 ? totalFuelCostCurrent / totalRevenue : 0,
    marginCompressionPts: totalRevenue > 0 ? (totalUnrecoveredIncrease / totalRevenue) * 100 : 0,
    recommendedSurcharge: costIncreasePerTrip,
    annualRecoveryFull: costIncreasePerTrip * totalVisits,
  };
}

function buildWeeklyTrend(): { week: string; gulfCoast: number; rockyMountain: number; westCoast: number }[] {
  const gulfCoast = getEIAFuelForRegion("RE");
  const rockyMountain = getEIAFuelForRegion("RN");
  const westCoast = getEIAFuelForRegion("RW");

  const weekMap = new Map<string, { gulfCoast: number; rockyMountain: number; westCoast: number }>();

  for (const d of gulfCoast) {
    const entry = weekMap.get(d.weekEnding) ?? { gulfCoast: 0, rockyMountain: 0, westCoast: 0 };
    entry.gulfCoast = d.pricePerGallon;
    weekMap.set(d.weekEnding, entry);
  }
  for (const d of rockyMountain) {
    const entry = weekMap.get(d.weekEnding) ?? { gulfCoast: 0, rockyMountain: 0, westCoast: 0 };
    entry.rockyMountain = d.pricePerGallon;
    weekMap.set(d.weekEnding, entry);
  }
  for (const d of westCoast) {
    const entry = weekMap.get(d.weekEnding) ?? { gulfCoast: 0, rockyMountain: 0, westCoast: 0 };
    entry.westCoast = d.pricePerGallon;
    weekMap.set(d.weekEnding, entry);
  }

  return [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, prices]) => ({ week, ...prices }));
}

function findSpikeStartWeek(): string {
  const padds: PADDRegion[] = ["PADD3", "PADD4", "PADD5"];
  const seriesByPadd: Record<PADDRegion, EIAFuelPrice[]> = {
    PADD3: getEIAFuelForRegion("RE"),
    PADD4: getEIAFuelForRegion("RN"),
    PADD5: getEIAFuelForRegion("RW"),
  };

  const baselines: Record<PADDRegion, number> = { PADD3: 0, PADD4: 0, PADD5: 0 };
  for (const padd of padds) {
    const first8 = seriesByPadd[padd].slice(0, 8);
    baselines[padd] = first8.reduce((s, d) => s + d.pricePerGallon, 0) / first8.length;
  }

  const allWeeks = seriesByPadd.PADD3.map(d => d.weekEnding);
  for (const week of allWeeks) {
    for (const padd of padds) {
      const entry = seriesByPadd[padd].find(d => d.weekEnding === week);
      if (entry && entry.pricePerGallon > baselines[padd] * 1.2) {
        return week;
      }
    }
  }

  return allWeeks[allWeeks.length - 1] ?? "";
}

function buildFuelSensitivity(atobActuals: FleetFuelActuals): FuelSensitivityAnalysis {
  const annualGallons = atobActuals.totalAnnualGallons;
  const baselinePrice = atobActuals.baselineUnleadedPricePerGal;
  const currentPrice = atobActuals.currentUnleadedPricePerGal;
  const baselineAnnualCost = annualGallons * baselinePrice;
  const currentAnnualCost = annualGallons * currentPrice;
  const impactPerDime = annualGallons * 0.10;

  const scenarios: FuelSensitivityScenario[] = [
    {
      name: "return-to-baseline",
      label: `Return to baseline (${formatActiveFuelUnit(baselinePrice)}/L)`,
      pricePerGal: baselinePrice,
      annualFleetCost: baselineAnnualCost,
      deltaVsBaseline: 0,
      deltaPct: 0,
    },
    {
      name: "hold-current",
      label: `Hold at current (${formatActiveFuelUnit(currentPrice)}/L)`,
      pricePerGal: currentPrice,
      annualFleetCost: currentAnnualCost,
      deltaVsBaseline: currentAnnualCost - baselineAnnualCost,
      deltaPct: baselinePrice > 0 ? (currentPrice - baselinePrice) / baselinePrice : 0,
    },
    {
      name: "plus-10pct",
      label: `+10% from current (${formatActiveFuelUnit((currentPrice * 1.1))}/L)`,
      pricePerGal: currentPrice * 1.1,
      annualFleetCost: annualGallons * currentPrice * 1.1,
      deltaVsBaseline: annualGallons * currentPrice * 1.1 - baselineAnnualCost,
      deltaPct: baselinePrice > 0 ? (currentPrice * 1.1 - baselinePrice) / baselinePrice : 0,
    },
    {
      name: "plus-25pct",
      label: `+25% from current (${formatActiveFuelUnit((currentPrice * 1.25))}/L)`,
      pricePerGal: currentPrice * 1.25,
      annualFleetCost: annualGallons * currentPrice * 1.25,
      deltaVsBaseline: annualGallons * currentPrice * 1.25 - baselineAnnualCost,
      deltaPct: baselinePrice > 0 ? (currentPrice * 1.25 - baselinePrice) / baselinePrice : 0,
    },
  ];

  return {
    annualGallons,
    baselinePricePerGal: baselinePrice,
    currentPricePerGal: currentPrice,
    baselineAnnualCost,
    currentAnnualCost,
    currentVsBaselineDelta: currentAnnualCost - baselineAnnualCost,
    impactPerDime,
    scenarios,
  };
}

function buildMarginErosion(
  regions: RegionFuelProfile[],
  jobs: Job[],
  totalRevenue: number,
  atobActuals: FleetFuelActuals,
): MarginErosionFactor[] {
  const factors: MarginErosionFactor[] = [];

  const spikeAnnualized = atobActuals.spikeImpactDollars * 12;
  factors.push({
    factor: "Fuel cost increase",
    dollarImpact: spikeAnnualized,
    marginPtsImpact: totalRevenue > 0 ? (spikeAnnualized / totalRevenue) * 100 : 0,
    source: "Fleet Card",
  });

  const nvWage = getWageForRegion("RW");
  if (nvWage) {
    const estimatedTechs = Math.max(1, Math.round(jobs.length / 80));
    const snap2019 = nvWage.snapshots.find(s => s.year === 2019);
    const snap2023 = nvWage.snapshots.find(s => s.year === 2023);
    if (snap2019 && snap2023) {
      const annualWageIncrease = (snap2023.meanAnnualWage - snap2019.meanAnnualWage) / 4;
      const laborCostIncrease = annualWageIncrease * estimatedTechs;
      factors.push({
        factor: "Labor cost growth",
        dollarImpact: laborCostIncrease,
        marginPtsImpact: totalRevenue > 0 ? (laborCostIncrease / totalRevenue) * 100 : 0,
        source: "BLS OES",
      });
    }
  }

  const jobsWithCosts = jobs.filter(j => j.costBreakdown != null && j.totalAmount != null && j.totalAmount > 0);
  if (jobsWithCosts.length > 0) {
    const materialCosts = jobsWithCosts.reduce((s, j) => s + (j.costBreakdown!.materialCost ?? 0), 0);
    const jobRevenue = jobsWithCosts.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
    const materialPct = jobRevenue > 0 ? materialCosts / jobRevenue : 0;
    // 25% material ratio is a common baseline for field services
    const baselineMaterialPct = 0.25;
    const materialDelta = (materialPct - baselineMaterialPct) * totalRevenue;
    factors.push({
      factor: "Material cost change",
      dollarImpact: Math.max(0, materialDelta),
      marginPtsImpact: totalRevenue > 0 ? (Math.max(0, materialDelta) / totalRevenue) * 100 : 0,
      source: "Internal",
    });
  } else {
    factors.push({
      factor: "Material cost change",
      dollarImpact: 0,
      marginPtsImpact: 0,
      source: "Internal",
    });
  }

  return factors;
}

export function buildFuelAnalysis(jobs: Job[]): PortfolioFuelExposure {
  const validJobs = jobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);
  const atobActuals = loadFleetFuelActuals();
  const atobPrices = getAtoBPriceDelta();

  const byRegion = new Map<Region, Job[]>();
  for (const j of validJobs) {
    const arr = byRegion.get(j.region) || [];
    arr.push(j);
    byRegion.set(j.region, arr);
  }

  const regions: RegionFuelProfile[] = [];
  for (const [region, regionJobs] of byRegion) {
    regions.push(buildRegionProfile(region, regionJobs, atobPrices));
  }
  regions.sort((a, b) => b.totalUnrecoveredIncrease - a.totalUnrecoveredIncrease);

  const totalJobs = validJobs.length;
  const totalTruckRolls = regions.reduce((s, r) => s + r.totalVisits, 0);
  const avgVisitsPerJob = totalJobs > 0 ? totalTruckRolls / totalJobs : 0;
  const totalPortfolioRevenue = regions.reduce((s, r) => s + r.totalRevenue, 0);
  const totalFuelCostBaseline = regions.reduce((s, r) => s + r.totalFuelCostBaseline, 0);
  const totalFuelCostCurrent = regions.reduce((s, r) => s + r.totalFuelCostCurrent, 0);
  const totalUnrecoveredDelta = totalFuelCostCurrent - totalFuelCostBaseline;

  const weeklyTrend = buildWeeklyTrend();
  const spikeStartWeek = findSpikeStartWeek();
  const sensitivity = buildFuelSensitivity(atobActuals);
  const marginErosion = buildMarginErosion(regions, validJobs, totalPortfolioRevenue, atobActuals);

  return {
    totalJobs,
    totalTruckRolls,
    avgVisitsPerJob,
    totalPortfolioRevenue,
    totalFuelCostBaseline,
    totalFuelCostCurrent,
    totalUnrecoveredDelta,
    fuelAsPortfolioRevenuePct: totalPortfolioRevenue > 0 ? totalFuelCostCurrent / totalPortfolioRevenue : 0,
    portfolioMarginCompressionPts: totalPortfolioRevenue > 0 ? (totalUnrecoveredDelta / totalPortfolioRevenue) * 100 : 0,
    regions,
    weeklyTrend,
    sensitivity,
    marginErosion,
    spikeStartWeek,
    actuals: atobActuals,
    divisionSummaries: atobActuals.divisions,
  };
}
