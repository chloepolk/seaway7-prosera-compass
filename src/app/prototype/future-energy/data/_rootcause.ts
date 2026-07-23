/* ------------------------------------------------------------------ */
/*  Root Cause Decomposition Engine                                    */
/*                                                                     */
/*  Decomposes margin performance into ranked, quantified drivers      */
/*  for any customer or region vs. portfolio baseline.                 */
/* ------------------------------------------------------------------ */

import type { Job, CustomerAggregate, RegionAggregate, AggregateMetrics, JobTypeMargin, JobTypeQuoteAnalysis, AtRiskQuote } from "./_transform";
import { tradeMargins, pricingBenchmarks, whaleCurve } from "./_benchmarks";
import { metroWageProfiles, nationalBaseline, getWageForRegion } from "./_labor";
import { getEIAFuelForRegion, getEIAFuelSummaryForRegion } from "./_eia";
import type { Region } from "./_regions";

const SCALE = 0.87;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type DriverCategory = "pricing" | "cost-structure" | "job-mix" | "regional" | "volume" | "contract";

export interface MarginDriver {
  driver: string;
  category: DriverCategory;
  direction: "drag" | "lift";
  dollarImpact: number;
  detail: string;
  benchmarkComparison?: string;
}

export interface RootCauseAnalysis {
  entity: string;
  entityType: "customer" | "region";
  currentMarginPct: number;
  portfolioBenchmarkPct: number;
  industryBenchmarkPct: [number, number];
  gapToPortfolioPct: number;
  drivers: MarginDriver[];
  topLever: string;
  estimatedRecovery: number;
}

/* ------------------------------------------------------------------ */
/*  Portfolio-Level Medians (computed once from all valid jobs)         */
/* ------------------------------------------------------------------ */

interface PortfolioBaseline {
  avgMarginPct: number;
  totalRevenue: number;
  avgTicket: number;
  avgRevenuePerJobByType: Map<string, number>;
  avgCostPerJobByType: Map<string, number>;
  avgMaterialPctByType: Map<string, number>;
  marginByType: Map<string, number>;
  overallJobTypeMix: Map<string, number>;
  avgCostPerJob: number;
}

function buildPortfolioBaseline(allJobs: Job[]): PortfolioBaseline {
  const valid = allJobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);

  const totalRevenue = valid.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  const totalCost = valid.reduce((s, j) => s + (j.actualCost ?? 0), 0);
  const avgMarginPct = totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0;
  const avgTicket = valid.length > 0 ? totalRevenue / valid.length : 0;
  const avgCostPerJob = valid.length > 0 ? totalCost / valid.length : 0;

  const byType = new Map<string, Job[]>();
  for (const j of valid) {
    const arr = byType.get(j.jobType) || [];
    arr.push(j);
    byType.set(j.jobType, arr);
  }

  const avgRevenuePerJobByType = new Map<string, number>();
  const avgCostPerJobByType = new Map<string, number>();
  const avgMaterialPctByType = new Map<string, number>();
  const marginByType = new Map<string, number>();
  const overallJobTypeMix = new Map<string, number>();

  for (const [type, jobs] of byType) {
    const rev = jobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
    const cost = jobs.reduce((s, j) => s + (j.actualCost ?? 0), 0);
    avgRevenuePerJobByType.set(type, jobs.length > 0 ? rev / jobs.length : 0);
    avgCostPerJobByType.set(type, jobs.length > 0 ? cost / jobs.length : 0);
    marginByType.set(type, rev > 0 ? (rev - cost) / rev : 0);
    overallJobTypeMix.set(type, jobs.length / valid.length);

    const materialCosts = jobs.reduce((s, j) => {
      if (!j.costBreakdown) return s;
      return s + j.costBreakdown.materialCost + j.costBreakdown.equipmentCost;
    }, 0);
    avgMaterialPctByType.set(type, rev > 0 ? materialCosts / rev : 0);
  }

  return {
    avgMarginPct,
    totalRevenue,
    avgTicket,
    avgRevenuePerJobByType,
    avgCostPerJobByType,
    avgMaterialPctByType,
    marginByType,
    overallJobTypeMix,
    avgCostPerJob,
  };
}

/* ------------------------------------------------------------------ */
/*  Industry Benchmark Lookup                                          */
/* ------------------------------------------------------------------ */

function getIndustryMarginRange(jobType: string): [number, number] {
  const normalized = jobType.toLowerCase();
  for (const tm of tradeMargins) {
    if (normalized.includes(tm.trade.toLowerCase().split(" ")[0])) {
      return tm.grossMarginRange;
    }
  }
  return [0.35, 0.55];
}

function getPrimaryJobType(jobs: Job[]): string {
  const counts = new Map<string, number>();
  for (const j of jobs) {
    counts.set(j.jobType, (counts.get(j.jobType) ?? 0) + 1);
  }
  let max = 0;
  let primary = "";
  for (const [type, count] of counts) {
    if (count > max) { max = count; primary = type; }
  }
  return primary;
}

/* ------------------------------------------------------------------ */
/*  Driver Analysis Functions                                          */
/* ------------------------------------------------------------------ */

function analyzePricingGap(
  entityJobs: Job[],
  baseline: PortfolioBaseline,
): MarginDriver | null {
  const valid = entityJobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);
  if (valid.length < 2) return null;

  let totalDelta = 0;
  const byType = new Map<string, Job[]>();
  for (const j of valid) {
    const arr = byType.get(j.jobType) || [];
    arr.push(j);
    byType.set(j.jobType, arr);
  }

  const details: string[] = [];

  for (const [type, jobs] of byType) {
    const entityAvgRev = jobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0) / jobs.length;
    const portfolioAvgRev = baseline.avgRevenuePerJobByType.get(type);
    if (!portfolioAvgRev || portfolioAvgRev === 0) continue;

    const delta = (entityAvgRev - portfolioAvgRev) * jobs.length;
    totalDelta += delta;

    const pctDiff = ((entityAvgRev - portfolioAvgRev) / portfolioAvgRev) * 100;
    if (Math.abs(pctDiff) > 10 && jobs.length >= 2) {
      details.push(`${type}: $${Math.round(entityAvgRev).toLocaleString()} avg vs. portfolio $${Math.round(portfolioAvgRev).toLocaleString()} (${pctDiff > 0 ? "+" : ""}${pctDiff.toFixed(0)}% across ${jobs.length} jobs)`);
    }
  }

  if (Math.abs(totalDelta) < 500 * SCALE) return null;

  return {
    driver: totalDelta < 0 ? "Revenue Pricing Gap" : "Revenue Pricing Premium",
    category: "pricing",
    direction: totalDelta < 0 ? "drag" : "lift",
    dollarImpact: Math.round(totalDelta),
    detail: details.length > 0
      ? details.join(". ")
      : `Weighted pricing delta of $${Math.abs(Math.round(totalDelta)).toLocaleString()} across ${valid.length} jobs.`,
  };
}

