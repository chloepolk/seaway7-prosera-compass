/* ------------------------------------------------------------------ */
/*  Census Bureau Building Permits Survey                              */
/*  New Privately-Owned Housing Units Authorized by Metro              */
/*                                                                     */
/*  Source: U.S. Census Bureau, Building Permits Survey (BPS)          */
/*  https://www.census.gov/construction/bps/msamonthly.html            */
/*                                                                     */
/*  Data vintage: Annual 2022, 2023, 2024                              */
/*  Cross-verified with Census Bureau interactive visualization        */
/* ------------------------------------------------------------------ */

export interface PermitSnapshot {
  year: number;
  totalPermits: number;
  singleFamily: number;
  multiFamilyTwoToFour: number;
  multiFamilyFivePlus: number;
}

export interface MetroPermitProfile {
  metroArea: string;
  metroCode: string;
  state: string;
  silverStateRegion: "RW" | "RS" | "RC" | "RE" | "RN" | "RM";
  snapshots: PermitSnapshot[];
  twoYearChangePct: number;
  constructionActivityLevel: "high" | "moderate" | "low" | "declining";
  notes: string;
}

export const nationalPermits: PermitSnapshot[] = [
  { year: 2022, totalPermits: 1665100, singleFamily: 1006200, multiFamilyTwoToFour: 24800, multiFamilyFivePlus: 634100 },
  { year: 2023, totalPermits: 1475800, singleFamily: 949800, multiFamilyTwoToFour: 22400, multiFamilyFivePlus: 503600 },
  { year: 2024, totalPermits: 1493000, singleFamily: 992800, multiFamilyTwoToFour: 23600, multiFamilyFivePlus: 476600 },
];

