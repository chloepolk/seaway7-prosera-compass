/* ------------------------------------------------------------------ */
/*  Market Expansion Prescriptions Engine                              */
/*                                                                     */
/*  Cross-references BLS wage data, Census construction permits,       */
/*  EIA fuel costs, and ACME Field Services' current regional footprint      */
/*  to produce invest / harvest / defend strategy per region.          */
/* ------------------------------------------------------------------ */

import type { RegionAggregate } from "./_transform";
import type { Region } from "./_regions";
import { regionLabels } from "./_regions";
import { metroWageProfiles, nationalBaseline, getWageForRegion, getWagePremiumVsNational } from "./_labor";
import { metroPermitProfiles, getPermitsForRegion, getConstructionGrowthSignal } from "./_construction";
import { getEIAFuelForRegion, getEIAFuelSummaryForRegion, paddLabels } from "./_eia";
import { formatGbp, formatFuelUnit } from "../_format";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ExpansionStrategy = "invest" | "expand" | "defend" | "harvest" | "explore";

export interface MarketSignal {
  source: "BLS" | "Census" | "EIA" | "Internal";
  metric: string;
  value: string;
  implication: string;
}

export interface StrategyScorecard {
  constructionGrowth: number;
  wageFavorability: number;
  laborSupply: number;
  currentMargin: number;
  footprintStrength: number;
  fuelExposure: number;
}

export interface ExpansionPrescription {
  region: Region;
  regionName: string;
  strategy: ExpansionStrategy;
  strategyRationale: string;
  compositeScore: number;
  scorecard: StrategyScorecard;
  currentFootprint: {
    customers: number;
    jobs: number;
    margin: number;
    revenue: number;
    tier: string;
  };
  marketSignals: MarketSignal[];
  actions: ExpansionAction[];
}

export interface ExpansionAction {
  action: string;
  lever: "M&A" | "Sales" | "Pricing" | "Operations";
  rationale: string;
  expectedImpact: string;
  /** Explicit formula backing the expected impact. */
  math?: string;
  sources: ("BLS" | "Census" | "EIA" | "Internal")[];
  confidence: "high" | "medium" | "low";
}

/* ------------------------------------------------------------------ */
/*  Scoring Model                                                      */
/* ------------------------------------------------------------------ */

function scoreRegion(region: Region, regionAgg: RegionAggregate | undefined): StrategyScorecard {
  const wageProfile = getWageForRegion(region);
  const constructionSignal = getConstructionGrowthSignal(region);
  const permits = getPermitsForRegion(region);

  const latestNational = nationalBaseline[nationalBaseline.length - 1];

  let constructionGrowth = 50;
  if (constructionSignal.twoYearChange > -0.05) constructionGrowth = 80;
  else if (constructionSignal.twoYearChange > -0.10) constructionGrowth = 60;
  else if (constructionSignal.twoYearChange > -0.20) constructionGrowth = 40;
  else constructionGrowth = 20;

  const topPermit = permits.sort((a, b) => {
    const la = a.snapshots[a.snapshots.length - 1]?.totalPermits ?? 0;
    const lb = b.snapshots[b.snapshots.length - 1]?.totalPermits ?? 0;
    return lb - la;
  })[0];
  if (topPermit?.constructionActivityLevel === "high") constructionGrowth = Math.min(100, constructionGrowth + 15);

  let wageFavorability = 50;
  if (wageProfile) {
    const premium = getWagePremiumVsNational(wageProfile);
    if (premium < -0.05) wageFavorability = 80;
    else if (premium < 0.05) wageFavorability = 60;
    else if (premium < 0.15) wageFavorability = 40;
    else wageFavorability = 25;
  }

  let laborSupply = 50;
  if (wageProfile) {
    const latest = wageProfile.snapshots[wageProfile.snapshots.length - 1];
    if (latest?.locationQuotient) {
      if (latest.locationQuotient >= 1.05) laborSupply = 75;
      else if (latest.locationQuotient >= 0.90) laborSupply = 55;
      else laborSupply = 30;
    }
    if (wageProfile.fourYearChangePct > 0.17) laborSupply = Math.max(20, laborSupply - 15);
  }

  let currentMargin = 50;
  if (regionAgg) {
    const m = regionAgg.validated.avgMarginPct;
    if (m >= 0.60) currentMargin = 90;
    else if (m >= 0.50) currentMargin = 70;
    else if (m >= 0.40) currentMargin = 50;
    else currentMargin = 30;
  }

  let footprintStrength = 0;
  if (regionAgg) {
    const jobs = regionAgg.jobCount;
    if (jobs >= 200) footprintStrength = 90;
    else if (jobs >= 100) footprintStrength = 70;
    else if (jobs >= 30) footprintStrength = 50;
    else if (jobs >= 10) footprintStrength = 30;
    else footprintStrength = 10;
  }

  const eiaFuelSummary = getEIAFuelSummaryForRegion(region);
  const fuelDelta = eiaFuelSummary.deltaPct;
  const fuelExposure = fuelDelta > 0.25 ? 30 : fuelDelta > 0.10 ? 50 : 70;

  return { constructionGrowth, wageFavorability, laborSupply, currentMargin, footprintStrength, fuelExposure };
}

