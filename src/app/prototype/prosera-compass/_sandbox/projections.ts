import type { ComputedData, CustomerAggregate } from "../data/_transform";
import type { ScenarioState, ScenarioProjection } from "./types";

const EBITDA_MARGIN_PROXY = 0.13;
const TRUCK_ROLL_COST = 50;

function sortedDogs(customers: CustomerAggregate[]): CustomerAggregate[] {
  return customers
    .filter(c => c.tier === "Dogs")
    .sort((a, b) => a.validated.avgMarginPct - b.validated.avgMarginPct);
}

function starsProfile(customers: CustomerAggregate[]) {
  const stars = customers.filter(c => c.tier === "Stars");
  if (stars.length === 0) return { avgMargin: 0.6, avgRevenue: 5000, avgJobs: 5, avgTruckRolls: 8 };
  const n = stars.length;
  return {
    avgMargin: stars.reduce((s, c) => s + c.validated.avgMarginPct, 0) / n,
    avgRevenue: stars.reduce((s, c) => s + c.validated.totalRevenue, 0) / n,
    avgJobs: stars.reduce((s, c) => s + c.validated.jobCount, 0) / n,
    avgTruckRolls: stars.reduce((s, c) => s + c.jobs.reduce((t, j) => t + j.visitCount, 0), 0) / n,
  };
}

export function projectCustomerMix(
  data: ComputedData,
  exitDogs: number,
  addStars: number,
): ScenarioProjection {
  const dogs = sortedDogs(data.customers);
  const exiting = dogs.slice(0, Math.min(exitDogs, dogs.length));

  const exitRevenue = exiting.reduce((s, c) => s + c.validated.totalRevenue, 0);
  const exitMargin = exiting.reduce((s, c) => s + c.validated.totalMargin, 0);
  const exitTruckRolls = exiting.reduce(
    (s, c) => s + c.jobs.reduce((t, j) => t + j.visitCount, 0), 0,
  );
  const exitJobs = exiting.reduce((s, c) => s + c.validated.jobCount, 0);

  const dna = starsProfile(data.customers);
  const addRevenue = addStars * dna.avgRevenue;
  const addMargin = addStars * dna.avgRevenue * dna.avgMargin;
  const addTruckRolls = addStars * dna.avgTruckRolls;
  const addJobs = addStars * dna.avgJobs;

  const revenueDelta = -exitRevenue + addRevenue;
  const marginDelta = -exitMargin + addMargin;
  const baseRevenue = data.portfolioSummary.validated.totalRevenue;
  const baseMargin = data.portfolioSummary.validated.totalMargin;
  const currentMarginPct = baseRevenue > 0 ? baseMargin / baseRevenue : 0;
  const newMarginPct = (baseRevenue + revenueDelta) > 0
    ? (baseMargin + marginDelta) / (baseRevenue + revenueDelta) : 0;
  const marginPtsDelta = (newMarginPct - currentMarginPct) * 100;
  const ebitdaDeltaBps = baseRevenue > 0
    ? ((marginDelta * EBITDA_MARGIN_PROXY) / baseRevenue) * 10000 : 0;

  return {
    revenueDelta,
    marginDelta,
    marginPtsDelta,
    ebitdaDeltaBps,
    freedTruckRolls: exitTruckRolls - addTruckRolls,
    affectedCustomers: exiting.map(c => c.customerName),
    affectedJobs: exitJobs + addJobs,
  };
}

export function projectPricing(
  data: ComputedData,
  laborMultiplierTarget: number,
  materialMarkupTarget: number,
): ScenarioProjection {
  const jobs = data.jobs.filter(j => !j.excluded && j.totalAmount != null && j.totalAmount > 0);
  let laborUplift = 0;
  let materialUplift = 0;
  let affectedJobs = 0;

  if (laborMultiplierTarget > 0) {
    const jobsWithLabor = jobs.filter(j => j.costBreakdown?.laborCost && j.costBreakdown.laborCost > 0);
    for (const j of jobsWithLabor) {
      const laborCost = j.costBreakdown!.laborCost ?? 0;
      const currentBilling = (j.totalAmount ?? 0) - (j.costBreakdown!.materialCost ?? 0);
      const currentMultiplier = laborCost > 0 ? currentBilling / laborCost : 0;
      if (currentMultiplier > 0 && currentMultiplier < laborMultiplierTarget) {
        laborUplift += laborCost * (laborMultiplierTarget - currentMultiplier);
        affectedJobs++;
      }
    }
  }

  if (materialMarkupTarget > 0) {
    const jobsWithMat = jobs.filter(j => j.costBreakdown?.materialCost && j.costBreakdown.materialCost > 0);
    const totalMatCost = jobsWithMat.reduce((s, j) => s + (j.costBreakdown!.materialCost ?? 0), 0);
    const totalRevenue = jobsWithMat.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
    const currentMarkup = totalRevenue > 0 ? totalMatCost / totalRevenue : 0;
    if (currentMarkup > 0 && materialMarkupTarget / 100 > currentMarkup) {
      materialUplift = (materialMarkupTarget / 100 - currentMarkup) * totalRevenue;
      affectedJobs += jobsWithMat.length;
    }
  }

  const revenueDelta = laborUplift + materialUplift;
  const marginDelta = revenueDelta;
  const baseRevenue = data.portfolioSummary.validated.totalRevenue;
  const baseMargin = data.portfolioSummary.validated.totalMargin;
  const currentMarginPct = baseRevenue > 0 ? baseMargin / baseRevenue : 0;
  const newMarginPct = (baseRevenue + revenueDelta) > 0
    ? (baseMargin + marginDelta) / (baseRevenue + revenueDelta) : 0;

  return {
    revenueDelta,
    marginDelta,
    marginPtsDelta: (newMarginPct - currentMarginPct) * 100,
    ebitdaDeltaBps: baseRevenue > 0 ? (marginDelta * EBITDA_MARGIN_PROXY / baseRevenue) * 10000 : 0,
    freedTruckRolls: 0,
    affectedCustomers: [],
    affectedJobs,
  };
}