function analyzeLaborCostVariance(
  entityJobs: Job[],
  baseline: PortfolioBaseline,
  entityRegion?: string,
): MarginDriver | null {
  const valid = entityJobs.filter(j => !j.excluded && j.costBreakdown);
  if (valid.length < 2) return null;

  const entityLaborCost = valid.reduce((s, j) => s + (j.costBreakdown?.laborCost ?? 0), 0);
  const entityRevenue = valid.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  if (entityRevenue === 0) return null;

  const entityLaborPct = entityLaborCost / entityRevenue;

  const portfolioLaborPct = (() => {
    let totalLabor = 0;
    let totalRev = 0;
    for (const j of entityJobs) {
      if (j.excluded || !j.costBreakdown || !j.totalAmount) continue;
      const portfolioCost = baseline.avgCostPerJobByType.get(j.jobType);
      if (portfolioCost == null) continue;
      totalLabor += portfolioCost * 0.55;
      totalRev += baseline.avgRevenuePerJobByType.get(j.jobType) ?? 0;
    }
    return totalRev > 0 ? totalLabor / totalRev : 0;
  })();

  const laborDelta = (entityLaborPct - portfolioLaborPct) * entityRevenue;

  if (Math.abs(laborDelta) < 500 * SCALE) return null;

  let benchComp: string | undefined;
  if (entityRegion) {
    const stateKey = entityRegion as "RW" | "RS" | "RC" | "RE" | "RN" | "RM";
    const wageProfile = getWageForRegion(stateKey);
    const nvProfile = getWageForRegion("RW");
    if (wageProfile && nvProfile) {
      const latest = wageProfile.snapshots[wageProfile.snapshots.length - 1];
      const nvLatest = nvProfile.snapshots[nvProfile.snapshots.length - 1];
      if (latest && nvLatest) {
        const premium = ((latest.meanAnnualWage - nvLatest.meanAnnualWage) / nvLatest.meanAnnualWage * 100);
        if (Math.abs(premium) > 5) {
          benchComp = `BLS data: ${wageProfile.metroArea} HVAC techs avg $${(latest.meanAnnualWage / 1000).toFixed(0)}k/yr vs. Metro West-1 $${(nvLatest.meanAnnualWage / 1000).toFixed(0)}k/yr (${premium > 0 ? "+" : ""}${premium.toFixed(0)}% structural premium)`;
        }
      }
    }
  }

  return {
    driver: laborDelta > 0 ? "Labor Cost Overrun" : "Labor Cost Efficiency",
    category: "cost-structure",
    direction: laborDelta > 0 ? "drag" : "lift",
    dollarImpact: Math.round(-laborDelta),
    detail: `Labor at ${(entityLaborPct * 100).toFixed(1)}% of revenue vs. portfolio benchmark ${(portfolioLaborPct * 100).toFixed(1)}%. ${laborDelta > 0 ? "Excess" : "Savings"} of $${Math.abs(Math.round(laborDelta)).toLocaleString()}.`,
    benchmarkComparison: benchComp,
  };
}

function analyzeMaterialMarkup(
  entityJobs: Job[],
  baseline: PortfolioBaseline,
): MarginDriver | null {
  const valid = entityJobs.filter(j => !j.excluded && j.costBreakdown && j.totalAmount != null && j.totalAmount > 0);
  if (valid.length < 2) return null;

  const entityMaterialCost = valid.reduce((s, j) => s + (j.costBreakdown?.materialCost ?? 0) + (j.costBreakdown?.equipmentCost ?? 0), 0);
  const entityRevenue = valid.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  if (entityRevenue === 0 || entityMaterialCost === 0) return null;

  const entityMaterialPct = entityMaterialCost / entityRevenue;

  let portfolioMaterialPct = 0;
  {
    let totalMat = 0;
    let totalRev = 0;
    for (const j of valid) {
      const pctForType = baseline.avgMaterialPctByType.get(j.jobType);
      if (pctForType == null) continue;
      const revForType = baseline.avgRevenuePerJobByType.get(j.jobType) ?? 0;
      totalMat += pctForType * revForType;
      totalRev += revForType;
    }
    portfolioMaterialPct = totalRev > 0 ? totalMat / totalRev : 0;
  }

  const materialDelta = (entityMaterialPct - portfolioMaterialPct) * entityRevenue;
  if (Math.abs(materialDelta) < 500 * SCALE) return null;

  const [indLow, indHigh] = pricingBenchmarks.materialMarkup.industryStandardRange;
  const benchComp = `Industry standard material markup: ${(indLow * 100).toFixed(0)}-${(indHigh * 100).toFixed(0)}% of revenue. Entity at ${(entityMaterialPct * 100).toFixed(1)}%.`;

  return {
    driver: materialDelta > 0 ? "Material Cost Overweight" : "Material Cost Advantage",
    category: "pricing",
    direction: materialDelta > 0 ? "drag" : "lift",
    dollarImpact: Math.round(-materialDelta),
    detail: `Material + equipment at ${(entityMaterialPct * 100).toFixed(1)}% of revenue vs. portfolio ${(portfolioMaterialPct * 100).toFixed(1)}%. Delta: $${Math.abs(Math.round(materialDelta)).toLocaleString()}.`,
    benchmarkComparison: benchComp,
  };
}

