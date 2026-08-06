import { rawJobInfo, rawJobStats, rawJobVisit, rawJobAddress, rawJobCost, type RawJobInfo, type RawJobStats, type RawJobVisit, type RawSFQuote } from "./_raw";
import { formatActiveUsd } from "../_i18n/legacy"
import { rawSFQuotes } from "./_raw_quotes";
import { deriveRegionFromAddress, normalizeCity, type Region } from "./_regions";
import { validateJob, buildQualitySummary, type QualityFlag, type QualitySummary } from "./_validate";
import { buildCostBreakdowns, type CostBreakdown } from "./_costs";
import { buildPortfolioTrend, buildScopedTrend, type TrendSummary } from "./_temporal";
import { buildCustomerRootCauses, buildRegionRootCauses, buildPrescriptions, buildPricingBandInsights, type RootCauseAnalysis, type Prescription, type PricingBandInsight } from "./_rootcause";
import { buildExpansionPrescriptions, type ExpansionPrescription } from "./_expansion";
import { buildDispatchEfficiency, type DispatchEfficiencyReport } from "./_dispatch";
import { buildFuelAnalysis, type PortfolioFuelExposure } from "./_fuel";
import { buildCustomerScores, type CustomerScore } from "./_scorecard";
import { buildCustomerTams, type CustomerTam } from "./_tam";
import { buildCustomerAr, type ArProfile } from "./_ar";

/* ------------------------------------------------------------------ */
/*  Unified Job Record                                                 */
/* ------------------------------------------------------------------ */

export interface Job {
  jobNumber: number;
  jobType: string;
  jobStatus: string;
  quoteStatus: string;
  priceBookName: string;
  customerName: string;
  propertyName: string;
  propertyType: string;
  region: Region;
  city: string;
  state: string;

  totalAmountQuoted: number | null;
  estimatedCost: number | null;
  amountNTE: number | null;

  billingStatus: string;
  completedDate: Date | null;
  createdTime: Date | null;
  firstInvoiceCreated: Date | null;
  totalAmount: number | null;
  actualCost: number | null;
  totalAmountPaid: number | null;
  outstandingBalance: number | null;

  margin: number | null;
  marginPct: number | null;
  invoiceLagDays: number | null;
  timeToCompleteDays: number | null;
  nteUtilization: number | null;
  nteExceeded: boolean;
  nteWorkflowOutcome: "within-scope" | "approved-overage" | "quote-converted" | null;

  visitCount: number;
  totalVisitDurationMins: number;
  techNames: string[];

  qualityFlags: QualityFlag[];
  excluded: boolean;
  excludeReason?: string;
  costBreakdown: CostBreakdown | null;
}

/* ------------------------------------------------------------------ */
/*  Aggregate Metrics (raw vs validated dual-track)                     */
/* ------------------------------------------------------------------ */

export interface AggregateMetrics {
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  avgMarginPct: number;
  avgTicket: number;
  jobCount: number;
}

export interface JobTypeMargin {
  jobType: string;
  jobCount: number;
  totalRevenue: number;
  totalCost: number;
  avgMarginPct: number;
}

/* ------------------------------------------------------------------ */
/*  Customer Aggregate                                                 */
/* ------------------------------------------------------------------ */

export type Tier = "Stars" | "Cash Cows" | "Question Marks" | "Dogs";

export interface CustomerAggregate {
  customerName: string;
  jobCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  avgMarginPct: number;
  avgTicket: number;
  jobTypeMix: Record<string, number>;
  propertyTypeMix: Record<string, number>;
  regionDistribution: Record<Region, number>;
  negativeMarginJobCount: number;
  tier: Tier;
  jobs: Job[];
  marginByJobType: JobTypeMargin[];
  excludedJobCount: number;
  validated: AggregateMetrics;
  qualitySummary: QualitySummary;
  trend: TrendSummary | null;
  /** CI-04 composite Customer Score (additive to BCG tier; see _scorecard.ts). */
  customerScore?: CustomerScore;
  customerTam?: CustomerTam;
  /** Simulated AR/DSO collections profile (see _ar.ts) — feeds the A-factor. */
  arProfile?: ArProfile;
}

/* ------------------------------------------------------------------ */
/*  City Aggregate                                                     */
/* ------------------------------------------------------------------ */

export interface CityAggregate {
  city: string;
  region: Region;
  jobCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  avgMarginPct: number;
  avgTicket: number;
  customerCount: number;
}

/* ------------------------------------------------------------------ */
/*  Region Aggregate                                                   */
/* ------------------------------------------------------------------ */

export interface RegionAggregate {
  region: Region;
  jobCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  avgMarginPct: number;
  avgTicket: number;
  customerCount: number;
  negativeMarginJobCount: number;
  topPropertyTypes: { type: string; count: number }[];
  topJobTypes: { type: string; count: number }[];
  cities: CityAggregate[];
  validated: AggregateMetrics;
  qualitySummary: QualitySummary;
  trend: TrendSummary | null;
}

/* ------------------------------------------------------------------ */
/*  Quote / Price Band Analysis                                        */
/* ------------------------------------------------------------------ */

