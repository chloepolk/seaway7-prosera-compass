/* ------------------------------------------------------------------ */
/*  NOAA — Monthly Heating & Cooling Degree-Day Normals by Region      */
/*  Climatology baseline (NOT the extreme-event layer in _weather.ts)  */
/*                                                                     */
/*  Source: NOAA NCEI 1991-2020 U.S. Climate Normals — monthly         */
/*  population-weighted Heating/Cooling Degree Days (base 65 F).        */
/*  https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals */
/*                                                                     */
/*  Data vintage: 1991-2020 Normals (current NOAA normals period).     */
/*  Each region's 12-month profile is built from representative NCEI    */
/*  stations matching the region's climate identity in _weather.ts     */
/*  (e.g. mild-coastal, hot-humid, cold-continental). Regional          */
/*  aggregation is an estimate (MEDIUM confidence on exact totals);     */
/*  monthly SHAPE and annual magnitudes track published station         */
/*  normals. Use this for steady-state seasonal demand; use _weather.ts */
/*  for cohort-window anomalies and severe-weather demand spikes.       */
/* ------------------------------------------------------------------ */

import type { Region } from "./_regions";
import { regionLabels } from "./_regions";

export interface DegreeDayMonth {
  /** Calendar month index, 1-12. */
  month: number;
  /** Three-letter month label. */
  label: string;
  /** Heating Degree Days, base 65 F (winter heating demand). */
  hdd: number;
  /** Cooling Degree Days, base 65 F (summer cooling demand). */
  cdd: number;
}

export interface RegionDegreeDayProfile {
  region: Region;
  regionLabel: string;
  /** Representative NOAA station/climate basis for the normals. */
  climateBasis: string;
  annualHDD: number;
  annualCDD: number;
  /** Dominant load as a 0-1 cooling share (1 = all cooling). */
  coolingShare: number;
  monthly: DegreeDayMonth[];
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function buildMonthly(hdd: number[], cdd: number[]): DegreeDayMonth[] {
  return MONTH_LABELS.map((label, i) => ({
    month: i + 1,
    label,
    hdd: hdd[i],
    cdd: cdd[i],
  }));
}

/* HDD/CDD arrays are Jan -> Dec. */
const RAW: Record<Region, { climateBasis: string; hdd: number[]; cdd: number[] }> = {
  RW: {
    climateBasis: "Mild coastal / Mediterranean — narrow annual swing (e.g. LA Basin coastal normals)",
    hdd: [300, 250, 210, 120, 45, 5, 0, 0, 10, 80, 180, 280],
    cdd: [10, 15, 40, 90, 160, 240, 320, 320, 250, 140, 40, 10],
  },
  RC: {
    climateBasis: "Inland valley — hot summers, cool winters (e.g. Central Valley / interior-Southwest normals)",
    hdd: [380, 290, 200, 90, 25, 0, 0, 0, 5, 60, 220, 360],
    cdd: [0, 5, 30, 110, 250, 430, 560, 540, 380, 170, 30, 0],
  },
  RS: {
    climateBasis: "Hot-humid — long cooling season (e.g. western Gulf-coast normals)",
    hdd: [180, 130, 70, 20, 0, 0, 0, 0, 0, 10, 80, 170],
    cdd: [40, 70, 150, 270, 420, 540, 600, 590, 450, 290, 120, 50],
  },
  RE: {
    climateBasis: "Humid continental — four-season swing (e.g. mid-Atlantic / Ohio Valley normals)",
    hdd: [1050, 880, 700, 360, 140, 20, 0, 5, 60, 280, 600, 950],
    cdd: [0, 0, 5, 30, 130, 300, 420, 390, 200, 40, 5, 0],
  },
  RN: {
    climateBasis: "Cold continental — severe winters (e.g. Upper-Midwest / northern-Rockies normals)",
    hdd: [1500, 1230, 1010, 580, 290, 90, 20, 35, 180, 510, 960, 1380],
    cdd: [0, 0, 0, 5, 60, 180, 300, 250, 90, 10, 0, 0],
  },
  RM: {
    climateBasis: "High-desert / mountain — wide diurnal swing (e.g. interior-mountain corridor normals)",
    hdd: [1150, 920, 780, 480, 230, 50, 5, 10, 120, 420, 780, 1080],
    cdd: [0, 0, 10, 30, 110, 250, 360, 320, 160, 30, 0, 0],
  },
};

const PROFILES: Record<Region, RegionDegreeDayProfile> = (Object.keys(RAW) as Region[]).reduce(
  (acc, region) => {
    const { climateBasis, hdd, cdd } = RAW[region];
    const annualHDD = hdd.reduce((a, b) => a + b, 0);
    const annualCDD = cdd.reduce((a, b) => a + b, 0);
    const denom = annualHDD + annualCDD;
    acc[region] = {
      region,
      regionLabel: regionLabels[region],
      climateBasis,
      annualHDD,
      annualCDD,
      coolingShare: denom > 0 ? annualCDD / denom : 0,
      monthly: buildMonthly(hdd, cdd),
    };
    return acc;
  },
  {} as Record<Region, RegionDegreeDayProfile>,
);

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Full 12-month HDD/CDD normals profile for a region. */
export function getDegreeDaysForRegion(region: Region): RegionDegreeDayProfile {
  return PROFILES[region];
}

/** Normals for a single calendar month (1-12) in a region. */
export function getDegreeDayMonth(region: Region, month: number): DegreeDayMonth | null {
  return PROFILES[region].monthly.find(m => m.month === month) ?? null;
}

/** Climate load classification from the annual cooling share. */
export function getLoadProfile(region: Region): "cooling-led" | "heating-led" | "balanced" {
  const share = PROFILES[region].coolingShare;
  if (share >= 0.6) return "cooling-led";
  if (share <= 0.4) return "heating-led";
  return "balanced";
}

/** Portfolio roll-up of degree-day normals across all regions. */
export function getPortfolioDegreeDays(): {
  byRegion: RegionDegreeDayProfile[];
  coolingDominant: Region[];
  heatingDominant: Region[];
} {
  const regions: Region[] = ["RW", "RC", "RS", "RE", "RN", "RM"];
  const byRegion = regions.map(getDegreeDaysForRegion);
  return {
    byRegion,
    coolingDominant: byRegion.filter(p => p.coolingShare >= 0.5).map(p => p.region),
    heatingDominant: byRegion.filter(p => p.coolingShare < 0.5).map(p => p.region),
  };
}