function analyzeJobMixDrag(
  entityJobs: Job[],
  baseline: PortfolioBaseline,
): MarginDriver | null {
  const valid = entityJobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);
  if (valid.length < 3) return null;

  const entityRevenue = valid.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  const entityCost = valid.reduce((s, j) => s + (j.actualCost ?? 0), 0);
  const actualMargin = entityRevenue > 0 ? (entityRevenue - entityCost) / entityRevenue : 0;

  let hypotheticalMargin = 0;
  let totalWeight = 0;
  for (const j of valid) {
    const portfolioMarginForType = baseline.marginByType.get(j.jobType);
    if (portfolioMarginForType == null) continue;
    const jobRev = j.totalAmount ?? 0;
    hypotheticalMargin += portfolioMarginForType * jobRev;
    totalWeight += jobRev;
  }
  if (totalWeight === 0) return null;
  hypotheticalMargin = hypotheticalMargin / totalWeight;

  const mixEffect = actualMargin - hypotheticalMargin;
  const mixDollarImpact = mixEffect * entityRevenue;

  if (Math.abs(mixDollarImpact) < 500 * SCALE) return null;

  const entityTypeCounts = new Map<string, number>();
  for (const j of valid) {
    entityTypeCounts.set(j.jobType, (entityTypeCounts.get(j.jobType) ?? 0) + 1);
  }

  const details: string[] = [];
  for (const [type, count] of entityTypeCounts) {
    const entityShare = count / valid.length;
    const portfolioShare = baseline.overallJobTypeMix.get(type) ?? 0;
    const typeMargin = baseline.marginByType.get(type) ?? 0;
    if (Math.abs(entityShare - portfolioShare) > 0.05) {
      const isHighMargin = typeMargin > baseline.avgMarginPct;
      details.push(`${type}: ${(entityShare * 100).toFixed(0)}% of mix vs. portfolio ${(portfolioShare * 100).toFixed(0)}% (${isHighMargin ? "high" : "low"}-margin trade)`);
    }
  }

  return {
    driver: mixDollarImpact < 0 ? "Job Mix Drag" : "Job Mix Advantage",
    category: "job-mix",
    direction: mixDollarImpact < 0 ? "drag" : "lift",
    dollarImpact: Math.round(mixDollarImpact),
    detail: details.length > 0
      ? `Job type distribution differs from portfolio norm. ${details.join(". ")}.`
      : `Weighted mix effect of ${(mixEffect * 100).toFixed(1)} margin points.`,
  };
}

function analyzeVolumeTicket(
  entityJobs: Job[],
  baseline: PortfolioBaseline,
): MarginDriver | null {
  const valid = entityJobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);
  if (valid.length < 2) return null;

  const entityRevenue = valid.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  const entityAvgTicket = entityRevenue / valid.length;
  const ticketDelta = entityAvgTicket - baseline.avgTicket;
  const ticketPctDiff = baseline.avgTicket > 0 ? ticketDelta / baseline.avgTicket : 0;

  if (Math.abs(ticketPctDiff) < 0.15) return null;

  const costSpreadEffect = (() => {
    if (entityAvgTicket < baseline.avgTicket * 0.7) {
      return valid.length * (baseline.avgCostPerJob * 0.1);
    }
    return 0;
  })();

  const totalImpact = costSpreadEffect > 0 ? -costSpreadEffect : ticketDelta * valid.length * 0.1;

  return {
    driver: ticketDelta < 0 ? "Low-Ticket / High-Volume Pattern" : "Premium Ticket Size",
    category: "volume",
    direction: ticketDelta < 0 ? "drag" : "lift",
    dollarImpact: Math.round(totalImpact),
    detail: `Avg ticket $${Math.round(entityAvgTicket).toLocaleString()} vs. portfolio $${Math.round(baseline.avgTicket).toLocaleString()} (${ticketPctDiff > 0 ? "+" : ""}${(ticketPctDiff * 100).toFixed(0)}%). ${ticketDelta < 0 ? "Small jobs have higher per-unit dispatch and overhead costs." : "Larger jobs amortize fixed costs more effectively."}`,
  };
}

function analyzeContractStructure(
  entityJobs: Job[],
): MarginDriver | null {
  const valid = entityJobs.filter(j => !j.excluded && j.totalAmount != null);
  if (valid.length < 3) return null;

  const pmJobs = valid.filter(j => /preventative|preventive|pm|maintenance/i.test(j.jobType));
  const tmJobs = valid.filter(j => /t&m|time|service|repair/i.test(j.jobType));

  if (pmJobs.length === 0 && tmJobs.length === 0) return null;

  const pmRevenue = pmJobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  const pmCost = pmJobs.reduce((s, j) => s + (j.actualCost ?? 0), 0);
  const pmMargin = pmRevenue > 0 ? (pmRevenue - pmCost) / pmRevenue : null;

  const tmRevenue = tmJobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  const tmCost = tmJobs.reduce((s, j) => s + (j.actualCost ?? 0), 0);
  const tmMargin = tmRevenue > 0 ? (tmRevenue - tmCost) / tmRevenue : null;

  if (pmMargin != null && pmMargin < 0.15 && pmJobs.length >= 2) {
    const potentialLift = (0.30 - pmMargin) * pmRevenue;
    return {
      driver: "Underpriced PM Contracts",
      category: "contract",
      direction: "drag",
      dollarImpact: Math.round(-Math.abs(potentialLift)),
      detail: `PM contracts at ${(pmMargin * 100).toFixed(1)}% margin across ${pmJobs.length} jobs ($${Math.round(pmRevenue).toLocaleString()} revenue). Target PM margin: 30-40%.`,
      benchmarkComparison: "Industry PM contracts typically yield 30-40% gross margin due to predictable scope and route density advantages.",
    };
  }

  const escalatedJobs = valid.filter(j => j.nteExceeded);
  const withinScopeJobs = valid.filter(j => j.amountNTE != null && j.amountNTE > 0 && !j.nteExceeded);
  if (escalatedJobs.length >= 3 && withinScopeJobs.length >= 1) {
    const avgVisitsEscalated = escalatedJobs.reduce((s, j) => s + j.visitCount, 0) / escalatedJobs.length;
    const avgVisitsWithin = withinScopeJobs.reduce((s, j) => s + j.visitCount, 0) / withinScopeJobs.length;
    const visitDelta = avgVisitsEscalated - avgVisitsWithin;
    const returnTrips = escalatedJobs.filter(j => j.visitCount > Math.round(avgVisitsWithin)).length;
    const estTruckRollCost = Math.round(50 * SCALE);
    const frictionCost = returnTrips * estTruckRollCost;

    if (frictionCost > Math.round(200 * SCALE)) {
      return {
        driver: "Scope Escalation Friction",
        category: "contract",
        direction: "drag",
        dollarImpact: Math.round(-frictionCost),
        detail: `${escalatedJobs.length} jobs exceeded the customer-set NTE threshold, triggering dispatch approval workflow. Escalated jobs average ${avgVisitsEscalated.toFixed(1)} visits vs. ${avgVisitsWithin.toFixed(1)} for within-scope jobs (${visitDelta > 0 ? "+" : ""}${visitDelta.toFixed(1)} visit delta). ${returnTrips} estimated return trips at ~$${estTruckRollCost}/trip = $${frictionCost.toLocaleString()} annual friction cost.`,
        benchmarkComparison: "NTE is a customer-set authorization threshold from the third-party FM platform, not an internal dispatch setting. High escalation rates indicate the customer's NTE is too low for actual job scope — recommend negotiating higher thresholds.",
      };
    }
  }

  return null;
}

