"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceLine, ReferenceArea } from "recharts"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"

// Day-of-year for 1st of each month (non-leap year)
const monthStartDays = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]
const monthAbbreviations = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthFullNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const data = [
  { dayOfYear: 1, month: "Jan", visitors: 186, mobile: 120, tablet: 95 },
  { dayOfYear: 32, month: "Feb", visitors: 305, mobile: 280, tablet: 220 },
  { dayOfYear: 60, month: "Mar", visitors: 237, mobile: 195, tablet: 180 },
  { dayOfYear: 91, month: "Apr", visitors: 273, mobile: 320, tablet: 250 },
  { dayOfYear: 121, month: "May", visitors: 209, mobile: 150, tablet: 140 },
  { dayOfYear: 152, month: "Jun", visitors: 214, mobile: 240, tablet: 200 },
  { dayOfYear: 182, month: "Jul", visitors: 285, mobile: 380, tablet: 320 },
  { dayOfYear: 213, month: "Aug", visitors: 320, mobile: 420, tablet: 380 },
  { dayOfYear: 244, month: "Sep", visitors: 275, mobile: 350, tablet: 300 },
  { dayOfYear: 274, month: "Oct", visitors: 340, mobile: 450, tablet: 400 },
  { dayOfYear: 305, month: "Nov", visitors: 290, mobile: 380, tablet: 340 },
  { dayOfYear: 335, month: "Dec", visitors: 365, mobile: 480, tablet: 420 }
]

// Data for bottom chart (Shipped) - values within low 20's to maximum 149
// Includes forecast series starting in September
const shippedData = [
  { dayOfYear: 1, month: "Jan", visitors: 28, mobile: 32, visitorsForecast: null, mobileForecast: null },
  { dayOfYear: 32, month: "Feb", visitors: 45, mobile: 52, visitorsForecast: null, mobileForecast: null },
  { dayOfYear: 60, month: "Mar", visitors: 38, mobile: 42, visitorsForecast: null, mobileForecast: null },
  { dayOfYear: 91, month: "Apr", visitors: 55, mobile: 68, visitorsForecast: null, mobileForecast: null },
  { dayOfYear: 121, month: "May", visitors: 42, mobile: 35, visitorsForecast: null, mobileForecast: null },
  { dayOfYear: 152, month: "Jun", visitors: 48, mobile: 58, visitorsForecast: null, mobileForecast: null },
  { dayOfYear: 182, month: "Jul", visitors: 62, mobile: 78, visitorsForecast: null, mobileForecast: null },
  { dayOfYear: 213, month: "Aug", visitors: 72, mobile: 89, visitorsForecast: null, mobileForecast: null },
  // Forecast begins in September and loosely follows the actual trend
  { dayOfYear: 244, month: "Sep", visitors: 68, mobile: 82, visitorsForecast: 70, mobileForecast: 90 },
  { dayOfYear: 274, month: "Oct", visitors: 95, mobile: 118, visitorsForecast: 105, mobileForecast: 130 },
  { dayOfYear: 305, month: "Nov", visitors: 88, mobile: 105, visitorsForecast: 96, mobileForecast: 120 },
  { dayOfYear: 335, month: "Dec", visitors: 112, mobile: 139, visitorsForecast: 125, mobileForecast: 145 }
]

// Generate weekly reference lines (every 7 days starting from day 1)
const weeklyLines = Array.from({ length: 53 }, (_, i) => i * 7 + 1).filter(day => day <= 365)

