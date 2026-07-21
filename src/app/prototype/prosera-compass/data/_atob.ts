/* ------------------------------------------------------------------ */
/*  Fleet Fuel Card Transactions                                       */
/*                                                                     */
/*  Source: Monthly ACME Field Services Fleet Card Transactions         */
/*  Data vintage: Jan 2025 – Mar 2026                                  */
/*  Three divisions: DIV-A, DIV-B, DIV-C                               */
/*  Fleet is ~97% unleaded gasoline, ~3% diesel                        */
/* ------------------------------------------------------------------ */

export type Division = "DIV-A" | "DIV-B" | "DIV-C";

export interface DivisionFuelMonth {
  division: Division;
  month: string;
  year: number;
  dieselGallons: number;
  dieselPricePerGal: number | null;
  dieselTotal: number;
  unleadedGallons: number;
  unleadedPricePerGal: number | null;
  unleadedTotal: number;
  otherTotal: number;
  totalGallons: number;
  totalSpend: number;
}

export interface CombinedFuelMonth {
  month: string;
  year: number;
  dieselGallons: number;
  dieselPricePerGal: number | null;
  dieselTotal: number;
  unleadedGallons: number;
  unleadedPricePerGal: number | null;
  unleadedTotal: number;
  otherTotal: number;
  totalGallons: number;
  totalSpend: number;
  spikeImpactVsPrior: number | null;
}

export interface DivisionFuelSummary {
  division: Division;
  label: string;
  baselineAvgPricePerGal: number;
  currentAvgPricePerGal: number;
  priceDeltaPct: number;
  totalAnnualSpend: number;
  totalAnnualGallons: number;
  avgMonthlySpend: number;
  pctOfFleet: number;
  months: DivisionFuelMonth[];
}

export interface FleetFuelActuals {
  totalAnnualSpend: number;
  totalAnnualGallons: number;
  avgMonthlySpend: number;
  latestMonthSpend: number;
  latestMonthLabel: string;
  baselineUnleadedPricePerGal: number;
  currentUnleadedPricePerGal: number;
  unleadedPriceDeltaPct: number;
  spikeMonthLabel: string;
  spikeImpactDollars: number;
  unleadedPctOfVolume: number;
  divisions: DivisionFuelSummary[];
  combinedMonthly: CombinedFuelMonth[];
}

const DIVISION_LABELS: Record<Division, string> = {
  "DIV-A": "Commercial Refrigeration",
  "DIV-B": "Plumbing Services",
  "DIV-C": "HVAC/Refrigeration",
};

