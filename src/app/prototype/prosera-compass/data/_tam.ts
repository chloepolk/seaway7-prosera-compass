/* ------------------------------------------------------------------ */
/*  Customer TAM / Whitespace Intelligence                             */
/*                                                                     */
/*  For each customer we estimate the Total Addressable Market across  */
/*  ACME's service lines, compare it to current wallet (what we        */
/*  actually capture), and surface the whitespace plus an              */
/*  "intelligence package" (technician recon + OSINT) describing how   */
/*  to capture it. Modeled after SOF-style target packages: every signal */
/*  carries a source and a confidence grade.                           */
/*                                                                     */
/*  All recon / OSINT signals are statically mocked (deterministic per */
/*  customer) — `_tam.ts` is the single seam for real data later.      */
/* ------------------------------------------------------------------ */

import type { CustomerAggregate, DataScope } from "./_transform"
import type { Region } from "./_regions"
import { getBusinessProfile } from "./_scorecard"
import { getConstructionGrowthSignal } from "./_construction"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** The 8 service lines present in ACME's job data. */
export type ServiceLine =
  | "Refrigeration"
  | "HVAC - Commercial"
  | "Plumbing - Commercial"
  | "Plumbing - Construction"
  | "Electrical"
  | "Cooking"
  | "General Maintenance"
  | "Preventative Maintenance"

export type Confidence = "high" | "medium" | "low"

export interface ServiceLinePotential {
  line: ServiceLine
  /** Estimated annual addressable spend for this line at this account. */
  potentialAnnual: number
  /** Annualized spend ACME currently captures in this line. */
  capturedAnnual: number
  /** Addressable headroom = potential - captured (>= 0). */
  whitespace: number
  penetrated: boolean
  confidence: Confidence
}

export interface IntelSignal {
  source: "recon" | "osint" | "permit"
  label: string
  detail: string
  confidence: Confidence
}

export interface CrossSellAction {
  line: ServiceLine
  action: string
  expectedAnnual: number
  how: string
}

export interface CustomerTam {
  businessType: string
  totalAddressable: number
  currentWallet: number
  whitespace: number
  /** 0-1 share of the addressable wallet ACME currently holds. */
  sharePct: number
  lines: ServiceLinePotential[]
  intelPackage: IntelSignal[]
  recommendedActions: CrossSellAction[]
}

/* ------------------------------------------------------------------ */
/*  Service-line economics + addressability                           */
/* ------------------------------------------------------------------ */

const ALL_LINES: ServiceLine[] = [
  "Refrigeration",
  "HVAC - Commercial",
  "Plumbing - Commercial",
  "Plumbing - Construction",
  "Electrical",
  "Cooking",
  "General Maintenance",
  "Preventative Maintenance",
]

/** Typical annual commercial spend per line (anchor; scaled by account size). */
const LINE_POTENTIAL_BASE: Record<ServiceLine, number> = {
  "Refrigeration": 18_000,
  "HVAC - Commercial": 22_000,
  "Plumbing - Commercial": 12_000,
  "Plumbing - Construction": 15_000,
  "Electrical": 10_000,
  "Cooking": 8_000,
  "General Maintenance": 9_000,
  "Preventative Maintenance": 11_000,
}

/** Which lines a given business profile plausibly needs (its addressable set). */
const ADDRESSABLE_BY_PROFILE: Record<string, ServiceLine[]> = {
  "Restaurant": ["Refrigeration", "HVAC - Commercial", "Plumbing - Commercial", "Electrical", "Cooking", "General Maintenance", "Preventative Maintenance"],
  "Grocery": ["Refrigeration", "HVAC - Commercial", "Plumbing - Commercial", "Electrical", "Cooking", "General Maintenance", "Preventative Maintenance"],
  "Cold Storage": ["Refrigeration", "HVAC - Commercial", "Plumbing - Commercial", "Electrical", "General Maintenance", "Preventative Maintenance"],
  "Healthcare": ["HVAC - Commercial", "Refrigeration", "Plumbing - Commercial", "Electrical", "Cooking", "General Maintenance", "Preventative Maintenance"],
  "Commercial Office": ["HVAC - Commercial", "Plumbing - Commercial", "Electrical", "General Maintenance", "Preventative Maintenance"],
  "Industrial": ["HVAC - Commercial", "Refrigeration", "Electrical", "General Maintenance", "Preventative Maintenance"],
  "Retail": ["HVAC - Commercial", "Electrical", "General Maintenance", "Preventative Maintenance"],
  "Multi-Family": ["HVAC - Commercial", "Plumbing - Commercial", "Electrical", "General Maintenance"],
  "General Commercial": ["HVAC - Commercial", "Plumbing - Commercial", "Electrical", "General Maintenance", "Preventative Maintenance"],
}