export interface PriceBand {
  min: number;
  max: number;
  label: string;
  totalQuotes: number;
  wins: number;
  losses: number;
  pending: number;
  expired: number;
  winRate: number;
}

export interface JobTypeQuoteAnalysis {
  jobType: string;
  totalQuotes: number;
  wins: number;
  losses: number;
  pending: number;
  overallWinRate: number;
  priceBands: PriceBand[];
  ceilingAmount: number | null;
  sweetSpot: { min: number; max: number } | null;
}

export interface AtRiskQuote {
  jobNumber: number;
  customerName: string;
  propertyName: string;
  jobType: string;
  region: Region;
  totalAmountQuoted: number;
  amountNTE: number | null;
  nteUtilization: number | null;
  ceilingForType: number | null;
  aboveCeiling: boolean;
  exceedsNteAuth: boolean;
  quoteAgeDays: number;
  riskScore: number;
}

export interface DispatchAuthEvent {
  jobNumber: number;
  customerName: string;
  jobType: string;
  region: Region;
  totalAmount: number;
  amountNTE: number;
  revenueToNteRatio: number;
  workflowOutcome: "within-scope" | "approved-overage" | "quote-converted";
  visitCount: number;
  daysToComplete: number | null;
  margin: number | null;
}

/* ------------------------------------------------------------------ */
/*  Text Normalization                                                 */
/* ------------------------------------------------------------------ */

const UPPER_ACRONYMS = new Set(["hvac", "llc", "dba", "cvs", "cbre", "usa", "gm"]);