const sccrData: DivisionFuelMonth[] = [
  { division: "DIV-A", month: "Jan", year: 2025, dieselGallons: 55.40, dieselPricePerGal: 4.21, dieselTotal: 233.12, unleadedGallons: 6977.77, unleadedPricePerGal: 4.33, unleadedTotal: 30242.16, otherTotal: 393.35, totalGallons: 7033.16, totalSpend: 30868.63 },
  { division: "DIV-A", month: "Feb", year: 2025, dieselGallons: 106.75, dieselPricePerGal: 4.08, dieselTotal: 435.26, unleadedGallons: 6350.11, unleadedPricePerGal: 4.64, unleadedTotal: 29452.68, otherTotal: 69.17, totalGallons: 6456.86, totalSpend: 29957.11 },
  { division: "DIV-A", month: "Mar", year: 2025, dieselGallons: 119.82, dieselPricePerGal: 4.82, dieselTotal: 577.84, unleadedGallons: 7179.99, unleadedPricePerGal: 4.62, unleadedTotal: 33192.95, otherTotal: 0, totalGallons: 7299.81, totalSpend: 33770.79 },
  { division: "DIV-A", month: "Apr", year: 2025, dieselGallons: 129.89, dieselPricePerGal: 4.60, dieselTotal: 597.71, unleadedGallons: 7934.52, unleadedPricePerGal: 4.83, unleadedTotal: 38316.59, otherTotal: 234.82, totalGallons: 8064.41, totalSpend: 39149.12 },
  { division: "DIV-A", month: "May", year: 2025, dieselGallons: 242.54, dieselPricePerGal: 4.83, dieselTotal: 1171.66, unleadedGallons: 8608.67, unleadedPricePerGal: 4.73, unleadedTotal: 40758.31, otherTotal: 132.02, totalGallons: 8851.22, totalSpend: 42061.99 },
  { division: "DIV-A", month: "Jun", year: 2025, dieselGallons: 139.81, dieselPricePerGal: 5.01, dieselTotal: 700.44, unleadedGallons: 8270.54, unleadedPricePerGal: 4.60, unleadedTotal: 38020.53, otherTotal: 32.92, totalGallons: 8410.35, totalSpend: 38753.89 },
  { division: "DIV-A", month: "Jul", year: 2025, dieselGallons: 20.09, dieselPricePerGal: 4.95, dieselTotal: 99.43, unleadedGallons: 9169.66, unleadedPricePerGal: 4.42, unleadedTotal: 40562.52, otherTotal: 78.92, totalGallons: 9189.75, totalSpend: 40740.87 },
  { division: "DIV-A", month: "Aug", year: 2025, dieselGallons: 131.12, dieselPricePerGal: 4.84, dieselTotal: 635.14, unleadedGallons: 9269.01, unleadedPricePerGal: 4.48, unleadedTotal: 41524.21, otherTotal: 15.45, totalGallons: 9400.13, totalSpend: 42174.80 },
  { division: "DIV-A", month: "Sep", year: 2025, dieselGallons: 99.46, dieselPricePerGal: 4.58, dieselTotal: 455.03, unleadedGallons: 8108.58, unleadedPricePerGal: 4.64, unleadedTotal: 37647.86, otherTotal: 114.79, totalGallons: 8208.04, totalSpend: 38217.68 },
  { division: "DIV-A", month: "Oct", year: 2025, dieselGallons: 198.90, dieselPricePerGal: 4.87, dieselTotal: 969.00, unleadedGallons: 8920.29, unleadedPricePerGal: 4.66, unleadedTotal: 41589.74, otherTotal: 78.32, totalGallons: 9119.19, totalSpend: 42637.06 },
  { division: "DIV-A", month: "Nov", year: 2025, dieselGallons: 155.60, dieselPricePerGal: 4.72, dieselTotal: 734.24, unleadedGallons: 6734.40, unleadedPricePerGal: 4.69, unleadedTotal: 31590.35, otherTotal: 110.02, totalGallons: 6890.00, totalSpend: 32434.61 },
  { division: "DIV-A", month: "Dec", year: 2025, dieselGallons: 82.14, dieselPricePerGal: 4.53, dieselTotal: 371.96, unleadedGallons: 7597.93, unleadedPricePerGal: 4.40, unleadedTotal: 33432.05, otherTotal: 0, totalGallons: 7680.06, totalSpend: 33804.01 },
  { division: "DIV-A", month: "Jan", year: 2026, dieselGallons: 61.05, dieselPricePerGal: 4.59, dieselTotal: 280.31, unleadedGallons: 7229.37, unleadedPricePerGal: 4.22, unleadedTotal: 30526.38, otherTotal: 81.99, totalGallons: 7309.81, totalSpend: 30888.68 },
  { division: "DIV-A", month: "Feb", year: 2026, dieselGallons: 63.73, dieselPricePerGal: 4.07, dieselTotal: 259.48, unleadedGallons: 6510.03, unleadedPricePerGal: 4.53, unleadedTotal: 29502.81, otherTotal: 116.82, totalGallons: 6588.06, totalSpend: 29879.11 },
  { division: "DIV-A", month: "Mar", year: 2026, dieselGallons: 104.26, dieselPricePerGal: 7.06, dieselTotal: 736.49, unleadedGallons: 8038.49, unleadedPricePerGal: 5.42, unleadedTotal: 43541.76, otherTotal: 307.21, totalGallons: 8174.28, totalSpend: 44585.46 },
];