/* ------------------------------------------------------------------ */
/*  Deterministic pseudo-randomness (stable per customer name)         */
/* ------------------------------------------------------------------ */

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seed * arr.length) % arr.length]
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function dominantKey(mix: Record<string, number>): string {
  let best = ""
  let bestN = -1
  for (const [k, n] of Object.entries(mix)) {
    if (n > bestN) { bestN = n; best = k }
  }
  return best
}

/* ------------------------------------------------------------------ */
/*  Intel package synthesis (mocked recon + OSINT)                     */
/* ------------------------------------------------------------------ */

const EQUIP_AGES = [8, 11, 12, 14, 15, 17]
const REFRIGERANTS = ["R-22 (phased out)", "R-404A", "R-448A"]

function buildIntelPackage(
  c: CustomerAggregate,
  profileLabel: string,
  sqFt: number,
  topWhitespace: ServiceLinePotential[],
): IntelSignal[] {
  const seed = hashSeed(c.customerName)
  const homeRegion = dominantKey(c.regionDistribution) as Region
  const signals: IntelSignal[] = []

  // OSINT — facility profile
  signals.push({
    source: "osint",
    label: "Facility profile",
    detail: `${profileLabel}, ~${sqFt.toLocaleString()} sq ft. Supports ${ADDRESSABLE_BY_PROFILE[profileLabel]?.length ?? 5} service lines for a fully-penetrated account.`,
    confidence: "medium",
  })

  // Permit — regional construction signal
  const permit = getConstructionGrowthSignal(homeRegion)
  signals.push({
    source: "permit",
    label: `Construction activity (${homeRegion})`,
    detail: `Permits ${permit.signal} near ${permit.topMetro} (2-yr ${(permit.twoYearChange * 100).toFixed(0)}%) — signals facility build-out / retrofit demand.`,
    confidence: "medium",
  })

  // Recon — equipment age (drives PM / replacement upsell)
  const age = pick(EQUIP_AGES, seed)
  const refrigerant = pick(REFRIGERANTS, seed * 1.7)
  signals.push({
    source: "recon",
    label: "Onsite equipment age",
    detail: `Technician noted primary equipment ~${age} yrs old${topWhitespace.some(l => l.line === "Refrigeration") ? `, refrigeration on ${refrigerant}` : ""}. Replacement / PM-contract window open.`,
    confidence: "high",
  })

  // Recon — observed but unserved systems (tie to top whitespace line)
  const top = topWhitespace[0]
  if (top) {
    signals.push({
      source: "recon",
      label: `Unserved ${top.line} systems`,
      detail: `Technician observed ${top.line} systems onsite during service that are not under an ACME agreement — est. $${Math.round(top.whitespace / 1000)}k/yr addressable.`,
      confidence: "high",
    })
  }

  // OSINT — multi-site / hours (varies by seed)
  if (seed > 0.5) {
    signals.push({
      source: "osint",
      label: "Operator footprint",
      detail: `Public listings indicate a multi-site operator — landing additional lines here is a template for sibling locations.`,
      confidence: "low",
    })
  }

  return signals
}

/* ------------------------------------------------------------------ */
/*  Core computation                                                   */
/* ------------------------------------------------------------------ */

