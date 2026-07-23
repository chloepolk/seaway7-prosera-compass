import type { Job } from "./_transform";

/* ------------------------------------------------------------------ */
/*  Quality Flags                                                      */
/* ------------------------------------------------------------------ */

export type QualityFlag =
  | "PLACEHOLDER_NTE"
  | "MISSING_COST"
  | "MISSING_JOB_TYPE"
  | "STRUCTURAL_LOSS"
  | "SCOPE_ESCALATION"
  | "INCOMPLETE_BILLING"
  | "EXTREME_NTE_UTIL"
  | "IMPLAUSIBLE_MARGIN"
  | "COST_UNDERPOST"
  | "OPEN_INVOICED"
  | "OPEN_UNBILLED";

export interface ValidationResult {
  flags: QualityFlag[];
  excluded: boolean;
  excludeReason?: string;
}

const EXCLUSION_FLAGS: Set<QualityFlag> = new Set([
  "PLACEHOLDER_NTE",
  "MISSING_COST",
  "IMPLAUSIBLE_MARGIN",
  "COST_UNDERPOST",
  "OPEN_UNBILLED",
]);

const SCALE = 0.87;
const PLACEHOLDER_NTE_CEILING = Math.round(10 * SCALE);
const MIN_LABOR_HOUR_COST = Math.round(27 * SCALE);
const IMPLAUSIBLE_MARGIN_FLOOR = 0.85;
const IMPLAUSIBLE_REVENUE_FLOOR = Math.round(500 * SCALE);
const COST_UNDERPOST_RATIO = 0.15;

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

export function validateJob(job: Job): ValidationResult {
  const flags: QualityFlag[] = [];

  if (
    job.amountNTE != null &&
    job.amountNTE > 0 &&
    job.amountNTE < PLACEHOLDER_NTE_CEILING
  ) {
    flags.push("PLACEHOLDER_NTE");
  }

  if (
    job.amountNTE != null &&
    job.amountNTE >= PLACEHOLDER_NTE_CEILING &&
    job.amountNTE < MIN_LABOR_HOUR_COST
  ) {
    flags.push("STRUCTURAL_LOSS");
  }

  if (
    job.totalAmount != null &&
    job.totalAmount > 0 &&
    (job.actualCost === null || job.actualCost === 0)
  ) {
    flags.push("MISSING_COST");
  }

  if (!job.jobType || job.jobType.trim() === "") {
    flags.push("MISSING_JOB_TYPE");
  }

  if (
    job.amountNTE != null &&
    job.amountNTE >= MIN_LABOR_HOUR_COST &&
    job.actualCost != null &&
    job.actualCost > job.amountNTE
  ) {
    flags.push("SCOPE_ESCALATION");
  }

  if (
    job.totalAmount != null &&
    job.totalAmount > IMPLAUSIBLE_REVENUE_FLOOR &&
    job.actualCost != null &&
    job.actualCost > 0 &&
    job.marginPct != null &&
    job.marginPct > IMPLAUSIBLE_MARGIN_FLOOR
  ) {
    flags.push("IMPLAUSIBLE_MARGIN");
  }

  if (
    job.estimatedCost != null &&
    job.estimatedCost > Math.round(100 * SCALE) &&
    job.actualCost != null &&
    job.actualCost < job.estimatedCost * COST_UNDERPOST_RATIO
  ) {
    flags.push("COST_UNDERPOST");
  }

  if (
    job.jobStatus === "Open" &&
    job.billingStatus === "FullyInvoiced"
  ) {
    flags.push("OPEN_INVOICED");
  }

  if (
    job.billingStatus &&
    job.billingStatus !== "FullyInvoiced" &&
    job.jobStatus === "Complete"
  ) {
    flags.push("INCOMPLETE_BILLING");
  }

  if (
    job.jobStatus !== "Complete" &&
    job.jobStatus !== "Canceled" &&
    job.actualCost != null &&
    job.actualCost > Math.round(200 * SCALE) &&
    (job.totalAmount == null || job.totalAmount === 0)
  ) {
    flags.push("OPEN_UNBILLED");
  }

  if (job.nteUtilization != null && job.nteUtilization > 10) {
    flags.push("EXTREME_NTE_UTIL");
  }

  const excluded = flags.some(f => EXCLUSION_FLAGS.has(f));
  let excludeReason: string | undefined;
  if (excluded) {
    const reasons: string[] = [];
    if (flags.includes("PLACEHOLDER_NTE")) {
      reasons.push("NTE value is a placeholder");
    }
    if (flags.includes("MISSING_COST")) {
      reasons.push("actual cost is zero/missing — margin cannot be computed");
    }
    if (flags.includes("IMPLAUSIBLE_MARGIN")) {
      reasons.push(`margin of ${((job.marginPct ?? 0) * 100).toFixed(0)}% on ${job.totalAmount ? "$" + job.totalAmount.toLocaleString() : "N/A"} revenue is implausible — costs likely incomplete`);
    }
    if (flags.includes("COST_UNDERPOST")) {
      reasons.push(`only ${job.actualCost ? "$" + job.actualCost.toFixed(0) : "$0"} of estimated $${(job.estimatedCost ?? 0).toFixed(0)} cost posted (${job.estimatedCost && job.estimatedCost > 0 ? ((job.actualCost ?? 0) / job.estimatedCost * 100).toFixed(0) : "0"}%)`);
    }
    if (flags.includes("OPEN_UNBILLED")) {
      reasons.push(`open job with $${(job.actualCost ?? 0).toLocaleString()} cost posted but no revenue — work in progress, not a realized loss`);
    }
    excludeReason = reasons.join("; ");
  }

  return { flags, excluded, excludeReason };
}

/* ------------------------------------------------------------------ */
/*  Quality Summary                                                    */
/* ------------------------------------------------------------------ */

export interface QualitySummary {
  totalJobs: number;
  excludedJobs: number;
  flaggedJobs: number;
  flags: Record<QualityFlag, number>;
}

export function buildQualitySummary(
  jobs: Array<{ qualityFlags: QualityFlag[]; excluded: boolean }>
): QualitySummary {
  const flags: Record<QualityFlag, number> = {
    PLACEHOLDER_NTE: 0,
    MISSING_COST: 0,
    MISSING_JOB_TYPE: 0,
    STRUCTURAL_LOSS: 0,
    SCOPE_ESCALATION: 0,
    INCOMPLETE_BILLING: 0,
    EXTREME_NTE_UTIL: 0,
    IMPLAUSIBLE_MARGIN: 0,
    COST_UNDERPOST: 0,
    OPEN_INVOICED: 0,
    OPEN_UNBILLED: 0,
  };

  let excludedJobs = 0;
  let flaggedJobs = 0;

  for (const job of jobs) {
    if (job.excluded) excludedJobs++;
    if (job.qualityFlags.length > 0) flaggedJobs++;
    for (const f of job.qualityFlags) {
      flags[f]++;
    }
  }

  return { totalJobs: jobs.length, excludedJobs, flaggedJobs, flags };
}