function computeComposite(sc: StrategyScorecard): number {
  return Math.round(
    sc.constructionGrowth * 0.25 +
    sc.wageFavorability * 0.15 +
    sc.laborSupply * 0.10 +
    sc.currentMargin * 0.20 +
    sc.footprintStrength * 0.15 +
    sc.fuelExposure * 0.15
  );
}

function deriveStrategy(composite: number, footprint: number, constructionGrowth: number): ExpansionStrategy {
  if (composite >= 70 && footprint >= 50) return "invest";
  if (composite >= 65 && footprint < 40 && constructionGrowth >= 60) return "expand";
  if (composite >= 55 && footprint >= 50) return "defend";
  if (composite < 45) return "harvest";
  return "explore";
}

/* ------------------------------------------------------------------ */
/*  Market Signals Builder                                             */
/* ------------------------------------------------------------------ */

function buildMarketSignals(region: Region, sc: StrategyScorecard, regionAgg: RegionAggregate | undefined): MarketSignal[] {
  const signals: MarketSignal[] = [];
  const wageProfile = getWageForRegion(region);
  const permits = getPermitsForRegion(region);
  const constructionSignal = getConstructionGrowthSignal(region);

  if (wageProfile) {
    const latest = wageProfile.snapshots[wageProfile.snapshots.length - 1];
    const premium = getWagePremiumVsNational(wageProfile);
    signals.push({
      source: "BLS",
      metric: "HVAC tech mean wage",
      value: `${formatGbp(latest?.meanAnnualWage ?? 0, false)}/yr`,
      implication: premium > 0.05
        ? `${(premium * 100).toFixed(1)}% above the national mean`
        : `${Math.abs(premium * 100).toFixed(1)}% ${premium >= 0 ? "above" : "below"} the national mean`,
    });

    if (latest?.locationQuotient) {
      signals.push({
        source: "BLS",
        metric: "Tech location quotient",
        value: latest.locationQuotient.toFixed(2),
        implication: latest.locationQuotient < 0.90
          ? `Location quotient ${latest.locationQuotient.toFixed(2)} is below 0.90. Tech supply is short of the national mean.`
          : latest.locationQuotient >= 1.05
          ? `Location quotient ${latest.locationQuotient.toFixed(2)} is at or above 1.05. Hiring is less constrained than in short-supply metros.`
          : `Location quotient ${latest.locationQuotient.toFixed(2)} is between 0.90 and 1.05.`,
      });
    }

    signals.push({
      source: "BLS",
      metric: "4-year wage growth",
      value: `${(wageProfile.fourYearChangePct * 100).toFixed(1)}%`,
      implication: wageProfile.fourYearChangePct > 0.15
        ? `Wages are up ${(wageProfile.fourYearChangePct * 100).toFixed(1)}% over four years. Price escalation needs to match that rate or margin falls.`
        : `Wages are up ${(wageProfile.fourYearChangePct * 100).toFixed(1)}% over four years.`,
    });
  }

  if (permits.length > 0) {
    const topPermit = permits.sort((a, b) => {
      const la = a.snapshots[a.snapshots.length - 1]?.totalPermits ?? 0;
      const lb = b.snapshots[b.snapshots.length - 1]?.totalPermits ?? 0;
      return lb - la;
    })[0];
    const latestPermits = topPermit.snapshots[topPermit.snapshots.length - 1]?.totalPermits ?? 0;

    signals.push({
      source: "Census",
      metric: "Building permits (top metro)",
      value: `${latestPermits.toLocaleString()} units (${topPermit.metroArea})`,
      implication: `${latestPermits.toLocaleString()} permits/yr in ${topPermit.metroArea} (dataset activity level: ${topPermit.constructionActivityLevel}).`,
    });

    signals.push({
      source: "Census",
      metric: "2-year permit trend",
      value: `${(constructionSignal.twoYearChange * 100).toFixed(1)}%`,
      implication: `Permits are ${(constructionSignal.twoYearChange * 100).toFixed(1)}% vs. two years ago.`,
    });
  }

  const eiaFuel = getEIAFuelSummaryForRegion(region);
  signals.push({
    source: "EIA",
    metric: `Fuel cost trend (${eiaFuel.paddLabel})`,
    value: `${formatFuelUnit(eiaFuel.recentAvg)}/L (${eiaFuel.deltaPct > 0 ? "+" : ""}${(eiaFuel.deltaPct * 100).toFixed(1)}% from baseline ${formatFuelUnit(eiaFuel.baselineAvg)})`,
    implication: eiaFuel.deltaPct > 0.25
      ? `${eiaFuel.paddLabel} fuel is ${(eiaFuel.deltaPct * 100).toFixed(1)}% above baseline. Add a contract fuel clause.`
      : eiaFuel.deltaPct > 0.10
      ? `${eiaFuel.paddLabel} fuel is ${(eiaFuel.deltaPct * 100).toFixed(1)}% above baseline. Embed fuel escalation in new contracts.`
      : `${eiaFuel.paddLabel} fuel is ${(eiaFuel.deltaPct * 100).toFixed(1)}% vs. baseline.`,
  });

  if (regionAgg) {
    signals.push({
      source: "Internal",
      metric: "Current margin",
      value: `${(regionAgg.validated.avgMarginPct * 100).toFixed(1)}%`,
      implication: regionAgg.validated.avgMarginPct >= 0.60
        ? `Margin is ${(regionAgg.validated.avgMarginPct * 100).toFixed(1)}%, at or above the 60% cut.`
        : regionAgg.validated.avgMarginPct >= 0.50
        ? `Margin is ${(regionAgg.validated.avgMarginPct * 100).toFixed(1)}%, between the 50% and 60% cuts.`
        : `Margin is ${(regionAgg.validated.avgMarginPct * 100).toFixed(1)}%, below the 50% cut.`,
    });

    signals.push({
      source: "Internal",
      metric: "Customer base",
      value: `${regionAgg.customerCount} customers, ${regionAgg.jobCount} jobs`,
      implication: regionAgg.customerCount >= 50
        ? `${regionAgg.customerCount} customers and ${regionAgg.jobCount} jobs. Use the existing book to add density.`
        : regionAgg.customerCount >= 15
        ? `${regionAgg.customerCount} customers and ${regionAgg.jobCount} jobs. Add sales coverage to raise density.`
        : `${regionAgg.customerCount} customers and ${regionAgg.jobCount} jobs. Evaluate M&A for market entry.`,
    });
  }

  return signals;
}