const plumbingData: DivisionFuelMonth[] = [
  { division: "DIV-B", month: "Jan", year: 2025, dieselGallons: 0, dieselPricePerGal: null, dieselTotal: 0, unleadedGallons: 6320.19, unleadedPricePerGal: 3.55, unleadedTotal: 22467.89, otherTotal: 218.70, totalGallons: 6320.19, totalSpend: 22686.59 },
  { division: "DIV-B", month: "Feb", year: 2025, dieselGallons: 0, dieselPricePerGal: null, dieselTotal: 0, unleadedGallons: 5483.65, unleadedPricePerGal: 3.75, unleadedTotal: 20567.24, otherTotal: 150.71, totalGallons: 5483.65, totalSpend: 20717.95 },
  { division: "DIV-B", month: "Mar", year: 2025, dieselGallons: 16.33, dieselPricePerGal: 3.35, dieselTotal: 54.67, unleadedGallons: 6581.42, unleadedPricePerGal: 3.71, unleadedTotal: 24410.03, otherTotal: 88.63, totalGallons: 6597.74, totalSpend: 24553.33 },
  { division: "DIV-B", month: "Apr", year: 2025, dieselGallons: 32.92, dieselPricePerGal: 3.95, dieselTotal: 129.99, unleadedGallons: 7117.96, unleadedPricePerGal: 3.94, unleadedTotal: 28037.75, otherTotal: 75.02, totalGallons: 7150.87, totalSpend: 28242.76 },
  { division: "DIV-B", month: "May", year: 2025, dieselGallons: 73.41, dieselPricePerGal: 3.64, dieselTotal: 267.43, unleadedGallons: 7483.09, unleadedPricePerGal: 3.93, unleadedTotal: 29396.75, otherTotal: 81.84, totalGallons: 7556.50, totalSpend: 29746.02 },
  { division: "DIV-B", month: "Jun", year: 2025, dieselGallons: 52.89, dieselPricePerGal: 4.00, dieselTotal: 211.42, unleadedGallons: 7179.47, unleadedPricePerGal: 3.80, unleadedTotal: 27266.58, otherTotal: 264.58, totalGallons: 7232.37, totalSpend: 27742.58 },
  { division: "DIV-B", month: "Jul", year: 2025, dieselGallons: 108.25, dieselPricePerGal: 4.25, dieselTotal: 460.05, unleadedGallons: 8068.94, unleadedPricePerGal: 3.73, unleadedTotal: 30124.23, otherTotal: 75.39, totalGallons: 8177.19, totalSpend: 30659.67 },
  { division: "DIV-B", month: "Aug", year: 2025, dieselGallons: 60.19, dieselPricePerGal: 3.99, dieselTotal: 240.24, unleadedGallons: 7877.22, unleadedPricePerGal: 3.81, unleadedTotal: 30029.41, otherTotal: 210.29, totalGallons: 7937.42, totalSpend: 30479.94 },
  { division: "DIV-B", month: "Sep", year: 2025, dieselGallons: 136.06, dieselPricePerGal: 3.93, dieselTotal: 534.34, unleadedGallons: 6419.05, unleadedPricePerGal: 3.91, unleadedTotal: 25085.20, otherTotal: 98.26, totalGallons: 6555.10, totalSpend: 25717.80 },
  { division: "DIV-B", month: "Oct", year: 2025, dieselGallons: 91.57, dieselPricePerGal: 4.00, dieselTotal: 365.98, unleadedGallons: 6806.83, unleadedPricePerGal: 3.84, unleadedTotal: 26118.20, otherTotal: 0, totalGallons: 6898.40, totalSpend: 26484.18 },
  { division: "DIV-B", month: "Nov", year: 2025, dieselGallons: 33.13, dieselPricePerGal: 4.05, dieselTotal: 134.13, unleadedGallons: 4691.40, unleadedPricePerGal: 3.88, unleadedTotal: 18197.64, otherTotal: 0, totalGallons: 4724.52, totalSpend: 18331.77 },
  { division: "DIV-B", month: "Dec", year: 2025, dieselGallons: 280.09, dieselPricePerGal: 3.53, dieselTotal: 988.42, unleadedGallons: 5061.24, unleadedPricePerGal: 3.49, unleadedTotal: 17646.83, otherTotal: 99.24, totalGallons: 5341.33, totalSpend: 18734.49 },
  { division: "DIV-B", month: "Jan", year: 2026, dieselGallons: 252.91, dieselPricePerGal: 3.77, dieselTotal: 952.45, unleadedGallons: 4568.54, unleadedPricePerGal: 3.37, unleadedTotal: 15389.13, otherTotal: 78.41, totalGallons: 4821.45, totalSpend: 16419.99 },
  { division: "DIV-B", month: "Feb", year: 2026, dieselGallons: 62.15, dieselPricePerGal: 4.16, dieselTotal: 258.52, unleadedGallons: 4172.21, unleadedPricePerGal: 3.64, unleadedTotal: 15173.18, otherTotal: 0, totalGallons: 4234.36, totalSpend: 15431.70 },
  { division: "DIV-B", month: "Mar", year: 2026, dieselGallons: 87.11, dieselPricePerGal: 5.14, dieselTotal: 448.12, unleadedGallons: 4526.61, unleadedPricePerGal: 4.48, unleadedTotal: 20275.73, otherTotal: 0, totalGallons: 4613.71, totalSpend: 20723.85 },
];

