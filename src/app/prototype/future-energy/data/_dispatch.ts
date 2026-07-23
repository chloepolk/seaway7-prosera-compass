import type { Job } from "./_transform";
import type { Region } from "./_regions";
import { getEIAFuelSummaryForRegion } from "./_eia";
import { getWageForRegion } from "./_labor";

export interface CustomerEscalationProfile {
  customerName: string;
  totalNteJobs: number;
  escalatedJobCount: number;
  withinScopeJobCount: number;
  escalationRate: number;
  avgVisitsEscalated: number;
  avgVisitsWithinScope: number;
  visitDelta: number;
  avgDaysEscalated: number | null;
  avgDaysWithinScope: number | null;
  daysDelta: number | null;
  estimatedReturnTrips: number;
  truckRollCost: number;
  annualFrictionCost: number;
  currentNte: number;
  recommendedNte: number;
  escalationsEliminatedAtRecommended: number;
  recoverableWaste: number;
  declinedEscalations: number;
  declinedRevenueLost: number;
  primaryRegion: Region;
}

export interface RegionEscalationSummary {
  region: Region;
  totalNteJobs: number;
  escalationCount: number;
  escalationRate: number;
  totalFrictionCost: number;
  avgTruckRollCost: number;
}

export interface DispatchEfficiencyReport {
  portfolioEscalationRate: number;
  totalEscalationEvents: number;
  totalFrictionCost: number;
  customerProfiles: CustomerEscalationProfile[];
  regionSummaries: RegionEscalationSummary[];
  topFrictionCustomers: CustomerEscalationProfile[];
}

