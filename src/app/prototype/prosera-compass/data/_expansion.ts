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
      value: `$${latest?.meanAnnualWage?.toLocaleString()}/yr`,
      implication: premium > 0.05
        ? `${(premium * 100).toFixed(1)}% above national avg — labor costs compress margins, platform wage arbitrage opportunity at scale`
        : `${Math.abs(premium * 100).toFixed(1)}% ${premium >= 0 ? "above" : "below"} national avg — favorable labor economics for service delivery`,
    });

    if (latest?.locationQuotient) {
      signals.push({
        source: "BLS",
        metric: "Tech location quotient",
        value: latest.locationQuotient.toFixed(2),
        implication: latest.locationQuotient < 0.90
          ? "Tech supply is structurally short — competitors struggle to staff, platform with recruiting leverage wins"
          : latest.locationQuotient >= 1.05
          ? "Adequate tech supply — hiring is less constrained, focus on retention over recruitment"
          : "Moderate tech availability — selective recruiting advantage",
      });
    }

    signals.push({
      source: "BLS",
      metric: "4-year wage growth",
      value: `${(wageProfile.fourYearChangePct * 100).toFixed(1)}%`,
      implication: wageProfile.fourYearChangePct > 0.15
        ? "Rapid wage inflation — pricing must outpace or margins erode structurally"
        : "Moderate wage growth — manageable within standard price escalation",
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
      implication: topPermit.constructionActivityLevel === "high"
        ? "High new-construction activity = steady pipeline of new HVAC installations converting to service contracts"
        : topPermit.constructionActivityLevel === "declining"
        ? "Declining new construction — pivot strategy to retrofit/service revenue over new installation"
        : "Moderate construction — balanced growth opportunity",
    });

    signals.push({
      source: "Census",
      metric: "2-year permit trend",
      value: `${(constructionSignal.twoYearChange * 100).toFixed(1)}%`,
      implication: constructionSignal.twoYearChange > -0.05
        ? "Construction nearly recovered or growing — expanding market for commercial HVAC"
        : constructionSignal.twoYearChange > -0.15
        ? "Modest pullback from peak — market normalizing, not declining"
        : "Significant construction decline — new installation revenue contracting",
    });
  }

  const eiaFuel = getEIAFuelSummaryForRegion(region);
  signals.push({
    source: "EIA",
    metric: `Fuel cost trend (${eiaFuel.paddLabel})`,
    value: `$${eiaFuel.recentAvg.toFixed(3)}/gal (${eiaFuel.deltaPct > 0 ? "+" : ""}${(eiaFuel.deltaPct * 100).toFixed(1)}% from baseline $${eiaFuel.baselineAvg.toFixed(3)})`,
    implication: eiaFuel.deltaPct > 0.25
      ? `Fuel surge in ${eiaFuel.paddLabel} compresses travel-heavy route margins — contract fuel clause implementation urgent`
      : eiaFuel.deltaPct > 0.10
      ? `Rising fuel costs in ${eiaFuel.paddLabel} — embed fuel escalation clauses before further erosion`
      : `${eiaFuel.paddLabel} fuel costs stable — no immediate action needed`,
  });

  if (regionAgg) {
    signals.push({
      source: "Internal",
      metric: "Current margin",
      value: `${(regionAgg.validated.avgMarginPct * 100).toFixed(1)}%`,
      implication: regionAgg.validated.avgMarginPct >= 0.60
        ? "Outperforming — protect this margin leadership and replicate the operational model"
        : regionAgg.validated.avgMarginPct >= 0.50
        ? "Performing within benchmark — incremental improvements available"
        : "Below benchmark — pricing intervention or operational restructuring needed",
    });

    signals.push({
      source: "Internal",
      metric: "Customer base",
      value: `${regionAgg.customerCount} customers, ${regionAgg.jobCount} jobs`,
      implication: regionAgg.customerCount >= 50
        ? "Established market presence — leverage existing relationships for expansion"
        : regionAgg.customerCount >= 15
        ? "Growing presence — invest in sales to build density"
        : "Nascent footprint — evaluate M&A for accelerated market entry",
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
        action: `Corp Dev Lead: acquire 1–3 truck operators in ${name} facing ${(wageProfile.fourYearChangePct * 100).toFixed(1)}% BLS wage inflation at $${latest?.meanAnnualWage?.toLocaleString()}/yr — consolidate overhead for 4–6× EBITDA entry`,
        lever: "M&A",
        rationale: `Small operators (1-3 trucks) face margin compression from rising tech wages without scale economies. ACME Field Services' platform absorbs the cost through utilization leverage.`,
        expectedImpact: `Acquire at 4-6x EBITDA from margin-pressured sellers, immediately improve margins through overhead consolidation`,
        math: `BLS 4-yr wage growth = ${(wageProfile.fourYearChangePct * 100).toFixed(1)}%; platform absorbs via utilization leverage at $${latest?.meanAnnualWage?.toLocaleString()}/yr`,
        sources: ["BLS", "Internal"],
        confidence: "medium",
      });
    }

    if (regionAgg && regionAgg.customerCount < 30) {
      actions.push({
        action: `Sales Director: add 1 dedicated AE in ${name} to grow from ${regionAgg.customerCount} → 50+ accounts — each new customer adds ~$${Math.round(regionAgg.validated.avgTicket).toLocaleString()} at near-zero incremental travel`,
        lever: "Sales",
        rationale: `Current footprint is sub-scale. Route density drives technician utilization — more customers per zip code reduces windshield time.`,
        expectedImpact: `Each additional customer in an existing service area adds ~$${Math.round(regionAgg.validated.avgTicket)} avg ticket revenue at near-zero incremental travel cost`,
        math: `Incremental revenue/customer ≈ avgTicket = $${Math.round(regionAgg.validated.avgTicket).toLocaleString()} (near-zero marginal travel in existing routes)`,
        sources: ["Internal"],
        confidence: "medium",
      });
    }
  }

  if (strategy === "defend") {
    if (regionAgg && regionAgg.validated.avgMarginPct >= 0.60) {
      actions.push({
        action: `Sales Director: lock ${Math.min(10, regionAgg.customerCount)} top ${name} accounts into 3-yr agreements at ${(regionAgg.validated.avgMarginPct * 100).toFixed(1)}% margin — protects $${Math.round(regionAgg.validated.totalMargin).toLocaleString()}/yr from competitive displacement`,
        lever: "Sales",
        rationale: `High-margin regions attract competitor attention. Contractual lock-in prevents cherry-picking of best accounts.`,
        expectedImpact: `Protect $${Math.round(regionAgg.validated.totalMargin).toLocaleString()} in annual margin from competitive displacement`,
        math: `Protected margin = Σ(top ${Math.min(10, regionAgg.customerCount)} accounts) = $${Math.round(regionAgg.validated.totalMargin).toLocaleString()}/yr at ${(regionAgg.validated.avgMarginPct * 100).toFixed(1)}%`,
        sources: ["Internal"],
        confidence: "high",
      });
    }

    if (wageProfile && wageProfile.fourYearChangePct > 0.15) {
      const latest = wageProfile.snapshots[wageProfile.snapshots.length - 1];
      actions.push({
        action: `Regional Pricing Manager: escalate ${name} service rates ${(wageProfile.fourYearChangePct * 100 / 4).toFixed(1)}%/yr to track BLS ${(wageProfile.fourYearChangePct * 100).toFixed(1)}% wage growth ($${latest?.meanAnnualWage?.toLocaleString()}/yr HVAC tech in ${wageProfile.metroArea})`,
        lever: "Pricing",
        rationale: `BLS data shows HVAC tech wages in ${wageProfile.metroArea} at $${latest?.meanAnnualWage?.toLocaleString()}/yr, growing faster than national average.`,
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
        rationale: `Low composite score driven by declining construction, unfavorable wage economics, or thin footprint.`,
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
      rationale: `Market conditions are neither strongly positive nor negative. Right acquisition at right price could establish beachhead.`,
      expectedImpact: `Potential market entry at favorable valuation if seller pressure exists`,
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
      return `${name} combines strong margins (${regionAgg ? (regionAgg.validated.avgMarginPct * 100).toFixed(1) : "N/A"}%), established footprint, and favorable market dynamics. Priority: scale through M&A and sales to maximize platform leverage.`;
    case "expand":
      return `${name} shows strong market fundamentals (construction, labor economics) but ACME Field Services' footprint is underdeveloped. Priority: accelerated market entry through targeted acquisition.`;
    case "defend":
      return `${name} is a profitable market with rising external pressures (wage growth, fuel costs). Priority: protect margins through pricing discipline and contract lock-in.`;
    case "harvest":
      return `${name} faces unfavorable market conditions or sub-scale operations. Priority: extract maximum value from existing book, redeploy growth capital elsewhere.`;
    case "explore":
      return `${name} presents mixed signals — evaluate opportunistically rather than committing dedicated growth resources.`;
  }
}
