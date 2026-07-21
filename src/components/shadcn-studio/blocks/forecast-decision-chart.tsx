"use client"

import * as React from "react"
import {
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  ComposedChart,
  Area,
} from "recharts"
import type { WeeklyDecisionPoint } from "./get-weekly-decision-forecast"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Optional translation function — when omitted, English defaults are used */
export type ChartT = (key: string, vars?: Record<string, string | number>) => string

const defaultT: ChartT = (key) => key

export interface ForecastDecisionChartProps {
  /** Array of weekly decision points */
  data: WeeklyDecisionPoint[]
  /** Chart variant: compact for right rail, fullscreen for modal */
  variant?: "compact" | "fullscreen"
  /** Optional class name for the container */
  className?: string
  /** Optional i18n translation function */
  t?: ChartT
}

// Extended data point for chart rendering
interface ChartDataPoint extends WeeklyDecisionPoint {
  /** Compact label for small views (W-4, W-3, ..., W1, W2, ...) */
  compactLabel: string
  /** Index for ordering */
  index: number
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const COLORS = {
  forecast: "#2563eb",          // blue-600 - BP order recommendation line
  forecastFill: "#dbeafe",      // blue-100 - forecast area
  actual: "#16a34a",            // green-600 - vendor shipped line
  actualFill: "#dcfce7",        // green-100 - actual area
  safety: "#f59e0b",            // amber-500 - BP demand forecast
  forecastDemand: "#f59e0b",    // amber-500 - BP demand forecast (alias)
  historical: "#f1f5f9",        // slate-100 - historical background
  grid: "#e5e7eb",              // gray-200
  text: "#6b7280",              // gray-500
  currentWeek: "#0f172a",       // slate-900 - current week marker
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Calculate Y-axis domain including all values
 */
function calculateYDomain(data: WeeklyDecisionPoint[]): [number, number] {
  if (data.length === 0) return [0, 100]

  const allValues: number[] = []
  
  data.forEach((point) => {
    allValues.push(point.demand)
    allValues.push(point.safety)
    if (point.actual !== undefined) allValues.push(point.actual)
    if (point.actualToDate !== undefined) allValues.push(point.actualToDate)
    if (point.forecastDemand !== undefined) allValues.push(point.forecastDemand)
  })

  const max = Math.max(...allValues)
  const min = Math.min(...allValues)
  const padding = (max - min) * 0.15 || 10

  return [
    Math.max(0, Math.floor(min - padding)),
    Math.ceil(max + padding),
  ]
}

/**
 * Generate verdict text based on future safety breaches
 */
function generateSummary(data: WeeklyDecisionPoint[], t: ChartT = defaultT): string | null {
  const futureData = data.filter(d => !d.isHistorical)
  if (futureData.length === 0) return null

  const breachWeeks = futureData
    .map((point, index) => ({ ...point, weekNumber: index + 1 }))
    .filter((point) => point.demand < point.safety)

  if (breachWeeks.length === 0) {
    return t("no_safety_risk")
  }

  if (breachWeeks.length === 1) {
    return t("risk_week_one", { n: breachWeeks[0].weekNumber })
  }

  const weekNumbers = breachWeeks.map((w) => w.weekNumber).join(` ${t("and")} `)
  return t("risk_weeks", { weeks: weekNumbers })
}

/**
 * Calculate forecast accuracy from historical data
 */
function calculateAccuracy(data: WeeklyDecisionPoint[], t: ChartT = defaultT): string | null {
  const historicalData = data.filter(d => d.isHistorical && d.actual !== undefined)
  if (historicalData.length === 0) return null

  let totalError = 0
  historicalData.forEach(point => {
    const error = Math.abs(point.demand - (point.actual || 0)) / (point.actual || 1)
    totalError += error
  })
  const avgError = totalError / historicalData.length
  const accuracy = Math.round((1 - avgError) * 100)
  
  return t("forecast_accuracy_pct", { pct: accuracy, weeks: historicalData.length })
}

/**
 * Transform data for chart rendering
 */
function transformData(data: WeeklyDecisionPoint[]): ChartDataPoint[] {
  return data.map((point, index) => ({
    ...point,
    compactLabel: point.isHistorical 
      ? `W${index - data.filter(d => d.isHistorical).length + 1}` 
      : `W${index - data.filter(d => d.isHistorical).length + 1}`,
    index,
  }))
}

// -----------------------------------------------------------------------------
// Custom Tooltip
// -----------------------------------------------------------------------------

interface TooltipPayload {
  dataKey: string
  value: number
  color: string
  name: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
  t?: ChartT
}

function DecisionTooltip({ active, payload, label, t = defaultT }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const forecastValue = payload.find((p) => p.dataKey === "demand")?.value
  const actualValue = payload.find((p) => p.dataKey === "actual")?.value
  const actualToDateValue = payload.find((p) => p.dataKey === "actualToDate")?.value
  const forecastDemandValue = payload.find((p) => p.dataKey === "forecastDemand")?.value

  const hasActual = actualValue !== undefined
  const hasActualToDate = actualToDateValue !== undefined

  return (
    <div className="rounded-lg border bg-background px-4 py-3 shadow-lg min-w-[220px]">
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      
      <div className="space-y-1.5 text-xs">
        {forecastValue !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.forecast }} />
              <span className="text-muted-foreground">{t("chart_forecast_demand")}</span>
            </div>
            <span className="font-medium text-foreground">{forecastValue}</span>
          </div>
        )}