function analyzeRegionalCostPremium(
  entityJobs: Job[],
  baseline: PortfolioBaseline,
): MarginDriver | null {
  const valid = entityJobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);
  if (valid.length < 3) return null;

  const entityCost = valid.reduce((s, j) => s + (j.actualCost ?? 0), 0);
  const entityRevenue = valid.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  const entityCostPct = entityRevenue > 0 ? entityCost / entityRevenue : 0;

  let expectedCost = 0;
  for (const j of valid) {
    const avgCostForType = baseline.avgCostPerJobByType.get(j.jobType);
    if (avgCostForType != null) {
      expectedCost += avgCostForType;
    } else {
      expectedCost += baseline.avgCostPerJob;
    }
  }
  const expectedCostPct = entityRevenue > 0 ? expectedCost / entityRevenue : 0;

  const costDelta = entityCost - expectedCost;
  if (Math.abs(costDelta) < 1000 * SCALE) return null;

  const regions = [...new Set(valid.map(j => j.state))].filter(Boolean);
  const regionStr = regions.length > 0 ? regions.join(", ") : "Unknown";

  let benchComp: string | undefined;
  if (regions.length === 1 && regions[0]) {
    const stateKey = regions[0] as "RW" | "RS" | "RC" | "RE" | "RN" | "RM";
    const wageProfile = getWageForRegion(stateKey);
    if (wageProfile) {
      const latest = wageProfile.snapshots[wageProfile.snapshots.length - 1];
      const national = nationalBaseline[nationalBaseline.length - 1];
      if (latest && national) {
        const premium = ((latest.meanAnnualWage - national.meanAnnualWage) / national.meanAnnualWage * 100);
        benchComp = `${wageProfile.metroArea} HVAC wages ${premium > 0 ? "+" : ""}${premium.toFixed(0)}% vs. national avg ($${(latest.meanAnnualWage / 1000).toFixed(0)}k vs. $${(national.meanAnnualWage / 1000).toFixed(0)}k). ${costDelta > 0 ? "Structural cost premium should be reflected in regional pricing." : ""}`;
      }
    }
  }

  return {
    driver: costDelta > 0 ? "Regional Cost Premium" : "Regional Cost Advantage",
    category: "regional",
    direction: costDelta > 0 ? "drag" : "lift",
    dollarImpact: Math.round(-costDelta),
    detail: `Cost at ${(entityCostPct * 100).toFixed(1)}% of revenue vs. portfolio-adjusted expectation ${(expectedCostPct * 100).toFixed(1)}%. Regional operations in ${regionStr} carry a ${costDelta > 0 ? "premium" : "discount"} of $${Math.abs(Math.round(costDelta)).toLocaleString()}.`,
    benchmarkComparison: benchComp,
  };
}

/* ------------------------------------------------------------------ */
/*  Main Analysis Function                                             */
/* ------------------------------------------------------------------ */

export function analyzeEntity(
  entity: string,
  entityType: "customer" | "region",
  entityJobs: Job[],
  allJobs: Job[],
): RootCauseAnalysis {
  const baseline = buildPortfolioBaseline(allJobs);

  const valid = entityJobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);
  const entityRevenue = valid.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  const entityCost = valid.reduce((s, j) => s + (j.actualCost ?? 0), 0);
  const currentMarginPct = entityRevenue > 0 ? (entityRevenue - entityCost) / entityRevenue : 0;

  const primaryType = getPrimaryJobType(valid);
  const industryRange = getIndustryMarginRange(primaryType);

  const primaryRegion = (() => {
    const regions = valid.map(j => j.state).filter(Boolean);
    const counts = new Map<string, number>();
    for (const r of regions) counts.set(r, (counts.get(r) ?? 0) + 1);
    let max = 0;
    let primary = "";
    for (const [r, c] of counts) { if (c > max) { max = c; primary = r; } }
    return primary;
  })();

  const drivers: MarginDriver[] = [];

  const pricing = analyzePricingGap(entityJobs, baseline);
  if (pricing) drivers.push(pricing);

  const labor = analyzeLaborCostVariance(entityJobs, baseline, primaryRegion);
  if (labor) drivers.push(labor);

  const material = analyzeMaterialMarkup(entityJobs, baseline);
  if (material) drivers.push(material);

  const mix = analyzeJobMixDrag(entityJobs, baseline);
  if (mix) drivers.push(mix);

  const volume = analyzeVolumeTicket(entityJobs, baseline);
  if (volume) drivers.push(volume);

  const contract = analyzeContractStructure(entityJobs);
  if (contract) drivers.push(contract);

  const regional = analyzeRegionalCostPremium(entityJobs, baseline);
  if (regional) drivers.push(regional);

  drivers.sort((a, b) => Math.abs(b.dollarImpact) - Math.abs(a.dollarImpact));

  const topDrags = drivers.filter(d => d.direction === "drag").slice(0, 3);
  const estimatedRecovery = topDrags.reduce((s, d) => s + Math.abs(d.dollarImpact), 0);

  const topLever = drivers.length > 0
    ? `${drivers[0].driver}: $${Math.abs(drivers[0].dollarImpact).toLocaleString()} ${drivers[0].direction === "drag" ? "recoverable" : "advantage"}`
    : "No significant margin drivers identified";

  return {
    entity,
    entityType,
    currentMarginPct,
    portfolioBenchmarkPct: baseline.avgMarginPct,
    industryBenchmarkPct: industryRange,
    gapToPortfolioPct: currentMarginPct - baseline.avgMarginPct,
    drivers,
    topLever,
    estimatedRecovery,
  };
}

