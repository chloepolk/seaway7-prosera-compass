"use client"

import * as React from "react"
import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine, ReferenceArea } from "recharts"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { useXAxisViewport } from "@/components/shadcn-studio/x-chart-pan-zoom/XAxisViewport"
import { XAxisPanZoomControls } from "@/components/shadcn-studio/x-chart-pan-zoom/XAxisPanZoomControls"

// Day-of-year for 1st of each month (non-leap year)
const monthStartDays = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]
const monthAbbreviations = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthFullNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

// Generate data points for every 3 days throughout the year (approximately 122 data points)
const generateData = () => {
  const data = []
  const baseValues = [
    { day: 1, value: 186 },
    { day: 32, value: 305 },
    { day: 60, value: 237 },
    { day: 91, value: 273 },
    { day: 121, value: 209 },
    { day: 152, value: 214 },
    { day: 182, value: 285 },
    { day: 213, value: 320 },
    { day: 244, value: 275 },
    { day: 274, value: 340 },
    { day: 305, value: 290 },
    { day: 335, value: 365 }
  ]

  for (let day = 1; day <= 365; day += 3) {
    // Find the two base values to interpolate between
    let lowerBase = baseValues[0]
    let upperBase = baseValues[baseValues.length - 1]
    
    for (let i = 0; i < baseValues.length - 1; i++) {
      if (day >= baseValues[i].day && day <= baseValues[i + 1].day) {
        lowerBase = baseValues[i]
        upperBase = baseValues[i + 1]
        break
      }
    }

    // Linear interpolation with some randomness for variation
    const range = upperBase.day - lowerBase.day
    const position = (day - lowerBase.day) / range
    const interpolated = lowerBase.value + (upperBase.value - lowerBase.value) * position
    const variation = (Math.random() - 0.5) * 30 // ±15 variation
    const value = Math.max(80, Math.min(500, Math.round(interpolated + variation)))

    const monthIndex = monthStartDays.findIndex((startDay, idx) => {
      const nextStart = idx < monthStartDays.length - 1 ? monthStartDays[idx + 1] : 366
      return day >= startDay && day < nextStart
    })
    const month = monthIndex !== -1 ? monthAbbreviations[monthIndex] : "Jan"

    data.push({
      dayOfYear: day,
      month,
      value
    })
  }

  return data
}

const allData = generateData()

const TypeLineChartInventoryPanzoom = () => {
  // Initialize pan-zoom viewport for numeric axis (day-of-year 1-365)
  const xAxis = useXAxisViewport({
    axisType: 'numeric',
    worldMin: 1,
    worldMax: 365,
    worldWidth: 364,
    maxZoom: 500,
    targetTickCount: 8,
    initialToFullRange: true,
    isEnabled: true
  })

  // Filter data to only show points within the viewport
  const filteredData = useMemo(() => {
    return allData.filter(
      (point) => point.dayOfYear >= xAxis.viewMin && point.dayOfYear <= xAxis.viewMax
    )
  }, [xAxis.viewMin, xAxis.viewMax])

  // Filter month start days to only show those within viewport
  const visibleMonthLines = useMemo(() => {
    return monthStartDays.filter(
      (day) => day >= xAxis.viewMin && day <= xAxis.viewMax
    )
  }, [xAxis.viewMin, xAxis.viewMax])

  // Filter month ticks to show month labels only for visible month start days
  const visibleMonthTicks = useMemo(() => {
    return monthStartDays.filter(
      (day) => day >= xAxis.viewMin && day <= xAxis.viewMax
    )
  }, [xAxis.viewMin, xAxis.viewMax])

  // Check if reference areas intersect with viewport
  const blueBandStart = 244
  const blueBandEnd = 304.5
  const greyBandStart = 304.5
  const greyBandEnd = 365

  const showBlueBand = useMemo(() => {
    return blueBandEnd >= xAxis.viewMin && blueBandStart <= xAxis.viewMax
  }, [xAxis.viewMin, xAxis.viewMax])

  const showGreyBand = useMemo(() => {
    return greyBandEnd >= xAxis.viewMin && greyBandStart <= xAxis.viewMax
  }, [xAxis.viewMin, xAxis.viewMax])

  return (
    <Card className="w-full rounded-xl border">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <SafeIcon name="LineChart" className="size-3.5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Line Chart</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-base font-semibold">Line Chart - Pan & Zoom</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">January - December 2024</CardDescription>
        </div>
        
        <div className="w-full min-w-0 space-y-4">
          <div className="h-[500px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 5, right: 20, left: 20, bottom: 40 }}>
                {/* Vertical bands for time periods - only show if within viewport */}
                {showBlueBand && (
                  <ReferenceArea 
                    x1={Math.max(blueBandStart, xAxis.viewMin)} 
                    x2={Math.min(blueBandEnd, xAxis.viewMax)} 
                    y1={0} 
                    y2={500} 
                    fill="#3b82f6" 
                    fillOpacity={0.1}
                    stroke="none"
                  />
                )}
                {showGreyBand && (
                  <ReferenceArea 
                    x1={Math.max(greyBandStart, xAxis.viewMin)} 
                    x2={Math.min(greyBandEnd, xAxis.viewMax)} 
                    y1={0} 
                    y2={500} 
                    fill="#64748b" 
                    fillOpacity={0.15}
                    stroke="none"
                  />
                )}
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                {/* Monthly reference lines - only show if within viewport */}
                {visibleMonthLines.map((day) => (
                  <ReferenceLine 
                    key={`month-line-${day}`}
                    x={day} 
                    stroke="#64748b" 
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    opacity={0.7}
                    ifOverflow="visible"
                  />
                ))}
                <XAxis 
                  dataKey="dayOfYear"
                  type="number"
                  domain={xAxis.domain}
                  ticks={visibleMonthTicks}
                  tickFormatter={(day) => {
                    const monthIndex = monthStartDays.indexOf(day)
                    return monthIndex !== -1 ? monthAbbreviations[monthIndex] : ''
                  }}
                  axisLine={true}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'var(--foreground)', dx: 1, textAnchor: 'start' }}
                  stroke="hsl(var(--border))"
                  allowDuplicatedCategory={false}
                  label={{ value: 'Month', position: 'insideBottom', offset: -5, style: { fill: 'var(--foreground)', fontSize: '0.875rem' } }}
                />
                <YAxis 
                  axisLine={true}
                  tickLine={true}
                  tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                  stroke="hsl(var(--border))"
                  width={50}
                  domain={[0, 500]}
                  label={{ value: 'Sales', angle: -90, position: 'insideLeft', style: { fill: 'var(--foreground)' } }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'oklch(1.00 0 0)',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    margin: '0.5rem',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
                  }}
                  labelStyle={{
                    color: 'oklch(0.35 0 0)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    marginBottom: '0.5rem'
                  }}
                  itemStyle={{
                    color: 'oklch(0.35 0 0)',
                    fontSize: '0.875rem',
                    padding: '0.25rem 0'
                  }}
                  wrapperStyle={{
                    outline: 'none'
                  }}
                  labelFormatter={(day) => {
                    // Convert day-of-year to actual date (2024, non-leap year)
                    const startDate = new Date(2024, 0, 1); // January 1, 2024
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + (day - 1)); // Add days (day - 1 because day 1 is Jan 1)
                    
                    // Format as "MMM d, yyyy" (e.g., "Jan 5, 2024")
                    const formatter = new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    return formatter.format(date);
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Sales"
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Pan-Zoom Controls */}
          <XAxisPanZoomControls {...xAxis.controls} />
        </div>
      </CardContent>
    </Card>
  )
}

export default TypeLineChartInventoryPanzoom