const ssrfgData: DivisionFuelMonth[] = [
  { division: "DIV-C", month: "Jan", year: 2025, dieselGallons: 300.37, dieselPricePerGal: 3.91, dieselTotal: 1174.56, unleadedGallons: 11885.92, unleadedPricePerGal: 3.38, unleadedTotal: 40189.76, otherTotal: 0, totalGallons: 12186.29, totalSpend: 41364.32 },
  { division: "DIV-C", month: "Feb", year: 2025, dieselGallons: 229.10, dieselPricePerGal: 4.08, dieselTotal: 934.34, unleadedGallons: 11593.29, unleadedPricePerGal: 3.53, unleadedTotal: 40900.35, otherTotal: 77.89, totalGallons: 11822.39, totalSpend: 41912.58 },
  { division: "DIV-C", month: "Mar", year: 2025, dieselGallons: 243.87, dieselPricePerGal: 3.87, dieselTotal: 942.66, unleadedGallons: 12327.33, unleadedPricePerGal: 3.53, unleadedTotal: 43565.11, otherTotal: 142.74, totalGallons: 12571.20, totalSpend: 44650.51 },
  { division: "DIV-C", month: "Apr", year: 2025, dieselGallons: 238.43, dieselPricePerGal: 3.63, dieselTotal: 866.08, unleadedGallons: 13209.64, unleadedPricePerGal: 3.56, unleadedTotal: 47083.57, otherTotal: 73.07, totalGallons: 13448.07, totalSpend: 48022.72 },
  { division: "DIV-C", month: "May", year: 2025, dieselGallons: 272.55, dieselPricePerGal: 3.64, dieselTotal: 991.98, unleadedGallons: 14466.76, unleadedPricePerGal: 3.56, unleadedTotal: 51538.22, otherTotal: 66.29, totalGallons: 14739.31, totalSpend: 52596.49 },
  { division: "DIV-C", month: "Jun", year: 2025, dieselGallons: 249.20, dieselPricePerGal: 3.95, dieselTotal: 983.73, unleadedGallons: 15934.15, unleadedPricePerGal: 3.50, unleadedTotal: 55751.82, otherTotal: 469.91, totalGallons: 16183.34, totalSpend: 57205.46 },
  { division: "DIV-C", month: "Jul", year: 2025, dieselGallons: 206.00, dieselPricePerGal: 3.89, dieselTotal: 802.18, unleadedGallons: 19635.95, unleadedPricePerGal: 3.43, unleadedTotal: 67298.26, otherTotal: 75.24, totalGallons: 19841.95, totalSpend: 68175.68 },
  { division: "DIV-C", month: "Aug", year: 2025, dieselGallons: 330.84, dieselPricePerGal: 4.05, dieselTotal: 1338.58, unleadedGallons: 18081.43, unleadedPricePerGal: 3.44, unleadedTotal: 62252.93, otherTotal: 0, totalGallons: 18412.27, totalSpend: 63591.51 },
  { division: "DIV-C", month: "Sep", year: 2025, dieselGallons: 262.97, dieselPricePerGal: 4.10, dieselTotal: 1079.26, unleadedGallons: 18544.31, unleadedPricePerGal: 3.45, unleadedTotal: 63916.81, otherTotal: 164.43, totalGallons: 18807.28, totalSpend: 65160.50 },
  { division: "DIV-C", month: "Oct", year: 2025, dieselGallons: 251.63, dieselPricePerGal: 3.70, dieselTotal: 931.01, unleadedGallons: 19548.50, unleadedPricePerGal: 3.27, unleadedTotal: 63953.98, otherTotal: 0, totalGallons: 19800.13, totalSpend: 64884.99 },
  { division: "DIV-C", month: "Nov", year: 2025, dieselGallons: 376.51, dieselPricePerGal: 4.27, dieselTotal: 1606.99, unleadedGallons: 15635.29, unleadedPricePerGal: 3.38, unleadedTotal: 52860.65, otherTotal: 203.86, totalGallons: 16011.80, totalSpend: 54671.50 },
  { division: "DIV-C", month: "Dec", year: 2025, dieselGallons: 655.42, dieselPricePerGal: 4.52, dieselTotal: 2963.92, unleadedGallons: 15270.54, unleadedPricePerGal: 3.17, unleadedTotal: 48429.14, otherTotal: 87.35, totalGallons: 15930.69, totalSpend: 51480.41 },
  { division: "DIV-C", month: "Jan", year: 2026, dieselGallons: 507.81, dieselPricePerGal: 3.99, dieselTotal: 2027.36, unleadedGallons: 14518.48, unleadedPricePerGal: 3.06, unleadedTotal: 44409.72, otherTotal: 0, totalGallons: 15026.29, totalSpend: 46437.08 },
  { division: "DIV-C", month: "Feb", year: 2026, dieselGallons: 627.68, dieselPricePerGal: 4.23, dieselTotal: 2656.02, unleadedGallons: 13780.56, unleadedPricePerGal: 3.21, unleadedTotal: 44245.39, otherTotal: 86.50, totalGallons: 14408.25, totalSpend: 46987.91 },
  { division: "DIV-C", month: "Mar", year: 2026, dieselGallons: 756.19, dieselPricePerGal: 5.73, dieselTotal: 4334.16, unleadedGallons: 17591.21, unleadedPricePerGal: 4.06, unleadedTotal: 71340.08, otherTotal: 204.99, totalGallons: 18371.54, totalSpend: 75879.23 },
];

