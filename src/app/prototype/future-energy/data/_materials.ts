/* ------------------------------------------------------------------ */
/*  BLS PPI — HVAC/Refrigeration Equipment + Key Trade Commodities     */
/*  Input-cost indices for commercial field-services procurement       */
/*                                                                     */
/*  Sources:                                                           */
/*   - BLS PPI by Industry: Air-Conditioning, Refrigeration, and       */
/*     Forced Air Heating Equipment Manufacturing (PCU333415333415),   */
/*     Index Dec 1982=100, NSA.                                        */
/*     https://fred.stlouisfed.org/series/PCU333415333415              */
/*   - Copper: CME/COMEX next-active contract, USD/lb.                 */
/*     https://tradingeconomics.com/commodity/copper                   */
/*   - Steel: CRU US Midwest Hot-Rolled Coil (HRC), USD/short ton.     */
/*     https://www.crugroup.com/en/data/prices-and-indices/steel-prices*/
/*   - Refrigerant (R-410A reclaimed + A2L R-454B/R-32 service stock), */
/*     national distributor/service USD/lb. ACHR News / ACDirect 2026. */
/*                                                                     */
/*  Data vintage: Aug 2025 - Apr 2026 (monthly).                       */
/*  Cross-verified: ycharts (PPI 315.69 Apr-2026, +3.84% YoY),         */
/*  Steel Market Update (HRC ~$1,105/st Jun-2026), Argus/JPMorgan      */
/*  (copper ~$6.20/lb Apr-2026). Refrigerant per-lb levels are         */
/*  national wholesale midpoints (MEDIUM confidence — wide regional    */
/*  dispersion; see notes).                                            */
/* ------------------------------------------------------------------ */

import type { Region } from "./_regions";

export interface MaterialPoint {
  /** YYYY-MM */
  month: string;
  /** Index value or price in the commodity's native unit. */
  value: number;
}

export interface MaterialSeries {
  key: MaterialKey;
  label: string;
  unit: string;
  source: string;
  /** Confidence in the encoded levels. */
  confidence: "high" | "medium" | "low";
  points: MaterialPoint[];
  notes: string;
}

export type MaterialKey =
  | "hvacEquipmentPPI"
  | "copper"
  | "steelHRC"
  | "refrigerantR410A"
  | "refrigerantA2L";

/* ------------------------------------------------------------------ */
/*  National monthly series (cohort window: 2025-08 .. 2026-04)        */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04",
];

function series(values: number[]): MaterialPoint[] {
  return MONTHS.map((month, i) => ({ month, value: values[i] }));
}

export const materialSeries: Record<MaterialKey, MaterialSeries> = {
  hvacEquipmentPPI: {
    key: "hvacEquipmentPPI",
    label: "HVAC/Refrigeration Equipment PPI",
    unit: "Index (Dec 1982=100, NSA)",
    source: "BLS PPI PCU333415333415 (via FRED / ycharts)",
    confidence: "high",
    points: series([312.60, 309.83, 311.97, 312.29, 311.87, 313.04, 313.48, 313.79, 315.69]),
    notes: "Selling prices received by domestic AC/refrigeration/heating-equipment manufacturers — upstream cost pressure, not retail. +3.8% YoY into Apr 2026; tariffs and metal costs driving a renewed inflation cycle distributors pass through.",
  },
  copper: {
    key: "copper",
    label: "Copper (COMEX next-active)",
    unit: "USD / lb",
    source: "CME/COMEX (via Trading Economics / Argus)",
    confidence: "high",
    points: series([4.45, 4.65, 4.95, 5.20, 5.55, 6.10, 5.85, 5.95, 6.20]),
    notes: "Core input for tubing, coils, wiring and motors. Fell to €8.82/kg (source USD $4.35/lb) on the Aug-2025 semis-tariff exemption, then climbed to €13.18/kg (source USD $6.50/lb) in Jan-2026. Section 232 semis at 50% since Apr 2026 keeps US prices elevated. EUR at USD 1 = EUR 0.92 (21 August 2026).",
  },
  steelHRC: {
    key: "steelHRC",
    label: "Steel (CRU US Midwest HRC)",
    unit: "USD / short ton",
    source: "CRU US Midwest Hot-Rolled Coil (via Steel Market Update)",
    confidence: "high",
    points: series([820, 850, 875, 895, 908, 945, 975, 1002, 1040]),
    notes: "Sheet steel for ductwork, cabinets, RTU frames and structural supports. Supply-constrained climb (not demand-led) under 50% Section 232 tariffs; crossed €1,014/tonne (source USD $1,000/short ton) in Mar 2026. EUR at USD 1 = EUR 0.92 (21 August 2026).",
  },
  refrigerantR410A: {
    key: "refrigerantR410A",
    label: "Refrigerant R-410A (legacy, reclaimed/wholesale)",
    unit: "USD / lb",
    source: "ACHR News / ACDirect 2026 (national wholesale midpoint)",
    confidence: "medium",
    points: series([14.0, 15.0, 16.5, 18.0, 19.5, 21.0, 23.0, 25.0, 27.0]),
    notes: "GWP-2088 HFC blend, banned for new equipment manufacture under the AIM Act. Series midpoint moved from €28.40/kg to €54.76/kg (source USD $14/lb to $27/lb). Dispersion €30.42–€91.27/kg (source USD $15–$45/lb). EUR at USD 1 = EUR 0.92 (21 August 2026).",
  },
  refrigerantA2L: {
    key: "refrigerantA2L",
    label: "Refrigerant A2L (R-454B / R-32 service stock)",
    unit: "USD / lb",
    source: "BTU Size / Call Mattioni 2026 (R-454B service-stock midpoint)",
    confidence: "medium",
    points: series([21.0, 20.5, 20.0, 19.5, 19.0, 18.5, 18.5, 18.0, 18.0]),
    notes: "Low-GWP A2L replacements (R-454B GWP-466, R-32 GWP-675) now standard in new equipment. Early-transition scarcity premium easing as production scales, but A2L will not return to pre-AIM R-410A levels. Watsco reported ~15% price realization on A2L products.",
  },
};