export function projectFuel(
  data: ComputedData,
  newPricePerGal: number,
): ScenarioProjection {
  const sens = data.fuelExposure.sensitivity;
  if (newPricePerGal <= 0) {
    return { revenueDelta: 0, marginDelta: 0, marginPtsDelta: 0, ebitdaDeltaBps: 0, freedTruckRolls: 0, affectedCustomers: [], affectedJobs: 0 };
  }

  const priceDelta = newPricePerGal - sens.currentPricePerGal;
  const costDelta = priceDelta * sens.annualGallons;
  const marginDelta = -costDelta;
  const baseRevenue = data.portfolioSummary.validated.totalRevenue;
  const baseMargin = data.portfolioSummary.validated.totalMargin;
  const currentMarginPct = baseRevenue > 0 ? baseMargin / baseRevenue : 0;
  const newMarginPct = baseRevenue > 0 ? (baseMargin + marginDelta) / baseRevenue : 0;

  return {
    revenueDelta: 0,
    marginDelta,
    marginPtsDelta: (newMarginPct - currentMarginPct) * 100,
    ebitdaDeltaBps: baseRevenue > 0 ? (marginDelta * EBITDA_MARGIN_PROXY / baseRevenue) * 10000 : 0,
    freedTruckRolls: 0,
    affectedCustomers: [],
    affectedJobs: 0,
  };
}

export function projectNte(
  data: ComputedData,
  thresholdMultiplier: number,
): ScenarioProjection {
  const de = data.dispatchEfficiency;
  if (!de || thresholdMultiplier <= 1.0) {
    return { revenueDelta: 0, marginDelta: 0, marginPtsDelta: 0, ebitdaDeltaBps: 0, freedTruckRolls: 0, affectedCustomers: [], affectedJobs: 0 };
  }

  let eliminatedEvents = 0;
  let frictionSaved = 0;
  let freedRolls = 0;
  const affected: string[] = [];

  for (const p of de.customerProfiles) {
    const newNte = p.currentNte * thresholdMultiplier;
    const escalatedJobs = data.jobs.filter(
      j => j.customerName === p.customerName && j.nteExceeded && j.amountNTE != null && (j.totalAmount ?? 0) <= newNte,
    );
    if (escalatedJobs.length > 0) {
      eliminatedEvents += escalatedJobs.length;
      freedRolls += escalatedJobs.length;
      frictionSaved += escalatedJobs.length * TRUCK_ROLL_COST;
      affected.push(p.customerName);
    }
  }

  const baseRevenue = data.portfolioSummary.validated.totalRevenue;
  const baseMargin = data.portfolioSummary.validated.totalMargin;
  const currentMarginPct = baseRevenue > 0 ? baseMargin / baseRevenue : 0;
  const newMarginPct = baseRevenue > 0 ? (baseMargin + frictionSaved) / baseRevenue : 0;

  return {
    revenueDelta: 0,
    marginDelta: frictionSaved,
    marginPtsDelta: (newMarginPct - currentMarginPct) * 100,
    ebitdaDeltaBps: baseRevenue > 0 ? (frictionSaved * EBITDA_MARGIN_PROXY / baseRevenue) * 10000 : 0,
    freedTruckRolls: freedRolls,
    affectedCustomers: affected,
    affectedJobs: eliminatedEvents,
  };
}

export function projectAll(data: ComputedData, state: ScenarioState): ScenarioProjection {
  const mix = projectCustomerMix(data, state.customerMix.exitDogs, state.customerMix.addStars);
  const pricing = projectPricing(data, state.pricing.laborMultiplier, state.pricing.materialMarkupPct);
  const fuel = projectFuel(data, state.fuel.pricePerGal);
  const nte = projectNte(data, state.nte.thresholdMultiplier);

  const all = [mix, pricing, fuel, nte];
  return {
    revenueDelta: all.reduce((s, p) => s + p.revenueDelta, 0),
    marginDelta: all.reduce((s, p) => s + p.marginDelta, 0),
    marginPtsDelta: all.reduce((s, p) => s + p.marginPtsDelta, 0),
    ebitdaDeltaBps: all.reduce((s, p) => s + p.ebitdaDeltaBps, 0),
    freedTruckRolls: all.reduce((s, p) => s + p.freedTruckRolls, 0),
    affectedCustomers: [...new Set(all.flatMap(p => p.affectedCustomers))],
    affectedJobs: all.reduce((s, p) => s + p.affectedJobs, 0),
  };
}

export function getDogsCount(data: ComputedData): number {
  return data.portfolioSummary.tierCounts.Dogs ?? 0;
}

export function getCurrentFuelPrice(data: ComputedData): number {
  return data.fuelExposure.sensitivity.currentPricePerGal;
}

export function getDogsNames(data: ComputedData, count: number): string[] {
  return sortedDogs(data.customers).slice(0, count).map(c => c.customerName);
}