/* ------------------------------------------------------------------ */
/*  Portfolio-Wide Root Cause Builder                                   */
/* ------------------------------------------------------------------ */

export function buildCustomerRootCauses(
  customers: CustomerAggregate[],
  allJobs: Job[],
): Map<string, RootCauseAnalysis> {
  const results = new Map<string, RootCauseAnalysis>();
  for (const c of customers) {
    if (c.validated.jobCount < 3) continue;
    const rca = analyzeEntity(c.customerName, "customer", c.jobs, allJobs);
    if (rca.drivers.length > 0) {
      results.set(c.customerName, rca);
    }
  }
  return results;
}

export function buildRegionRootCauses(
  regions: RegionAggregate[],
  allJobs: Job[],
): Map<string, RootCauseAnalysis> {
  const results = new Map<string, RootCauseAnalysis>();
  for (const r of regions) {
    const regionJobs = allJobs.filter(j => j.region === r.region);
    if (regionJobs.length < 5) continue;
    const rca = analyzeEntity(r.region, "region", regionJobs, allJobs);
    if (rca.drivers.length > 0) {
      results.set(r.region, rca);
    }
  }
  return results;
}

/* ------------------------------------------------------------------ */
/*  Pre-Computed Prescriptions                                         */
/*                                                                     */
/*  Computes ready-to-use corrective actions with all math done in     */
/*  code. The LLM's job is narrative framing, not calculation.         */
/* ------------------------------------------------------------------ */

export interface Prescription {
  customer: string;
  tier: string;
  currentMarginPct: number;
  portfolioBenchmarkPct: number;
  gapPct: number;
  totalProjectedUplift: number;
  actions: PrescriptionAction[];
}

export interface PrescriptionAction {
  action: string;
  lever: string;
  currentValue: string;
  targetValue: string;
  math: string;
  projectedAnnualUplift: number;
  jobCount: number;
  jobType: string;
  confidence: "high" | "medium" | "low";
}

const TARGET_MARGIN = 0.45;
const LABOR_MULTIPLIER_TARGET = 3.5;

/** Role accountable for each prescription lever — embedded in action verbiage. */
const PRESCRIPTION_ROLE: Record<string, string> = {
  "Dispatch re-auth workflow": "Dispatch Operations Lead",
  "Labor billing rate": "Regional Pricing Manager",
  "Material markup": "Regional Pricing Manager",
  "Job ticket pricing": "Regional Pricing Manager",
};

function roleForLever(lever: string): string {
  return PRESCRIPTION_ROLE[lever] ?? "Regional Operations Director";
}

export function buildPrescriptions(
  customers: CustomerAggregate[],
  allJobs: Job[],
  rootCauses: Map<string, RootCauseAnalysis>,
): Prescription[] {
  const baseline = buildPortfolioBaseline(allJobs);
  const prescriptions: Prescription[] = [];

  const INDUSTRY_FLOOR = 0.40;
  const draggingCustomers = [...rootCauses.entries()]
    .filter(([, rca]) => {
      const belowFloor = rca.currentMarginPct < INDUSTRY_FLOOR;
      const deepGap = rca.gapToPortfolioPct < -0.15;
      const negative = rca.currentMarginPct < 0;
      return (belowFloor || deepGap || negative) && rca.estimatedRecovery > 2000 * SCALE;
    })
    .sort((a, b) => b[1].estimatedRecovery - a[1].estimatedRecovery)
    .slice(0, 8);

  for (const [custName, rca] of draggingCustomers) {
    const cust = customers.find(c => c.customerName === custName);
    if (!cust) continue;

    const actions: PrescriptionAction[] = [];
    const valid = cust.jobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);

    computeNTEPrescriptions(valid, baseline, actions);
    computeLaborRatePrescriptions(valid, baseline, actions);
    computeMaterialMarkupPrescriptions(valid, baseline, actions);
    computePricingGapPrescriptions(valid, baseline, actions);

    if (actions.length > 0) {
      prescriptions.push({
        customer: custName,
        tier: cust.tier,
        currentMarginPct: rca.currentMarginPct,
        portfolioBenchmarkPct: rca.portfolioBenchmarkPct,
        gapPct: rca.gapToPortfolioPct,
        totalProjectedUplift: actions.reduce((s, a) => s + a.projectedAnnualUplift, 0),
        actions,
      });
    }
  }

  return prescriptions.sort((a, b) => b.totalProjectedUplift - a.totalProjectedUplift);
}

function computePercentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeNTEPrescriptions(
  jobs: Job[],
  baseline: PortfolioBaseline,
  actions: PrescriptionAction[],
): void {
  const nteJobs = jobs.filter(j =>
    j.amountNTE != null && j.amountNTE > 0 &&
    j.totalAmount != null && j.totalAmount > 0 &&
    j.nteWorkflowOutcome != null
  );
  if (nteJobs.length < 3) return;

  const escalated = nteJobs.filter(j => j.nteExceeded);
  if (escalated.length < 2) return;

  const withinScope = nteJobs.filter(j => !j.nteExceeded);
  const escalationRate = escalated.length / nteJobs.length;
  if (escalationRate < 0.15) return;

  const byType = new Map<string, Job[]>();
  for (const j of nteJobs) {
    const arr = byType.get(j.jobType) || [];
    arr.push(j);
    byType.set(j.jobType, arr);
  }

  for (const [jobType, typeJobs] of byType) {
    if (typeJobs.length < 3) continue;

    const typeEscalated = typeJobs.filter(j => j.nteExceeded);
    if (typeEscalated.length < 2) continue;
    const typeWithinScope = typeJobs.filter(j => !j.nteExceeded);

    const avgNTE = typeJobs.reduce((s, j) => s + (j.amountNTE ?? 0), 0) / typeJobs.length;
    const amounts = typeJobs.map(j => j.totalAmount!).sort((a, b) => a - b);
    const p85 = computePercentile(amounts, 85);
    const recommendedNte = Math.ceil(p85 / 25) * 25;

    if (recommendedNte <= avgNTE * 1.1) continue;

    const escalationsEliminated = typeEscalated.filter(j => j.totalAmount! <= recommendedNte).length;
    const estTruckRollCost = Math.round(50 * SCALE);
    const returnTripRate = 0.4;
    const annualSavings = Math.round(escalationsEliminated * estTruckRollCost * returnTripRate);

    if (annualSavings < Math.round(100 * SCALE)) continue;

    const avgVisitsEscalated = typeEscalated.reduce((s, j) => s + j.visitCount, 0) / typeEscalated.length;
    const avgVisitsWithin = typeWithinScope.length > 0
      ? typeWithinScope.reduce((s, j) => s + j.visitCount, 0) / typeWithinScope.length
      : 1;

    actions.push({
      action: `${roleForLever("Dispatch re-auth workflow")}: cut ${jobType} NTE escalation loops from ${typeEscalated.length}/${typeJobs.length} to ${typeEscalated.length - escalationsEliminated}/${typeJobs.length} jobs/yr via single-queue re-auth — saves $${annualSavings.toLocaleString()}/yr in truck-roll overhead (${escalationsEliminated} loops × $${estTruckRollCost} × ${(returnTripRate * 100).toFixed(0)}% return-trip rate)`,
      lever: "Dispatch re-auth workflow",
      currentValue: `$${Math.round(avgNTE).toLocaleString()} customer-set NTE, ${typeEscalated.length}/${typeJobs.length} jobs escalate (${(typeEscalated.length / typeJobs.length * 100).toFixed(0)}% escalation rate)`,
      targetValue: `Single-queue re-auth for ${jobType}, target ${typeEscalated.length - escalationsEliminated}/${typeJobs.length} fewer escalation loops`,
      math: `Escalated jobs avg ${avgVisitsEscalated.toFixed(1)} visits vs. within-scope ${avgVisitsWithin.toFixed(1)} visits. ${escalationsEliminated} eliminated escalations × $${estTruckRollCost} truck roll × ${(returnTripRate * 100).toFixed(0)}% return-trip rate = $${annualSavings.toLocaleString()}/yr dispatch overhead savings`,
      projectedAnnualUplift: annualSavings,
      jobCount: typeJobs.length,
      jobType,
      confidence: typeJobs.length >= 5 ? "high" : "medium",
    });
  }
}