const combinedData: CombinedFuelMonth[] = [
  { month: "Jan", year: 2025, dieselGallons: 355.77, dieselPricePerGal: 3.96, dieselTotal: 1407.68, unleadedGallons: 25183.88, unleadedPricePerGal: 3.69, unleadedTotal: 92899.81, otherTotal: 612.05, totalGallons: 25539.64, totalSpend: 94919.54, spikeImpactVsPrior: null },
  { month: "Feb", year: 2025, dieselGallons: 335.85, dieselPricePerGal: 4.08, dieselTotal: 1369.60, unleadedGallons: 23427.05, unleadedPricePerGal: 3.88, unleadedTotal: 90920.27, otherTotal: 297.77, totalGallons: 23762.90, totalSpend: 92587.64, spikeImpactVsPrior: 0 },
  { month: "Mar", year: 2025, dieselGallons: 380.02, dieselPricePerGal: 4.15, dieselTotal: 1575.17, unleadedGallons: 26088.73, unleadedPricePerGal: 3.88, unleadedTotal: 101168.09, otherTotal: 231.37, totalGallons: 26468.75, totalSpend: 102974.63, spikeImpactVsPrior: -155.84 },
  { month: "Apr", year: 2025, dieselGallons: 401.24, dieselPricePerGal: 3.97, dieselTotal: 1593.78, unleadedGallons: 28262.12, unleadedPricePerGal: 4.01, unleadedTotal: 113437.91, otherTotal: 382.91, totalGallons: 28663.36, totalSpend: 115414.60, spikeImpactVsPrior: 3902.02 },
  { month: "May", year: 2025, dieselGallons: 588.50, dieselPricePerGal: 4.13, dieselTotal: 2431.07, unleadedGallons: 30558.52, unleadedPricePerGal: 3.98, unleadedTotal: 121693.28, otherTotal: 280.15, totalGallons: 31147.02, totalSpend: 124404.50, spikeImpactVsPrior: -1010.70 },
  { month: "Jun", year: 2025, dieselGallons: 441.90, dieselPricePerGal: 4.29, dieselTotal: 1895.59, unleadedGallons: 31384.16, unleadedPricePerGal: 3.86, unleadedTotal: 121038.93, otherTotal: 767.41, totalGallons: 31826.06, totalSpend: 123701.93, spikeImpactVsPrior: -3414.72 },
  { month: "Jul", year: 2025, dieselGallons: 334.34, dieselPricePerGal: 4.07, dieselTotal: 1361.66, unleadedGallons: 36874.55, unleadedPricePerGal: 3.74, unleadedTotal: 137985.01, otherTotal: 229.55, totalGallons: 37208.88, totalSpend: 139576.22, spikeImpactVsPrior: -5047.75 },
  { month: "Aug", year: 2025, dieselGallons: 522.15, dieselPricePerGal: 4.24, dieselTotal: 2213.96, unleadedGallons: 35227.66, unleadedPricePerGal: 3.80, unleadedTotal: 133806.55, otherTotal: 225.74, totalGallons: 35749.82, totalSpend: 136246.25, spikeImpactVsPrior: 2143.21 },
  { month: "Sep", year: 2025, dieselGallons: 498.49, dieselPricePerGal: 4.15, dieselTotal: 2068.63, unleadedGallons: 33071.95, unleadedPricePerGal: 3.83, unleadedTotal: 126649.87, otherTotal: 377.48, totalGallons: 33570.43, totalSpend: 129095.98, spikeImpactVsPrior: 1155.59 },
  { month: "Oct", year: 2025, dieselGallons: 542.11, dieselPricePerGal: 4.18, dieselTotal: 2265.99, unleadedGallons: 35275.61, unleadedPricePerGal: 3.73, unleadedTotal: 131661.92, otherTotal: 78.32, totalGallons: 35817.72, totalSpend: 134006.23, spikeImpactVsPrior: -3731.74 },
  { month: "Nov", year: 2025, dieselGallons: 565.25, dieselPricePerGal: 4.38, dieselTotal: 2475.36, unleadedGallons: 27061.08, unleadedPricePerGal: 3.79, unleadedTotal: 102648.64, otherTotal: 313.88, totalGallons: 27626.33, totalSpend: 105437.88, spikeImpactVsPrior: 2078.42 },
  { month: "Dec", year: 2025, dieselGallons: 1017.65, dieselPricePerGal: 4.25, dieselTotal: 4324.30, unleadedGallons: 27929.71, unleadedPricePerGal: 3.56, unleadedTotal: 99508.02, otherTotal: 186.59, totalGallons: 28952.09, totalSpend: 104018.91, spikeImpactVsPrior: -6478.84 },
  { month: "Jan", year: 2026, dieselGallons: 821.78, dieselPricePerGal: 3.97, dieselTotal: 3260.12, unleadedGallons: 26316.39, unleadedPricePerGal: 3.43, unleadedTotal: 90325.23, otherTotal: 160.40, totalGallons: 27157.56, totalSpend: 93745.75, spikeImpactVsPrior: -3825.77 },
  { month: "Feb", year: 2026, dieselGallons: 753.56, dieselPricePerGal: 4.21, dieselTotal: 3174.02, unleadedGallons: 24462.80, unleadedPricePerGal: 3.63, unleadedTotal: 88921.38, otherTotal: 203.32, totalGallons: 25230.66, totalSpend: 92298.72, spikeImpactVsPrior: 5204.45 },
  { month: "Mar", year: 2026, dieselGallons: 947.56, dieselPricePerGal: 5.82, dieselTotal: 5518.77, unleadedGallons: 30156.31, unleadedPricePerGal: 4.48, unleadedTotal: 135157.57, otherTotal: 512.20, totalGallons: 31159.53, totalSpend: 141188.54, spikeImpactVsPrior: 27200.86 },
];