        {hasActual && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.actual }} />
              <span className="text-muted-foreground">{t("chart_actual_demand")}</span>
            </div>
            <span className="font-medium text-foreground">{actualValue}</span>
          </div>
        )}

        {hasActualToDate && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.actual }} />
              <span className="text-muted-foreground">{t("chart_actual_to_date")}</span>
            </div>
            <span className="font-medium text-foreground">{actualToDateValue}</span>
          </div>
        )}

        {forecastDemandValue !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.forecastDemand }} />
              <span className="text-muted-foreground">{t("chart_safety_threshold")}</span>
            </div>
            <span className="font-medium text-foreground">{forecastDemandValue}</span>
          </div>
        )}

        {hasActual && forecastValue !== undefined && (
          <div className="border-t pt-1.5 mt-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{t("chart_forecast_vs_actual")}</span>
              <span className="font-medium" style={{ color: COLORS.actual }}>
                {Math.round((1 - Math.abs(forecastValue - actualValue) / actualValue) * 100)}% {t("chart_accurate")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// ForecastDecisionChart Component
// -----------------------------------------------------------------------------

export function ForecastDecisionChart({
  data,
  variant = "fullscreen",
  className,
  t: tProp,
}: ForecastDecisionChartProps) {
  const t = tProp ?? defaultT
  const isCompact = variant === "compact"
  const [yMin, yMax] = calculateYDomain(data)
  
  // Find current week for reference line
  const currentWeekData = data.find(d => d.isCurrentWeek)
  const currentWeekLabel = currentWeekData?.weekLabel
  
  // Check for historical data
  const hasHistorical = data.some(d => d.isHistorical)
  const hasActualToDate = currentWeekData?.actualToDate !== undefined
  
  // Get first historical and first future labels for reference area
  const firstHistoricalLabel = data.find(d => d.isHistorical)?.weekLabel
  const lastHistoricalLabel = [...data].reverse().find(d => d.isHistorical)?.weekLabel
  
  // Generate summaries (fullscreen only)
  const summary = React.useMemo(() => 
    isCompact ? null : generateSummary(data, t), 
    [data, isCompact, t]
  )
  const accuracy = React.useMemo(() =>
    isCompact ? null : calculateAccuracy(data, t),
    [data, isCompact, t]
  )
  
  // Transform data for chart
  const chartData = React.useMemo(() => transformData(data), [data])

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className ?? ""}`}>
        <p className="text-sm text-muted-foreground">{t("no_forecast_data")}</p>
      </div>
    )
  }

  // Compact variant: minimal UI
  if (isCompact) {
    return (
      <div className={className} style={{ width: "100%", height: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            {/* Historical background shading */}
            {hasHistorical && firstHistoricalLabel && lastHistoricalLabel && (
              <ReferenceArea
                x1={firstHistoricalLabel}
                x2={lastHistoricalLabel}
                fill={COLORS.historical}
                fillOpacity={0.5}
              />
            )}

            <XAxis
              dataKey="weekLabel"
              axisLine={{ stroke: COLORS.grid }}
              tickLine={false}
              tick={{ fontSize: 8, fill: COLORS.text }}
              dy={4}
              interval={data.length > 10 ? Math.ceil(data.length / 6) - 1 : 0}
              angle={-45}
              textAnchor="end"
              height={40}
            />

            <YAxis domain={[yMin, yMax]} hide />

            {/* BP demand forecast (amber dashed) */}
            <Line
              type="monotone"
              dataKey="forecastDemand"
              name="ForecastDemand"
              stroke={COLORS.forecastDemand}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />

            {/* Vendor shipped (green) */}
            {hasHistorical && (
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke={COLORS.actual}
                strokeWidth={2}
                dot={{ fill: COLORS.actual, r: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            )}

            {/* BP order recommendation (blue) */}
            <Line
              type="monotone"
              dataKey="demand"
              name="Forecast"
              stroke={COLORS.forecast}
              strokeWidth={2}
              dot={{ fill: COLORS.forecast, r: 2 }}
              isAnimationActive={false}
            />

            {/* Current week actual-to-date marker */}
            {hasActualToDate && currentWeekLabel && (
              <ReferenceDot
                x={currentWeekLabel}
                y={currentWeekData.actualToDate!}
                r={3}
                fill={COLORS.actual}
                stroke="#fff"
                strokeWidth={1}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Fullscreen variant: full UI
  return (
    <div className={className} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.forecast} stopOpacity={0.2} />
                <stop offset="100%" stopColor={COLORS.forecastFill} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            {/* Historical background shading */}
            {hasHistorical && firstHistoricalLabel && lastHistoricalLabel && (
              <ReferenceArea
                x1={firstHistoricalLabel}
                x2={lastHistoricalLabel}
                fill={COLORS.historical}
                fillOpacity={0.6}
                label={{
                  value: t("chart_historical"),
                  position: "insideTopLeft",
                  fill: COLORS.text,
                  fontSize: 10,
                }}
              />
            )}

            {/* Current week vertical line */}
            {currentWeekLabel && (
              <ReferenceLine
                x={currentWeekLabel}
                stroke={COLORS.currentWeek}
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: t("chart_today"),
                  position: "insideTopRight",
                  fill: COLORS.currentWeek,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            <XAxis
              dataKey="weekLabel"
              axisLine={{ stroke: COLORS.grid }}
              tickLine={false}
              tick={{ fontSize: 10, fill: COLORS.text }}
              dy={8}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />

            <YAxis
              domain={[yMin, yMax]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: COLORS.text }}
              width={45}
              tickFormatter={(value) => value.toLocaleString()}
            />

            <Tooltip content={<DecisionTooltip t={t} />} />

            {/* BP order recommendation area + line (blue) */}
            <Area
              type="monotone"
              dataKey="demand"
              name="Forecast"
              stroke={COLORS.forecast}
              strokeWidth={2.5}
              fill="url(#forecastGradient)"
              fillOpacity={1}
              dot={{ fill: COLORS.forecast, r: 4, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, fill: COLORS.forecast, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {/* Vendor shipped (green) */}
            {hasHistorical && (
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke={COLORS.actual}
                strokeWidth={2.5}
                dot={{ fill: COLORS.actual, r: 4, strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, fill: COLORS.actual, stroke: "#fff", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            )}

            {/* BP demand forecast (amber dashed) */}
            <Line
              type="monotone"
              dataKey="forecastDemand"
              name="ForecastDemand"
              stroke={COLORS.forecastDemand}
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />

            {/* Current week actual-to-date marker */}
            {hasActualToDate && currentWeekLabel && (
              <ReferenceDot
                x={currentWeekLabel}
                y={currentWeekData.actualToDate!}
                r={5}
                fill={COLORS.actual}
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4" style={{ backgroundColor: COLORS.forecast }} />
          <span className="text-muted-foreground">{t("chart_forecast_demand")}</span>
        </div>
        {hasHistorical && (
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4" style={{ backgroundColor: COLORS.actual }} />
            <span className="text-muted-foreground">{t("chart_actual_demand")}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: COLORS.forecastDemand }} />
          <span className="text-muted-foreground">{t("chart_safety_threshold")}</span>
        </div>
      </div>

      {/* Summaries */}
      <div className="mt-3 space-y-1 shrink-0">
        {accuracy && (
          <p className="text-xs text-muted-foreground text-left" style={{ color: COLORS.actual }}>
            {accuracy}
          </p>
        )}
        {summary && (
          <p className="text-xs text-muted-foreground text-left">
            {summary}
          </p>
        )}
      </div>
    </div>
  )
}

export default ForecastDecisionChart
