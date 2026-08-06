import { activeLocaleTag } from "../_i18n/legacy"
import type { ComputedData, CustomerAggregate, RegionAggregate, JobTypeQuoteAnalysis, DispatchAuthEvent } from "./_transform";
import type { DispatchEfficiencyReport, CustomerEscalationProfile } from "./_dispatch";
import { regionLabels, type Region } from "./_regions";
import { getEIAFuelForRegion, getEIAFuelSummaryForRegion, paddLabels } from "./_eia";
import { tradeMargins, pricingBenchmarks, pricingElasticity, whaleCurve, peMetrics, pmEconomics, techUtilization, ftfrBenchmarks } from "./_benchmarks";
import type { RootCauseAnalysis, MarginDriver } from "./_rootcause";
import { getWageForRegion, nationalBaseline } from "./_labor";
import { getConstructionGrowthSignal, getPermitsForRegion } from "./_construction";

const SCALE = 0.87;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type FindingCategory =
  | "portfolio-health"
  | "margin-alert"
  | "pricing-signal"
  | "acquisition-signal"
  | "risk-flag"
  | "data-quality"
  | "pipeline-health"
  | "deadline-risk"
  | "savings-signal"
  | "compliance-flag"
  | "charter-interface"
  | "supplier-signal";

export type Severity = "critical" | "high" | "medium" | "info";