function computeLaborRatePrescriptions(
  jobs: Job[],
  baseline: PortfolioBaseline,
  actions: PrescriptionAction[],
): void {
  const laborJobs = jobs.filter(j =>
    j.costBreakdown && j.costBreakdown.laborHours > 0 && j.costBreakdown.avgLaborRate > 0
  );
  if (laborJobs.length < 3) return;

  const byType = new Map<string, Job[]>();
  for (const j of laborJobs) {
    const arr = byType.get(j.jobType) || [];
    arr.push(j);
    byType.set(j.jobType, arr);
  }

  for (const [jobType, typeJobs] of byType) {
    if (typeJobs.length < 2) continue;

    const totalHours = typeJobs.reduce((s, j) => s + (j.costBreakdown?.laborHours ?? 0), 0);
    const totalLaborCost = typeJobs.reduce((s, j) => s + (j.costBreakdown?.laborCost ?? 0), 0);
    const totalRevenue = typeJobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0);

    const avgCostRate = totalHours > 0 ? totalLaborCost / totalHours : 0;
    if (avgCostRate < 15 * SCALE) return;

    const currentBillingRate = totalHours > 0 ? totalRevenue / totalHours : 0;
    const currentMultiplier = avgCostRate > 0 ? currentBillingRate / avgCostRate : 0;

    if (currentMultiplier >= LABOR_MULTIPLIER_TARGET) continue;

    const targetBillingRate = Math.round(avgCostRate * LABOR_MULTIPLIER_TARGET);
    const rateUplift = targetBillingRate - currentBillingRate;
    if (rateUplift <= 5 * SCALE) continue;

    const annualRecovery = Math.round(rateUplift * totalHours);
    if (annualRecovery < 500 * SCALE) continue;

    const avgHoursPerJob = totalHours / typeJobs.length;

    actions.push({
      action: `${roleForLever("Labor billing rate")}: raise ${jobType} billing from $${Math.round(currentBillingRate)}/hr to $${targetBillingRate}/hr (${LABOR_MULTIPLIER_TARGET}× tech cost) on ~${typeJobs.length} jobs/yr — $${annualRecovery.toLocaleString()}/yr margin recovery at ${avgHoursPerJob.toFixed(1)} hrs/job avg`,
      lever: "Labor billing rate",
      currentValue: `$${Math.round(currentBillingRate)}/hr billing (${currentMultiplier.toFixed(1)}× tech cost of $${Math.round(avgCostRate)}/hr)`,
      targetValue: `$${targetBillingRate}/hr billing (${LABOR_MULTIPLIER_TARGET}× multiplier)`,
      math: `Tech cost $${Math.round(avgCostRate)}/hr × ${LABOR_MULTIPLIER_TARGET}× = $${targetBillingRate}/hr target. At current volume (~${typeJobs.length} jobs/yr, ${avgHoursPerJob.toFixed(1)} hrs/job avg), projected annual uplift: $${Math.round(rateUplift)}/hr × ${totalHours.toFixed(0)} hrs = $${annualRecovery.toLocaleString()}/yr`,
      projectedAnnualUplift: annualRecovery,
      jobCount: typeJobs.length,
      jobType,
      confidence: typeJobs.length >= 5 ? "high" : "medium",
    });
  }
}