export const metroPermitProfiles: MetroPermitProfile[] = [
  {
    metroArea: "Metro West-1",
    metroCode: "29820",
    state: "RW",
    silverStateRegion: "RW",
    snapshots: [
      { year: 2022, totalPermits: 22840, singleFamily: 15620, multiFamilyTwoToFour: 280, multiFamilyFivePlus: 6940 },
      { year: 2023, totalPermits: 18950, singleFamily: 14280, multiFamilyTwoToFour: 240, multiFamilyFivePlus: 4430 },
      { year: 2024, totalPermits: 20180, singleFamily: 15100, multiFamilyTwoToFour: 260, multiFamilyFivePlus: 4820 },
    ],
    twoYearChangePct: -0.116,
    constructionActivityLevel: "high",
    notes: "Permits fell from 22,840 in 2022 to 20,180 in 2024 (−11.6%). Multifamily five-plus units fell from 6,940 to 4,820. Single-family fell from 15,620 to 15,100. No hospitality-construction series is in this dataset.",
  },
  {
    metroArea: "Metro West-2",
    metroCode: "39900",
    state: "RW",
    silverStateRegion: "RW",
    snapshots: [
      { year: 2022, totalPermits: 5420, singleFamily: 3680, multiFamilyTwoToFour: 80, multiFamilyFivePlus: 1660 },
      { year: 2023, totalPermits: 4180, singleFamily: 2940, multiFamilyTwoToFour: 60, multiFamilyFivePlus: 1180 },
      { year: 2024, totalPermits: 4850, singleFamily: 3420, multiFamilyTwoToFour: 70, multiFamilyFivePlus: 1360 },
    ],
    twoYearChangePct: -0.105,
    constructionActivityLevel: "moderate",
    notes: "Permits fell from 5,420 in 2022 to 4,850 in 2024 (−10.5%). 2024 is up from 4,180 in 2023. No warehouse/logistics permit series is in this dataset.",
  },
  {
    metroArea: "Metro South-1",
    metroCode: "31080",
    state: "RS",
    silverStateRegion: "RS",
    snapshots: [
      { year: 2022, totalPermits: 31200, singleFamily: 8400, multiFamilyTwoToFour: 1200, multiFamilyFivePlus: 21600 },
      { year: 2023, totalPermits: 24800, singleFamily: 7200, multiFamilyTwoToFour: 980, multiFamilyFivePlus: 16620 },
      { year: 2024, totalPermits: 22400, singleFamily: 6800, multiFamilyTwoToFour: 900, multiFamilyFivePlus: 14700 },
    ],
    twoYearChangePct: -0.282,
    constructionActivityLevel: "declining",
    notes: "Permits fell from 31,200 in 2022 to 22,400 in 2024 (−28.2%). Single-family fell from 8,400 to 6,800. Multifamily five-plus fell from 21,600 to 14,700. No interest-rate or zoning series is in this dataset.",
  },
  {
    metroArea: "Metro South-2",
    metroCode: "12540",
    state: "RS",
    silverStateRegion: "RS",
    snapshots: [
      { year: 2022, totalPermits: 4200, singleFamily: 3600, multiFamilyTwoToFour: 120, multiFamilyFivePlus: 480 },
      { year: 2023, totalPermits: 3400, singleFamily: 2900, multiFamilyTwoToFour: 100, multiFamilyFivePlus: 400 },
      { year: 2024, totalPermits: 3600, singleFamily: 3100, multiFamilyTwoToFour: 110, multiFamilyFivePlus: 390 },
    ],
    twoYearChangePct: -0.143,
    constructionActivityLevel: "moderate",
    notes: "Permits fell from 4,200 in 2022 to 3,600 in 2024 (−14.3%). 2024 is up from 3,400 in 2023.",
  },
  {
    metroArea: "Metro Central-1",
    metroCode: "38060",
    state: "RC",
    silverStateRegion: "RC",
    snapshots: [
      { year: 2022, totalPermits: 47800, singleFamily: 30200, multiFamilyTwoToFour: 600, multiFamilyFivePlus: 17000 },
      { year: 2023, totalPermits: 42600, singleFamily: 28400, multiFamilyTwoToFour: 520, multiFamilyFivePlus: 13680 },
      { year: 2024, totalPermits: 46200, singleFamily: 31800, multiFamilyTwoToFour: 580, multiFamilyFivePlus: 13820 },
    ],
    twoYearChangePct: -0.033,
    constructionActivityLevel: "high",
    notes: "Permits fell from 47,800 in 2022 to 46,200 in 2024 (−3.3%). 2024 is up from 42,600 in 2023. Single-family rose from 30,200 to 31,800. No US metro rank is in this dataset.",
  },
  {
    metroArea: "Metro Central-2",
    metroCode: "46060",
    state: "RC",
    silverStateRegion: "RC",
    snapshots: [
      { year: 2022, totalPermits: 8200, singleFamily: 5800, multiFamilyTwoToFour: 140, multiFamilyFivePlus: 2260 },
      { year: 2023, totalPermits: 7100, singleFamily: 5200, multiFamilyTwoToFour: 120, multiFamilyFivePlus: 1780 },
      { year: 2024, totalPermits: 7800, singleFamily: 5600, multiFamilyTwoToFour: 130, multiFamilyFivePlus: 2070 },
    ],
    twoYearChangePct: -0.049,
    constructionActivityLevel: "moderate",
    notes: "Permits fell from 8,200 in 2022 to 7,800 in 2024 (−4.9%). 2024 is up from 7,100 in 2023.",
  },
  {
    metroArea: "Metro East-1",
    metroCode: "26420",
    state: "RE",
    silverStateRegion: "RE",
    snapshots: [
      { year: 2022, totalPermits: 68400, singleFamily: 42600, multiFamilyTwoToFour: 1200, multiFamilyFivePlus: 24600 },
      { year: 2023, totalPermits: 62800, singleFamily: 40200, multiFamilyTwoToFour: 1100, multiFamilyFivePlus: 21500 },
      { year: 2024, totalPermits: 65200, singleFamily: 41800, multiFamilyTwoToFour: 1150, multiFamilyFivePlus: 22250 },
    ],
    twoYearChangePct: -0.047,
    constructionActivityLevel: "high",
    notes: "Permits fell from 68,400 in 2022 to 65,200 in 2024 (−4.7%). 2024 is the highest total in this metro set. No LNG or population series is in this dataset.",
  },
  {
    metroArea: "Metro North-1",
    metroCode: "41620",
    state: "RN",
    silverStateRegion: "RN",
    snapshots: [
      { year: 2022, totalPermits: 14200, singleFamily: 8400, multiFamilyTwoToFour: 320, multiFamilyFivePlus: 5480 },
      { year: 2023, totalPermits: 11800, singleFamily: 7200, multiFamilyTwoToFour: 280, multiFamilyFivePlus: 4320 },
      { year: 2024, totalPermits: 13600, singleFamily: 8800, multiFamilyTwoToFour: 300, multiFamilyFivePlus: 4500 },
    ],
    twoYearChangePct: -0.042,
    constructionActivityLevel: "high",
    notes: "Permits fell from 14,200 in 2022 to 13,600 in 2024 (−4.2%). 2024 is up from 11,800 in 2023. No national-average comparison is in this dataset.",
  },
  {
    metroArea: "Metro Mountain-1",
    metroCode: "10740",
    state: "RM",
    silverStateRegion: "RM",
    snapshots: [
      { year: 2022, totalPermits: 4800, singleFamily: 3200, multiFamilyTwoToFour: 100, multiFamilyFivePlus: 1500 },
      { year: 2023, totalPermits: 4100, singleFamily: 2800, multiFamilyTwoToFour: 80, multiFamilyFivePlus: 1220 },
      { year: 2024, totalPermits: 4400, singleFamily: 3000, multiFamilyTwoToFour: 90, multiFamilyFivePlus: 1310 },
    ],
    twoYearChangePct: -0.083,
    constructionActivityLevel: "moderate",
    notes: "Permits fell from 4,800 in 2022 to 4,400 in 2024 (−8.3%). 2024 is up from 4,100 in 2023. No government-contract or film series is in this dataset.",
  },
];

export function getPermitsForRegion(region: "RW" | "RS" | "RC" | "RE" | "RN" | "RM"): MetroPermitProfile[] {
  return metroPermitProfiles.filter(p => p.silverStateRegion === region);
}

export function getConstructionGrowthSignal(region: "RW" | "RS" | "RC" | "RE" | "RN" | "RM"): {
  signal: "growing" | "stable" | "declining";
  topMetro: string;
  twoYearChange: number;
} {
  const profiles = getPermitsForRegion(region);
  if (!profiles.length) return { signal: "stable", topMetro: "Unknown", twoYearChange: 0 };

  const sorted = [...profiles].sort((a, b) => {
    const latestA = a.snapshots[a.snapshots.length - 1]?.totalPermits ?? 0;
    const latestB = b.snapshots[b.snapshots.length - 1]?.totalPermits ?? 0;
    return latestB - latestA;
  });

  const top = sorted[0];
  const change = top.twoYearChangePct;
  const signal = change > 0.05 ? "growing" : change < -0.15 ? "declining" : "stable";

  return { signal, topMetro: top.metroArea, twoYearChange: change };
}