export function buildDispatchEfficiency(jobs: Job[]): DispatchEfficiencyReport {
  const nteJobs = jobs.filter(j =>
    j.amountNTE != null && j.amountNTE > 0 &&
    j.totalAmount != null &&
    j.nteWorkflowOutcome != null &&
    !j.qualityFlags.includes("PLACEHOLDER_NTE") &&
    !j.excluded
  );

  const byCustomer = new Map<string, Job[]>();
  for (const j of nteJobs) {
    const arr = byCustomer.get(j.customerName) || [];
    arr.push(j);
    byCustomer.set(j.customerName, arr);
  }

  const customerProfiles: CustomerEscalationProfile[] = [];

  for (const [customerName, custJobs] of byCustomer) {
    if (custJobs.length < 3) continue;

    const escalated = custJobs.filter(j => j.nteExceeded);
    const withinScope = custJobs.filter(j => !j.nteExceeded);

    if (escalated.length === 0) continue;

    const escalationRate = escalated.length / custJobs.length;

    const avgVisitsEscalated = escalated.reduce((s, j) => s + j.visitCount, 0) / escalated.length;
    const avgVisitsWithinScope = withinScope.length > 0
      ? withinScope.reduce((s, j) => s + j.visitCount, 0) / withinScope.length
      : 1;
    const visitDelta = avgVisitsEscalated - avgVisitsWithinScope;

    const escalatedWithDays = escalated.filter(j => j.timeToCompleteDays != null && j.timeToCompleteDays >= 0);
    const withinScopeWithDays = withinScope.filter(j => j.timeToCompleteDays != null && j.timeToCompleteDays >= 0);
    const avgDaysEscalated = escalatedWithDays.length > 0
      ? escalatedWithDays.reduce((s, j) => s + j.timeToCompleteDays!, 0) / escalatedWithDays.length
      : null;
    const avgDaysWithinScope = withinScopeWithDays.length > 0
      ? withinScopeWithDays.reduce((s, j) => s + j.timeToCompleteDays!, 0) / withinScopeWithDays.length
      : null;
    const daysDelta = avgDaysEscalated != null && avgDaysWithinScope != null
      ? avgDaysEscalated - avgDaysWithinScope
      : null;

    const baselineVisits = Math.round(avgVisitsWithinScope);
    const estimatedReturnTrips = escalated.filter(j => j.visitCount > baselineVisits).length;

    const primaryRegion = getPrimaryRegion(custJobs);
    const truckRollCost = estimateTruckRollCost(primaryRegion);

    const annualFrictionCost = estimatedReturnTrips * truckRollCost;

    const currentNte = Math.round(custJobs.reduce((s, j) => s + (j.amountNTE ?? 0), 0) / custJobs.length);

    const amounts = custJobs
      .map(j => j.totalAmount!)
      .filter(a => a > 0)
      .sort((a, b) => a - b);
    const recommendedNte = amounts.length > 0
      ? Math.ceil(computePercentile(amounts, 85) / 25) * 25
      : currentNte;

    const escalationsEliminatedAtRecommended = escalated.filter(j =>
      j.totalAmount! <= recommendedNte
    ).length;
    const recoverableWaste = Math.round(
      (escalationsEliminatedAtRecommended / Math.max(1, escalated.length)) * annualFrictionCost
    );

    const declinedJobs = custJobs.filter(j =>
      j.nteExceeded &&
      (j.jobStatus === "Canceled" || j.jobStatus === "Hold") &&
      j.visitCount >= 1
    );
    const declinedRevenueLost = declinedJobs.reduce((s, j) => {
      const billed = j.totalAmount ?? 0;
      const potential = j.amountNTE ?? 0;
      return s + Math.max(0, potential - billed);
    }, 0);

    customerProfiles.push({
      customerName,
      totalNteJobs: custJobs.length,
      escalatedJobCount: escalated.length,
      withinScopeJobCount: withinScope.length,
      escalationRate,
      avgVisitsEscalated,
      avgVisitsWithinScope,
      visitDelta,
      avgDaysEscalated,
      avgDaysWithinScope,
      daysDelta,
      estimatedReturnTrips,
      truckRollCost,
      annualFrictionCost,
      currentNte,
      recommendedNte,
      escalationsEliminatedAtRecommended,
      recoverableWaste,
      declinedEscalations: declinedJobs.length,
      declinedRevenueLost,
      primaryRegion,
    });
  }

  customerProfiles.sort((a, b) => b.annualFrictionCost - a.annualFrictionCost);

  const byRegion = new Map<Region, Job[]>();
  for (const j of nteJobs) {
    const arr = byRegion.get(j.region) || [];
    arr.push(j);
    byRegion.set(j.region, arr);
  }

  const regionSummaries: RegionEscalationSummary[] = [];
  for (const [region, regionJobs] of byRegion) {
    const escalationCount = regionJobs.filter(j => j.nteExceeded).length;
    const truckRoll = estimateTruckRollCost(region);
    regionSummaries.push({
      region,
      totalNteJobs: regionJobs.length,
      escalationCount,
      escalationRate: regionJobs.length > 0 ? escalationCount / regionJobs.length : 0,
      totalFrictionCost: escalationCount * truckRoll * 0.4,
      avgTruckRollCost: truckRoll,
    });
  }
  regionSummaries.sort((a, b) => b.totalFrictionCost - a.totalFrictionCost);

  const totalEscalationEvents = nteJobs.filter(j => j.nteExceeded).length;

  return {
    portfolioEscalationRate: nteJobs.length > 0 ? totalEscalationEvents / nteJobs.length : 0,
    totalEscalationEvents,
    totalFrictionCost: customerProfiles.reduce((s, p) => s + p.annualFrictionCost, 0),
    customerProfiles,
    regionSummaries,
    topFrictionCustomers: customerProfiles.slice(0, 5),
  };
}

function getPrimaryRegion(jobs: Job[]): Region {
  const counts = new Map<Region, number>();
  for (const j of jobs) counts.set(j.region, (counts.get(j.region) ?? 0) + 1);
  let max = 0;
  let primary: Region = "RW";
  for (const [r, c] of counts) { if (c > max) { max = c; primary = r; } }
  return primary;
}

function estimateTruckRollCost(region: Region): number {
  const AVG_GALLONS_PER_TRIP = 3.5;
  const fuelSummary = getEIAFuelSummaryForRegion(region);
  const fuelCost = AVG_GALLONS_PER_TRIP * fuelSummary.recentAvg;

  const WASTED_HOURS = 0.75;
  const wageProfile = getWageForRegion(region);
  const hourlyRate = wageProfile
    ? (wageProfile.snapshots[wageProfile.snapshots.length - 1]?.meanAnnualWage ?? 55000) / 2080
    : 26.50;
  const laborCost = WASTED_HOURS * hourlyRate * 1.35;

  const DISPATCH_OVERHEAD = 12;

  return Math.round(fuelCost + laborCost + DISPATCH_OVERHEAD);
}

function computePercentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
