import type { Locale } from "./types"

/**
 * Seed amounts in Future Energy are USD-denominated.
 * English locale displays USD; French converts to EUR at a fixed demo FX rate.
 */
export const USD_TO_EUR = 0.92

function tag(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-US"
}

export function toEur(usdAmount: number): number {
  return usdAmount * USD_TO_EUR
}

/** Amount to display for the active locale (USD seed → EUR when fr). */
export function displayAmount(usdAmount: number, locale: Locale = "en"): number {
  return locale === "fr" ? toEur(usdAmount) : usdAmount
}

export function currencyCode(locale: Locale = "en"): "USD" | "EUR" {
  return locale === "fr" ? "EUR" : "USD"
}

/** Full currency format. EN: $229,632 · FR: 229 632 € */
export function formatMoney(
  usdAmount: number,
  locale: Locale = "en",
  opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  return new Intl.NumberFormat(tag(locale), {
    style: "currency",
    currency: currencyCode(locale),
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
    minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
  }).format(displayAmount(usdAmount, locale))
}

/**
 * Compact money for chips/KPIs.
 * EN: $230k / $1.2M
 * FR: 230 k€ / 1,2 M€
 */
export function formatCompactMoney(usdAmount: number, locale: Locale = "en"): string {
  const amount = displayAmount(usdAmount, locale)
  const sign = amount < 0 ? "-" : ""
  const abs = Math.abs(amount)

  if (abs >= 1_000_000) {
    const digits = abs % 1_000_000 === 0 ? 0 : 1
    const n = (abs / 1_000_000).toLocaleString(tag(locale), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    return locale === "fr" ? `${sign}${n} M€` : `${sign}$${n}M`
  }

  if (abs >= 1_000) {
    const n = Math.round(abs / 1_000).toLocaleString(tag(locale), {
      maximumFractionDigits: 0,
    })
    return locale === "fr" ? `${sign}${n} k€` : `${sign}$${n}k`
  }

  const n = Math.round(abs).toLocaleString(tag(locale), {
    maximumFractionDigits: 0,
  })
  return locale === "fr" ? `${sign}${n} €` : `${sign}$${n}`
}

/** Unit prices (e.g. per gallon) with two decimals. */
export function formatMoneyUnit(usdAmount: number, locale: Locale = "en"): string {
  return formatMoney(usdAmount, locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

/** @deprecated Prefer formatMoney — kept for call-site compatibility. */
export const formatEur = formatMoney
/** @deprecated Prefer formatCompactMoney — kept for call-site compatibility. */
export const formatCompactEur = formatCompactMoney
/** @deprecated Prefer formatMoneyUnit — kept for call-site compatibility. */
export const formatEurUnit = formatMoneyUnit

export function money(usdAmount: number, locale: Locale = "en", compact = true): string {
  return compact ? formatCompactMoney(usdAmount, locale) : formatMoney(usdAmount, locale)
}