function computeMaterialMarkupPrescriptions(
  jobs: Job[],
  baseline: PortfolioBaseline,
  actions: PrescriptionAction[],
): void {
  const matJobs = jobs.filter(j =>
    j.costBreakdown && (j.costBreakdown.materialCost + j.costBreakdown.equipmentCost) > 0 &&
    j.totalAmount != null && j.totalAmount > 0
  );
  if (matJobs.length < 3) return;

  const totalMatCost = matJobs.reduce((s, j) => s + (j.costBreakdown?.materialCost ?? 0) + (j.costBreakdown?.equipmentCost ?? 0), 0);
  const totalRevenue = matJobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
  const currentMarkupPct = totalRevenue > 0 ? totalMatCost / totalRevenue : 0;

  const [, indHigh] = pricingBenchmarks.materialMarkup.industryStandardRange;
  const targetMarkupPct = Math.min(indHigh, 0.25);

  if (currentMarkupPct >= targetMarkupPct || currentMarkupPct < 0.05) return;

  const markupGapPct = targetMarkupPct - currentMarkupPct;
  const annualRecovery = Math.round(markupGapPct * totalRevenue);
  if (annualRecovery < 500 * SCALE) return;

  const primaryType = getPrimaryJobType(matJobs);

  actions.push({
    action: `${roleForLever("Material markup")}: lift material markup from ${(currentMarkupPct * 100).toFixed(1)}% to ${(targetMarkupPct * 100).toFixed(0)}% of revenue on ~${matJobs.length} ${primaryType} jobs/yr — closes ${(markupGapPct * 100).toFixed(1)}pt gap for $${annualRecovery.toLocaleString()}/yr uplift`,
    lever: "Material markup",
    currentValue: `${(currentMarkupPct * 100).toFixed(1)}% material cost as % of revenue ($${Math.round(totalMatCost).toLocaleString()} on $${Math.round(totalRevenue).toLocaleString()})`,
    targetValue: `${(targetMarkupPct * 100).toFixed(0)}% (industry standard ${(pricingBenchmarks.materialMarkup.industryStandardRange[0] * 100).toFixed(0)}-${(pricingBenchmarks.materialMarkup.industryStandardRange[1] * 100).toFixed(0)}%)`,
    math: `Gap: ${(markupGapPct * 100).toFixed(1)} pts. At current volume (~${matJobs.length} jobs/yr, $${Math.round(totalRevenue).toLocaleString()} revenue), applying this markup going forward = $${annualRecovery.toLocaleString()}/yr projected uplift`,
    projectedAnnualUplift: annualRecovery,
    jobCount: matJobs.length,
    jobType: primaryType,
    confidence: matJobs.length >= 5 ? "high" : "medium",
  });
}

function computePricingGapPrescriptions(
  jobs: Job[],
  baseline: PortfolioBaseline,
  actions: PrescriptionAction[],
): void {
  const valid = jobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);
  if (valid.length < 3) return;

  const byType = new Map<string, Job[]>();
  for (const j of valid) {
    const arr = byType.get(j.jobType) || [];
    arr.push(j);
    byType.set(j.jobType, arr);
  }

  for (const [jobType, typeJobs] of byType) {
    if (typeJobs.length < 2) continue;

    const entityAvgTicket = typeJobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0) / typeJobs.length;
    const portfolioAvgTicket = baseline.avgRevenuePerJobByType.get(jobType);
    if (!portfolioAvgTicket || portfolioAvgTicket === 0) continue;

    const pctBelow = (portfolioAvgTicket - entityAvgTicket) / portfolioAvgTicket;
    if (pctBelow < 0.15) continue;

    const targetTicket = Math.round(portfolioAvgTicket * 0.95);
    const perJobUplift = targetTicket - entityAvgTicket;
    if (perJobUplift <= 0) continue;

    const annualRecovery = Math.round(perJobUplift * typeJobs.length);
    if (annualRecovery < 500 * SCALE) continue;

    const entityAvgCost = typeJobs.reduce((s, j) => s + (j.actualCost ?? 0), 0) / typeJobs.length;
    const currentMargin = entityAvgTicket > 0 ? ((entityAvgTicket - entityAvgCost) / entityAvgTicket * 100).toFixed(1) : "N/A";
    const targetMargin = targetTicket > 0 ? ((targetTicket - entityAvgCost) / targetTicket * 100).toFixed(1) : "N/A";

    actions.push({
      action: `${roleForLever("Job ticket pricing")}: reprice ${jobType} quotes from $${Math.round(entityAvgTicket).toLocaleString()} to $${targetTicket.toLocaleString()} (95% of portfolio $${Math.round(portfolioAvgTicket).toLocaleString()}) on ~${typeJobs.length} jobs/yr — $${annualRecovery.toLocaleString()}/yr uplift, margin ${currentMargin}% → ${targetMargin}%`,
      lever: "Job ticket pricing",
      currentValue: `$${Math.round(entityAvgTicket).toLocaleString()} avg ticket (${currentMargin}% margin) vs. portfolio $${Math.round(portfolioAvgTicket).toLocaleString()}`,
      targetValue: `$${targetTicket.toLocaleString()} (95% of portfolio avg, ${targetMargin}% margin)`,
      math: `$${Math.round(perJobUplift).toLocaleString()} uplift/job. At current volume (~${typeJobs.length} jobs/yr at $${Math.round(entityAvgCost).toLocaleString()} avg cost), projected annual uplift: $${annualRecovery.toLocaleString()}/yr`,
      projectedAnnualUplift: annualRecovery,
      jobCount: typeJobs.length,
      jobType,
      confidence: typeJobs.length >= 5 ? "high" : "medium",
    });
  }
}


/* ------------------------------------------------------------------ */
/*  Pricing Band Intelligence                                          */
/*                                                                     */
/*  Pre-computes actionable insights from win rate / price band data   */
/*  so the UI and agent can surface the "so what" — not just charts.   */
/* ------------------------------------------------------------------ */

export interface PricingBandInsight {
  jobType: string;
  totalQuotes: number;
  overallWinRate: number;
  sweetSpot: { min: number; max: number } | null;
  ceilingAmount: number | null;
  sweetSpotWinRate: number;
  aboveCeilingWinRate: number;
  winRateDropPts: number;
  pendingAboveCeiling: number;
  pendingAboveCeilingValue: number;
  expectedLossAboveCeiling: number;
  repricingOpportunityValue: number;
  pendingInSweetSpot: number;
  pendingInSweetSpotValue: number;
  recommendation: string;
  math: string;
}