const TypeLineChartInventoryStacked = () => {
  const [visibleLines, setVisibleLines] = React.useState({
    visitors: true,
    mobile: true,
    tablet: true
  })
  
  const [visibleShippedLines, setVisibleShippedLines] = React.useState({
    visitors: true,          // Shipped (actual, red line)
    mobile: true,            // Ordered (actual, green line)
    visitorsForecast: true,  // Shipped forecast (dashed red)
    mobileForecast: true     // Ordered forecast (dashed green)
  })

  const lineConfigs = [
    { key: 'visitors', name: 'Visitors', color: '#2563eb' },
    { key: 'mobile', name: 'Mobile', color: '#10b981' },
    { key: 'tablet', name: 'Tablet', color: '#f59e0b' }
  ]

  const toggleLine = (key: string) => {
    setVisibleLines(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }))
  }

  const toggleShippedLine = (key: string) => {
    setVisibleShippedLines(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }))
  }

  // Custom tooltip that combines data from both charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    // Get the dayOfYear from the payload (label is the dayOfYear value)
    const dayOfYear = label as number
    
    // Find corresponding data points in both charts
    const topChartData = data.find(d => d.dayOfYear === dayOfYear)
    const bottomChartData = shippedData.find(d => d.dayOfYear === dayOfYear)

    // Check if we have any visible lines in each chart
    const hasTopChartData = topChartData && (
      (visibleLines.visitors && topChartData.visitors !== undefined) ||
      (visibleLines.mobile && topChartData.mobile !== undefined) ||
      (visibleLines.tablet && topChartData.tablet !== undefined)
    )

    const hasBottomChartData = bottomChartData && (
      (visibleShippedLines.visitors && bottomChartData.visitors !== null && bottomChartData.visitors !== undefined) ||
      (visibleShippedLines.mobile && bottomChartData.mobile !== null && bottomChartData.mobile !== undefined) ||
      (visibleShippedLines.visitorsForecast && bottomChartData.visitorsForecast !== null && bottomChartData.visitorsForecast !== undefined) ||
      (visibleShippedLines.mobileForecast && bottomChartData.mobileForecast !== null && bottomChartData.mobileForecast !== undefined)
    )

    // Get month name for label
    const monthIndex = monthStartDays.indexOf(dayOfYear)
    const monthName = monthIndex !== -1 ? monthFullNames[monthIndex] : ''
    const labelText = monthName ? `${monthName} 2024` : ''

    if (!hasTopChartData && !hasBottomChartData) return null

    return (
      <div
        style={{
          backgroundColor: 'oklch(1.00 0 0)',
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          margin: '0.5rem',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          outline: 'none'
        }}
      >
        <p
          style={{
            color: 'oklch(0.35 0 0)',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '0.5rem'
          }}
        >
          {labelText}
        </p>
        
        {/* Top Chart Section */}
        {hasTopChartData && (
          <div style={{ marginBottom: hasBottomChartData ? '0.75rem' : '0', paddingBottom: hasBottomChartData ? '0.75rem' : '0', borderBottom: hasBottomChartData ? '1px solid hsl(var(--border))' : 'none' }}>
            {visibleLines.visitors && topChartData?.visitors !== undefined && (
              <div style={{ color: 'oklch(0.35 0 0)', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                <span style={{ color: '#2563eb' }}>●</span> Visitors: {topChartData.visitors}
              </div>
            )}
            {visibleLines.mobile && topChartData?.mobile !== undefined && (
              <div style={{ color: 'oklch(0.35 0 0)', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                <span style={{ color: '#10b981' }}>●</span> Mobile: {topChartData.mobile}
              </div>
            )}
            {visibleLines.tablet && topChartData?.tablet !== undefined && (
              <div style={{ color: 'oklch(0.35 0 0)', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                <span style={{ color: '#f59e0b' }}>●</span> Tablet: {topChartData.tablet}
              </div>
            )}
          </div>
        )}

        {/* Bottom Chart Section */}
        {hasBottomChartData && (
          <div>
            {visibleShippedLines.visitors && bottomChartData?.visitors !== null && bottomChartData?.visitors !== undefined && (
              <div style={{ color: 'oklch(0.35 0 0)', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                <span style={{ color: '#ef4444' }}>●</span> Shipped: {bottomChartData.visitors}
              </div>
            )}
            {visibleShippedLines.mobile && bottomChartData?.mobile !== null && bottomChartData?.mobile !== undefined && (
              <div style={{ color: 'oklch(0.35 0 0)', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                <span style={{ color: '#10b981' }}>●</span> Ordered: {bottomChartData.mobile}
              </div>
            )}
            {visibleShippedLines.visitorsForecast && bottomChartData?.visitorsForecast !== null && bottomChartData?.visitorsForecast !== undefined && (
              <div style={{ color: 'oklch(0.35 0 0)', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                <span style={{ color: '#ef4444' }}>─</span> Shipped (Forecast): {bottomChartData.visitorsForecast}
              </div>
            )}
            {visibleShippedLines.mobileForecast && bottomChartData?.mobileForecast !== null && bottomChartData?.mobileForecast !== undefined && (
              <div style={{ color: 'oklch(0.35 0 0)', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                <span style={{ color: '#10b981' }}>─</span> Ordered (Forecast): {bottomChartData.mobileForecast}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full rounded-xl border">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <SafeIcon name="LineChart" className="size-3.5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Line Chart</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-base font-semibold">Line Chart - Multiple</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">January - December 2024</CardDescription>
        </div>
        
        <div className="w-full min-w-0 relative" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>

          {/* Top Chart */}
          <div className="h-[400px] w-full min-w-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                {/* Vertical bands for time periods - full chart height */}
                <ReferenceArea 
                  x1={244} 
                  x2={304.5} 
                  fill="#3b82f6" 
                  fillOpacity={0.1}
                  stroke="none"
                />
                <ReferenceArea 
                  x1={304.5} 
                  x2={365} 
                  fill="#64748b" 
                  fillOpacity={0.15}
                  stroke="none"
                />
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                {/* Monthly reference lines */}
                {monthStartDays.map((day, index) => (
                  <ReferenceLine 
                    key={`top-month-line-${day}`}
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
                  domain={[1, 365]}
                  ticks={[]}
                  axisLine={false}
                  tickLine={false}
                  stroke="hsl(var(--border))"
                  allowDuplicatedCategory={false}
                />
                <YAxis 
                  axisLine={true}
                  tickLine={true}
                  tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                  stroke="hsl(var(--border))"
                  width={50}
                  domain={[0, 400]}
                  label={{ value: 'Closing Inventory', angle: -90, position: 'insideLeft', style: { fill: 'var(--foreground)' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                {visibleLines.visitors && (
                  <Line 
                    type="monotone" 
                    dataKey="visitors" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', r: 3 }}
                    activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                )}
                {visibleLines.mobile && (
                  <Line 
                    type="monotone" 
                    dataKey="mobile" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                )}
                {visibleLines.tablet && (
                  <Line 
                    type="monotone" 
                    dataKey="tablet" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 3 }}
                    activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Chart */}
          <div className="h-[400px] w-full min-w-0 relative" style={{ marginTop: '-32px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shippedData} margin={{ top: 5, right: 20, left: 20, bottom: 40 }}>
                {/* Vertical bands for time periods - full chart height */}
                <ReferenceArea 
                  x1={244} 
                  x2={304.5} 
                  fill="#3b82f6" 
                  fillOpacity={0.1}
                  stroke="none"
                />
                <ReferenceArea 
                  x1={304.5} 
                  x2={365} 
                  fill="#64748b" 
                  fillOpacity={0.15}
                  stroke="none"
                />
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                {/* Monthly reference lines */}
                {monthStartDays.map((day, index) => (
                  <ReferenceLine 
                    key={`bottom-month-line-${day}`}
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
                  domain={[1, 365]}
                  ticks={monthStartDays}
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
                  domain={[0, 300]}
                  label={{ value: 'Shipped', angle: -90, position: 'insideLeft', style: { fill: 'var(--foreground)' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                {visibleShippedLines.visitors && (
                  <Line 
                    type="monotone" 
                    dataKey="visitors" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 3 }}
                    activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                )}
                {visibleShippedLines.mobile && (
                  <Line 
                    type="monotone" 
                    dataKey="mobile" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                )}
                {visibleShippedLines.visitorsForecast && (
                  <Line 
                    type="monotone" 
                    dataKey="visitorsForecast" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Shipped (Forecast)"
                    isAnimationActive={false}
                  />
                )}
                {visibleShippedLines.mobileForecast && (
                  <Line 
                    type="monotone" 
                    dataKey="mobileForecast" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Ordered (Forecast)"
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Custom Legend */}
          <div className="flex flex-col gap-2">
            {/* Actual legend */}
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-foreground">Actual</p>
              {lineConfigs.map((config) => (
                <div
                  key={config.key}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => toggleLine(config.key)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm text-foreground">{config.name}</span>
                  {visibleLines[config.key as keyof typeof visibleLines] ? (
                    <SafeIcon name="Eye" className="size-4 text-muted-foreground" aria-hidden />
                  ) : (
                    <SafeIcon name="EyeOff" className="size-4 text-muted-foreground" aria-hidden />
                  )}
                </div>
              ))}
              {/* Additional legend items for shipped and ordered (actual) */}
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => toggleShippedLine('visitors')}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#ef4444' }}
                />
                <span className="text-sm text-foreground">Shipped</span>
                {visibleShippedLines.visitors ? (
                  <SafeIcon name="Eye" className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <SafeIcon name="EyeOff" className="size-4 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => toggleShippedLine('mobile')}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#10b981' }}
                />
                <span className="text-sm text-foreground">Ordered</span>
                {visibleShippedLines.mobile ? (
                  <SafeIcon name="Eye" className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <SafeIcon name="EyeOff" className="size-4 text-muted-foreground" aria-hidden />
                )}
              </div>
            </div>

            {/* Forecast legend */}
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-foreground">Forecast</p>
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => toggleShippedLine('visitorsForecast')}
              >
                <div
                  className="w-3 h-3 rounded-full border border-dashed"
                  style={{ borderColor: '#ef4444' }}
                />
                <span className="text-sm text-foreground">Shipped (Forecast)</span>
                {visibleShippedLines.visitorsForecast ? (
                  <SafeIcon name="Eye" className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <SafeIcon name="EyeOff" className="size-4 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => toggleShippedLine('mobileForecast')}
              >
                <div
                  className="w-3 h-3 rounded-full border border-dashed"
                  style={{ borderColor: '#10b981' }}
                />
                <span className="text-sm text-foreground">Ordered (Forecast)</span>
                {visibleShippedLines.mobileForecast ? (
                  <SafeIcon name="Eye" className="size-4 text-muted-foreground" aria-hidden />
                ) : (
                  <SafeIcon name="EyeOff" className="size-4 text-muted-foreground" aria-hidden />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TypeLineChartInventoryStacked