function toTitleCase(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const normalized = trimmed
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " - ");

  return normalized
    .toLowerCase()
    .split(" ")
    .map(word => {
      if (word === "-") return "-";
      const bare = word.replace(/[^a-z0-9]/g, "");
      if (UPPER_ACRONYMS.has(bare)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseDate(s: string): Date | null {
  if (!s || s.trim() === "") return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function topN(counts: Record<string, number>, n: number): { type: string; count: number }[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([type, count]) => ({ type, count }));
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/* ------------------------------------------------------------------ */
/*  Step 1: Join + Compute Per-Job Metrics                             */
/* ------------------------------------------------------------------ */

function buildJobs(): Job[] {
  const statsMap = new Map<number, RawJobStats>();
  for (const s of rawJobStats) statsMap.set(s.jobNumber, s);

  const visitMap = new Map<number, RawJobVisit[]>();
  for (const v of rawJobVisit) {
    const arr = visitMap.get(v.jobNumber) || [];
    arr.push(v);
    visitMap.set(v.jobNumber, arr);
  }

  const addressMap = new Map<number, { city: string; state: string }>();
  for (const a of rawJobAddress) {
    addressMap.set(a.jobNumber, { city: a.city, state: a.state });
  }

  const costBreakdowns = buildCostBreakdowns();

  const jobs = rawJobInfo.map((info: RawJobInfo) => {
    const stats = statsMap.get(info.jobNumber);
    const visits = visitMap.get(info.jobNumber) || [];
    const addr = addressMap.get(info.jobNumber);

    const completedDate = stats ? parseDate(stats.completedDateLocal) : null;
    const createdTime = stats ? parseDate(stats.createdTimeLocal) : null;
    const firstInvoiceCreated = stats ? parseDate(stats.firstInvoiceCreatedTimeUtc) : null;
    const totalAmount = stats?.totalAmount ?? null;
    const actualCost = stats?.actualCost ?? null;

    const margin = totalAmount != null && actualCost != null ? totalAmount - actualCost : null;
    const marginPct = totalAmount != null && totalAmount !== 0 && margin != null
      ? margin / totalAmount
      : null;

    const invoiceLagDays = completedDate && firstInvoiceCreated
      ? daysBetween(completedDate, firstInvoiceCreated)
      : null;

    const timeToCompleteDays = createdTime && completedDate
      ? daysBetween(createdTime, completedDate)
      : null;

    const nteUtilization = totalAmount != null && info.amountNTE != null && info.amountNTE > 0
      ? totalAmount / info.amountNTE
      : null;

    const nteExceeded = totalAmount != null && info.amountNTE != null && info.amountNTE > 0
      ? totalAmount > info.amountNTE
      : false;

    const nteWorkflowOutcome: Job["nteWorkflowOutcome"] =
      info.amountNTE == null || info.amountNTE <= 0 || totalAmount == null
        ? null
        : totalAmount <= info.amountNTE
          ? "within-scope"
          : info.quoteStatus === "Quote Approved"
            ? "quote-converted"
            : "approved-overage";

    const techNames = [...new Set(visits.map(v => v.primaryTechName).filter(Boolean))];
    const totalVisitDurationMins = visits.reduce((sum, v) => sum + (v.actualDurationMins || 0), 0);

    const region = deriveRegionFromAddress(addr?.state ?? null, info.priceBookName);
    const city = addr ? normalizeCity(addr.city) : "";

    const baseJob: Job = {
      jobNumber: info.jobNumber,
      jobType: toTitleCase(info.jobType),
      jobStatus: info.jobStatus,
      quoteStatus: info.quoteStatus,
      priceBookName: info.priceBookName,
      customerName: toTitleCase(info.customerName),
      propertyName: toTitleCase(info.propertyName),
      propertyType: toTitleCase(info.propertyType),
      region,
      city,
      state: addr?.state ?? "",
      totalAmountQuoted: info.totalAmountQuoted,
      estimatedCost: info.estimatedCost,
      amountNTE: info.amountNTE,
      billingStatus: stats?.billingStatus ?? "",
      completedDate,
      createdTime,
      firstInvoiceCreated,
      totalAmount,
      actualCost,
      totalAmountPaid: stats?.totalAmountPaid ?? null,
      outstandingBalance: stats?.outstandingBalance ?? null,
      margin,
      marginPct,
      invoiceLagDays,
      timeToCompleteDays,
      nteUtilization,
      nteExceeded,
      nteWorkflowOutcome,
      visitCount: visits.length,
      totalVisitDurationMins,
      techNames,
      qualityFlags: [],
      excluded: false,
      costBreakdown: costBreakdowns.get(info.jobNumber) ?? null,
    };

    const validation = validateJob(baseJob);
    baseJob.qualityFlags = validation.flags;
    baseJob.excluded = validation.excluded;
    baseJob.excludeReason = validation.excludeReason;

    return baseJob;
  });

  return jobs;
}

function computeAggregateMetrics(jobs: Job[]): AggregateMetrics {
  const withRevenue = jobs.filter(j => j.totalAmount != null && j.totalAmount > 0);
  const totalRevenue = jobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
  const totalCost = jobs.reduce((s, j) => s + (j.actualCost || 0), 0);
  const totalMargin = totalRevenue - totalCost;
  return {
    totalRevenue,
    totalCost,
    totalMargin,
    avgMarginPct: totalRevenue > 0 ? totalMargin / totalRevenue : 0,
    avgTicket: withRevenue.length > 0 ? totalRevenue / withRevenue.length : 0,
    jobCount: jobs.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Step 2: Customer Aggregation + Tiering                             */
/* ------------------------------------------------------------------ */

export function buildCustomerAggregates(jobs: Job[]): CustomerAggregate[] {
  const byCustomer = new Map<string, Job[]>();
  for (const j of jobs) {
    const arr = byCustomer.get(j.customerName) || [];
    arr.push(j);
    byCustomer.set(j.customerName, arr);
  }

  const aggregates: CustomerAggregate[] = [];
  for (const [customerName, custJobs] of byCustomer) {
    const withRevenue = custJobs.filter(j => j.totalAmount != null && j.totalAmount > 0);
    const totalRevenue = custJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
    const totalCost = custJobs.reduce((s, j) => s + (j.actualCost || 0), 0);
    const totalMargin = totalRevenue - totalCost;
    const avgMarginPct = totalRevenue > 0 ? totalMargin / totalRevenue : 0;
    const avgTicket = withRevenue.length > 0 ? totalRevenue / withRevenue.length : 0;

    const jobTypeMix: Record<string, number> = {};
    const propertyTypeMix: Record<string, number> = {};
    const regionDist: Record<string, number> = {};
    let negativeMarginJobCount = 0;

    for (const j of custJobs) {
      jobTypeMix[j.jobType] = (jobTypeMix[j.jobType] || 0) + 1;
      propertyTypeMix[j.propertyType] = (propertyTypeMix[j.propertyType] || 0) + 1;
      regionDist[j.region] = (regionDist[j.region] || 0) + 1;
      if (j.margin != null && j.margin < 0) negativeMarginJobCount++;
    }

    const validJobs = custJobs.filter(j => !j.excluded);
    const validated = computeAggregateMetrics(validJobs);
    const excludedJobCount = custJobs.length - validJobs.length;
    const qualitySummary = buildQualitySummary(custJobs);

    const byJobType = new Map<string, Job[]>();
    for (const j of validJobs) {
      if (!j.jobType) continue;
      const arr = byJobType.get(j.jobType) || [];
      arr.push(j);
      byJobType.set(j.jobType, arr);
    }
    const marginByJobType: JobTypeMargin[] = [];
    for (const [jobType, jtJobs] of byJobType) {
      const jtRevenue = jtJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
      const jtCost = jtJobs.reduce((s, j) => s + (j.actualCost || 0), 0);
      marginByJobType.push({
        jobType,
        jobCount: jtJobs.length,
        totalRevenue: jtRevenue,
        totalCost: jtCost,
        avgMarginPct: jtRevenue > 0 ? (jtRevenue - jtCost) / jtRevenue : 0,
      });
    }
    marginByJobType.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const trend = buildScopedTrend(custJobs, j => !j.excluded);

    aggregates.push({
      customerName,
      jobCount: custJobs.length,
      totalRevenue,
      totalCost,
      totalMargin,
      avgMarginPct,
      avgTicket,
      jobTypeMix,
      propertyTypeMix,
      regionDistribution: regionDist as Record<Region, number>,
      negativeMarginJobCount,
      tier: "Question Marks",
      jobs: custJobs,
      marginByJobType,
      excludedJobCount,
      validated,
      qualitySummary,
      trend,
    });
  }

  return assignTiers(aggregates);
}

function hasPremiumDNA(c: CustomerAggregate): boolean {
  const total = c.jobCount || 1;
  const hvacCount = Object.entries(c.jobTypeMix)
    .filter(([t]) => /hvac|refrigeration|cooking/i.test(t))
    .reduce((s, [, n]) => s + n, 0);
  const premiumPropCount = Object.entries(c.propertyTypeMix)
    .filter(([t]) => /restaurant|commercial|retail|grocery|multi-family/i.test(t))
    .reduce((s, [, n]) => s + n, 0);
  return (hvacCount / total >= 0.4) || (premiumPropCount / total >= 0.5);
}

function assignTiers(customers: CustomerAggregate[]): CustomerAggregate[] {
  const MIN_JOBS = 3;

  for (const c of customers) {
    const margin = c.validated.avgMarginPct;
    const validJobs = c.validated.jobCount;
    if (margin <= 0) {
      c.tier = "Dogs";
    } else if (margin >= 0.40 && validJobs >= MIN_JOBS && hasPremiumDNA(c)) {
      c.tier = "Stars";
    } else if (margin >= 0.40) {
      c.tier = "Cash Cows";
    } else if (margin >= 0.20) {
      c.tier = "Question Marks";
    } else {
      c.tier = "Dogs";
    }
  }
  return customers;
}

/* ------------------------------------------------------------------ */
/*  Step 3: City + Region Aggregation                                  */
/* ------------------------------------------------------------------ */

function buildCityAggregates(jobs: Job[], region: Region): CityAggregate[] {
  const byCity = new Map<string, Job[]>();
  for (const j of jobs) {
    if (!j.city) continue;
    const arr = byCity.get(j.city) || [];
    arr.push(j);
    byCity.set(j.city, arr);
  }

  const aggregates: CityAggregate[] = [];
  for (const [city, cityJobs] of byCity) {
    const totalRevenue = cityJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
    const totalCost = cityJobs.reduce((s, j) => s + (j.actualCost || 0), 0);
    const totalMargin = totalRevenue - totalCost;
    const withRevenue = cityJobs.filter(j => j.totalAmount != null && j.totalAmount > 0);
    aggregates.push({
      city,
      region,
      jobCount: cityJobs.length,
      totalRevenue,
      totalCost,
      totalMargin,
      avgMarginPct: totalRevenue > 0 ? totalMargin / totalRevenue : 0,
      avgTicket: withRevenue.length > 0 ? totalRevenue / withRevenue.length : 0,
      customerCount: new Set(cityJobs.map(j => j.customerName)).size,
    });
  }

  return aggregates.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function buildRegionAggregates(jobs: Job[]): RegionAggregate[] {
  const byRegion = new Map<Region, Job[]>();
  for (const j of jobs) {
    const arr = byRegion.get(j.region) || [];
    arr.push(j);
    byRegion.set(j.region, arr);
  }

  const aggregates: RegionAggregate[] = [];
  for (const [region, regionJobs] of byRegion) {
    const totalRevenue = regionJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
    const totalCost = regionJobs.reduce((s, j) => s + (j.actualCost || 0), 0);
    const totalMargin = totalRevenue - totalCost;
    const avgMarginPct = totalRevenue > 0 ? totalMargin / totalRevenue : 0;
    const withRevenue = regionJobs.filter(j => j.totalAmount != null && j.totalAmount > 0);
    const avgTicket = withRevenue.length > 0 ? totalRevenue / withRevenue.length : 0;
    const customerSet = new Set(regionJobs.map(j => j.customerName));

    const ptCounts: Record<string, number> = {};
    const jtCounts: Record<string, number> = {};
    let negativeMarginJobCount = 0;
    for (const j of regionJobs) {
      ptCounts[j.propertyType] = (ptCounts[j.propertyType] || 0) + 1;
      jtCounts[j.jobType] = (jtCounts[j.jobType] || 0) + 1;
      if (j.margin != null && j.margin < 0) negativeMarginJobCount++;
    }

    const validJobs = regionJobs.filter(j => !j.excluded);
    const validated = computeAggregateMetrics(validJobs);
    const qualitySummary = buildQualitySummary(regionJobs);
    const trend = buildScopedTrend(regionJobs, j => !j.excluded);

    aggregates.push({
      region,
      jobCount: regionJobs.length,
      totalRevenue,
      totalCost,
      totalMargin,
      avgMarginPct,
      avgTicket,
      customerCount: customerSet.size,
      negativeMarginJobCount,
      topPropertyTypes: topN(ptCounts, 5),
      topJobTypes: topN(jtCounts, 5),
      cities: buildCityAggregates(regionJobs, region),
      validated,
      qualitySummary,
      trend,
    });
  }

  return aggregates.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/* ------------------------------------------------------------------ */
/*  Step 4: Quote / Price Band Analysis                                */
/* ------------------------------------------------------------------ */

type QuoteOutcome = "win" | "loss" | "pending" | "expired";

/**
 * Best-available price signal per job.
 *
 * NTE is a customer-set authorization threshold, not a price. Only use
 * it as a proxy for jobs that stayed within NTE scope or have no revenue yet.
 */
function getPriceSignal(j: Job): number | null {
  if (j.totalAmountQuoted != null && j.totalAmountQuoted > 0) return j.totalAmountQuoted;
  if (j.amountNTE != null && j.amountNTE > 0 && !j.nteExceeded) return j.amountNTE;
  return null;
}

function classifyOutcome(j: Job): QuoteOutcome | null {
  if (j.quoteStatus === "Quote Approved") return "win";
  if (j.quoteStatus === "Quote Rejected") return "loss";
  if (j.quoteStatus === "Quote Sent") return "pending";
  if (j.quoteStatus === "Quote Expired") return "loss";
  if (j.jobStatus === "Canceled" && (j.amountNTE != null && j.amountNTE > 0 || j.totalAmountQuoted != null && j.totalAmountQuoted > 0)) return "loss";
  return null;
}

function buildQuoteAnalysis(jobs: Job[]): {
  byJobType: JobTypeQuoteAnalysis[];
  atRiskQuotes: AtRiskQuote[];
} {
  const cleanJobs = jobs.filter(j =>
    !j.qualityFlags.includes("PLACEHOLDER_NTE")
  );
  const analyzed: { job: Job; price: number; outcome: QuoteOutcome }[] = [];
  for (const j of cleanJobs) {
    const outcome = classifyOutcome(j);
    if (!outcome) continue;
    const price = getPriceSignal(j);
    if (price == null) continue;
    analyzed.push({ job: j, price, outcome });
  }

  const byJobType = new Map<string, typeof analyzed>();
  for (const entry of analyzed) {
    const arr = byJobType.get(entry.job.jobType) || [];
    arr.push(entry);
    byJobType.set(entry.job.jobType, arr);
  }

  const analyses: JobTypeQuoteAnalysis[] = [];
  const ceilingMap = new Map<string, number>();

  for (const [jobType, entries] of byJobType) {
    if (entries.length < 5) continue;

    const amounts = entries.map(e => e.price).sort((a, b) => a - b);
    const bands = computePriceBands(amounts, entries);
    const wins = entries.filter(e => e.outcome === "win").length;
    const losses = entries.filter(e => e.outcome === "loss").length;
    const pending = entries.filter(e => e.outcome === "pending").length;
    const overallWinRate = (wins + losses) > 0 ? wins / (wins + losses) : 0;

    let ceilingAmount: number | null = null;
    let sweetSpot: { min: number; max: number } | null = null;

    const decidedBands = bands.filter(b => (b.wins + b.losses) >= 3);
    for (let i = 0; i < decidedBands.length; i++) {
      if (decidedBands[i].winRate < 0.4 && ceilingAmount === null) {
        ceilingAmount = decidedBands[i].min;
        break;
      }
    }

    const goodBands = decidedBands.filter(b => b.winRate >= 0.5);
    if (goodBands.length > 0) {
      sweetSpot = {
        min: goodBands[0].min,
        max: goodBands[goodBands.length - 1].max,
      };
    }

    if (ceilingAmount != null) ceilingMap.set(jobType, ceilingAmount);

    analyses.push({
      jobType,
      totalQuotes: entries.length,
      wins,
      losses,
      pending,
      overallWinRate,
      priceBands: bands,
      ceilingAmount,
      sweetSpot,
    });
  }

  const now = new Date();
  const pendingEntries = analyzed.filter(e => e.outcome === "pending");
  const atRiskQuotes: AtRiskQuote[] = pendingEntries.map(({ job: j, price }) => {
    const ceiling = ceilingMap.get(j.jobType) ?? null;
    const aboveCeiling = ceiling != null && price > ceiling;
    const exceedsNteAuth = j.amountNTE != null && price > j.amountNTE;
    const quoteAgeDays = j.createdTime ? daysBetween(j.createdTime, now) : 0;

    let riskScore = 0;
    if (aboveCeiling) riskScore += 3;
    if (exceedsNteAuth) riskScore += 1;
    if (quoteAgeDays > 7) riskScore += 2;
    else if (quoteAgeDays > 2) riskScore += 1;

    return {
      jobNumber: j.jobNumber,
      customerName: j.customerName,
      propertyName: j.propertyName,
      jobType: j.jobType,
      region: j.region,
      totalAmountQuoted: price,
      amountNTE: j.amountNTE,
      nteUtilization: j.amountNTE ? price / j.amountNTE : null,
      ceilingForType: ceiling,
      aboveCeiling,
      exceedsNteAuth,
      quoteAgeDays: Math.round(quoteAgeDays),
      riskScore,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);

  return { byJobType: analyses.sort((a, b) => b.totalQuotes - a.totalQuotes), atRiskQuotes };
}

interface PricedEntry { job: Job; price: number; outcome: QuoteOutcome }

function computePriceBands(sortedAmounts: number[], entries: PricedEntry[]): PriceBand[] {
  const max = sortedAmounts[sortedAmounts.length - 1];
  const bandSize = determineBandSize(max);
  const bands: PriceBand[] = [];

  let current = 0;
  while (current < max) {
    const min = current;
    const max_ = current + bandSize;
    const inBand = entries.filter(e => e.price >= min && e.price < max_);

    if (inBand.length > 0) {
      const wins = inBand.filter(e => e.outcome === "win").length;
      const losses = inBand.filter(e => e.outcome === "loss").length;
      const pending = inBand.filter(e => e.outcome === "pending").length;
      const expired = inBand.filter(e => e.outcome === "expired").length;
      const decided = wins + losses;

      bands.push({
        min,
        max: max_,
        label: `${formatActiveUsd(min)}–${formatActiveUsd(max_)}`,
        totalQuotes: inBand.length,
        wins,
        losses,
        pending,
        expired,
        winRate: decided > 0 ? wins / decided : 0,
      });
    }

    current += bandSize;
  }
  return bands;
}

const MONETARY_SCALE = 0.87;
function determineBandSize(maxAmount: number): number {
  if (maxAmount <= 1000 * MONETARY_SCALE) return Math.round(250 * MONETARY_SCALE);
  if (maxAmount <= 5000 * MONETARY_SCALE) return Math.round(500 * MONETARY_SCALE);
  if (maxAmount <= 20000 * MONETARY_SCALE) return Math.round(2500 * MONETARY_SCALE);
  if (maxAmount <= 50000 * MONETARY_SCALE) return Math.round(5000 * MONETARY_SCALE);
  return Math.round(10000 * MONETARY_SCALE);
}

function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return n.toString();
}

/* ------------------------------------------------------------------ */
/*  Step 5: NTE Threshold Analysis (customer-set authorization)        */
/* ------------------------------------------------------------------ */

function buildDispatchAuthAnalysis(jobs: Job[]): DispatchAuthEvent[] {
  return jobs
    .filter(j =>
      j.amountNTE != null &&
      j.amountNTE > 0 &&
      j.totalAmount != null &&
      j.nteWorkflowOutcome != null &&
      !j.qualityFlags.includes("PLACEHOLDER_NTE")
    )
    .map(j => ({
      jobNumber: j.jobNumber,
      customerName: j.customerName,
      jobType: j.jobType,
      region: j.region,
      totalAmount: j.totalAmount!,
      amountNTE: j.amountNTE!,
      revenueToNteRatio: j.totalAmount! / j.amountNTE!,
      workflowOutcome: j.nteWorkflowOutcome!,
      visitCount: j.visitCount,
      daysToComplete: j.timeToCompleteDays,
      margin: j.margin,
    }))
    .sort((a, b) => b.revenueToNteRatio - a.revenueToNteRatio);
}

/* ------------------------------------------------------------------ */
/*  Public API: Compute Everything                                     */
/* ------------------------------------------------------------------ */

export interface DataScope {
  createdFrom: Date;
  createdTo: Date;
  completedFrom: Date | null;
  completedTo: Date | null;
  totalJobs: number;
  stateCount: number;
  states: string[];
}

/* ------------------------------------------------------------------ */
/*  Sales Performance (SF Quotes)                                      */
/* ------------------------------------------------------------------ */

export interface SalesRepProfile {
  name: string;
  totalQuotes: number;
  won: number;
  lost: number;
  expired: number;
  winRate: number;
  avgDaysToConvert: number | null;
  topJobTypes: string[];
  topCustomers: string[];
}

export interface SalesPerformance {
  totalQuotes: number;
  totalConverted: number;
  totalLost: number;
  totalExpired: number;
  overallWinRate: number;
  medianDaysToConvert: number;
  avgDaysToConvert: number;
  p75DaysToConvert: number;
  repProfiles: SalesRepProfile[];
  conversionFunnel: {
    quoted: number;
    converted: number;
    cancelled: number;
    rejected: number;
    expired: number;
  };
}

export interface ComputedData {
  jobs: Job[];
  customers: CustomerAggregate[];
  regions: RegionAggregate[];
  quoteAnalysis: { byJobType: JobTypeQuoteAnalysis[]; atRiskQuotes: AtRiskQuote[] };
  dispatchAuthEvents: DispatchAuthEvent[];
  portfolioSummary: {
    totalJobs: number;
    totalRevenue: number;
    totalMargin: number;
    avgMarginPct: number;
    totalCustomers: number;
    negativeMarginCustomers: number;
    tierCounts: Record<Tier, number>;
    topMarginCustomerPct: number;
    topMarginSharePct: number;
    validated: AggregateMetrics;
  };
  dataQuality: QualitySummary;
  dataScope: DataScope;
  portfolioTrend: TrendSummary | null;
  customerRootCauses: Map<string, RootCauseAnalysis> | null;
  regionRootCauses: Map<string, RootCauseAnalysis> | null;
  prescriptions: Prescription[];
  expansionPrescriptions: ExpansionPrescription[];
  dispatchEfficiency: DispatchEfficiencyReport;
  pricingBandInsights: PricingBandInsight[];
  fuelExposure: PortfolioFuelExposure;
  quotingProfile: {
    totalValidated: number;
    quotedJobs: number;
    nteDispatchJobs: number;
    quotedPct: number;
    dispatchPct: number;
    quoteWinRate: number;
  };
  salesPerformance: SalesPerformance;
}

function buildSalesPerformance(): SalesPerformance {
  const quotes = rawSFQuotes;

  const converted = quotes.filter(q => q.status === "JobAdded");
  const cancelled = quotes.filter(q => q.status === "Cancelled");
  const rejected = quotes.filter(q => q.status === "Rejected");
  const expired = quotes.filter(q => q.status === "Expired");

  const conversionDays: number[] = [];
  for (const q of converted) {
    if (q.createdTimeLocal && q.jobAddedTimeLocal) {
      const created = new Date(q.createdTimeLocal);
      const added = new Date(q.jobAddedTimeLocal);
      const days = (added.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 365) conversionDays.push(days);
    }
  }
  conversionDays.sort((a, b) => a - b);

  const median = conversionDays.length > 0
    ? conversionDays[Math.floor(conversionDays.length / 2)]
    : 0;
  const avg = conversionDays.length > 0
    ? conversionDays.reduce((s, d) => s + d, 0) / conversionDays.length
    : 0;
  const p75 = conversionDays.length > 0
    ? conversionDays[Math.floor(conversionDays.length * 0.75)]
    : 0;

  const decisions = converted.length + rejected.length + expired.length;
  const overallWinRate = decisions > 0 ? converted.length / decisions : 0;

  const repMap = new Map<string, RawSFQuote[]>();
  for (const q of quotes) {
    const rep = q.soldBy ?? "(no rep)";
    if (!repMap.has(rep)) repMap.set(rep, []);
    repMap.get(rep)!.push(q);
  }

  const repProfiles: SalesRepProfile[] = [];
  for (const [name, rQuotes] of repMap) {
    const won = rQuotes.filter(q => q.status === "JobAdded").length;
    const lost = rQuotes.filter(q => q.status === "Cancelled" || q.status === "Rejected").length;
    const exp = rQuotes.filter(q => q.status === "Expired").length;
    const repDecisions = won + lost + exp;
    const winRate = repDecisions > 0 ? won / repDecisions : 0;

    const repConvDays: number[] = [];
    for (const q of rQuotes) {
      if (q.status === "JobAdded" && q.createdTimeLocal && q.jobAddedTimeLocal) {
        const d = (new Date(q.jobAddedTimeLocal).getTime() - new Date(q.createdTimeLocal).getTime()) / (1000 * 60 * 60 * 24);
        if (d >= 0 && d < 365) repConvDays.push(d);
      }
    }
    const avgDays = repConvDays.length > 0
      ? repConvDays.reduce((s, d) => s + d, 0) / repConvDays.length
      : null;

    const deptCounts: Record<string, number> = {};
    const custCounts: Record<string, number> = {};
    for (const q of rQuotes) {
      deptCounts[q.department] = (deptCounts[q.department] || 0) + 1;
      custCounts[q.customerName] = (custCounts[q.customerName] || 0) + 1;
    }

    const topJobTypes = Object.entries(deptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    const topCustomers = Object.entries(custCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    repProfiles.push({
      name: name === "(no rep)" ? "Unassigned" : name,
      totalQuotes: rQuotes.length,
      won,
      lost,
      expired: exp,
      winRate,
      avgDaysToConvert: avgDays,
      topJobTypes,
      topCustomers,
    });
  }

  repProfiles.sort((a, b) => b.totalQuotes - a.totalQuotes);

  return {
    totalQuotes: quotes.length,
    totalConverted: converted.length,
    totalLost: cancelled.length + rejected.length,
    totalExpired: expired.length,
    overallWinRate,
    medianDaysToConvert: Math.round(median * 10) / 10,
    avgDaysToConvert: Math.round(avg * 10) / 10,
    p75DaysToConvert: Math.round(p75 * 10) / 10,
    repProfiles,
    conversionFunnel: {
      quoted: quotes.length,
      converted: converted.length,
      cancelled: cancelled.length,
      rejected: rejected.length,
      expired: expired.length,
    },
  };
}

function buildDataScope(jobs: Job[]): DataScope {
  let createdMin: Date | null = null;
  let createdMax: Date | null = null;
  let completedMin: Date | null = null;
  let completedMax: Date | null = null;
  const statesSet = new Set<string>();

  for (const j of jobs) {
    if (j.createdTime) {
      if (!createdMin || j.createdTime < createdMin) createdMin = j.createdTime;
      if (!createdMax || j.createdTime > createdMax) createdMax = j.createdTime;
    }
    if (j.completedDate) {
      if (!completedMin || j.completedDate < completedMin) completedMin = j.completedDate;
      if (!completedMax || j.completedDate > completedMax) completedMax = j.completedDate;
    }
    if (j.state) statesSet.add(j.state);
  }

  return {
    createdFrom: createdMin ?? new Date(),
    createdTo: createdMax ?? new Date(),
    completedFrom: completedMin,
    completedTo: completedMax,
    totalJobs: jobs.length,
    stateCount: statesSet.size,
    states: [...statesSet].sort(),
  };
}

let _cached: ComputedData | null = null;

export function computeAll(): ComputedData {
  if (_cached) return _cached;

  const jobs = buildJobs();
  const customers = buildCustomerAggregates(jobs);
  const regions = buildRegionAggregates(jobs);
  const quoteAnalysis = buildQuoteAnalysis(jobs);
  const dispatchAuthEvents = buildDispatchAuthAnalysis(jobs);

  const dataQuality = buildQualitySummary(jobs);
  const validJobs = jobs.filter(j => !j.excluded);
  const validatedPortfolio = computeAggregateMetrics(validJobs);

  const sortedByMargin = [...customers]
    .filter(c => c.validated.totalMargin > 0)
    .sort((a, b) => b.validated.totalMargin - a.validated.totalMargin);

  const totalMargin = customers.reduce((s, c) => s + Math.max(0, c.validated.totalMargin), 0);
  let cumulativeMargin = 0;
  let topCount = 0;
  for (const c of sortedByMargin) {
    cumulativeMargin += c.validated.totalMargin;
    topCount++;
    if (cumulativeMargin >= totalMargin * 0.6) break;
  }

  const tierCounts: Record<Tier, number> = { Stars: 0, "Cash Cows": 0, "Question Marks": 0, Dogs: 0 };
  for (const c of customers) tierCounts[c.tier]++;

  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);
  const totalMarginAll = customers.reduce((s, c) => s + c.totalMargin, 0);

  const portfolioSummary = {
    totalJobs: jobs.length,
    totalRevenue,
    totalMargin: totalMarginAll,
    avgMarginPct: totalRevenue > 0 ? totalMarginAll / totalRevenue : 0,
    totalCustomers: customers.length,
    negativeMarginCustomers: customers.filter(c => c.validated.totalMargin < 0).length,
    tierCounts,
    topMarginCustomerPct: customers.length > 0 ? (topCount / customers.length) * 100 : 0,
    topMarginSharePct: 60,
    validated: validatedPortfolio,
  };

  const portfolioTrend = buildPortfolioTrend(jobs);

  const customerRootCauses = buildCustomerRootCauses(customers, jobs);
  const regionRootCauses = buildRegionRootCauses(regions, jobs);
  const prescriptions = customerRootCauses ? buildPrescriptions(customers, jobs, customerRootCauses) : [];
  const expansionPrescriptions = buildExpansionPrescriptions(regions);
  const dispatchEfficiency = buildDispatchEfficiency(jobs);
  const pricingBandInsights = buildPricingBandInsights(quoteAnalysis);
  const fuelExposure = buildFuelAnalysis(jobs);
  const salesPerformance = buildSalesPerformance();
  const dataScope = buildDataScope(jobs);

  // Customer TAM / whitespace — computed first so the scorecard S-factor can
  // use real penetration (currentWallet / totalAddressable).
  const customerTams = buildCustomerTams(customers, dataScope);
  for (const c of customers) c.customerTam = customerTams.get(c.customerName);

  // Simulated AR/DSO profile — attached before scoring so the A-factor reads it.
  const customerAr = buildCustomerAr(customers);
  for (const c of customers) c.arProfile = customerAr.get(c.customerName);

  // CI-04: attach composite Customer Score additively (tier logic unchanged).
  const customerScores = buildCustomerScores(customers, regions, validatedPortfolio.avgMarginPct, dataScope);
  for (const c of customers) c.customerScore = customerScores.get(c.customerName);

  const quotedJobs = validJobs.filter(j => j.quoteStatus === "Quote Approved" || j.quoteStatus === "Quote Rejected" || j.quoteStatus === "Quote Sent" || j.quoteStatus === "Quote Expired");
  const quoteWins = quotedJobs.filter(j => j.quoteStatus === "Quote Approved").length;
  const quoteDecisions = quotedJobs.filter(j => j.quoteStatus === "Quote Approved" || j.quoteStatus === "Quote Rejected" || j.quoteStatus === "Quote Expired").length;
  const nteDispatchJobs = validJobs.filter(j => j.quoteStatus === "No Quotes").length;
  const quotingProfile = {
    totalValidated: validJobs.length,
    quotedJobs: quotedJobs.length,
    nteDispatchJobs,
    quotedPct: validJobs.length > 0 ? quotedJobs.length / validJobs.length : 0,
    dispatchPct: validJobs.length > 0 ? nteDispatchJobs / validJobs.length : 0,
    quoteWinRate: quoteDecisions > 0 ? quoteWins / quoteDecisions : 0,
  };

  _cached = { jobs, customers, regions, quoteAnalysis, dispatchAuthEvents, portfolioSummary, dataQuality, dataScope, portfolioTrend, customerRootCauses, regionRootCauses, prescriptions, expansionPrescriptions, dispatchEfficiency, pricingBandInsights, fuelExposure, quotingProfile, salesPerformance };
  return _cached;
}
