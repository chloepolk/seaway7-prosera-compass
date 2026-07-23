export type Region = "RW" | "RC" | "RS" | "RE" | "RN" | "RM";

export const regionLabels: Record<Region, string> = {
  RW: "Region West",
  RC: "Region Central",
  RS: "Region South",
  RE: "Region East",
  RN: "Region North",
  RM: "Region Mountain",
};

const STATE_TO_REGION: Record<string, Region> = {
  RW: "RW",
  RC: "RC",
  RS: "RS",
  RE: "RE",
  RN: "RN",
  RM: "RM",
};

const CITY_ALIASES: Record<string, string> = {};

export function normalizeCity(raw: string): string {
  if (!raw || raw === "#N/A") return "";
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (CITY_ALIASES[normalized]) return CITY_ALIASES[normalized];
  return normalized
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function deriveRegionFromAddress(
  state: string | null,
  priceBookFallback: string
): Region {
  if (state && state !== "#N/A" && state.trim() !== "") {
    const upper = state.trim().toUpperCase();
    const mapped = STATE_TO_REGION[upper];
    if (mapped) return mapped;
  }

  const pb = priceBookFallback.trim().toUpperCase();
  if (pb.includes("RE") || /\bRE\b/.test(pb)) return "RE";
  if (pb.includes("RS") || /\bRS\b/.test(pb)) return "RS";
  if (pb.includes("RN") || /\bRN\b/.test(pb)) return "RN";
  if (pb.includes("RM") || /\bRM\b/.test(pb)) return "RM";
  if (pb.includes("RC") || /\bRC\b/.test(pb)) return "RC";
  return "RW";
}

/** @deprecated Use deriveRegionFromAddress instead */
export function deriveRegion(priceBookName: string): Region {
  return deriveRegionFromAddress(null, priceBookName);
}
