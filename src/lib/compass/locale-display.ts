/* ------------------------------------------------------------------ */
/*  EN-GB / FR display — currency, metric units, compact money         */
/*                                                                     */
/*  Seed amounts stay USD (and imperial where the source series is).   */
/*  User-facing English and French both display EUR and metric.        */
/*  Do not reconvert a figure that already carries a symbol.           */
/* ------------------------------------------------------------------ */

export type DisplayLocale = "en" | "fr"

/** Prototype FX, 21/08/2026. USD seed × rate = display currency. */
export const FX_RATE_DATE = "21/08/2026"
export const USD_TO_EUR = 0.92

export const US_GAL_TO_LITRE = 3.785411784
export const LB_TO_KG = 0.45359237
export const SHORT_TON_TO_TONNE = 0.90718474
/** Seed fuel-sensitivity step (USD per US gallon). */
export const USD_PER_GAL_SENSITIVITY = 0.1

export function localeTag(locale: DisplayLocale = "en"): "en-GB" | "fr-FR" {
  return locale === "fr" ? "fr-FR" : "en-GB"
}

function parseDisplayDate(input: string | number | Date): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input
  if (typeof input === "number") {
    const d = new Date(input)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const raw = input.trim()
  if (!raw) return null
  const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDay) {
    const d = new Date(`${isoDay[1]}-${isoDay[2]}-${isoDay[3]}T00:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const dmy = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/)
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(raw.includes("T") || raw.includes(" ") ? raw : `${raw}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** User-facing calendar date. Always DD/MM/YYYY (25/08/2026). */
export function formatDateDMY(input: string | number | Date | null | undefined): string {
  if (input == null || input === "") return ""
  const d = parseDisplayDate(input)
  if (!d) return typeof input === "string" ? input : ""
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}/${d.getFullYear()}`
}

/** YYYY-MM-DD for storage / native value attributes. Empty string if unparseable. */
export function toIsoDate(input: string | number | Date | null | undefined): string {
  if (input == null || input === "") return ""
  const d = parseDisplayDate(input)
  if (!d) return ""
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

/** Parse a DD/MM/YYYY (or ISO) string to YYYY-MM-DD, or null if invalid. */
export function parseToIsoDate(input: string | null | undefined): string | null {
  if (input == null || !input.trim()) return null
  const iso = toIsoDate(input.trim())
  return iso || null
}

export const DATE_INPUT_PLACEHOLDER = "DD/MM/YYYY"

/** User-facing date and 24-hour time. DD/MM/YYYY HH:mm */
export function formatDateTimeDMY(input: string | number | Date | null | undefined): string {
  if (input == null || input === "") return ""
  const d = parseDisplayDate(input)
  if (!d) return typeof input === "string" ? input : ""
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${formatDateDMY(d)} ${hh}:${min}`
}

/** Decimal with a fixed fraction length. EN: 20.1 · FR: 20,1 */
export function formatFixed(
  n: number,
  locale: DisplayLocale = "en",
  digits = 1,
): string {
  return n.toLocaleString(localeTag(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** ROI / score multiple. EN: 20.1x · FR: 20,1x */
export function formatMultiple(
  n: number,
  locale: DisplayLocale = "en",
  digits = 1,
): string {
  return `${formatFixed(n, locale, digits)}x`
}

export function fxRate(_locale: DisplayLocale = "en"): number {
  return USD_TO_EUR
}

export function currencyCode(_locale: DisplayLocale = "en"): "EUR" {
  return "EUR"
}

export function displayAmount(usdAmount: number, locale: DisplayLocale = "en"): number {
  return usdAmount * fxRate(locale)
}

/** Convert a USD seed amount to euros using the prototype FX rate. */
export function usdToEur(usdAmount: number): number {
  return usdAmount * USD_TO_EUR
}

/** Format an already-converted euro amount (not a USD seed). */
export function formatEurFigure(eurAmount: number, locale: DisplayLocale = "en"): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(eurAmount)
}

/** Format a USD seed amount as euros (award-governance rule currency). */
export function formatUsdAsEur(usdAmount: number, locale: DisplayLocale = "en"): string {
  return formatEurFigure(usdToEur(usdAmount), locale)
}

export function formatMoney(
  usdAmount: number,
  locale: DisplayLocale = "en",
  opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: currencyCode(locale),
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
    minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
  }).format(displayAmount(usdAmount, locale))
}

/**
 * Compact money for chips/KPIs.
 * EN: €230k / €1.2m / €3.4bn
 * FR: 230 k€ / 1,2 M€ / 3,4 Md€
 */
export function formatCompactMoney(usdAmount: number, locale: DisplayLocale = "en"): string {
  const amount = displayAmount(usdAmount, locale)
  const sign = amount < 0 ? "-" : ""
  const abs = Math.abs(amount)
  const tag = localeTag(locale)

  if (abs >= 1_000_000_000) {
    const digits = abs % 1_000_000_000 === 0 ? 0 : 1
    const n = (abs / 1_000_000_000).toLocaleString(tag, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    return locale === "fr" ? `${sign}${n} Md€` : `${sign}€${n}bn`
  }

  if (abs >= 1_000_000) {
    const digits = abs % 1_000_000 === 0 ? 0 : 1
    const n = (abs / 1_000_000).toLocaleString(tag, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    return locale === "fr" ? `${sign}${n} M€` : `${sign}€${n}m`
  }

  if (abs >= 1_000) {
    const n = Math.round(abs / 1_000).toLocaleString(tag, {
      maximumFractionDigits: 0,
    })
    return locale === "fr" ? `${sign}${n} k€` : `${sign}€${n}k`
  }

  const n = Math.round(abs).toLocaleString(tag, {
    maximumFractionDigits: 0,
  })
  return locale === "fr" ? `${sign}${n} €` : `${sign}€${n}`
}

/** Unit prices (per hour, per day) with two decimals. Currency only. */
export function formatMoneyUnit(
  usdAmount: number,
  locale: DisplayLocale = "en",
): string {
  return formatMoney(usdAmount, locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

export function litresFromGallons(gallons: number): number {
  return gallons * US_GAL_TO_LITRE
}

export function kgFromLb(lb: number): number {
  return lb * LB_TO_KG
}

export function tonnesFromShortTons(shortTons: number): number {
  return shortTons * SHORT_TON_TO_TONNE
}

/** USD/gal seed → display currency per litre. */
export function fuelPriceDisplay(usdPerGal: number, locale: DisplayLocale = "en"): number {
  return displayAmount(usdPerGal, locale) / US_GAL_TO_LITRE
}

/** USD/lb seed → display currency per kg. */
export function massPriceDisplay(usdPerLb: number, locale: DisplayLocale = "en"): number {
  return displayAmount(usdPerLb, locale) / LB_TO_KG
}

/** USD/short ton seed → display currency per tonne. */
export function tonnePriceDisplay(usdPerShortTon: number, locale: DisplayLocale = "en"): number {
  return displayAmount(usdPerShortTon, locale) / SHORT_TON_TO_TONNE
}

export function formatFuelPrice(usdPerGal: number, locale: DisplayLocale = "en"): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: currencyCode(locale),
    maximumFractionDigits: 3,
    minimumFractionDigits: 2,
  }).format(fuelPriceDisplay(usdPerGal, locale))
}

export function formatFuelVolume(gallons: number, locale: DisplayLocale = "en"): string {
  const litres = litresFromGallons(gallons)
  return `${Math.round(litres).toLocaleString(localeTag(locale))} L`
}

export function formatMassPrice(usdPerLb: number, locale: DisplayLocale = "en"): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: currencyCode(locale),
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(massPriceDisplay(usdPerLb, locale))
}

export function formatTonnePrice(usdPerShortTon: number, locale: DisplayLocale = "en"): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: currencyCode(locale),
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(tonnePriceDisplay(usdPerShortTon, locale))
}

