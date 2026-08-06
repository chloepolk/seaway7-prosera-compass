import type { Locale } from "./types"

/**
 * Seed amounts in Future Energy are USD-denominated.
 * Display converts to EUR at a fixed demo FX rate.
 */
export const USD_TO_EUR = 0.92

function tag(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-GB"
}

export function toEur(usdAmount: number): number {
  return usdAmount * USD_TO_EUR
}

/** Full currency format, e.g. €229,632 / 229 632 € */
export function formatEur(
  usdAmount: number,
  locale: Locale = "en",
  opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  return new Intl.NumberFormat(tag(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
    minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
  }).format(toEur(usdAmount))
}

/**
 * Compact money for chips/KPIs.
 * EN: €230k / €1.2M
 * FR: 230 k€ / 1,2 M€
 */
export function formatCompactEur(usdAmount: number, locale: Locale = "en"): string {
  const eur = toEur(usdAmount)
  const sign = eur < 0 ? "-" : ""
  const abs = Math.abs(eur)

  if (abs >= 1_000_000) {
    const digits = abs % 1_000_000 === 0 ? 0 : 1
    const amount = (abs / 1_000_000).toLocaleString(tag(locale), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    return locale === "fr" ? `${sign}${amount} M€` : `${sign}€${amount}M`
  }

  if (abs >= 1_000) {
    const amount = Math.round(abs / 1_000).toLocaleString(tag(locale), {
      maximumFractionDigits: 0,
    })
    return locale === "fr" ? `${sign}${amount} k€` : `${sign}€${amount}k`
  }

  const amount = Math.round(abs).toLocaleString(tag(locale), {
    maximumFractionDigits: 0,
  })
  return locale === "fr" ? `${sign}${amount} €` : `${sign}€${amount}`
}

/** Unit prices (e.g. per gallon) with two decimals. */
export function formatEurUnit(usdAmount: number, locale: Locale = "en"): string {
  return formatEur(usdAmount, locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

/**
 * Format a USD seed amount for display in a template string.
 * Prefer this over embedding `$` prefixes in UI/data copy.
 */
export function money(usdAmount: number, locale: Locale = "en", compact = true): string {
  return compact ? formatCompactEur(usdAmount, locale) : formatEur(usdAmount, locale)
}
