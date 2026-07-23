import { rawJobCost, type RawJobCost } from "./_raw";

/* ------------------------------------------------------------------ */
/*  Cost Line Classification                                           */
/* ------------------------------------------------------------------ */

export type CostLineCategory =
  | "labor"
  | "material"
  | "flatFee"
  | "creditReturn"
  | "equipment"
  | "unknown";

export interface ClassifiedCostLine {
  jobNumber: number;
  category: CostLineCategory;
  markupPercentage: number | null;
  expectedRevenue: number | null;
  unitCost: number | null;
  quantity: number | null;
  lineCost: number | null;
}

export interface CostBreakdown {
  laborCost: number;
  laborHours: number;
  avgLaborRate: number;
  materialCost: number;
  materialMarkupAvg: number;
  flatFeeRevenue: number;
  creditAmount: number;
  equipmentCost: number;
  totalLineCost: number;
  lineCount: number;
  lines: ClassifiedCostLine[];
}

const SCALE = 0.87;
const LABOR_RATE_MIN = Math.round(20 * SCALE);
const LABOR_RATE_MAX = Math.round(55 * SCALE);
const EQUIPMENT_MARKUP_CEILING = 100;
const EQUIPMENT_UNIT_COST_FLOOR = Math.round(100 * SCALE);

/* ------------------------------------------------------------------ */
/*  Classification                                                     */
/* ------------------------------------------------------------------ */

function classifyLine(raw: RawJobCost): ClassifiedCostLine {
  const { markupPercentage, unitCost, quantity, lineCost, expectedRevenue } = raw;
  let category: CostLineCategory = "unknown";

  if (markupPercentage === -100) {
    category = "creditReturn";
  } else if (
    markupPercentage != null &&
    markupPercentage > 0 &&
    unitCost != null &&
    unitCost >= EQUIPMENT_UNIT_COST_FLOOR &&
    markupPercentage <= EQUIPMENT_MARKUP_CEILING
  ) {
    category = "equipment";
  } else if (markupPercentage != null && markupPercentage > 0) {
    category = "material";
  } else if (
    markupPercentage == null &&
    unitCost != null &&
    unitCost >= LABOR_RATE_MIN &&
    unitCost <= LABOR_RATE_MAX &&
    quantity != null &&
    quantity > 0
  ) {
    category = "labor";
  } else if (
    (unitCost == null || unitCost === 0) &&
    (lineCost == null || lineCost === 0) &&
    expectedRevenue != null &&
    expectedRevenue > 0
  ) {
    category = "flatFee";
  }

  return {
    jobNumber: raw.jobNumber,
    category,
    markupPercentage: raw.markupPercentage,
    expectedRevenue: raw.expectedRevenue,
    unitCost: raw.unitCost,
    quantity: raw.quantity,
    lineCost: raw.lineCost,
  };
}

/* ------------------------------------------------------------------ */
/*  Per-Job Rollup                                                     */
/* ------------------------------------------------------------------ */

function rollup(lines: ClassifiedCostLine[]): CostBreakdown {
  let laborCost = 0;
  let laborHours = 0;
  let materialCost = 0;
  let materialMarkupSum = 0;
  let materialMarkupCount = 0;
  let flatFeeRevenue = 0;
  let creditAmount = 0;
  let equipmentCost = 0;
  let totalLineCost = 0;

  for (const l of lines) {
    const cost = l.lineCost ?? 0;
    totalLineCost += cost;

    switch (l.category) {
      case "labor":
        laborCost += cost;
        laborHours += l.quantity ?? 0;
        break;
      case "material":
        materialCost += cost;
        if (l.markupPercentage != null) {
          materialMarkupSum += l.markupPercentage;
          materialMarkupCount++;
        }
        break;
      case "equipment":
        equipmentCost += cost;
        break;
      case "flatFee":
        flatFeeRevenue += l.expectedRevenue ?? 0;
        break;
      case "creditReturn":
        creditAmount += cost;
        break;
    }
  }

  const avgLaborRate = laborHours > 0 ? laborCost / laborHours : 0;
  const materialMarkupAvg = materialMarkupCount > 0 ? materialMarkupSum / materialMarkupCount : 0;

  return {
    laborCost,
    laborHours,
    avgLaborRate,
    materialCost,
    materialMarkupAvg,
    flatFeeRevenue,
    creditAmount,
    equipmentCost,
    totalLineCost,
    lineCount: lines.length,
    lines,
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function buildCostBreakdowns(): Map<number, CostBreakdown> {
  const byJob = new Map<number, ClassifiedCostLine[]>();

  for (const raw of rawJobCost) {
    const classified = classifyLine(raw);
    const arr = byJob.get(raw.jobNumber) || [];
    arr.push(classified);
    byJob.set(raw.jobNumber, arr);
  }

  const result = new Map<number, CostBreakdown>();
  for (const [jobNumber, lines] of byJob) {
    result.set(jobNumber, rollup(lines));
  }

  return result;
}
