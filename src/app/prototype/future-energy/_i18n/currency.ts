import type { Locale } from "./types"
import {
  USD_TO_EUR as SHARED_USD_TO_EUR,
  displayAmount as sharedDisplayAmount,
  currencyCode as sharedCurrencyCode,
  formatMoney as sharedFormatMoney,
  formatCompactMoney as sharedFormatCompactMoney,
  formatMoneyUnit as sharedFormatMoneyUnit,
  money as sharedMoney,
  type DisplayLocale,
} from "@/lib/compass/locale-display"

/**
 * Seed amounts are USD-denominated.
 * English and French display EUR. Prototype FX is in locale-display.ts.
 */
export const USD_TO_EUR = SHARED_USD_TO_EUR

function asDisplay(locale: Locale): DisplayLocale {
  return locale === "fr" ? "fr" : "en"
}

export function toEur(usdAmount: number): number {
  return usdAmount * USD_TO_EUR
}

/** Amount to display (USD seed → EUR). */
export function displayAmount(usdAmount: number, locale: Locale = "en"): number {
  return sharedDisplayAmount(usdAmount, asDisplay(locale))
}

export function currencyCode(locale: Locale = "en"): "EUR" {
  return sharedCurrencyCode(asDisplay(locale))
}

/** Full currency format. EN: €229,632 · FR: 229 632 € */
export function formatMoney(
  usdAmount: number,
  locale: Locale = "en",
  opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  return sharedFormatMoney(usdAmount, asDisplay(locale), opts)
}

/**
 * Compact money for chips/KPIs.
 * EN: €230k / €1.2m
 * FR: 230 k€ / 1,2 M€
 */
export function formatCompactMoney(usdAmount: number, locale: Locale = "en"): string {
  return sharedFormatCompactMoney(usdAmount, asDisplay(locale))
}

/** Unit prices (e.g. per hour) with two decimals. */
export function formatMoneyUnit(usdAmount: number, locale: Locale = "en"): string {
  return sharedFormatMoneyUnit(usdAmount, asDisplay(locale))
}

/** @deprecated Prefer formatMoney — kept for call-site compatibility. */
export const formatEur = formatMoney
/** @deprecated Prefer formatCompactMoney — kept for call-site compatibility. */
export const formatCompactEur = formatCompactMoney
/** @deprecated Prefer formatMoneyUnit — kept for call-site compatibility. */
export const formatEurUnit = formatMoneyUnit

export function money(usdAmount: number, locale: Locale = "en", compact = true): string {
  return sharedMoney(usdAmount, asDisplay(locale), compact)
}