/** Label for the converted $0.10/gal sensitivity step. */
export function formatFuelSensitivityStep(locale: DisplayLocale = "en"): string {
  const perLitre = fuelPriceDisplay(USD_PER_GAL_SENSITIVITY, locale)
  const cents = Math.round(perLitre * 100)
  return locale === "fr" ? `${cents} c€/L` : `${cents} c€/L`
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9
}

export function formatCelsius(f: number, locale: DisplayLocale = "en"): string {
  const c = fahrenheitToCelsius(f)
  const n = c.toLocaleString(localeTag(locale), {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
  return `${n} °C`
}

/** US mpg → L/100 km. */
export function litresPer100kmFromMpg(mpg: number): number {
  if (mpg <= 0) return 0
  return 235.215 / mpg
}

export function formatFuelEconomyMpg(mpg: number, locale: DisplayLocale = "en"): string {
  const l100 = litresPer100kmFromMpg(mpg)
  const n = l100.toLocaleString(localeTag(locale), {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })
  return `${n} L/100 km`
}

export function displayMaterialUnit(nativeUnit: string, _locale: DisplayLocale = "en"): string {
  const symbol = "€"
  if (/short\s*ton/i.test(nativeUnit)) return `${symbol} / tonne`
  if (/\blb\b/i.test(nativeUnit)) return `${symbol} / kg`
  if (/USD/i.test(nativeUnit)) return nativeUnit.replace(/USD/gi, symbol)
  return nativeUnit
}

export function formatMaterialValue(
  nativeUnit: string,
  usdNative: number,
  locale: DisplayLocale = "en",
): string {
  if (/short\s*ton/i.test(nativeUnit)) return formatTonnePrice(usdNative, locale)
  if (/\blb\b/i.test(nativeUnit)) return formatMassPrice(usdNative, locale)
  return formatMoneyUnit(usdNative, locale)
}

export function money(usdAmount: number, locale: DisplayLocale = "en", compact = true): string {
  return compact ? formatCompactMoney(usdAmount, locale) : formatMoney(usdAmount, locale)
}
