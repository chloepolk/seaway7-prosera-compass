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

// Generate weekly reference lines (every 7 days starting from day 1)
const weeklyLines = Array.from({ length: 53 }, (_, i) => i * 7 + 1).filter(day => day <= 365)

const TypeLineChartInventorySingle = () => {
  const [visibleLines, setVisibleLines] = React.useState({
    visitors: true,
    mobile: true,
    tablet: true
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
        
        <div className="w-full min-w-0 space-y-4">
          <div className="h-[500px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 40 }}>
                {/* Vertical bands for time periods */}
                <ReferenceArea 
                  x1={244} 
                  x2={304.5} 
                  y1={0} 
                  y2={500} 
                  fill="#3b82f6" 
                  fillOpacity={0.1}
                  stroke="none"
                />
                <ReferenceArea 
                  x1={304.5} 
                  x2={365} 
                  y1={0} 
                  y2={500} 
                  fill="#64748b" 
                  fillOpacity={0.15}
                  stroke="none"
                />
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                {/* Weekly reference lines (thin, light) - Hidden */}
                {/* {weeklyLines.map((day) => (
                  <ReferenceLine 
                    key={`week-line-${day}`}
                    x={day} 
                    stroke="#94a3b8" 
                    strokeDasharray="2 3"
                    strokeWidth={0.5}
                    opacity={0.6}
                    ifOverflow="visible"
                  />
                ))} */}
                {/* Monthly reference lines (thicker, more visible) */}
                {monthStartDays.map((day, index) => (
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
                    const monthIndex = monthStartDays.indexOf(day);
                    const monthName = monthIndex !== -1 ? monthFullNames[monthIndex] : '';
                    return monthName ? `${monthName} 2024` : '';
                  }}
                />
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
          
          {/* Custom Legend */}
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-foreground">Legend</p>
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TypeLineChartInventorySingle