/* ------------------------------------------------------------------ */
/*  Actions Builder                                                    */
/* ------------------------------------------------------------------ */

function buildActions(
  region: Region,
  strategy: ExpansionStrategy,
  sc: StrategyScorecard,
  regionAgg: RegionAggregate | undefined,
): ExpansionAction[] {
  const actions: ExpansionAction[] = [];
  const wageProfile = getWageForRegion(region);
  const permits = getPermitsForRegion(region);
  const name = regionLabels[region];

  if (strategy === "invest" || strategy === "expand") {
    const topPermit = permits.sort((a, b) => {
      const la = a.snapshots[a.snapshots.length - 1]?.totalPermits ?? 0;
      const lb = b.snapshots[b.snapshots.length - 1]?.totalPermits ?? 0;
      return lb - la;
    })[0];

    if (topPermit && topPermit.constructionActivityLevel === "high") {
      const latestPermits = topPermit.snapshots[topPermit.snapshots.length - 1]?.totalPermits ?? 0;
      actions.push({
        action: `Corp Dev Lead: target M&A in ${topPermit.metroArea} — ${latestPermits.toLocaleString()} Census permits/yr (high activity) converts install pipeline to recurring service; model 4–6× EBITDA on sub-scale sellers`,
        lever: "M&A",
        rationale: `${topPermit.notes}`,
        expectedImpact: `Each acquired competitor in a high-permit metro adds install-to-service conversion revenue plus existing contract book`,
        math: `Permit pipeline = ${latestPermits.toLocaleString()} units/yr (${topPermit.metroArea}, Census BPS) × install-to-service conversion rate`,
        sources: ["Census", "Internal"],
        confidence: "high",
      });
    }

    if (wageProfile && wageProfile.fourYearChangePct > 0.14) {
      const latest = wageProfile.snapshots[wageProfile.snapshots.length - 1];
      actions.push({
        action: `Corp Dev Lead: acquire 1–3 truck operators in ${name} facing ${(wageProfile.fourYearChangePct * 100).toFixed(1)}% BLS wage inflation at ${formatGbp(latest?.meanAnnualWage ?? 0, false)}/yr — consolidate overhead for 4–6× EBITDA entry`,
        lever: "M&A",
        rationale: `Small operators (1-3 trucks) face margin compression from rising tech wages without scale economies. ACME Field Services' platform absorbs the cost through utilization leverage.`,
        expectedImpact: `Acquire at 4-6x EBITDA from margin-pressured sellers, immediately improve margins through overhead consolidation`,
        math: `BLS 4-yr wage growth = ${(wageProfile.fourYearChangePct * 100).toFixed(1)}%; platform absorbs via utilization leverage at ${formatGbp(latest?.meanAnnualWage ?? 0, false)}/yr`,
        sources: ["BLS", "Internal"],
        confidence: "medium",
      });
    }

    if (regionAgg && regionAgg.customerCount < 30) {
      actions.push({
        action: `Sales Director: add 1 dedicated AE in ${name} to grow from ${regionAgg.customerCount} → 50+ accounts — each new customer adds ~${formatGbp(regionAgg.validated.avgTicket, false)} at near-zero incremental travel`,
        lever: "Sales",
        rationale: `Current footprint is sub-scale. Route density drives technician utilization — more customers per zip code reduces windshield time.`,
        expectedImpact: `Each additional customer in an existing service area adds ~${formatGbp(regionAgg.validated.avgTicket, false)} avg ticket revenue at near-zero incremental travel cost`,
        math: `Incremental revenue/customer ≈ avgTicket = ${formatGbp(regionAgg.validated.avgTicket, false)} (near-zero marginal travel in existing routes)`,
        sources: ["Internal"],
        confidence: "medium",
      });
    }
  }

  if (strategy === "defend") {
    if (regionAgg && regionAgg.validated.avgMarginPct >= 0.60) {
      actions.push({
        action: `Sales Director: lock ${Math.min(10, regionAgg.customerCount)} top ${name} accounts into 3-yr agreements at ${(regionAgg.validated.avgMarginPct * 100).toFixed(1)}% margin — protects ${formatGbp(regionAgg.validated.totalMargin, false)}/yr from competitive displacement`,
        lever: "Sales",
        rationale: `High-margin regions attract competitor attention. Contractual lock-in prevents cherry-picking of best accounts.`,
        expectedImpact: `Protect ${formatGbp(regionAgg.validated.totalMargin, false)} in annual margin from competitive displacement`,
        math: `Protected margin = Σ(top ${Math.min(10, regionAgg.customerCount)} accounts) = ${formatGbp(regionAgg.validated.totalMargin, false)}/yr at ${(regionAgg.validated.avgMarginPct * 100).toFixed(1)}%`,
        sources: ["Internal"],
        confidence: "high",
      });
    }

    if (wageProfile && wageProfile.fourYearChangePct > 0.15) {
      const latest = wageProfile.snapshots[wageProfile.snapshots.length - 1];
      actions.push({
        action: `Regional Pricing Manager: escalate ${name} service rates ${(wageProfile.fourYearChangePct * 100 / 4).toFixed(1)}%/yr to track BLS ${(wageProfile.fourYearChangePct * 100).toFixed(1)}% wage growth (${formatGbp(latest?.meanAnnualWage ?? 0, false)}/yr HVAC tech in ${wageProfile.metroArea})`,
        lever: "Pricing",
        rationale: `BLS data shows HVAC tech wages in ${wageProfile.metroArea} at ${formatGbp(latest?.meanAnnualWage ?? 0, false)}/yr, growing faster than national average.`,
        expectedImpact: `Prevents margin erosion from wage-price divergence`,
        math: `Required price escalation ≥ wage growth / 4 = ${(wageProfile.fourYearChangePct * 100 / 4).toFixed(1)}%/yr to match ${(wageProfile.fourYearChangePct * 100).toFixed(1)}% 4-yr BLS trend`,
        sources: ["BLS", "Internal"],
        confidence: "high",
      });
    }
  }

  if (strategy === "harvest") {
    if (regionAgg) {
      actions.push({
        action: `Regional Operations Director: consolidate ${name} — ${regionAgg.customerCount} customers / ${regionAgg.jobCount} jobs is sub-scale; redeploy ${Math.max(1, Math.round(regionAgg.jobCount / 100))} FTE to higher-ROI invest/expand regions`,
        lever: "Operations",
        rationale: `Construction ${sc.constructionGrowth}/100, wages ${sc.wageFavorability}/100, footprint ${sc.footprintStrength}/100.`,
        expectedImpact: `Redeploy freed resources to invest/expand regions with higher ROI`,
        sources: ["Census", "BLS", "Internal"],
        confidence: "medium",
      });
    }
  }

  if (strategy === "explore") {
    actions.push({
      action: `Corp Dev Lead: run deal screen on ${name} — composite ${sc.constructionGrowth}/100 construction, ${sc.wageFavorability}/100 wage score; target beachhead at ≤ 5× EBITDA if seller pressure exists`,
      lever: "M&A",
      rationale: `Construction ${sc.constructionGrowth}/100, wages ${sc.wageFavorability}/100. Price any entry off those scores.`,
      expectedImpact: `Market entry if a seller is available. No valuation multiple is in this dataset.`,
      sources: ["Census", "BLS", "Internal"],
      confidence: "low",
    });
  }

  return actions;
}