export function buildPricingBandInsights(
  quoteAnalysis: { byJobType: JobTypeQuoteAnalysis[]; atRiskQuotes: AtRiskQuote[] },
): PricingBandInsight[] {
  const insights: PricingBandInsight[] = [];

  const fmtUsd = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(abs / 1_000).toFixed(1)}k`;
    return `$${abs.toFixed(0)}`;
  };

  for (const jt of quoteAnalysis.byJobType) {
    if (jt.totalQuotes < 5) continue;

    let sweetSpotWinRate = jt.overallWinRate;
    let ssWins = 0;
    let ssDecided = 0;
    let pendingInSweetSpot = 0;
    let pendingInSweetSpotValue = 0;

    if (jt.sweetSpot) {
      const sweetSpotBands = jt.priceBands.filter(
        b => b.min >= jt.sweetSpot!.min && b.max <= jt.sweetSpot!.max,
      );
      ssDecided = sweetSpotBands.reduce((s, b) => s + b.wins + b.losses, 0);
      ssWins = sweetSpotBands.reduce((s, b) => s + b.wins, 0);
      sweetSpotWinRate = ssDecided > 0 ? ssWins / ssDecided : jt.overallWinRate;
      pendingInSweetSpot = sweetSpotBands.reduce((s, b) => s + b.pending, 0);
      pendingInSweetSpotValue = sweetSpotBands.reduce((s, b) => {
        const midpoint = (b.min + b.max) / 2;
        return s + b.pending * midpoint;
      }, 0);
    }

    const boundary = jt.ceilingAmount ?? (jt.sweetSpot?.max ?? jt.priceBands[jt.priceBands.length - 1]?.max ?? 0);
    const outsideBands = jt.priceBands.filter(b => b.min >= boundary);
    const acDecided = outsideBands.reduce((s, b) => s + b.wins + b.losses, 0);
    const acWins = outsideBands.reduce((s, b) => s + b.wins, 0);
    const aboveCeilingWinRate = acDecided > 0 ? acWins / acDecided : 0;

    const winRateDropPts = acDecided >= 2
      ? (sweetSpotWinRate - aboveCeilingWinRate) * 100
      : 0;

    const pendingAboveCeiling = outsideBands.reduce((s, b) => s + b.pending, 0);
    const pendingAboveCeilingValue = outsideBands.reduce((s, b) => {
      const midpoint = (b.min + b.max) / 2;
      return s + b.pending * midpoint;
    }, 0);

    const expectedLossRate = acDecided >= 2 ? 1 - aboveCeilingWinRate : 0.5;
    const expectedLossAboveCeiling = Math.round(pendingAboveCeilingValue * expectedLossRate);

    const avgSweetSpotPrice = jt.sweetSpot ? (jt.sweetSpot.min + jt.sweetSpot.max) / 2 : 0;
    const repricingOpportunityValue = jt.sweetSpot ? Math.round(
      pendingAboveCeiling * avgSweetSpotPrice * sweetSpotWinRate,
    ) : 0;

    const totalPending = jt.priceBands.reduce((s, b) => s + b.pending, 0);
    const totalPendingValue = jt.priceBands.reduce((s, b) => s + b.pending * (b.min + b.max) / 2, 0);
    const expectedConversion = Math.round(totalPendingValue * sweetSpotWinRate);

    const decided = jt.wins + jt.losses;

    let recommendation: string;
    let math: string;

    if (jt.sweetSpot && pendingAboveCeiling > 0 && winRateDropPts >= 10) {
      recommendation = `Regional Pricing Manager: reprice ${pendingAboveCeiling} pending ${jt.jobType} quote${pendingAboveCeiling !== 1 ? "s" : ""} from above ${fmtUsd(boundary)} into ${fmtUsd(jt.sweetSpot.min)}–${fmtUsd(jt.sweetSpot.max)} sweet spot — recovers ${fmtUsd(repricingOpportunityValue)} at ${Math.round(sweetSpotWinRate * 100)}% win rate vs. ${Math.round(aboveCeilingWinRate * 100)}% above ceiling.`;
      math = `Sweet spot win rate: ${Math.round(sweetSpotWinRate * 100)}% (${ssWins}/${ssDecided}). Above ${fmtUsd(boundary)} win rate: ${Math.round(aboveCeilingWinRate * 100)}% (${acWins}/${acDecided}). ${pendingAboveCeiling} pending quotes worth ${fmtUsd(pendingAboveCeilingValue)} face ${Math.round(expectedLossRate * 100)}% loss rate → ${fmtUsd(expectedLossAboveCeiling)} at risk.`;
    } else if (jt.sweetSpot && totalPending > 0) {
      recommendation = `Sales Director: prioritize follow-up on ${totalPending} pending ${jt.jobType} quotes (${fmtUsd(totalPendingValue)} pipeline) — ${pendingInSweetSpot} already in ${fmtUsd(jt.sweetSpot.min)}–${fmtUsd(jt.sweetSpot.max)} band; expected conversion ${fmtUsd(expectedConversion)} at ${Math.round(sweetSpotWinRate * 100)}% win rate.`;
      math = `Sweet spot: ${fmtUsd(jt.sweetSpot.min)}–${fmtUsd(jt.sweetSpot.max)} with ${Math.round(sweetSpotWinRate * 100)}% win rate (${ssWins}/${ssDecided}). Total pending: ${totalPending} quotes worth ${fmtUsd(totalPendingValue)}, ${pendingInSweetSpot} in sweet spot. Expected conversion: ${fmtUsd(expectedConversion)}.`;
    } else if (jt.sweetSpot) {
      recommendation = `Regional Pricing Manager: price new ${jt.jobType} quotes within ${fmtUsd(jt.sweetSpot.min)}–${fmtUsd(jt.sweetSpot.max)} — ${Math.round(sweetSpotWinRate * 100)}% win rate across ${ssDecided} decided quotes (${ssWins}W/${ssDecided}).`;
      math = `${ssWins} wins out of ${ssDecided} decided quotes in sweet spot = ${Math.round(sweetSpotWinRate * 100)}% win rate. Overall: ${jt.totalQuotes} quotes, ${Math.round(jt.overallWinRate * 100)}% win rate.`;
    } else {
      recommendation = `${jt.jobType}: ${jt.totalQuotes} quotes analyzed, ${jt.wins} won, ${jt.losses} lost (${Math.round(jt.overallWinRate * 100)}% win rate). Sample size is limited — as quoting volume grows, pricing sweet spots and ceilings will become identifiable.`;
      math = `${jt.wins}W / ${jt.losses}L across ${jt.totalQuotes} quotes = ${Math.round(jt.overallWinRate * 100)}% overall win rate. ${jt.priceBands.length} price bands analyzed, ${totalPending} pending.`;
    }

    insights.push({
      jobType: jt.jobType,
      totalQuotes: jt.totalQuotes,
      overallWinRate: jt.overallWinRate,
      sweetSpot: jt.sweetSpot,
      ceilingAmount: jt.ceilingAmount,
      sweetSpotWinRate,
      aboveCeilingWinRate,
      winRateDropPts,
      pendingAboveCeiling,
      pendingAboveCeilingValue,
      expectedLossAboveCeiling,
      repricingOpportunityValue,
      pendingInSweetSpot,
      pendingInSweetSpotValue,
      recommendation,
      math,
    });
  }

  return insights.sort((a, b) => b.expectedLossAboveCeiling - a.expectedLossAboveCeiling);
}
