import type { ForecastDataPoint } from "./forecast-chart"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface WeeklyDecisionPoint {
  /** Week label, e.g. "Jan 29–Feb 4" */
  weekLabel: string
  /** BP recommended order rate (bpQty / 2 weekly equiv) */
  demand: number
  /** Vendor shipped — actual deliveries to DC (historical weeks only) */
  actual?: number
  /** Vendor shipped to date (current week only) */
  actualToDate?: number
  /** BP demand forecast — predicted weekly consumption from BP model */
  safety: number
  /** Whether this is a historical week (before anchor) */
  isHistorical: boolean
  /** Whether this is the current week (contains anchor date) */
  isCurrentWeek: boolean
  /** BP demand forecast value (mean of model runs, from pred_vs_actual CSV) */
  forecastDemand?: number
}

export interface WeeklyDecisionInput {
  /** Array of daily forecast data points */
  data: ForecastDataPoint[]
  /** ISO date string marking the start of the forecast window (today) */
  anchorDate: string
}

export interface WeeklyDecisionOutput {
  /** Array of 8 weekly buckets (4 historical + 4 future) */
  weeks: WeeklyDecisionPoint[]
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DAYS_PER_WEEK = 7
const HISTORICAL_WEEKS = 4
const FUTURE_WEEKS = 4
const MONTH_ABBREV = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Parse an ISO date string to a Date object (normalized to midnight UTC)
 */
function parseDate(isoDate: string): Date {
  const date = new Date(isoDate)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Format a date range label, e.g. "Jan 29–Feb 4"
 */
function formatDateRange(startDate: Date, endDate: Date): string {
  const startMonth = MONTH_ABBREV[startDate.getUTCMonth()]
  const startDay = startDate.getUTCDate()
  const endMonth = MONTH_ABBREV[endDate.getUTCMonth()]
  const endDay = endDate.getUTCDate()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`
  }
  return `${startMonth} ${startDay}–${endMonth} ${endDay}`
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

// -----------------------------------------------------------------------------
// Main Function
// -----------------------------------------------------------------------------

/**
 * Transforms daily forecast data into 8 weekly decision buckets.
 *
 * - 4 historical weeks (before anchor): shows actual + forecast for accuracy comparison
 * - Current week (contains anchor): shows actualToDate + forecast
 * - 3 future weeks (after anchor): shows forecast only
 *
 * @param input - The input data and anchor date
 * @returns Array of WeeklyDecisionPoint (up to 8 weeks)
 */
export function getWeeklyDecisionForecast(
  input: WeeklyDecisionInput
): WeeklyDecisionOutput {
  const { data, anchorDate } = input

  if (data.length === 0) {
    return { weeks: [] }
  }

  const anchor = parseDate(anchorDate)

  // Create a map of date string -> data point for quick lookup
  const dataByDate = new Map<string, ForecastDataPoint>()
  for (const point of data) {
    const dateKey = formatDate(parseDate(point.date))
    dataByDate.set(dateKey, point)
  }

  const weeks: WeeklyDecisionPoint[] = []

  // Loop from -4 weeks (historical) to +3 weeks (future), 0 = current week
  for (let weekOffset = -HISTORICAL_WEEKS; weekOffset < FUTURE_WEEKS; weekOffset++) {
    const weekStartDate = addDays(anchor, weekOffset * DAYS_PER_WEEK)
    const weekEndDate = addDays(weekStartDate, DAYS_PER_WEEK - 1)
    const isHistorical = weekOffset < 0
    const isCurrentWeek = weekOffset === 0

    let demandSum = 0
    let actualSum = 0
    let actualToDateSum = 0
    let safetySum = 0
    let hasActual = false
    let hasActualToDate = false
    let hasDemand = false
    let hasSafety = false

    // Iterate through each day of the week
    for (let dayOffset = 0; dayOffset < DAYS_PER_WEEK; dayOffset++) {
      const currentDate = addDays(weekStartDate, dayOffset)
      const dateKey = formatDate(currentDate)
      const point = dataByDate.get(dateKey)

      if (point) {
        // Sum forecast values (demand)
        if (point.forecast !== undefined) {
          demandSum += point.forecast
          hasDemand = true
        }

        // Sum actual values
        if (point.actual !== undefined) {
          if (isHistorical) {
            // Historical weeks: sum all actuals for the full week
            actualSum += point.actual
            hasActual = true
          } else if (isCurrentWeek) {
            // Current week: only sum actuals through anchorDate
            if (currentDate.getTime() <= anchor.getTime()) {
              actualToDateSum += point.actual
              hasActualToDate = true
            }
          }
        }

        // Sum safety values
        if (point.safety !== undefined) {
          safetySum += point.safety
          hasSafety = true
        }
      }
    }

    // Only include weeks that have some data
    if (hasDemand || hasActual || hasActualToDate || hasSafety) {
      const weekLabel = formatDateRange(weekStartDate, weekEndDate)

      weeks.push({
        weekLabel,
        demand: Math.round(demandSum),
        actual: isHistorical && hasActual ? Math.round(actualSum) : undefined,
        actualToDate: isCurrentWeek && hasActualToDate ? Math.round(actualToDateSum) : undefined,
        safety: Math.round(safetySum),
        isHistorical,
        isCurrentWeek,
      })
    }
  }

  return { weeks }
}

export default getWeeklyDecisionForecast