/* ------------------------------------------------------------------ */
/*  Main Entry Point                                                   */
/* ------------------------------------------------------------------ */

export function buildExpansionPrescriptions(
  regions: RegionAggregate[],
): ExpansionPrescription[] {
  const allRegions: Region[] = ["RW", "RC", "RS", "RE", "RN", "RM"];

  return allRegions.map(region => {
    const regionAgg = regions.find(r => r.region === region);
    const scorecard = scoreRegion(region, regionAgg);
    const composite = computeComposite(scorecard);
    const strategy = deriveStrategy(composite, scorecard.footprintStrength, scorecard.constructionGrowth);
    const signals = buildMarketSignals(region, scorecard, regionAgg);
    const actions = buildActions(region, strategy, scorecard, regionAgg);

    return {
      region,
      regionName: regionLabels[region],
      strategy,
      strategyRationale: buildStrategyRationale(strategy, region, scorecard, regionAgg),
      compositeScore: composite,
      scorecard,
      currentFootprint: {
        customers: regionAgg?.customerCount ?? 0,
        jobs: regionAgg?.jobCount ?? 0,
        margin: regionAgg?.validated.avgMarginPct ?? 0,
        revenue: regionAgg?.validated.totalRevenue ?? 0,
        tier: strategy === "invest" ? "Core"
          : strategy === "expand" ? "Growth"
          : strategy === "defend" ? "Protect"
          : strategy === "harvest" ? "Optimize"
          : "Evaluate",
      },
      marketSignals: signals,
      actions,
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
}

function buildStrategyRationale(
  strategy: ExpansionStrategy,
  region: Region,
  sc: StrategyScorecard,
  regionAgg: RegionAggregate | undefined,
): string {
  const name = regionLabels[region];
  switch (strategy) {
    case "invest":
      return `${name} margin is ${regionAgg ? (regionAgg.validated.avgMarginPct * 100).toFixed(1) : "N/A"}%. Priority: scale through M&A and sales.`;
    case "expand":
      return `${name} construction score is ${sc.constructionGrowth}/100 and wage score is ${sc.wageFavorability}/100. Footprint score is ${sc.footprintStrength}/100. Priority: market entry through targeted acquisition.`;
    case "defend":
      return `${name} margin is ${regionAgg ? (regionAgg.validated.avgMarginPct * 100).toFixed(1) : "N/A"}%. Wage score ${sc.wageFavorability}/100, fuel score ${sc.fuelExposure}/100. Priority: hold pricing and lock contracts.`;
    case "harvest":
      return `${name} scorecard is below the invest/expand cut. Priority: extract value from the existing book and redeploy growth capital elsewhere.`;
    case "explore":
      return `${name} construction ${sc.constructionGrowth}/100, wages ${sc.wageFavorability}/100, footprint ${sc.footprintStrength}/100. Evaluate each case before committing growth capital.`;
  }
}
