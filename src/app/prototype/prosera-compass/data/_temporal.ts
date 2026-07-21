import type { Job } from "./_transform";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TrendDirection = "improving" | "declining" | "stable";

export interface MonthlyBucket {
  month: string;
  jobCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  avgMarginPct: number;
  avgTicket: number;
}

export interface TrendSummary {
  direction: TrendDirection;
  recentMonthlyMargin: number;
  priorMonthlyMargin: number;
  delta: number;
  monthCount: number;
  buckets: MonthlyBucket[];
}

/* ------------------------------------------------------------------ */
/*  Monthly Bucketing                                                  */
/* ------------------------------------------------------------------ */

const MIN_JOBS_PER_MONTH = 5;

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyBuckets(jobs: Job[]): MonthlyBucket[] {
  const byMonth = new Map<string, Job[]>();

  for (const j of jobs) {
    if (!j.completedDate || j.excluded) continue;
    const key = toMonthKey(j.completedDate);
    const arr = byMonth.get(key) || [];
    arr.push(j);
    byMonth.set(key, arr);
  }

  const buckets: MonthlyBucket[] = [];
  for (const [month, monthJobs] of byMonth) {
    if (monthJobs.length < MIN_JOBS_PER_MONTH) continue;

    const totalRevenue = monthJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
    const totalCost = monthJobs.reduce((s, j) => s + (j.actualCost || 0), 0);
    const totalMargin = totalRevenue - totalCost;
    const withRevenue = monthJobs.filter(j => j.totalAmount != null && j.totalAmount > 0);

    buckets.push({
      month,
      jobCount: monthJobs.length,
      totalRevenue,
      totalCost,
      totalMargin,
      avgMarginPct: totalRevenue > 0 ? totalMargin / totalRevenue : 0,
      avgTicket: withRevenue.length > 0 ? totalRevenue / withRevenue.length : 0,
    });
  }

  return buckets.sort((a, b) => a.month.localeCompare(b.month));
}

/* ------------------------------------------------------------------ */
/*  Trend Computation                                                  */
/* ------------------------------------------------------------------ */

function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  return den !== 0 ? num / den : 0;
}

export function computeTrend(buckets: MonthlyBucket[]): TrendSummary | null {
  if (buckets.length < 2) return null;

  const recent = buckets.slice(-3);
  const margins = recent.map(b => b.avgMarginPct);
  const slope = linearSlope(margins);

  const recentBucket = buckets[buckets.length - 1];
  const priorBucket = buckets[buckets.length - 2];

  const SLOPE_THRESHOLD = 0.02;
  let direction: TrendDirection = "stable";
  if (slope > SLOPE_THRESHOLD) direction = "improving";
  else if (slope < -SLOPE_THRESHOLD) direction = "declining";

  return {
    direction,
    recentMonthlyMargin: recentBucket.avgMarginPct,
    priorMonthlyMargin: priorBucket.avgMarginPct,
    delta: recentBucket.avgMarginPct - priorBucket.avgMarginPct,
    monthCount: buckets.length,
    buckets,
  };
}

/* ------------------------------------------------------------------ */
/*  Scoped Trend Builders                                              */
/* ------------------------------------------------------------------ */

export function buildPortfolioTrend(jobs: Job[]): TrendSummary | null {
  return computeTrend(buildMonthlyBuckets(jobs));
}

export function buildScopedTrend(jobs: Job[], filterFn: (j: Job) => boolean): TrendSummary | null {
  const filtered = jobs.filter(filterFn);
  const buckets = buildMonthlyBuckets(filtered);
  return computeTrend(buckets);
}