export interface BPFinding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  narrative: string;
  evidence: string[];
  recommendation: string;
  drillPath?: {
    page: string;
    region?: string;
    customer?: string;
    jobType?: string;
  };
  page: "customer-intel" | "pricing-intel" | "fuel-integrity" | "process-velocity" | "operating-loop" | "tender-studio";
  drillLevel: "macro" | "region" | "customer";
  regionScope?: Region;
  customerScope?: string;
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function usd(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

/* ------------------------------------------------------------------ */
/*  Finding Generators                                                 */
/* ------------------------------------------------------------------ */

function portfolioFindings(data: ComputedData): BPFinding[] {
  const findings: BPFinding[] = [];
  const { portfolioSummary, customers } = data;
  const v = portfolioSummary.validated;

  const concentrationRatio = portfolioSummary.totalCustomers > 0
    ? customers.filter(c => c.tier === "Stars").reduce((s, c) => s + c.validated.totalRevenue, 0) / v.totalRevenue
    : 0;
  const singleMaxPct = portfolioSummary.totalCustomers > 0
    ? Math.max(...customers.map(c => c.validated.totalRevenue)) / v.totalRevenue
    : 0;

  findings.push({
    id: "portfolio-concentration",
    category: "portfolio-health",
    severity: singleMaxPct > whaleCurve.concentrationRisk.singleCustomerThreshold ? "critical" : "high",
    title: `Top ${portfolioSummary.topMarginCustomerPct.toFixed(0)}% of customers generate ${portfolioSummary.topMarginSharePct}% of margin`,
    narrative: `Portfolio concentration is significant. ${portfolioSummary.negativeMarginCustomers} customers are currently net value destroyers with negative realized margins. The validated portfolio margin stands at ${pct(v.avgMarginPct)} across ${v.jobCount} validated jobs. Industry whale curve analysis shows top 20-30% of customers typically generate 150-200% of profit while the bottom 20% destroy 50-80%. ${singleMaxPct > whaleCurve.concentrationRisk.singleCustomerThreshold ? `WARNING: Top customer represents ${pct(singleMaxPct)} of revenue, exceeding the ${pct(whaleCurve.concentrationRisk.singleCustomerThreshold)} concentration risk threshold. Highly concentrated firms trade at 4.5x EBITDA vs. 5.5x for diversified peers.` : ""}`,
    evidence: [
      `${portfolioSummary.totalCustomers} total customers across ${data.regions.length} regions`,
      `${portfolioSummary.tierCounts.Stars} Stars (top tier), ${portfolioSummary.tierCounts.Dogs} Dogs (exit candidates)`,
      `${portfolioSummary.negativeMarginCustomers} customers with negative margins`,
      `Portfolio margin: ${pct(v.avgMarginPct)} vs. industry HVAC benchmark ${pct(tradeMargins[0].grossMarginRange[0])}-${pct(tradeMargins[0].grossMarginRange[1])}`,
      `Top customer concentration: ${pct(singleMaxPct)} of revenue (threshold: ${pct(whaleCurve.concentrationRisk.singleCustomerThreshold)})`,
      data.dataQuality.excludedJobs > 0
        ? `${data.dataQuality.excludedJobs} jobs excluded from analysis due to data quality issues`
        : "",
    ].filter(Boolean),
    recommendation: singleMaxPct > whaleCurve.concentrationRisk.singleCustomerThreshold
      ? `Diversification is critical. Target ${Math.ceil(singleMaxPct / 0.05)} new accounts to bring top-customer concentration below ${pct(whaleCurve.concentrationRisk.singleCustomerThreshold)}. Focus on Stars DNA profile: ${topJobTypesInList(customers.filter(c => c.tier === "Stars"))} in commercial properties. PE Portfolio Co's precedent: intentionally exiting low-margin accounts drove ${peMetrics.apiAccountPruning.ebitdaExpansionBps}bp EBITDA expansion.`
      : `Prioritize Stars retention and conduct pricing reviews for all ${portfolioSummary.negativeMarginCustomers} negative-margin accounts. PE Portfolio Co's 13/60/80 framework targets ${pct(peMetrics.api1360Framework.ebitdaMarginTarget)} EBITDA, ${pct(peMetrics.api1360Framework.serviceRevenuePctTarget)} service revenue, ${pct(peMetrics.api1360Framework.fcfConversionTarget)} FCF conversion.`,
    page: "customer-intel",
    drillLevel: "macro",
  });

  const exitCustomers = customers.filter(c => c.tier === "Dogs");
  if (exitCustomers.length > 0) {
    const totalLoss = exitCustomers.reduce((s, c) => s + Math.min(0, c.validated.totalMargin), 0);
    const exitRevenue = exitCustomers.reduce((s, c) => s + c.validated.totalRevenue, 0);

    const topExitDetails = exitCustomers
      .sort((a, b) => a.validated.totalMargin - b.validated.totalMargin)
      .slice(0, 5)
      .map(c => {
        const rca = data.customerRootCauses?.get(c.customerName);
        const topDriver = rca?.drivers[0];
        return `${c.customerName.split(",")[0]}: ${usd(c.validated.totalMargin)} margin (${pct(c.validated.avgMarginPct)})${topDriver ? ` — ${topDriver.driver}: ${usd(topDriver.dollarImpact)}` : ""}`;
      });

    const totalRecovery = exitCustomers.reduce((s, c) => {
      const rca = data.customerRootCauses?.get(c.customerName);
      return s + (rca?.estimatedRecovery ?? 0);
    }, 0);

    findings.push({
      id: "negative-margin-customers",
      category: "margin-alert",
      severity: "critical",
      title: `${portfolioSummary.negativeMarginCustomers} customers show negative realized margins — ${usd(Math.abs(totalLoss))} annual margin destruction`,
      narrative: `These accounts are consuming resources at a loss. The combined margin deficit is ${usd(totalLoss)} on ${usd(exitRevenue)} in revenue. PE Portfolio Co's precedent: intentionally exiting comparable low-margin accounts drove ${peMetrics.apiAccountPruning.ebitdaExpansionBps}bp EBITDA expansion to record levels. Root cause analysis identifies ${usd(totalRecovery)} in addressable margin through forward pricing adjustments and cost structure optimization.`,
      evidence: [
        `Combined negative margin: ${usd(totalLoss)} on ${usd(exitRevenue)} revenue`,
        `${exitCustomers.reduce((s, c) => s + c.negativeMarginJobCount, 0)} individual jobs with negative margins`,
        `Projected annual uplift from forward pricing changes: ${usd(totalRecovery)}`,
        ...topExitDetails,
      ],
      recommendation: totalRecovery > Math.abs(totalLoss) * 0.5
        ? `Root cause analysis shows ${usd(totalRecovery)} addressable through forward pricing adjustments. For accounts with correctable drivers, apply updated rates to future quotes. For accounts where >60% of loss is structural (regional labor cost premium), exit and reallocate capacity to Stars DNA prospects.`
        : `Combined margin destruction of ${usd(Math.abs(totalLoss))} exceeds addressable uplift. Recommend strategic exit of bottom ${Math.min(exitCustomers.length, 3)} accounts and reallocation of technician capacity to Stars-profile prospects. Expected EBITDA impact: +${pct(Math.abs(totalLoss) / v.totalRevenue)} on portfolio margin.`,
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  const cloneCustomers = customers.filter(c => c.tier === "Stars");
  if (cloneCustomers.length > 0) {
    const avgMargin = cloneCustomers.reduce((s, c) => s + c.validated.avgMarginPct, 0) / cloneCustomers.length;
    const topPropertyTypes = aggregatePropertyTypes(cloneCustomers);
    const topJobTypes = aggregateJobTypes(cloneCustomers);

    findings.push({
      id: "stars-dna",
      category: "acquisition-signal",
      severity: "info",
      title: `Stars DNA: ${topPropertyTypes[0]?.type || "Commercial"} + ${topJobTypes[0]?.type || "HVAC"} = ${pct(avgMargin)} avg margin`,
      narrative: `Your most profitable customer profile combines ${topPropertyTypes.slice(0, 2).map(t => t.type).join(" and ")} properties with ${topJobTypes.slice(0, 2).map(t => t.type).join(" and ")} service. This profile is replicable across regions for acquisition targeting.`,
      evidence: [
        `${cloneCustomers.length} Stars customers averaging ${pct(avgMargin)} margin`,
        `Primary property types: ${topPropertyTypes.slice(0, 3).map(t => `${t.type} (${t.count})`).join(", ")}`,
        `Primary service types: ${topJobTypes.slice(0, 3).map(t => `${t.type} (${t.count})`).join(", ")}`,
      ],
      recommendation: "Sales Director: use Stars DNA profile (job types + property mix above) to build a 50-account regional target list — prioritize markets where Stars concentration exceeds portfolio average.",
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  if (data.portfolioTrend) {
    const t = data.portfolioTrend;
    if (t.direction === "declining") {
      findings.push({
        id: "trend-portfolio-declining",
        category: "margin-alert",
        severity: "high",
        title: `Portfolio margin trending down: ${pct(t.priorMonthlyMargin)} to ${pct(t.recentMonthlyMargin)} over ${t.monthCount} months`,
        narrative: `The portfolio's blended margin has declined month-over-month. This could reflect mix shift toward lower-margin work, rising labor costs, or pricing erosion on renewals. The trend across ${t.monthCount} months of data warrants investigation.`,
        evidence: t.buckets.slice(-4).map(b =>
          `${b.month}: ${b.jobCount} jobs, ${pct(b.avgMarginPct)} margin, ${usd(b.totalRevenue)} revenue`
        ),
        recommendation: "Decompose the decline by region and job type to identify the specific driver. Check whether recent contract renewals included rate reductions.",
        page: "customer-intel",
        drillLevel: "macro",
      });
    }
  }

  const decliningStars = customers.filter(c =>
    c.tier === "Stars" && c.trend && c.trend.direction === "declining"
  );
  if (decliningStars.length > 0) {
    findings.push({
      id: "trend-declining-stars",
      category: "risk-flag",
      severity: "high",
      title: `${decliningStars.length} Stars ${decliningStars.length === 1 ? "customer is" : "customers are"} showing declining margins`,
      narrative: `These are your highest-value accounts, but their margin trend is moving the wrong direction. Early intervention prevents tier demotion and revenue loss.`,
      evidence: decliningStars.slice(0, 5).map(c =>
        `${c.customerName.split(",")[0]}: ${pct(c.trend!.priorMonthlyMargin)} → ${pct(c.trend!.recentMonthlyMargin)} (${c.trend!.monthCount} months)`
      ),
      recommendation: "Schedule account reviews for each declining Stars customer. Investigate whether cost increases, scope creep, or pricing concessions are driving the decline.",
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  const improvingDogs = customers.filter(c =>
    c.tier === "Dogs" && c.trend && c.trend.direction === "improving"
  );
  if (improvingDogs.length > 0) {
    findings.push({
      id: "trend-improving-dogs",
      category: "portfolio-health",
      severity: "info",
      title: `${improvingDogs.length} Dogs ${improvingDogs.length === 1 ? "customer is" : "customers are"} trending toward profitability`,
      narrative: `These accounts are currently in the Dogs tier but their margin trend is improving. They may warrant reclassification if the trend continues, rather than exit.`,
      evidence: improvingDogs.slice(0, 5).map(c =>
        `${c.customerName.split(",")[0]}: ${pct(c.trend!.priorMonthlyMargin)} → ${pct(c.trend!.recentMonthlyMargin)} (${c.trend!.monthCount} months)`
      ),
      recommendation: "Hold these accounts for one more review cycle. If margin continues to improve, they should be reclassified as Question Marks and prioritized for retention.",
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  return findings;
}

function regionFindings(data: ComputedData): BPFinding[] {
  const findings: BPFinding[] = [];
  const { regions, customers } = data;

  if (regions.length >= 2) {
    const sorted = [...regions].sort((a, b) => b.validated.avgMarginPct - a.validated.avgMarginPct);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const spread = best.validated.avgMarginPct - worst.validated.avgMarginPct;

    if (spread > 0.05) {
      const worstState = worst.region as "RW" | "RS" | "RC" | "RE" | "RN" | "RM";
      const bestState = best.region as "RW" | "RS" | "RC" | "RE" | "RN" | "RM";
      const worstWage = getWageForRegion(worstState);
      const bestWage = getWageForRegion(bestState);

      let laborContext = "";
      if (worstWage && bestWage) {
        const worstLatest = worstWage.snapshots[worstWage.snapshots.length - 1];
        const bestLatest = bestWage.snapshots[bestWage.snapshots.length - 1];
        if (worstLatest && bestLatest) {
          const wageDelta = ((worstLatest.meanAnnualWage - bestLatest.meanAnnualWage) / bestLatest.meanAnnualWage * 100);
          if (wageDelta > 5) {
            laborContext = ` BLS data confirms: ${worstWage.metroArea} HVAC techs avg $${(worstLatest.meanAnnualWage / 1000).toFixed(0)}k/yr vs. ${bestWage.metroArea} $${(bestLatest.meanAnnualWage / 1000).toFixed(0)}k/yr (+${wageDelta.toFixed(0)}% structural premium). This cost differential must be priced into ${regionLabels[worst.region]} contracts.`;
          }
        }
      }

      findings.push({
        id: "regional-margin-variance",
        category: "margin-alert",
        severity: "high",
        title: `${regionLabels[best.region]} leads margin at ${pct(best.validated.avgMarginPct)} vs ${regionLabels[worst.region]} at ${pct(worst.validated.avgMarginPct)}`,
        narrative: `A ${pct(spread)} margin spread across regions suggests that local labor markets, travel distances, or branch-level pricing discipline are impacting the bottom line. ${regionLabels[worst.region]} processes ${worst.jobCount} jobs but captures less margin per dollar of revenue.${laborContext}`,
        evidence: [
          ...regions.map(r => {
            const state = r.region as "RW" | "RS" | "RC" | "RE" | "RN" | "RM";
            const wage = getWageForRegion(state);
            const wageStr = wage ? `, HVAC wage $${(wage.snapshots[wage.snapshots.length - 1]?.meanAnnualWage ?? 0) / 1000}k` : "";
            return `${regionLabels[r.region]}: ${r.jobCount} jobs, ${pct(r.validated.avgMarginPct)} margin, ${usd(r.validated.avgTicket)} avg ticket${wageStr}`;
          }),
        ],
        recommendation: `${regionLabels[worst.region]} pricing books must reflect the local labor cost premium. Raise hourly rates by the BLS-documented wage differential. The industry standard labor rate multiplier is ${pricingBenchmarks.laborRateMultiplier.range[0]}-${pricingBenchmarks.laborRateMultiplier.range[1]}x tech hourly pay — verify ${regionLabels[worst.region]} meets this threshold.`,
        page: "customer-intel",
        drillLevel: "macro",
      });
    }
  }

  for (const r of regions) {
    const regionCustomers = customers.filter(c =>
      c.regionDistribution[r.region] && c.regionDistribution[r.region] > 0
    );
    const topPerformers = regionCustomers
      .filter(c => c.validated.avgMarginPct > 0.4 && c.validated.jobCount >= 3)
      .sort((a, b) => b.validated.totalMargin - a.validated.totalMargin)
      .slice(0, 3);

    if (topPerformers.length > 0) {
      findings.push({
        id: `region-${r.region}-stars`,
        category: "acquisition-signal",
        severity: "info",
        title: `${regionLabels[r.region]}: ${topPerformers.map(c => c.customerName.split(" ").slice(0, 2).join(" ")).join(", ")} driving premium margins`,
        narrative: `These accounts consistently yield margins above 40% in the ${regionLabels[r.region]} market. Their service mix and property profiles represent the ideal acquisition target for this region.`,
        evidence: topPerformers.map(c =>
          `${c.customerName}: ${c.jobCount} jobs, ${pct(c.validated.avgMarginPct)} margin, ${usd(c.validated.avgTicket)} avg ticket`
        ),
        recommendation: `Use these customer profiles to identify similar prospects in the ${regionLabels[r.region]} market.`,
        page: "customer-intel",
        drillLevel: "region",
        regionScope: r.region,
      });
    }
  }

  for (const r of regions) {
    if (r.cities.length >= 3) {
      const sortedCities = [...r.cities].sort((a, b) => b.avgMarginPct - a.avgMarginPct);
      const bestCity = sortedCities[0];
      const worstCity = sortedCities[sortedCities.length - 1];
      const spread = bestCity.avgMarginPct - worstCity.avgMarginPct;

      if (spread > 0.10 && bestCity.jobCount >= 3 && worstCity.jobCount >= 3) {
        findings.push({
          id: `city-variance-${r.region}`,
          category: "margin-alert",
          severity: spread > 0.25 ? "high" : "medium",
          title: `${regionLabels[r.region]}: ${bestCity.city} at ${pct(bestCity.avgMarginPct)} vs ${worstCity.city} at ${pct(worstCity.avgMarginPct)}`,
          narrative: `Within ${regionLabels[r.region]}, a ${pct(spread)} margin spread between cities suggests localized pricing, labor cost, or service mix differences. ${bestCity.city} processes ${bestCity.jobCount} jobs at premium margins while ${worstCity.city}'s ${worstCity.jobCount} jobs yield significantly less.`,
          evidence: sortedCities
            .filter(c => c.jobCount >= 2)
            .slice(0, 6)
            .map(c => `${c.city}: ${c.jobCount} jobs, ${pct(c.avgMarginPct)} margin, ${usd(c.avgTicket)} avg ticket`),
          recommendation: `Investigate ${worstCity.city}'s cost structure and compare pricing books against ${bestCity.city}. The higher-performing city's approach may be replicable.`,
          page: "customer-intel",
          drillLevel: "region",
          regionScope: r.region,
        });
      }
    }
  }

  const multiRegionCustomers = customers.filter(c => {
    const regionCount = Object.keys(c.regionDistribution).length;
    return regionCount >= 2 && c.jobCount >= 4;
  });

  for (const c of multiRegionCustomers.slice(0, 3)) {
    const regionEntries = Object.entries(c.regionDistribution) as [Region, number][];
    const regionJobs = regionEntries.map(([reg, count]) => {
      const regJobs = c.jobs.filter(j => j.region === reg);
      const rev = regJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
      const cost = regJobs.reduce((s, j) => s + (j.actualCost || 0), 0);
      const margin = rev > 0 ? (rev - cost) / rev : 0;
      return { region: reg, count, margin };
    });

    const margins = regionJobs.map(r => r.margin);
    const maxM = Math.max(...margins);
    const minM = Math.min(...margins);

    if (maxM - minM > 0.15) {
      findings.push({
        id: `cross-region-${c.customerName.replace(/\s+/g, "-").toLowerCase().slice(0, 20)}`,
        category: "margin-alert",
        severity: "medium",
        title: `${c.customerName.split(",")[0]}: ${pct(maxM - minM)} margin variance across regions`,
        narrative: `Same customer, different outcomes. Pricing books, labor rates, or service scope differences are creating a ${pct(maxM - minM)} margin gap for this account across regions.`,
        evidence: regionJobs.map(r =>
          `${regionLabels[r.region]}: ${r.count} jobs, ${pct(r.margin)} margin`
        ),
        recommendation: "Standardize pricing approach for this account. The higher-margin region's pricing book and scope definitions should inform the lower-performing regions.",
        page: "customer-intel",
        drillLevel: "customer",
        customerScope: c.customerName,
      });
    }
  }

  const portfolioDir = data.portfolioTrend?.direction;
  for (const r of regions) {
    if (!r.trend || !portfolioDir) continue;
    if (r.trend.direction === "declining" && portfolioDir !== "declining") {
      findings.push({
        id: `trend-region-diverge-${r.region}`,
        category: "risk-flag",
        severity: "high",
        title: `${regionLabels[r.region]} margin is declining while portfolio is ${portfolioDir}`,
        narrative: `${regionLabels[r.region]} is trending down (${pct(r.trend.priorMonthlyMargin)} → ${pct(r.trend.recentMonthlyMargin)}) while the overall portfolio is ${portfolioDir}. This regional divergence needs investigation before it drags the portfolio.`,
        evidence: r.trend.buckets.slice(-3).map(b =>
          `${b.month}: ${b.jobCount} jobs, ${pct(b.avgMarginPct)} margin`
        ),
        recommendation: `Deep-dive into ${regionLabels[r.region]}'s recent jobs. Check for new low-margin contracts, technician utilization changes, or unrecovered cost increases.`,
        page: "customer-intel",
        drillLevel: "region",
        regionScope: r.region,
      });
    }
  }

  return findings;
}

function pricingFindings(data: ComputedData): BPFinding[] {
  const findings: BPFinding[] = [];
  const { quoteAnalysis } = data;

  const withCeiling = quoteAnalysis.byJobType.filter(a => a.ceilingAmount != null);
  if (withCeiling.length > 0) {
    const aboveCeilingCount = quoteAnalysis.atRiskQuotes.filter(q => q.aboveCeiling).length;
    findings.push({
      id: "pricing-ceilings",
      category: "pricing-signal",
      severity: "high",
      title: `Win rate drops sharply above computed ceilings in ${withCeiling.map(a => a.jobType).join(", ")}`,
      narrative: `Price band analysis reveals inflection points where quote acceptance drops below 40%. ${aboveCeilingCount} pending quotes are currently priced above their job-type ceiling.`,
      evidence: withCeiling.map(a =>
        `${a.jobType}: ceiling at ${usd(a.ceilingAmount!)}, ${a.wins}W/${a.losses}L overall (${pct(a.overallWinRate)} win rate)`
      ),
      recommendation: `Regional Pricing Manager: reprice ${aboveCeilingCount} pending quote${aboveCeilingCount !== 1 ? "s" : ""} above job-type ceiling into sweet-spot bands — win rate drops below 40% above ceiling in ${withCeiling.map(a => a.jobType).join(", ")}.`,
      page: "pricing-intel",
      drillLevel: "macro",
    });
  }

  for (const analysis of quoteAnalysis.byJobType) {
    if (analysis.sweetSpot) {
      findings.push({
        id: `sweet-spot-${analysis.jobType.replace(/\s+/g, "-").toLowerCase()}`,
        category: "pricing-signal",
        severity: "info",
        title: `${analysis.jobType} sweet spot: ${usd(analysis.sweetSpot.min)}–${usd(analysis.sweetSpot.max)}`,
        narrative: `Historical data shows the highest win rates for ${analysis.jobType} jobs fall in the ${usd(analysis.sweetSpot.min)}–${usd(analysis.sweetSpot.max)} range. ${analysis.totalQuotes} quotes analyzed across all regions.`,
        evidence: analysis.priceBands
          .filter(b => (b.wins + b.losses) >= 2)
          .map(b => `${b.label}: ${pct(b.winRate)} win rate (${b.wins}W/${b.losses}L, ${b.pending} pending)`),
        recommendation: `Regional Pricing Manager: price ${analysis.jobType} quotes within ${usd(analysis.sweetSpot.min)}–${usd(analysis.sweetSpot.max)} (${Math.round(analysis.overallWinRate * 100)}% overall win rate). Above ${analysis.ceilingAmount ? usd(analysis.ceilingAmount) : "ceiling"} requires documented scope premium.`,
        page: "pricing-intel",
        drillLevel: "macro",
        drillPath: { page: "pricing-intel", jobType: analysis.jobType },
      });
    }
  }

  if (quoteAnalysis.atRiskQuotes.length > 0) {
    const highRisk = quoteAnalysis.atRiskQuotes.filter(q => q.riskScore >= 3);
    if (highRisk.length > 0) {
      findings.push({
        id: "at-risk-quotes",
        category: "risk-flag",
        severity: "critical",
        title: `${highRisk.length} pending quotes at elevated risk`,
        narrative: `These quotes combine factors that historically predict rejection: pricing above ceiling, customer-set NTE thresholds, and/or aging beyond 48 hours without follow-up. Aging quotes are 30% more likely to be rejected.`,
        evidence: highRisk.slice(0, 5).map(q =>
          `Job ${q.jobNumber} (${q.customerName}): ${usd(q.totalAmountQuoted)} ${q.jobType}, ${q.quoteAgeDays}d old${q.aboveCeiling ? ", above ceiling" : ""}${q.exceedsNteAuth ? ", exceeds NTE auth" : ""}`
        ),
        recommendation: `Sales Director: follow up on ${highRisk.length} high-risk pending quote${highRisk.length !== 1 ? "s" : ""} within 24hrs — ${highRisk.filter(q => q.aboveCeiling).length} above ceiling, ${highRisk.filter(q => q.quoteAgeDays > 7).length} aged >7d; restructure or add scope justification before expiration.`,
        page: "pricing-intel",
        drillLevel: "macro",
      });
    }
  }

  const dispatchEvents = data.dispatchAuthEvents;
  const escalationEvents = dispatchEvents.filter(e => e.revenueToNteRatio > 1.0);
  if (escalationEvents.length > 0) {
    const escalationRate = dispatchEvents.length > 0 ? escalationEvents.length / dispatchEvents.length : 0;
    const avgVisitsEscalated = escalationEvents.reduce((s, e) => s + e.visitCount, 0) / escalationEvents.length;
    const withinScope = dispatchEvents.filter(e => e.revenueToNteRatio <= 1.0);
    const avgVisitsWithin = withinScope.length > 0
      ? withinScope.reduce((s, e) => s + e.visitCount, 0) / withinScope.length
      : 1;

    findings.push({
      id: "nte-escalations",
      category: "pricing-signal",
      severity: escalationRate > 0.30 ? "high" : "medium",
      title: `${escalationEvents.length} of ${dispatchEvents.length} NTE-authorized jobs required scope escalation — ${pct(escalationRate)} escalation rate`,
      narrative: `NTE is a customer-set work order threshold — when a job exceeds it, the tech stops, calls dispatch, and dispatch calls the customer for approval. A ${pct(escalationRate)} escalation rate means ${escalationEvents.length} jobs triggered this workflow, adding an average of ${(avgVisitsEscalated - avgVisitsWithin).toFixed(1)} extra visits per escalated job. ACME cannot change the NTE — the cost is operational friction from the re-auth loop.`,
      evidence: [
        `${escalationEvents.length} scope escalations out of ${dispatchEvents.length} NTE-authorized jobs`,
        `Escalated jobs avg ${avgVisitsEscalated.toFixed(1)} visits vs. within-scope ${avgVisitsWithin.toFixed(1)} visits`,
        ...escalationEvents.slice(0, 3).map(e =>
          `Job ${e.jobNumber} (${e.customerName}): billed ${usd(e.totalAmount)} on ${usd(e.amountNTE)} NTE auth (${e.workflowOutcome}), ${e.visitCount} visits`
        ),
      ],
      recommendation: `Dispatch Operations Lead: deploy single-queue re-auth on top ${Math.min(5, escalationEvents.length)} friction accounts — ${escalationEvents.length}/${dispatchEvents.length} jobs (${pct(escalationRate)}) exceed customer-set NTE; cut ${(avgVisitsEscalated - avgVisitsWithin).toFixed(1)} extra visits/job via one-pass approver routing (est. $${Math.round(escalationEvents.length * 50 * 0.4).toLocaleString(activeLocaleTag())}/yr truck-roll savings).`,
      page: "pricing-intel",
      drillLevel: "macro",
    });
  }

  return findings;
}

function fuelFindings(): BPFinding[] {
  const regions = ["RW", "RE", "RN"] as const;
  const summaries = regions.map(r => getEIAFuelSummaryForRegion(r));
  const worst = summaries.reduce((a, b) => b.deltaPct > a.deltaPct ? b : a);
  const best = summaries.reduce((a, b) => b.deltaPct < a.deltaPct ? b : a);

  const findings: BPFinding[] = [{
    id: "fuel-price-trend",
    category: "risk-flag",
    severity: worst.deltaPct > 0.15 ? "critical" : worst.deltaPct > 0.05 ? "high" : "info",
    title: `Fuel up ${pct(worst.deltaPct)} in ${worst.paddLabel}, ${pct(best.deltaPct)} in ${best.paddLabel}`,
    narrative: `Regional fuel costs diverge sharply. ${worst.paddLabel} averages $${worst.recentAvg.toFixed(2)}/gal (+${(worst.deltaPct * 100).toFixed(1)}% from baseline), while ${best.paddLabel} sits at $${best.recentAvg.toFixed(2)}/gal (+${(best.deltaPct * 100).toFixed(1)}%). ${worst.deltaPct > 0.15 ? `NV/AZ/CA face steeper fuel cost exposure than TX. Contract fuel clauses should be calibrated by region, not applied portfolio-wide at a flat rate.` : "Regional differences are currently modest."}`,
    evidence: summaries.map(s =>
      `${s.paddLabel}: $${s.recentAvg.toFixed(3)}/gal (baseline $${s.baselineAvg.toFixed(3)}, +${(s.deltaPct * 100).toFixed(1)}%)`
    ),
    recommendation: worst.deltaPct > 0.15
      ? `Embed region-specific fuel escalation clauses in contracts. ${worst.paddLabel} exposure is ${((worst.recentAvg - worst.baselineAvg) / worst.baselineAvg * 100).toFixed(1)}% above baseline vs. ${best.paddLabel} at ${((best.recentAvg - best.baselineAvg) / best.baselineAvg * 100).toFixed(1)}%. Tie quarterly reviews to fleet card actuals.`
      : "Continue monitoring regional fuel differentials.",
    page: "fuel-integrity",
    drillLevel: "macro",
  }];

  return findings;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function topJobTypesInList(customers: CustomerAggregate[]): string {
  const counts: Record<string, number> = {};
  for (const c of customers) {
    for (const [jt, n] of Object.entries(c.jobTypeMix)) {
      counts[jt] = (counts[jt] || 0) + n;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t)
    .join(", ");
}

function aggregatePropertyTypes(customers: CustomerAggregate[]): { type: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const c of customers) {
    for (const [pt, n] of Object.entries(c.propertyTypeMix)) {
      counts[pt] = (counts[pt] || 0) + n;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));
}

function aggregateJobTypes(customers: CustomerAggregate[]): { type: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const c of customers) {
    for (const [jt, n] of Object.entries(c.jobTypeMix)) {
      counts[jt] = (counts[jt] || 0) + n;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));
}

/* ------------------------------------------------------------------ */
/*  Data Quality Findings                                              */
/* ------------------------------------------------------------------ */

function dataQualityFindings(data: ComputedData): BPFinding[] {
  const findings: BPFinding[] = [];
  const { jobs, dataQuality } = data;

  if (dataQuality.flags.MISSING_COST > 0) {
    const affected = jobs.filter(j => j.qualityFlags.includes("MISSING_COST"));
    const overstatedMargin = affected.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
    findings.push({
      id: "dq-missing-costs",
      category: "data-quality",
      severity: "high",
      title: `${affected.length} jobs have no posted costs — margin overstated by up to ${usd(overstatedMargin)}`,
      narrative: `These jobs show revenue but zero actual cost in the field service platform. If costs are pending, the portfolio margin is overstated. If these are warranty or goodwill jobs, they should be categorized as such and excluded from pricing benchmarks.`,
      evidence: affected.slice(0, 8).map(j =>
        `Job ${j.jobNumber} (${j.customerName}): ${usd(j.totalAmount ?? 0)} revenue, $0 cost`
      ),
      recommendation: `Verify cost posting status for ${affected.length === 1 ? "this job" : `these ${affected.length} jobs`} in the field service platform. If costs are finalized at $0, tag as warranty/goodwill to prevent margin distortion.`,
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  if (dataQuality.flags.PLACEHOLDER_NTE > 0 || dataQuality.flags.EXTREME_NTE_UTIL > 0) {
    const affected = jobs.filter(j =>
      j.qualityFlags.includes("PLACEHOLDER_NTE") || j.qualityFlags.includes("EXTREME_NTE_UTIL")
    );
    findings.push({
      id: "dq-placeholder-nte",
      category: "data-quality",
      severity: "high",
      title: `${affected.length} ${affected.length === 1 ? "job has" : "jobs have"} placeholder NTE values — excluded from NTE analysis`,
      narrative: `NTE values under $10 are data entry placeholders. These produce extreme revenue-to-NTE ratios that distort escalation analysis. They have been excluded from NTE threshold analysis.`,
      evidence: affected.slice(0, 8).map(j =>
        `Job ${j.jobNumber} (${j.customerName}): NTE ${usd(j.amountNTE ?? 0)}, billed ${usd(j.totalAmount ?? 0)}, utilization ${j.nteUtilization != null ? (j.nteUtilization * 100).toFixed(0) + "%" : "N/A"}`
      ),
      recommendation: `Correct the NTE field for ${affected.length === 1 ? "this job" : `these ${affected.length} jobs`} in the field service platform. Until corrected, ${affected.length === 1 ? "it is" : "they are"} excluded from NTE escalation analysis and threshold recommendations.`,
      page: "pricing-intel",
      drillLevel: "macro",
    });
  }

  const structuralLossJobs = jobs.filter(j => j.qualityFlags.includes("STRUCTURAL_LOSS"));
  if (structuralLossJobs.length > 0) {
    const byCustomer = new Map<string, typeof structuralLossJobs>();
    for (const j of structuralLossJobs) {
      const arr = byCustomer.get(j.customerName) || [];
      arr.push(j);
      byCustomer.set(j.customerName, arr);
    }

    for (const [customer, custJobs] of byCustomer) {
      const totalRevenue = custJobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
      const totalCost = custJobs.reduce((s, j) => s + (j.actualCost ?? 0), 0);
      const netLoss = totalRevenue - totalCost;
      const avgCost = totalCost / custJobs.length;
      const avgNTE = custJobs.reduce((s, j) => s + (j.amountNTE ?? 0), 0) / custJobs.length;

      const costWith1Sigma = avgCost * 1.2;
      const targetMargin = 0.20;
      const recommendedNTE = Math.ceil(costWith1Sigma / (1 - targetMargin) / 5) * 5;

      const jobsOverNTE = custJobs.filter(j =>
        j.actualCost != null && j.amountNTE != null && j.actualCost > j.amountNTE
      ).length;

      findings.push({
        id: `dq-structural-loss-${customer.replace(/\s+/g, "-").toLowerCase().slice(0, 30)}`,
        category: "data-quality",
        severity: "critical",
        title: `${customer.split(",")[0]}: NTE of ${usd(avgNTE)} guarantees losses — ${jobsOverNTE} of ${custJobs.length} jobs exceed NTE`,
        narrative: `This contract's NTE cannot cover a single tech-hour at current labor rates ($27–$37/hr). ${jobsOverNTE} of ${custJobs.length} jobs cost more than the NTE to execute. Net loss on this program: ${usd(netLoss)}.`,
        evidence: [
          `Average NTE: ${usd(avgNTE)}`,
          `Average actual cost: ${usd(avgCost)}`,
          `${jobsOverNTE} of ${custJobs.length} jobs exceed NTE`,
          `Net margin on these jobs: ${usd(netLoss)} (${pct(totalRevenue > 0 ? netLoss / totalRevenue : 0)})`,
        ],
        recommendation: `Exit or reprice future work for this customer — customer-set NTE of ${usd(avgNTE)} cannot cover execution cost (${usd(avgCost)} avg). At current volume of ${custJobs.length} jobs, continuing absorbs ${usd(Math.abs(netLoss))}/yr.`,
        page: "pricing-intel",
        drillLevel: "macro",
        customerScope: customer,
      });
    }
  }

  const scopeEscalationJobs = jobs.filter(j =>
    j.qualityFlags.includes("SCOPE_ESCALATION") && !j.qualityFlags.includes("STRUCTURAL_LOSS")
  );
  if (scopeEscalationJobs.length > 0) {
    const costAbsorbed = scopeEscalationJobs.reduce((s, j) => {
      const cost = j.actualCost ?? 0;
      const revenue = j.totalAmount ?? 0;
      return s + Math.max(0, cost - revenue);
    }, 0);
    const revenueExceededToo = scopeEscalationJobs.filter(j =>
      j.totalAmount != null && j.amountNTE != null && j.totalAmount > j.amountNTE
    ).length;

    findings.push({
      id: "dq-scope-escalation",
      category: "data-quality",
      severity: "high",
      title: `${scopeEscalationJobs.length} scope escalation events — ${revenueExceededToo} billed above NTE, ${scopeEscalationJobs.length - revenueExceededToo} cost-only overruns`,
      narrative: `These jobs exceeded NTE scope. In ${revenueExceededToo} cases, the customer approved additional billing (approved overage). In ${scopeEscalationJobs.length - revenueExceededToo} cases, costs exceeded NTE but revenue did not — the company absorbed the difference.${costAbsorbed > 0 ? ` Total unrecovered cost: ${usd(costAbsorbed)}.` : ""}`,
      evidence: scopeEscalationJobs.slice(0, 5).map(j =>
        `Job ${j.jobNumber} (${j.customerName}): cost ${usd(j.actualCost ?? 0)} vs NTE ${usd(j.amountNTE ?? 0)}, billed ${usd(j.totalAmount ?? 0)}${j.nteExceeded ? " (billed above NTE)" : " (cost-only overrun)"}`
      ),
      recommendation: costAbsorbed > 0
        ? `${usd(costAbsorbed)} in costs absorbed without proportional revenue on these jobs. Going forward, tighten scope estimation and stand up expedited re-auth workflow to reduce dispatch overhead on customer-set NTE overflows.`
        : `All escalation events resulted in approved billing above NTE. Going forward, streamline the re-auth loop (tech → dispatch → approver) to cut return trips and dispatch labor on overflow tickets.`,
      page: "pricing-intel",
      drillLevel: "macro",
    });
  }

  if (dataQuality.flags.MISSING_JOB_TYPE > 0) {
    const affected = jobs.filter(j => j.qualityFlags.includes("MISSING_JOB_TYPE"));
    findings.push({
      id: "dq-missing-job-type",
      category: "data-quality",
      severity: "medium",
      title: `${affected.length} jobs have no job type — excluded from segmented analysis`,
      narrative: `Jobs without a job type cannot be included in per-type margin analysis, pricing band calculations, or customer DNA profiling. These should be categorized in the field service platform.`,
      evidence: affected.slice(0, 8).map(j =>
        `Job ${j.jobNumber} (${j.customerName}): status ${j.jobStatus}, revenue ${usd(j.totalAmount ?? 0)}`
      ),
      recommendation: `Assign job types to ${affected.length === 1 ? "this job" : `these ${affected.length} jobs`} in the field service platform to include them in segmented analysis.`,
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  const implausibleJobs = jobs.filter(j => j.qualityFlags.includes("IMPLAUSIBLE_MARGIN"));
  if (implausibleJobs.length > 0) {
    const totalRevenueExcluded = implausibleJobs.reduce((s, j) => s + (j.totalAmount ?? 0), 0);
    const sorted = [...implausibleJobs].sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0));

    findings.push({
      id: "dq-implausible-margin",
      category: "data-quality",
      severity: "critical",
      title: `${implausibleJobs.length} jobs show 85%+ margin on $500+ revenue — costs almost certainly incomplete`,
      narrative: `These jobs report margins that are economically impossible for field services (labor billing rates of $95–$125/hr against tech costs of $27–$45/hr cap realistic margins around 60–70%). The actual costs in the field service platform appear to be partially posted. Combined revenue of ${usd(totalRevenueExcluded)} is excluded from validated metrics until cost posting is completed.`,
      evidence: sorted.slice(0, 5).map(j =>
        `Job ${j.jobNumber} (${j.customerName}): ${usd(j.totalAmount ?? 0)} revenue, ${usd(j.actualCost ?? 0)} cost, ${pct(j.marginPct ?? 0)} margin`
      ),
      recommendation: `Complete cost posting for ${implausibleJobs.length === 1 ? "this job" : `these ${implausibleJobs.length} jobs`} in the field service platform. ${usd(totalRevenueExcluded)} in revenue is currently excluded from all validated analysis.`,
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  const underpostJobs = jobs.filter(j => j.qualityFlags.includes("COST_UNDERPOST"));
  if (underpostJobs.length > 0) {
    const sorted = [...underpostJobs].sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0));

    findings.push({
      id: "dq-cost-underpost",
      category: "data-quality",
      severity: "high",
      title: `${underpostJobs.length} quoted jobs have less than 15% of estimated costs posted`,
      narrative: `The field service platform carries cost estimates from approved quotes for these jobs, but actual posted costs are a fraction of what was estimated. This confirms costs were not fully entered — the margin on these jobs is artificially inflated.`,
      evidence: sorted.slice(0, 5).map(j => {
        const postPct = j.estimatedCost && j.estimatedCost > 0 ? ((j.actualCost ?? 0) / j.estimatedCost * 100).toFixed(0) : "0";
        return `Job ${j.jobNumber} (${j.customerName}): estimated cost ${usd(j.estimatedCost ?? 0)}, posted ${usd(j.actualCost ?? 0)} (${postPct}% of estimate)`;
      }),
      recommendation: "Review these quoted jobs in the field service platform. The cost estimate from the approved quote confirms that actual costs should be significantly higher than what is currently posted.",
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  const openUnbilledJobs = jobs.filter(j => j.qualityFlags.includes("OPEN_UNBILLED"));
  if (openUnbilledJobs.length > 0) {
    const totalCostExposed = openUnbilledJobs.reduce((s, j) => s + (j.actualCost ?? 0), 0);
    const byCustomer = new Map<string, typeof openUnbilledJobs>();
    for (const j of openUnbilledJobs) {
      const arr = byCustomer.get(j.customerName) || [];
      arr.push(j);
      byCustomer.set(j.customerName, arr);
    }
    const topCustomers = [...byCustomer.entries()].sort((a, b) => {
      const costA = a[1].reduce((s, j) => s + (j.actualCost ?? 0), 0);
      const costB = b[1].reduce((s, j) => s + (j.actualCost ?? 0), 0);
      return costB - costA;
    });

    findings.push({
      id: "dq-open-unbilled",
      category: "data-quality",
      severity: openUnbilledJobs.length >= 3 || totalCostExposed > 20000 * SCALE ? "critical" : "high",
      title: `${openUnbilledJobs.length} open ${openUnbilledJobs.length === 1 ? "job has" : "jobs have"} ${usd(totalCostExposed)} in costs posted but no revenue — excluded from margin analysis`,
      narrative: `These jobs are still open with costs accumulating but no revenue invoiced yet. Including them in margin calculations creates phantom negative margins (e.g., -200%) that distort customer and portfolio metrics. They represent work in progress, not realized losses. Excluded until revenue is posted or the job is completed.`,
      evidence: [
        `Total cost exposure: ${usd(totalCostExposed)} across ${openUnbilledJobs.length} jobs`,
        ...topCustomers.slice(0, 5).map(([name, custJobs]) => {
          const custCost = custJobs.reduce((s, j) => s + (j.actualCost ?? 0), 0);
          return `${name.split(",")[0]}: ${custJobs.length} open ${custJobs.length === 1 ? "job" : "jobs"}, ${usd(custCost)} in posted costs, $0 revenue`;
        }),
      ],
      recommendation: `Monitor these open jobs. If they remain unbilled past 30 days, escalate to project management for invoicing. The ${usd(totalCostExposed)} in costs will correctly flow into margin calculations once revenue is posted.`,
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  const openInvoicedJobs = jobs.filter(j => j.qualityFlags.includes("OPEN_INVOICED"));
  if (openInvoicedJobs.length > 0) {
    findings.push({
      id: "dq-open-invoiced",
      category: "data-quality",
      severity: "medium",
      title: `${openInvoicedJobs.length} jobs are marked Open but fully invoiced and paid`,
      narrative: `These jobs have been invoiced and paid in full but remain in Open status in the field service platform. This typically indicates the project manager hasn't closed the job because cost posting is still pending. These are strong candidates for incomplete cost data.`,
      evidence: openInvoicedJobs.slice(0, 5).map(j =>
        `Job ${j.jobNumber} (${j.customerName}): invoiced ${usd(j.totalAmount ?? 0)}, paid ${usd(j.totalAmountPaid ?? 0)}, status: ${j.jobStatus}`
      ),
      recommendation: `Close ${openInvoicedJobs.length === 1 ? "this job" : `these ${openInvoicedJobs.length} jobs`} in the field service platform after verifying all costs are posted. Open jobs with completed billing create confusion in both operational and financial reporting.`,
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  if (dataQuality.excludedJobs > 0) {
    const rawMargin = data.portfolioSummary.totalMargin;
    const validatedMargin = data.portfolioSummary.validated.totalMargin;
    const delta = rawMargin - validatedMargin;

    if (Math.abs(delta) > 100 * SCALE) {
      findings.push({
        id: "dq-margin-impact",
        category: "data-quality",
        severity: "info",
        title: `Data quality corrections shift portfolio margin by ${usd(delta)}`,
        narrative: `Excluding ${dataQuality.excludedJobs} jobs with data quality issues changes the portfolio margin from ${usd(rawMargin)} (raw) to ${usd(validatedMargin)} (validated). All tier assignments and recommendations use the validated figure.`,
        evidence: [
          `Raw portfolio margin: ${usd(rawMargin)} (${pct(data.portfolioSummary.totalRevenue > 0 ? rawMargin / data.portfolioSummary.totalRevenue : 0)})`,
          `Validated portfolio margin: ${usd(validatedMargin)} (${pct(data.portfolioSummary.validated.avgMarginPct)})`,
          `${dataQuality.excludedJobs} jobs excluded, ${dataQuality.flaggedJobs} jobs flagged`,
        ],
        recommendation: "No action required. This finding documents the impact of data quality corrections on aggregate metrics. Resolve flagged records in the field service platform to reduce the gap.",
        page: "customer-intel",
        drillLevel: "macro",
      });
    }
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/*  Cost Intelligence Findings                                         */
/* ------------------------------------------------------------------ */

function costIntelFindings(data: ComputedData): BPFinding[] {
  const findings: BPFinding[] = [];
  const { customers, jobs } = data;

  const portfolioLaborRates: number[] = [];
  const portfolioMarkups: number[] = [];
  for (const j of jobs) {
    if (j.costBreakdown && j.costBreakdown.avgLaborRate > 0) {
      portfolioLaborRates.push(j.costBreakdown.avgLaborRate);
    }
    if (j.costBreakdown && j.costBreakdown.materialMarkupAvg > 0) {
      portfolioMarkups.push(j.costBreakdown.materialMarkupAvg);
    }
  }
  const medianMarkup = portfolioMarkups.length > 0
    ? portfolioMarkups.sort((a, b) => a - b)[Math.floor(portfolioMarkups.length / 2)]
    : 0;

  for (const c of customers) {
    const custJobsWithLabor = c.jobs.filter(j =>
      j.costBreakdown && j.costBreakdown.avgLaborRate > 0 && !j.excluded
    );
    if (custJobsWithLabor.length < 3) continue;

    const rates = custJobsWithLabor.map(j => j.costBreakdown!.avgLaborRate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    const spread = maxRate - minRate;

    if (spread > 8 * SCALE) {
      const targetRate = Math.round(avgRate);
      const highRateJobs = custJobsWithLabor.filter(j => j.costBreakdown!.avgLaborRate > avgRate + 4 * SCALE);
      const savingsEstimate = highRateJobs.reduce((s, j) => {
        const overHours = j.costBreakdown!.laborHours;
        const overRate = j.costBreakdown!.avgLaborRate - targetRate;
        return s + overHours * overRate;
      }, 0);

      findings.push({
        id: `cost-labor-variance-${c.customerName.replace(/\s+/g, "-").toLowerCase().slice(0, 25)}`,
        category: "margin-alert",
        severity: spread > 15 * SCALE ? "high" : "medium",
        title: `${c.customerName.split(",")[0]}: labor rate ranges $${minRate.toFixed(0)}–$${maxRate.toFixed(0)}/hr across ${custJobsWithLabor.length} jobs`,
        narrative: `A $${spread.toFixed(0)}/hr labor rate spread on the same account suggests inconsistent tech assignment or overtime billing. Standardizing near the average of $${targetRate}/hr would improve margin predictability.`,
        evidence: [
          `Min rate: $${minRate.toFixed(0)}/hr, Max rate: $${maxRate.toFixed(0)}/hr, Avg: $${avgRate.toFixed(0)}/hr`,
          `${highRateJobs.length} jobs billed above $${(avgRate + 4).toFixed(0)}/hr`,
          savingsEstimate > 50 * SCALE ? `Estimated savings from rate normalization: ${usd(savingsEstimate)}` : "",
        ].filter(Boolean),
        recommendation: `Review tech assignments for ${c.customerName.split(",")[0]} going forward. If senior techs are dispatched for routine work, redeploy to higher-value calls. Projected margin improvement: ${usd(savingsEstimate)}/yr.`,
        page: "customer-intel",
        drillLevel: "customer",
        customerScope: c.customerName,
      });
    }
  }

  for (const c of customers) {
    const custJobsWithMaterial = c.jobs.filter(j =>
      j.costBreakdown && j.costBreakdown.materialCost > 0 && j.costBreakdown.materialMarkupAvg > 0 && !j.excluded
    );
    if (custJobsWithMaterial.length < 2 || medianMarkup <= 0) continue;

    const avgMarkup = custJobsWithMaterial.reduce((s, j) => s + j.costBreakdown!.materialMarkupAvg, 0) / custJobsWithMaterial.length;

    if (avgMarkup < 20 && avgMarkup < medianMarkup * 0.6) {
      const totalMaterialCost = custJobsWithMaterial.reduce((s, j) => s + j.costBreakdown!.materialCost, 0);
      const repriceTarget = medianMarkup * 0.85;
      const additionalMargin = totalMaterialCost * ((repriceTarget - avgMarkup) / 100);

      findings.push({
        id: `cost-material-markup-${c.customerName.replace(/\s+/g, "-").toLowerCase().slice(0, 25)}`,
        category: "pricing-signal",
        severity: "medium",
        title: `${c.customerName.split(",")[0]}: material markup at ${avgMarkup.toFixed(0)}% vs portfolio median ${medianMarkup.toFixed(0)}%`,
        narrative: `This account's material markup is well below the portfolio standard. At current material spend of ${usd(totalMaterialCost)}, repricing to ${repriceTarget.toFixed(0)}% would add ${usd(additionalMargin)} in margin.`,
        evidence: [
          `Average material markup: ${avgMarkup.toFixed(1)}%`,
          `Portfolio median markup: ${medianMarkup.toFixed(1)}%`,
          `Total material cost on this account: ${usd(totalMaterialCost)}`,
          `${custJobsWithMaterial.length} jobs with material line items`,
        ],
        recommendation: `Adjust material markup to ${repriceTarget.toFixed(0)}% on the next contract renewal. Estimated annual margin improvement: ${usd(additionalMargin)}.`,
        page: "pricing-intel",
        drillLevel: "customer",
        customerScope: c.customerName,
      });
    }
  }

  const syncIssueJobs = jobs.filter(j =>
    j.qualityFlags.includes("MISSING_COST") &&
    j.costBreakdown &&
    j.costBreakdown.totalLineCost > 0
  );
  if (syncIssueJobs.length > 0) {
    const totalLineCost = syncIssueJobs.reduce((s, j) => s + (j.costBreakdown?.totalLineCost ?? 0), 0);
    findings.push({
      id: "cost-sync-issue",
      category: "data-quality",
      severity: "high",
      title: `${syncIssueJobs.length} jobs have cost line items but $0 actual cost — platform sync issue`,
      narrative: `These jobs have detailed cost line items totaling ${usd(totalLineCost)} but show $0 in the actualCost field. This is a platform rollup/sync failure, not genuinely zero-cost work. The margin on these jobs is overstated.`,
      evidence: syncIssueJobs.slice(0, 5).map(j =>
        `Job ${j.jobNumber} (${j.customerName}): ${j.costBreakdown!.lineCount} cost lines totaling ${usd(j.costBreakdown!.totalLineCost)}, actualCost = $0`
      ),
      recommendation: `Trigger a cost rollup refresh in the field service platform for ${syncIssueJobs.length === 1 ? "this job" : `these ${syncIssueJobs.length} jobs`}. ${usd(totalLineCost)} in costs should be reflected in actuals.`,
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  const flatFeeOnlyJobs = jobs.filter(j =>
    !j.excluded &&
    j.costBreakdown &&
    j.costBreakdown.flatFeeRevenue > 0 &&
    j.costBreakdown.laborCost === 0 &&
    j.costBreakdown.materialCost === 0
  );
  if (flatFeeOnlyJobs.length >= 3) {
    const totalFlatFee = flatFeeOnlyJobs.reduce((s, j) => s + j.costBreakdown!.flatFeeRevenue, 0);
    const byCustomer = new Map<string, number>();
    for (const j of flatFeeOnlyJobs) {
      byCustomer.set(j.customerName, (byCustomer.get(j.customerName) ?? 0) + 1);
    }
    const topCustomers = [...byCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    findings.push({
      id: "cost-flat-fee-no-cost",
      category: "pricing-signal",
      severity: "medium",
      title: `${flatFeeOnlyJobs.length} flat-fee jobs with no labor or material costs posted`,
      narrative: `These jobs generate ${usd(totalFlatFee)} in flat-fee revenue but have zero labor and material cost lines. If technicians performed work, costs are unrecorded. If these are administrative fees, they should be tagged as such.`,
      evidence: [
        `Total flat-fee revenue: ${usd(totalFlatFee)}`,
        ...topCustomers.map(([name, count]) => `${name.split(",")[0]}: ${count} flat-fee-only jobs`),
      ],
      recommendation: "Verify whether these flat-fee jobs involved technician dispatch. If yes, post labor costs to prevent margin overstatement. If administrative, tag them to exclude from service margin analysis.",
      page: "customer-intel",
      drillLevel: "macro",
    });
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/*  Dispatch Efficiency Findings                                       */
/* ------------------------------------------------------------------ */

function dispatchEfficiencyFindings(data: ComputedData): BPFinding[] {
  const findings: BPFinding[] = [];
  const { dispatchEfficiency } = data;

  if (dispatchEfficiency.totalEscalationEvents > 0) {
    const topFriction = dispatchEfficiency.topFrictionCustomers.slice(0, 3);
    
    if (topFriction.length > 0 && dispatchEfficiency.totalFrictionCost > 100 * SCALE) {
      findings.push({
        id: "dispatch-friction-portfolio",
        category: "margin-alert",
        severity: dispatchEfficiency.totalFrictionCost > 5000 * SCALE ? "critical" : dispatchEfficiency.totalFrictionCost > 1000 * SCALE ? "high" : "medium",
        title: `${dispatchEfficiency.totalEscalationEvents} NTE escalation events generate ${usd(dispatchEfficiency.totalFrictionCost)} in estimated annual dispatch friction`,
        narrative: `Portfolio-wide, ${pct(dispatchEfficiency.portfolioEscalationRate)} of NTE-authorized jobs trigger scope escalation — each requiring a tech-dispatch-customer approval handoff. The top friction customers are ${topFriction.map(p => p.customerName.split(",")[0]).join(", ")}. Return trips, tech idle time, and dispatch overhead create measurable margin drag.`,
        evidence: [
          `Portfolio escalation rate: ${pct(dispatchEfficiency.portfolioEscalationRate)} (${dispatchEfficiency.totalEscalationEvents} events)`,
          `Estimated annual friction cost: ${usd(dispatchEfficiency.totalFrictionCost)}`,
          ...topFriction.map(p =>
            `${p.customerName.split(",")[0]}: ${p.escalatedJobCount}/${p.totalNteJobs} jobs escalate (${pct(p.escalationRate)}), ${p.estimatedReturnTrips} return trips, ${usd(p.annualFrictionCost)} friction cost`
          ),
        ],
        recommendation: topFriction.length > 0
          ? `Stand up single-queue expedited re-auth for ${topFriction[0].customerName.split(",")[0]} — ${topFriction[0].escalatedJobCount} of ${topFriction[0].totalNteJobs} jobs exceed their customer-set NTE (${usd(topFriction[0].currentNte)}), generating ${usd(topFriction[0].recoverableWaste)}/yr in dispatch friction. NTE is customer-controlled; reduce overhead through workflow, not threshold changes.`
          : `Flag top-friction customers where jobs frequently exceed customer-set NTE caps and route overflow tickets through expedited re-auth.`,
        page: "customer-intel",
        drillLevel: "macro",
      });
    }
  }

  for (const profile of dispatchEfficiency.customerProfiles.slice(0, 5)) {
    if (profile.escalationRate > 0.30 && profile.annualFrictionCost > 200 * SCALE) {
      findings.push({
        id: `dispatch-friction-${profile.customerName.replace(/\s+/g, "-").toLowerCase().slice(0, 25)}`,
        category: "margin-alert",
        severity: profile.annualFrictionCost > 1000 * SCALE ? "high" : "medium",
        title: `${profile.customerName.split(",")[0]}: ${pct(profile.escalationRate)} escalation rate — ${usd(profile.annualFrictionCost)} annual friction cost`,
        narrative: `${profile.escalatedJobCount} of ${profile.totalNteJobs} jobs for ${profile.customerName.split(",")[0]} exceed the customer-set NTE threshold, triggering the dispatch approval workflow. Escalated jobs average ${profile.avgVisitsEscalated.toFixed(1)} visits vs. ${profile.avgVisitsWithinScope.toFixed(1)} for within-scope jobs.${profile.daysDelta != null && profile.daysDelta > 1 ? ` Escalated jobs also take ${profile.daysDelta.toFixed(1)} extra days to close.` : ""} The customer defines this threshold when submitting the work request — ACME cannot change it.`,
        evidence: [
          `Customer-set NTE: ${usd(profile.currentNte)}; typical billed scope: ${usd(profile.recommendedNte)}`,
          `Escalation rate: ${pct(profile.escalationRate)} (${profile.escalatedJobCount} of ${profile.totalNteJobs})`,
          `Visit delta: ${profile.avgVisitsEscalated.toFixed(1)} vs. ${profile.avgVisitsWithinScope.toFixed(1)} (${profile.visitDelta > 0 ? "+" : ""}${profile.visitDelta.toFixed(1)})`,
          `${profile.estimatedReturnTrips} return trips at ${usd(profile.truckRollCost)}/trip`,
          profile.declinedEscalations > 0
            ? `${profile.declinedEscalations} declined escalations (customer rejected scope expansion), ${usd(profile.declinedRevenueLost)} potential revenue lost`
            : "",
        ].filter(Boolean),
        recommendation: `Stand up single-queue expedited re-auth for ${profile.customerName.split(",")[0]} — ${profile.escalatedJobCount} jobs exceed their customer-set NTE (${usd(profile.currentNte)}), saving an estimated ${usd(profile.recoverableWaste)}/yr in dispatch overhead through workflow streamlining.`,
        page: "customer-intel",
        drillLevel: "customer",
        customerScope: profile.customerName,
      });
    }
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/*  Labor Market & Construction Intelligence Findings                  */
/* ------------------------------------------------------------------ */

function laborMarketFindings(data: ComputedData): BPFinding[] {
  const findings: BPFinding[] = [];
  const { regions } = data;

  const stateRegions: ("RW" | "RS" | "RC" | "RE" | "RN" | "RM")[] = ["RW", "RS", "RC", "RE", "RN", "RM"];

  for (const state of stateRegions) {
    const wage = getWageForRegion(state);
    if (!wage) continue;

    const region = regions.find(r => r.region === state);
    if (!region || region.jobCount < 5) continue;

    if (wage.fourYearChangePct > 0.15) {
      const latest = wage.snapshots[wage.snapshots.length - 1];
      const earliest = wage.snapshots[0];
      if (!latest || !earliest) continue;

      const annualizedIncrease = (latest.meanAnnualWage - earliest.meanAnnualWage) / 4;
      const techCount = Math.ceil(region.jobCount / 150);
      const annualLaborInflation = annualizedIncrease * techCount;

      findings.push({
        id: `labor-pressure-${state}`,
        category: "risk-flag",
        severity: wage.fourYearChangePct > 0.18 ? "high" : "medium",
        title: `${wage.metroArea}: HVAC tech wages up ${pct(wage.fourYearChangePct)} in 4 years — ${usd(annualLaborInflation)}/yr labor cost pressure`,
        narrative: `BLS data shows ${wage.metroArea} HVAC technician wages grew from $${(earliest.meanAnnualWage / 1000).toFixed(0)}k to $${(latest.meanAnnualWage / 1000).toFixed(0)}k (${pct(wage.fourYearChangePct)}) between 2019-2023. At an estimated ${techCount} techs serving ${region.jobCount} jobs, this creates ~${usd(annualLaborInflation)}/yr in labor cost inflation. ${wage.notes}`,
        evidence: [
          `2019 mean wage: $${(earliest.meanAnnualWage / 1000).toFixed(0)}k → 2023: $${(latest.meanAnnualWage / 1000).toFixed(0)}k`,
          `Location quotient: ${latest.locationQuotient?.toFixed(2) ?? "N/A"} (${(latest.locationQuotient ?? 0) < 0.9 ? "below-average tech density — supply constrained" : "adequate tech supply"})`,
          `Estimated tech pool: ${latest.employment?.toLocaleString(activeLocaleTag()) ?? "N/A"} in metro`,
          `National 4-year growth: ${pct(0.159)} — ${state} ${wage.fourYearChangePct > 0.159 ? "outpacing" : "trailing"} national`,
        ],
        recommendation: `Build annual ${pct(wage.fourYearChangePct / 4)} labor rate escalation into all ${regionLabels[state]} contracts. For T&M work, verify hourly billing rates reflect the ${pricingBenchmarks.laborRateMultiplier.range[0]}-${pricingBenchmarks.laborRateMultiplier.range[1]}x multiplier on current actual labor costs of $${(latest.meanAnnualWage / 2080).toFixed(0)}/hr.`,
        page: "customer-intel",
        drillLevel: "region",
        regionScope: state,
      });
    }
  }

  for (const state of stateRegions) {
    const signal = getConstructionGrowthSignal(state);
    const permits = getPermitsForRegion(state);
    const region = regions.find(r => r.region === state);

    if (!region || permits.length === 0) continue;

    const totalPermits = permits.reduce((s, p) => s + (p.snapshots[p.snapshots.length - 1]?.totalPermits ?? 0), 0);

    if (signal.signal === "growing" || (signal.signal === "stable" && totalPermits > 15000)) {
      findings.push({
        id: `construction-growth-${state}`,
        category: "acquisition-signal",
        severity: "info",
        title: `${signal.topMetro}: ${totalPermits.toLocaleString(activeLocaleTag())} building permits in 2024 — expansion opportunity`,
        narrative: `Census Bureau data shows ${signal.signal} construction activity in ${regionLabels[state]}. ${permits.map(p => `${p.metroArea}: ${p.snapshots[p.snapshots.length - 1]?.totalPermits.toLocaleString(activeLocaleTag())} permits (${pct(p.twoYearChangePct)} vs. 2022)`).join(". ")}. New construction creates HVAC installation demand and establishes long-term service relationships.`,
        evidence: permits.map(p => {
          const latest = p.snapshots[p.snapshots.length - 1];
          return `${p.metroArea}: ${latest?.totalPermits.toLocaleString(activeLocaleTag()) ?? 0} total (${latest?.singleFamily.toLocaleString(activeLocaleTag()) ?? 0} SF, ${latest?.multiFamilyFivePlus.toLocaleString(activeLocaleTag()) ?? 0} MF 5+), ${p.constructionActivityLevel} activity`;
        }),
        recommendation: `Target new construction HVAC contracts in ${signal.topMetro}. Each 1,000 residential permits generates ~$2-4M in commercial HVAC demand over 3 years. ${permits[0]?.notes ?? ""}`,
        page: "customer-intel",
        drillLevel: "region",
        regionScope: state,
      });
    }

    if (signal.signal === "declining") {
      findings.push({
        id: `construction-decline-${state}`,
        category: "risk-flag",
        severity: "medium",
        title: `${signal.topMetro}: construction permits down ${pct(Math.abs(signal.twoYearChange))} — shift to service/retrofit`,
        narrative: `New construction activity in ${regionLabels[state]} is declining. This reduces installation revenue but increases retrofit and replacement demand as existing building stock ages. ${permits[0]?.notes ?? ""}`,
        evidence: permits.map(p => {
          const latest = p.snapshots[p.snapshots.length - 1];
          return `${p.metroArea}: ${latest?.totalPermits.toLocaleString(activeLocaleTag()) ?? 0} permits, ${pct(p.twoYearChangePct)} vs. 2022`;
        }),
        recommendation: `Pivot ${regionLabels[state]} strategy from new construction to service contracts and equipment replacement. The 50% rule: if single repair cost exceeds 50% of replacement value, recommend replacement. This builds advisory trust and captures higher-margin installation work.`,
        page: "customer-intel",
        drillLevel: "region",
        regionScope: state,
      });
    }
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/*  Root Cause Prescriptive Findings                                   */
/* ------------------------------------------------------------------ */

function rootCauseFindings(data: ComputedData): BPFinding[] {
  const findings: BPFinding[] = [];
  if (!data.customerRootCauses) return findings;

  const highImpact = [...data.customerRootCauses.entries()]
    .filter(([, rca]) => rca.estimatedRecovery > 10000 * SCALE && rca.drivers.length >= 2)
    .sort((a, b) => b[1].estimatedRecovery - a[1].estimatedRecovery)
    .slice(0, 8);

  for (const [name, rca] of highImpact) {
    const topDrivers = rca.drivers.filter(d => d.direction === "drag").slice(0, 3);
    if (topDrivers.length === 0) continue;

    const prescriptions = topDrivers.map(d => {
      let action = d.detail;
      if (d.benchmarkComparison) {
        action += ` | Benchmark: ${d.benchmarkComparison}`;
      }
      return `${d.driver} (${usd(Math.abs(d.dollarImpact))}): ${action}`;
    });

    const customer = data.customers.find(c => c.customerName === name);
    const tier = customer?.tier ?? "Unknown";

    findings.push({
      id: `rca-${name.replace(/\s+/g, "-").toLowerCase().slice(0, 25)}`,
      category: "margin-alert",
      severity: rca.estimatedRecovery > 50000 * SCALE ? "critical" : rca.estimatedRecovery > 20000 * SCALE ? "high" : "medium",
      title: `${name.split(",")[0]}: ${usd(rca.estimatedRecovery)} projected annual uplift — ${topDrivers.length} addressable drivers`,
      narrative: `Root cause decomposition for ${name.split(",")[0]} (${tier} tier, ${pct(rca.currentMarginPct)} margin vs. portfolio ${pct(rca.portfolioBenchmarkPct)}) identifies ${rca.drivers.length} margin drivers. Applying corrected pricing on future work for the top ${topDrivers.length} addressable drags projects ${usd(rca.estimatedRecovery)}/yr in margin improvement. Industry benchmark for primary trade: ${pct(rca.industryBenchmarkPct[0])}-${pct(rca.industryBenchmarkPct[1])} gross margin.`,
      evidence: prescriptions,
      recommendation: rca.topLever,
      page: "customer-intel",
      drillLevel: "customer",
      customerScope: name,
    });
  }

  return findings;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Procurement pipeline findings (Meridian OWF)                       */
/* ------------------------------------------------------------------ */

function procurementFindings(): BPFinding[] {
  return [
    {
      id: "s7-cable-critical-path",
      category: "deadline-risk",
      severity: "critical",
      title: "66kV array cable ITT is the programme critical path",
      narrative:
        "PKG-2101 must open its 21-day tender window this week to hold the Q2 2027 cable-lay campaign. Cable lead times drive the installation sequence — every week of tender slippage compresses the lay window directly.",
      evidence: [
        "Submission deadline 03 Aug 2026 — 21 days from issue.",
        "Five pre-qualified suppliers confirmed capacity for Q1 2027 delivery.",
        "PKG-2105 (J-tube seals) is sequenced behind the cable award for OD confirmation.",
      ],
      recommendation: "Draft and issue the PKG-2101 ITT via Tender Studio, then route to the SCM Director for approval.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "s7-tp-fabrication-slot",
      category: "supplier-signal",
      severity: "high",
      title: "European TP fabrication slots are contested",
      narrative:
        "PKG-2102 (24 transition pieces) holds a reserved Q1 2027 fabrication slot. A late ITT risks losing the slot to a competing developer; the Batch 1 benchmark of €1.83M per unit landed DDP anchors the negotiation.",
      evidence: [
        "Batch 1 award benchmark: €1.83M per unit landed DDP.",
        "Three yards on the bidder list, submission deadline 17 Aug 2026.",
      ],
      recommendation: "Complete requirements extraction against TS-STR-TP-002 and issue inside the reserved-slot window.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "s7-anode-fixed-pricing",
      category: "savings-signal",
      severity: "medium",
      title: "Anode tender exposed to aluminium alloy volatility",
      narrative:
        "PKG-2104 closes 24 July with four bidders. Clause 7.1 fixed pricing must hold without a commodities-index rider, or the $118k savings target erodes on award.",
      evidence: [
        "S7-SCM-TC-2026 §7.1: fixed firm pricing, no escalation without an agreed commodities index.",
        "4 of 4 bidders acknowledged receipt; two clarifications answered inside the 7-day window.",
      ],
      recommendation: "Hold clause 7.1 in negotiation; reject index riders unless offset by unit-price concessions.",
      page: "operating-loop",
      drillLevel: "macro",
    },
    {
      id: "s7-charter-flowdown",
      category: "charter-interface",
      severity: "high",
      title: "Charter flow-downs required on vessel-side packages",
      narrative:
        "Packages with vessel operations (cable, transition pieces, hook block) must carry the SUPPLYTIME 2026 knock-for-knock regime and offshore marine warranty into Section 4.0. Omitting the flow-down leaves an uninsured liability gap at the vessel interface.",
      evidence: [
        "SUPPLYTIME 2026 Clauses 4.1/4.2 — mutual knock-for-knock indemnities.",
        "Clause 2.2 — SOLAS/MARPOL marine warranty and classification requirement.",
      ],
      recommendation: "The Contracts & Maritime Agent applies the flow-down automatically; the audit pass verifies it before approval.",
      page: "tender-studio",
      drillLevel: "macro",
    },
    {
      id: "s7-traceability-gate",
      category: "compliance-flag",
      severity: "medium",
      title: "EN 10204 traceability is a hard acceptance gate",
      narrative:
        "Type 3.1/3.2 material certificates are a condition of acceptance at the Rotterdam mobilisation port — uncertified load-bearing materials are rejected on arrival. Every ITT must state this in Section 3.0.",
      evidence: [
        "QA-MAN-2026-EPCI §4.1: EN 10204 Type 3.1/3.2 mandatory for primary steel and load-bearing components.",
        "ITP submission required 30 days prior to manufacturing.",
      ],
      recommendation: "Confirm the traceability clause survives any supplier mark-up during clarifications.",
      page: "tender-studio",
      drillLevel: "macro",
    },
  ];
}

export function generateFindings(data: ComputedData): BPFinding[] {
  return [
    ...procurementFindings(),
    ...portfolioFindings(data),
    ...regionFindings(data),
    ...pricingFindings(data),
    ...dispatchEfficiencyFindings(data),
    ...fuelFindings(),
    ...laborMarketFindings(data),
    ...rootCauseFindings(data),
    ...dataQualityFindings(data),
    ...costIntelFindings(data),
  ].sort((a, b) => {
    const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, info: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
