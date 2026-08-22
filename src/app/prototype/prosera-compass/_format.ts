import {
  formatCompactMoney,
  formatMoney,
  formatMoneyUnit,
  formatFuelPrice,
  formatFuelVolume,
  formatFuelSensitivityStep,
  formatFuelEconomyMpg,
  formatMassPrice,
  formatTonnePrice,
  displayMaterialUnit,
  formatMaterialValue,
  formatCelsius,
} from "@/lib/compass/locale-display"

const EN = "en" as const

/** Compact GBP for chips/KPIs: £230k / £1.2m */
export function formatGbp(usdAmount: number, compact = true): string {
  return compact ? formatCompactMoney(usdAmount, EN) : formatMoney(usdAmount, EN)
}

export function formatGbpExact(usdAmount: number): string {
  return formatMoney(usdAmount, EN, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}

export function formatGbpUnit(usdAmount: number): string {
  return formatMoneyUnit(usdAmount, EN)
}

export function formatFuelUnit(usdPerGal: number): string {
  return formatFuelPrice(usdPerGal, EN)
}

export function formatLitres(gallons: number): string {
  return formatFuelVolume(gallons, EN)
}

export function fuelSensitivityStep(): string {
  return formatFuelSensitivityStep(EN)
}

export function formatEconomy(mpg: number): string {
  return formatFuelEconomyMpg(mpg, EN)
}

export { formatMassPrice, formatTonnePrice, displayMaterialUnit, formatMaterialValue, formatCelsius }
