"use client"

import * as React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ForecastDataPoint {
  date: string
  actual?: number
  forecast?: number
  safety: number
}

export interface ForecastChartProps {
  /** Array of data points with date, optional actual/forecast values, and safety stock */
  data: ForecastDataPoint[]
  /** Display variant: compact for sidebar/rail, fullscreen for expanded view */
  variant: "compact" | "fullscreen"
  /** ISO date string marking the start of the forecast window (for background shading) */
  forecastStartDate: string
  /** Optional class name for the container */
  className?: string
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const COLORS = {
  actual: "#374151",      // gray-700 - solid dark line
  forecast: "#2563eb",    // blue-600 - primary blue
  safety: "#9ca3af",      // gray-400 - neutral thin line
  forecastArea: "#dbeafe", // blue-100 - subtle forecast window shading
  grid: "#e5e7eb",        // gray-200
  tooltipBg: "hsl(var(--background))",
  tooltipBorder: "hsl(var(--border))",
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Calculate Y-axis domain with padding for better visualization
 */
function calculateYDomain(data: ForecastDataPoint[]): [number, number] {
  const allValues: number[] = []
  
  data.forEach((point) => {
    if (point.actual !== undefined) allValues.push(point.actual)
    if (point.forecast !== undefined) allValues.push(point.forecast)
    allValues.push(point.safety)
  })
  
  if (allValues.length === 0) return [0, 100]
  
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const padding = (max - min) * 0.1 || 10
  
  return [
    Math.max(0, Math.floor(min - padding)),
    Math.ceil(max + padding),
  ]
}

// -----------------------------------------------------------------------------
// Custom Tooltip
// -----------------------------------------------------------------------------

interface TooltipPayloadItem {
  dataKey: string
  value: number
  color: string
  name: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      className="rounded-lg border bg-background px-3 py-2 shadow-md"
      style={{
        borderColor: COLORS.tooltipBorder,
      }}
    >
      <p className="mb-1.5 text-xs font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}:</span>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// X-Axis Tick Formatter
// -----------------------------------------------------------------------------

function formatXAxisTick(value: string, variant: "compact" | "fullscreen"): string {
  // Attempt to parse as date
  const date = new Date(value)
  
  if (isNaN(date.getTime())) {
    // Not a valid date, return as-is (truncated for compact)
    return variant === "compact" ? value.slice(0, 3) : value
  }
  
  if (variant === "compact") {
    // Compact: show just day number or abbreviated
    return date.getDate().toString()
  }
  
  // Fullscreen: show "Jan 15" format
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}`
}

// -----------------------------------------------------------------------------
// ForecastChart Component
// -----------------------------------------------------------------------------

export function ForecastChart({
  data,
  variant,
  forecastStartDate,
  className,
}: ForecastChartProps) {
  // Margins based on variant
  const margins = variant === "compact"
    ? { top: 8, right: 8, left: -20, bottom: 4 }
    : { top: 16, right: 16, left: 8, bottom: 8 }

  // Calculate Y-axis domain
  const [yMin, yMax] = calculateYDomain(data)

  // Forecast window ends at the last data point
  const forecastEndDate = data.length > 0 ? data[data.length - 1].date : null

  // Determine X-axis ticks based on variant
  const xAxisTicks = React.useMemo(() => {
    if (data.length === 0) return []
    
    if (variant === "compact") {
      // Compact: show first, middle, and last tick
      if (data.length <= 3) return data.map((d) => d.date)
      const midIndex = Math.floor(data.length / 2)
      return [data[0].date, data[midIndex].date, data[data.length - 1].date]
    }
    
    // Fullscreen: show all ticks
    return data.map((d) => d.date)
  }, [data, variant])

  // For compact mode, we need to account for the legend height
  const chartContainerStyle = variant === "compact"
    ? { width: "100%", height: "100%", display: "flex", flexDirection: "column" as const }
    : { width: "100%", height: "100%", display: "flex", flexDirection: "column" as const }

  return (
    <div className={className} style={chartContainerStyle}>
      <div style={{ flex: 1, minHeight: 0, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={margins}>
          {/* Forecast window shading - starts exactly at forecastStartDate */}
          {forecastStartDate && forecastEndDate && (
            <ReferenceArea
              x1={forecastStartDate}
              x2={forecastEndDate}
              y1={yMin}
              y2={yMax}
              fill={COLORS.forecastArea}
              fillOpacity={0.5}
              stroke="none"
            />
          )}

          {/* Safety stock reference line (horizontal) - fullscreen only */}
          {variant === "fullscreen" && data.length > 0 && data[0].safety !== undefined && (
            <ReferenceLine
              y={data[0].safety}
              stroke={COLORS.safety}
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: "Safety",
                position: "right",
                fill: COLORS.safety,
                fontSize: 10,
              }}
            />
          )}

          {/* X-Axis */}
          <XAxis
            dataKey="date"
            axisLine={{ stroke: COLORS.grid }}
            tickLine={false}
            tick={{
              fontSize: variant === "compact" ? 9 : 11,
              fill: "hsl(var(--muted-foreground))",
            }}
            ticks={xAxisTicks}
            tickFormatter={(value) => formatXAxisTick(value, variant)}
            interval="preserveStartEnd"
          />

          {/* Y-Axis */}
          <YAxis
            domain={[yMin, yMax]}
            axisLine={false}
            tickLine={false}
            tick={{
              fontSize: variant === "compact" ? 9 : 11,
              fill: "hsl(var(--muted-foreground))",
            }}
            width={variant === "compact" ? 30 : 40}
            tickCount={variant === "compact" ? 3 : 5}
          />

          {/* Tooltip */}
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: "hsl(var(--border))",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />

          {/* Safety Stock Line - thin neutral dashed */}
          <Line
            type="monotone"
            dataKey="safety"
            name="Safety Stock"
            stroke={COLORS.safety}
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Actual Line - solid dark */}
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke={COLORS.actual}
            strokeWidth={2}
            dot={
              variant === "fullscreen"
                ? { fill: COLORS.actual, r: 2.5 }
                : false
            }
            activeDot={{ r: 4, fill: COLORS.actual, stroke: "#fff", strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Forecast Line - dashed blue */}
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke={COLORS.forecast}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={
              variant === "fullscreen"
                ? { fill: COLORS.forecast, r: 2.5 }
                : false
            }
            activeDot={{ r: 4, fill: COLORS.forecast, stroke: "#fff", strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - hidden in compact mode to save space */}
      {variant === "fullscreen" && (
        <div className="flex items-center justify-center gap-6 mt-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <div
              className="h-0.5 w-4"
              style={{ backgroundColor: COLORS.actual }}
            />
            <span className="text-muted-foreground">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-0.5 w-4"
              style={{
                background: `repeating-linear-gradient(to right, ${COLORS.forecast} 0, ${COLORS.forecast} 4px, transparent 4px, transparent 6px)`,
              }}
            />
            <span className="text-muted-foreground">Forecast</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-0.5 w-4 border-t border-dashed"
              style={{ borderColor: COLORS.safety }}
            />
            <span className="text-muted-foreground">Safety</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ForecastChart