function buildCustomerTam(c: CustomerAggregate, annualizationFactor: number): CustomerTam {
  const profile = getBusinessProfile(dominantKey(c.propertyTypeMix))
  const annualizedCurrent = c.validated.totalRevenue * annualizationFactor
  const sizeMult = clamp(annualizedCurrent / Math.max(1, profile.targetAnnualValue), 0.6, 3)

  // Captured spend per line (annualized), from validated margin-by-job-type.
  const capturedByLine: Record<string, number> = {}
  for (const m of c.marginByJobType) {
    capturedByLine[m.jobType] = (capturedByLine[m.jobType] ?? 0) + m.totalRevenue * annualizationFactor
  }

  const addressable = ADDRESSABLE_BY_PROFILE[profile.label] ?? ADDRESSABLE_BY_PROFILE["General Commercial"]
  // Union of addressable lines + any line we already bill (so wallet is complete).
  const lineSet = new Set<ServiceLine>(addressable)
  for (const k of Object.keys(capturedByLine)) {
    if ((ALL_LINES as string[]).includes(k)) lineSet.add(k as ServiceLine)
  }

  const seed = hashSeed(c.customerName)
  const lines: ServiceLinePotential[] = [...lineSet].map((line, i) => {
    const captured = Math.round(capturedByLine[line] ?? 0)
    const penetrated = captured > 0
    const base = Math.round(LINE_POTENTIAL_BASE[line] * sizeMult)
    // Penetrated lines have modest upsell headroom; unpenetrated lines are full whitespace.
    const potential = penetrated ? Math.max(captured, Math.round(captured + base * 0.25)) : base
    const whitespace = Math.max(0, potential - captured)
    const conf: Confidence = penetrated ? "high" : pick<Confidence>(["high", "medium", "medium", "low"], seed + i * 0.13)
    return { line, potentialAnnual: potential, capturedAnnual: captured, whitespace, penetrated, confidence: conf }
  }).sort((a, b) => b.whitespace - a.whitespace)

  const totalAddressable = lines.reduce((s, l) => s + l.potentialAnnual, 0)
  const currentWallet = lines.reduce((s, l) => s + l.capturedAnnual, 0)
  const whitespace = Math.max(0, totalAddressable - currentWallet)
  const sharePct = totalAddressable > 0 ? currentWallet / totalAddressable : 0

  const topWhitespace = lines.filter(l => !l.penetrated && l.whitespace > 0).slice(0, 3)
  const intelPackage = buildIntelPackage(c, profile.label, profile.avgSquareFeet, topWhitespace)

  const recommendedActions: CrossSellAction[] = topWhitespace.map(l => ({
    line: l.line,
    action: `Cross-sell ${l.line}`,
    expectedAnnual: l.whitespace,
    how: crossSellApproach(l.line),
  }))

  return {
    businessType: profile.label,
    totalAddressable: Math.round(totalAddressable),
    currentWallet: Math.round(currentWallet),
    whitespace: Math.round(whitespace),
    sharePct,
    lines,
    intelPackage,
    recommendedActions,
  }
}

function crossSellApproach(line: ServiceLine): string {
  switch (line) {
    case "HVAC - Commercial": return "Quote rooftop-unit assessment flagged during last visit; bundle into a PM agreement."
    case "Refrigeration": return "Lead with a free walk-in/reach-in reliability audit; convert to a monitored service plan."
    case "Plumbing - Commercial": return "Offer a backflow-prevention + drain-line inspection; attach to existing dispatch cadence."
    case "Plumbing - Construction": return "Position for the next build-out/retrofit via the observed permit activity."
    case "Electrical": return "Bundle panel + lighting safety inspection with the next scheduled service call."
    case "Cooking": return "Add kitchen-equipment service to the refrigeration route — same technician, same trip."
    case "General Maintenance": return "Consolidate handyman/repair spend currently leaking to other vendors."
    case "Preventative Maintenance": return "Convert reactive break-fix history into a fixed-fee PM contract (margin + retention)."
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function buildCustomerTams(customers: CustomerAggregate[], dataScope: DataScope): Map<string, CustomerTam> {
  const windowDays = Math.max(
    1,
    Math.round((dataScope.createdTo.getTime() - dataScope.createdFrom.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const factor = 365 / windowDays
  const map = new Map<string, CustomerTam>()
  for (const c of customers) map.set(c.customerName, buildCustomerTam(c, factor))
  return map
}

export interface TamRollup {
  totalAddressable: number
  currentWallet: number
  whitespace: number
  sharePct: number
  topWhitespaceCustomers: { customerName: string; whitespace: number; businessType: string }[]
}

export function buildTamRollup(customers: CustomerAggregate[]): TamRollup {
  let totalAddressable = 0
  let currentWallet = 0
  const ranked: { customerName: string; whitespace: number; businessType: string }[] = []
  for (const c of customers) {
    if (!c.customerTam) continue
    totalAddressable += c.customerTam.totalAddressable
    currentWallet += c.customerTam.currentWallet
    ranked.push({ customerName: c.customerName, whitespace: c.customerTam.whitespace, businessType: c.customerTam.businessType })
  }
  ranked.sort((a, b) => b.whitespace - a.whitespace)
  return {
    totalAddressable: Math.round(totalAddressable),
    currentWallet: Math.round(currentWallet),
    whitespace: Math.round(Math.max(0, totalAddressable - currentWallet)),
    sharePct: totalAddressable > 0 ? currentWallet / totalAddressable : 0,
    topWhitespaceCustomers: ranked.slice(0, 8),
  }
}
