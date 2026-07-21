import type { ForecastDataPoint } from "./forecast-chart"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RollingForecastInput {
  /** Unsorted array of forecast data points (may contain mixed actual/forecast values) */
  data: ForecastDataPoint[]
  /** ISO date string representing "today" or the store-local anchor point */
  anchorDate: string
}

export interface RollingForecastOutput {
  /** Sorted ForecastDataPoint[] suitable for ForecastChart (ascending by date) */
  data: ForecastDataPoint[]
  /** The forecast start date (same as anchorDate) for use with ForecastChart */
  forecastStartDate: string
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MAX_DAYS = 28
const MS_PER_DAY = 24 * 60 * 60 * 1000

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Parse an ISO date string to a Date object (normalized to midnight UTC)
 */
function parseDate(isoDate: string): Date {
  const date = new Date(isoDate)
  // Normalize to midnight UTC to avoid timezone issues
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Calculate the difference in days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  return Math.round((date2.getTime() - date1.getTime()) / MS_PER_DAY)
}

// -----------------------------------------------------------------------------
// Main Function
// -----------------------------------------------------------------------------

/**
 * Generates a 4-week rolling forecast window centered around an anchor date.
 *
 * - Past: includes actual values on or before anchorDate
 * - Future: includes forecast values strictly after anchorDate, up to +28 days total
 * - If a day has both actual and forecast, keeps actual
 * - Does NOT fabricate data for missing days
 * - Sorts output by date ascending
 *
 * @param input - The input data and anchor date
 * @returns Sorted ForecastDataPoint[] and forecastStartDate for ForecastChart
 */
export function getFourWeekRollingForecast(
  input: RollingForecastInput
): RollingForecastOutput {
  const { data, anchorDate } = input

  if (data.length === 0) {
    return {
      data: [],
      forecastStartDate: anchorDate,
    }
  }

  const anchor = parseDate(anchorDate)
  const maxFutureDate = new Date(anchor.getTime() + MAX_DAYS * MS_PER_DAY)

  // Group data points by date string for deduplication
  const pointsByDate = new Map<string, ForecastDataPoint>()

  for (const point of data) {
    const pointDate = parseDate(point.date)
    const dateKey = formatDate(pointDate)

    // Calculate days from anchor
    const daysFromAnchor = daysBetween(anchor, pointDate)

    // Filter: include past/present (≤0) and future up to MAX_DAYS
    if (daysFromAnchor > MAX_DAYS) {
      continue // Too far in the future
    }

    // Check if this is past/present (on or before anchor) or future
    const isPastOrPresent = daysFromAnchor <= 0
    const isFuture = daysFromAnchor > 0

    // Get existing point for this date (if any)
    const existing = pointsByDate.get(dateKey)

    if (!existing) {
      // First point for this date
      if (isPastOrPresent) {
        // Past/present: prefer actual, clear forecast
        pointsByDate.set(dateKey, {
          date: dateKey,
          actual: point.actual,
          forecast: undefined, // Don't include forecast for past dates
          safety: point.safety,
        })
      } else if (isFuture) {
        // Future: prefer forecast, clear actual
        pointsByDate.set(dateKey, {
          date: dateKey,
          actual: undefined, // Don't include actual for future dates
          forecast: point.forecast,
          safety: point.safety,
        })
      }
    } else {
      // Merge with existing point for this date
      if (isPastOrPresent) {
        // Past/present: actual takes precedence
        pointsByDate.set(dateKey, {
          date: dateKey,
          actual: point.actual ?? existing.actual,
          forecast: undefined, // Don't include forecast for past dates
          safety: point.safety ?? existing.safety,
        })
      } else if (isFuture) {
        // Future: forecast takes precedence, but if actual exists keep it
        // (edge case: if both exist, keep actual per requirements)
        if (point.actual !== undefined || existing.actual !== undefined) {
          pointsByDate.set(dateKey, {
            date: dateKey,
            actual: point.actual ?? existing.actual,
            forecast: undefined,
            safety: point.safety ?? existing.safety,
          })
        } else {
          pointsByDate.set(dateKey, {
            date: dateKey,
            actual: undefined,
            forecast: point.forecast ?? existing.forecast,
            safety: point.safety ?? existing.safety,
          })
        }
      }
    }
  }

  // Convert map to array and sort by date ascending
  const result = Array.from(pointsByDate.values()).sort((a, b) => {
    return parseDate(a.date).getTime() - parseDate(b.date).getTime()
  })

  return {
    data: result,
    forecastStartDate: anchorDate,
  }
}

export default getFourWeekRollingForecast