function buildDivisionSummary(months: DivisionFuelMonth[]): DivisionFuelSummary {
  const division = months[0].division;
  const baselineAvg = months[0]?.unleadedPricePerGal ?? 3.69;
  const currentAvg = months[months.length - 1]?.unleadedPricePerGal ?? 4.48;

  const totalSpend = months.reduce((s, m) => s + m.totalSpend, 0);
  const totalGallons = months.reduce((s, m) => s + m.totalGallons, 0);

  return {
    division,
    label: DIVISION_LABELS[division],
    baselineAvgPricePerGal: baselineAvg,
    currentAvgPricePerGal: currentAvg,
    priceDeltaPct: baselineAvg > 0 ? (currentAvg - baselineAvg) / baselineAvg : 0,
    totalAnnualSpend: totalSpend,
    totalAnnualGallons: totalGallons,
    avgMonthlySpend: totalSpend / months.length,
    pctOfFleet: 0,
    months,
  };
}

export function loadFleetFuelActuals(): FleetFuelActuals {
  const divSummaries = [
    buildDivisionSummary(sccrData),
    buildDivisionSummary(plumbingData),
    buildDivisionSummary(ssrfgData),
  ];

  const totalFleetSpend = divSummaries.reduce((s, d) => s + d.totalAnnualSpend, 0);
  for (const d of divSummaries) {
    d.pctOfFleet = totalFleetSpend > 0 ? d.totalAnnualSpend / totalFleetSpend : 0;
  }

  const totalGallons = combinedData.reduce((s, m) => s + m.totalGallons, 0);
  const totalUnleadedGallons = combinedData.reduce((s, m) => s + m.unleadedGallons, 0);

  const baselineAvg = combinedData[0]?.unleadedPricePerGal ?? 3.69;
  const currentAvg = combinedData[combinedData.length - 1]?.unleadedPricePerGal ?? 4.48;

  const latest = combinedData[combinedData.length - 1];
  const spikeMonth = combinedData.reduce((best, m) =>
    (m.spikeImpactVsPrior ?? 0) > (best.spikeImpactVsPrior ?? 0) ? m : best
  , combinedData[0]);

  return {
    totalAnnualSpend: totalFleetSpend,
    totalAnnualGallons: totalGallons,
    avgMonthlySpend: totalFleetSpend / combinedData.length,
    latestMonthSpend: latest.totalSpend,
    latestMonthLabel: `${latest.month} ${latest.year}`,
    baselineUnleadedPricePerGal: baselineAvg,
    currentUnleadedPricePerGal: currentAvg,
    unleadedPriceDeltaPct: baselineAvg > 0 ? (currentAvg - baselineAvg) / baselineAvg : 0,
    spikeMonthLabel: `${spikeMonth.month} ${spikeMonth.year}`,
    spikeImpactDollars: spikeMonth.spikeImpactVsPrior ?? 0,
    unleadedPctOfVolume: totalGallons > 0 ? totalUnleadedGallons / totalGallons : 0,
    divisions: divSummaries,
    combinedMonthly: combinedData,
  };
}

export function getAtoBBaselinePrice(): number {
  const first = combinedData[0];
  return first?.unleadedPricePerGal ?? 3.69;
}

export function getAtoBCurrentPrice(): number {
  const last = combinedData[combinedData.length - 1];
  return last?.unleadedPricePerGal ?? 4.48;
}

export function getAtoBPriceDelta(): { baselineAvg: number; currentAvg: number; delta: number; deltaPct: number } {
  const baselineAvg = getAtoBBaselinePrice();
  const currentAvg = getAtoBCurrentPrice();
  return {
    baselineAvg,
    currentAvg,
    delta: currentAvg - baselineAvg,
    deltaPct: baselineAvg > 0 ? (currentAvg - baselineAvg) / baselineAvg : 0,
  };
}