/* ------------------------------------------------------------------ */
/*  Per-region material-cost adjustment factor                         */
/*  Multiplier on national input cost: freight, local distribution,    */
/*  tariff exposure and coastal/remote market premiums.                */
/* ------------------------------------------------------------------ */

export const regionMaterialAdjustment: Record<Region, number> = {
  RW: 1.04,
  RS: 1.08,
  RC: 1.02,
  RE: 0.98,
  RN: 1.03,
  RM: 1.05,
};

export const regionMaterialNotes: Record<Region, string> = {
  RW: "Landed-cost multiplier 1.04 vs national 1.00.",
  RS: "Landed-cost multiplier 1.08, the highest in this set.",
  RC: "Landed-cost multiplier 1.02 vs national 1.00.",
  RE: "Landed-cost multiplier 0.98, the lowest in this set.",
  RN: "Landed-cost multiplier 1.03 vs national 1.00.",
  RM: "Landed-cost multiplier 1.05 vs national 1.00.",
};

/* ------------------------------------------------------------------ */
/*  Public API (mirrors _eia summary shape)                            */
/* ------------------------------------------------------------------ */

export interface MaterialSummary {
  key: MaterialKey;
  label: string;
  unit: string;
  baselineAvg: number;
  recentAvg: number;
  latestValue: number;
  deltaFromBaseline: number;
  deltaPct: number;
  confidence: "high" | "medium" | "low";
}

function summarize(s: MaterialSeries, adjustment = 1): MaterialSummary {
  const pts = s.points;
  const baseline = pts.slice(0, 3);
  const recent = pts.slice(-3);
  const baselineAvg = (baseline.reduce((a, p) => a + p.value, 0) / baseline.length) * adjustment;
  const recentAvg = (recent.reduce((a, p) => a + p.value, 0) / recent.length) * adjustment;
  const latestValue = (pts[pts.length - 1]?.value ?? recentAvg / adjustment) * adjustment;
  return {
    key: s.key,
    label: s.label,
    unit: s.unit,
    baselineAvg,
    recentAvg,
    latestValue,
    deltaFromBaseline: recentAvg - baselineAvg,
    deltaPct: baselineAvg > 0 ? (recentAvg - baselineAvg) / baselineAvg : 0,
    confidence: s.confidence,
  };
}

/** National input-cost summary for every tracked commodity/index. */
export function getMaterialsSummary(): MaterialSummary[] {
  return (Object.keys(materialSeries) as MaterialKey[]).map(k => summarize(materialSeries[k]));
}

/** Single-commodity national summary. */
export function getMaterialSummary(key: MaterialKey): MaterialSummary {
  return summarize(materialSeries[key]);
}

/**
 * Region-adjusted input-cost summary. Applies the regional freight/market
 * multiplier so price levels reflect what a division actually pays, while
 * deltaPct (the trend) is unchanged by the multiplier.
 */
export function getMaterialCostForRegion(region: Region): {
  region: Region;
  adjustment: number;
  notes: string;
  materials: MaterialSummary[];
} {
  const adjustment = regionMaterialAdjustment[region];
  return {
    region,
    adjustment,
    notes: regionMaterialNotes[region],
    materials: (Object.keys(materialSeries) as MaterialKey[]).map(k => summarize(materialSeries[k], adjustment)),
  };
}

/** Blended input-cost pressure (avg deltaPct across commodities) for quick signals. */
export function getMaterialCostPressure(): { avgDeltaPct: number; hottest: MaterialSummary } {
  const all = getMaterialsSummary();
  const avgDeltaPct = all.reduce((a, m) => a + m.deltaPct, 0) / all.length;
  const hottest = [...all].sort((a, b) => b.deltaPct - a.deltaPct)[0];
  return { avgDeltaPct, hottest };
}
