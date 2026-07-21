"use client"

import { useState } from "react"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from "recharts"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"

const InventorySet = () => {
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = no zoom, 2 = 2x zoom, etc.
  
  // Calculate handle width as percentage of container
  // When zoomed in (zoomLevel > 1), handle gets smaller
  // Base width of 74px out of ~629px container ≈ 11.75%, adjust as needed
  const handleWidthPercentage = Math.max(5, 100 / zoomLevel) // Minimum 5% width
  const handleWidth = `${handleWidthPercentage}%`

  // Visibility state for top chart (6 data sources from Actual section)
  const [topChartVisibility, setTopChartVisibility] = useState({
    closingStock: true,
    closingInventory: true,
    received: true,
    shipped: true,
    ordered: true,
    notShipped: true,
  })

  // Visibility state for bottom chart (5 data sources)
  const [bottomChartVisibility, setBottomChartVisibility] = useState({
    avgCycle: true,
    safety: true,
    received: true,
    // Add 2 more based on your requirements
    forecastReceived: true,
    forecastShipped: true,
  })

  // Sample data for top chart (12 months)
  const topChartData = [
    { month: 'Jan', closingStock: 1200, closingInventory: 1500, received: 800, shipped: 600, ordered: 900, notShipped: 300 },
    { month: 'Feb', closingStock: 1350, closingInventory: 1650, received: 850, shipped: 650, ordered: 950, notShipped: 350 },
    { month: 'Mar', closingStock: 1100, closingInventory: 1400, received: 750, shipped: 550, ordered: 850, notShipped: 250 },
    { month: 'Apr', closingStock: 1450, closingInventory: 1750, received: 900, shipped: 700, ordered: 1000, notShipped: 400 },
    { month: 'May', closingStock: 1300, closingInventory: 1600, received: 820, shipped: 620, ordered: 920, notShipped: 320 },
    { month: 'Jun', closingStock: 1400, closingInventory: 1700, received: 880, shipped: 680, ordered: 980, notShipped: 380 },
    { month: 'Jul', closingStock: 1250, closingInventory: 1550, received: 780, shipped: 580, ordered: 880, notShipped: 280 },
    { month: 'Aug', closingStock: 1500, closingInventory: 1800, received: 950, shipped: 750, ordered: 1050, notShipped: 450 },
    { month: 'Sep', closingStock: 1380, closingInventory: 1680, received: 860, shipped: 660, ordered: 960, notShipped: 360 },
    { month: 'Oct', closingStock: 1420, closingInventory: 1720, received: 890, shipped: 690, ordered: 990, notShipped: 390 },
    { month: 'Nov', closingStock: 1320, closingInventory: 1620, received: 810, shipped: 610, ordered: 910, notShipped: 310 },
    { month: 'Dec', closingStock: 1480, closingInventory: 1780, received: 930, shipped: 730, ordered: 1030, notShipped: 430 },
  ]

  // Sample data for bottom chart (12 months)
  const bottomChartData = [
    { month: 'Jan', avgCycle: 45, safety: 120, received: 80, forecastReceived: 85, forecastShipped: 65 },
    { month: 'Feb', avgCycle: 48, safety: 125, received: 82, forecastReceived: 87, forecastShipped: 67 },
    { month: 'Mar', avgCycle: 42, safety: 115, received: 75, forecastReceived: 80, forecastShipped: 60 },
    { month: 'Apr', avgCycle: 50, safety: 130, received: 90, forecastReceived: 95, forecastShipped: 70 },
    { month: 'May', avgCycle: 46, safety: 122, received: 82, forecastReceived: 87, forecastShipped: 62 },
    { month: 'Jun', avgCycle: 49, safety: 128, received: 88, forecastReceived: 93, forecastShipped: 68 },
    { month: 'Jul', avgCycle: 44, safety: 118, received: 78, forecastReceived: 83, forecastShipped: 58 },
    { month: 'Aug', avgCycle: 52, safety: 135, received: 95, forecastReceived: 100, forecastShipped: 75 },
    { month: 'Sep', avgCycle: 47, safety: 124, received: 86, forecastReceived: 91, forecastShipped: 66 },
    { month: 'Oct', avgCycle: 51, safety: 132, received: 89, forecastReceived: 94, forecastShipped: 69 },
    { month: 'Nov', avgCycle: 45, safety: 120, received: 81, forecastReceived: 86, forecastShipped: 61 },
    { month: 'Dec', avgCycle: 53, safety: 138, received: 93, forecastReceived: 98, forecastShipped: 73 },
  ]

  // Time period zones for background
  const timeZones = [
    { start: 0, end: 7, color: 'bg-muted/20' }, // Jan-Aug (light grey/regular background)
    { start: 8, end: 9, color: 'bg-accent/30' }, // Sep-Oct (light blue)
    { start: 10, end: 11, color: 'bg-muted/50' }, // Nov-Dec (dark grey)
  ]

  // Unified tooltip component for both charts
  const UnifiedChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0 || !label) return null

    const monthNames: { [key: string]: string } = {
      Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
      May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
      Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
    }

    // Find the data point for the current month from both datasets
    const topDataPoint = topChartData.find(d => d.month === label)
    const bottomDataPoint = bottomChartData.find(d => d.month === label)

    if (!topDataPoint && !bottomDataPoint) return null

    // Build top chart data array based on visibility
    const visibleTopData: Array<{ dataKey: string; value: number }> = []
    if (topDataPoint) {
      if (topChartVisibility.closingStock) visibleTopData.push({ dataKey: 'closingStock', value: topDataPoint.closingStock })
      if (topChartVisibility.closingInventory) visibleTopData.push({ dataKey: 'closingInventory', value: topDataPoint.closingInventory })
      if (topChartVisibility.received) visibleTopData.push({ dataKey: 'received', value: topDataPoint.received })
      if (topChartVisibility.shipped) visibleTopData.push({ dataKey: 'shipped', value: topDataPoint.shipped })
      if (topChartVisibility.ordered) visibleTopData.push({ dataKey: 'ordered', value: topDataPoint.ordered })
      if (topChartVisibility.notShipped) visibleTopData.push({ dataKey: 'notShipped', value: topDataPoint.notShipped })
    }

    // Build bottom chart data array based on visibility
    const visibleBottomData: Array<{ dataKey: string; value: number }> = []
    if (bottomDataPoint) {
      if (bottomChartVisibility.avgCycle) visibleBottomData.push({ dataKey: 'avgCycle', value: bottomDataPoint.avgCycle })
      if (bottomChartVisibility.safety) visibleBottomData.push({ dataKey: 'safety', value: bottomDataPoint.safety })
      if (bottomChartVisibility.received) visibleBottomData.push({ dataKey: 'received', value: bottomDataPoint.received })
      if (bottomChartVisibility.forecastReceived) visibleBottomData.push({ dataKey: 'forecastReceived', value: bottomDataPoint.forecastReceived })
      if (bottomChartVisibility.forecastShipped) visibleBottomData.push({ dataKey: 'forecastShipped', value: bottomDataPoint.forecastShipped })
    }

    // If no visible data from either chart, don't show tooltip
    if (visibleTopData.length === 0 && visibleBottomData.length === 0) return null

    const hasTopData = visibleTopData.length > 0
    const hasBottomData = visibleBottomData.length > 0

    return (
      <div className="bg-card border rounded shadow-lg p-4 flex flex-col gap-1.5">
        {/* Title and Date - Always at top */}
        <p className="font-bold text-sm text-heading-foreground">Title (category)</p>
        <p className="font-semibold text-lg leading-7 text-primary">{monthNames[label as string]} 1, 2000</p>
        
        {/* Top Chart Data */}
        {hasTopData && (
          <>
            {visibleTopData.map((item: any, index: number) => (
              <div key={`top-${index}`} className="flex gap-1.5 items-start">
                <p className="font-medium text-sm text-muted-foreground">Data point:</p>
                <p className="font-bold text-sm text-muted-foreground">{item.value}</p>
              </div>
            ))}
          </>
        )}

        {/* Separator - Only if both sections have data */}
        {hasTopData && hasBottomData && (
          <Separator className="my-1" />
        )}

        {/* Bottom Chart Data */}
        {hasBottomData && (
          <>
            {visibleBottomData.map((item: any, index: number) => (
              <div key={`bottom-${index}`} className="flex gap-1.5 items-start">
                <p className="font-medium text-sm text-muted-foreground">Data point:</p>
                <p className="font-bold text-sm text-muted-foreground">{item.value}</p>
              </div>
            ))}
          </>
        )}
      </div>
    )
  }
  return (
    <div className="bg-secondary p-8 flex gap-2 justify-start items-center">
      <div className="w-full max-w-full flex flex-col gap-4 items-center">
        {/* Views Bar */}
        <div className="w-full flex gap-6 items-center">
          <Button className="bg-primary text-primary-foreground h-8 px-3 text-sm font-medium shadow-sm">
            Button
          </Button>
          <Button variant="outline" className="bg-popover text-secondary-foreground h-8 px-3 text-sm font-medium">
            Button
          </Button>
          <Button variant="outline" className="bg-popover text-secondary-foreground h-8 px-3 text-sm font-medium">
            Button
          </Button>
        </div>

        {/* Chart Section */}
        <div className="relative w-full min-h-[400px]">
          {/* Background rectangles */}
          <div className="absolute w-40 h-full bg-accent"></div>
          <div className="absolute w-39 h-full bg-border left-40"></div>
          
          {/* Time period zones - span full height through both charts */}
          {timeZones.map((zone, index) => {
            const zoneWidth = ((zone.end - zone.start + 1) / 12) * 100
            const zoneLeft = (zone.start / 12) * 100
            return (
              <div
                key={index}
                className={`absolute ${zone.color} opacity-50`}
                style={{
                  left: `calc(${zoneLeft}% + 42px)`,
                  width: `calc(${zoneWidth}% - 42px)`,
                  height: '100%',
                  top: '0%',
                }}
              />
            )
          })}

          {/* Top Chart - Line Chart with multiple data sources */}
          <div className="absolute left-[42px] top-[10%] w-[calc(100%-84px)] h-[50%]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={topChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                />
                <YAxis 
                  domain={[0, 2500]}
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                />
                <RechartsTooltip content={<UnifiedChartTooltip />} />
                {topChartVisibility.closingStock && (
                  <Line 
                    type="monotone" 
                    dataKey="closingStock" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {topChartVisibility.closingInventory && (
                  <Line 
                    type="monotone" 
                    dataKey="closingInventory" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {topChartVisibility.received && (
                  <Line 
                    type="monotone" 
                    dataKey="received" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {topChartVisibility.shipped && (
                  <Line 
                    type="monotone" 
                    dataKey="shipped" 
                    stroke="hsl(var(--chart-4))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {topChartVisibility.ordered && (
                  <Line 
                    type="monotone" 
                    dataKey="ordered" 
                    stroke="hsl(var(--chart-5))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {topChartVisibility.notShipped && (
                  <Line 
                    type="monotone" 
                    dataKey="notShipped" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 flex flex-col justify-between items-end w-[42px]">
            <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">2500</p>
            <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">2000</p>
            <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">1500</p>
            <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">1000</p>
            <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">500</p>
            <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">0</p>
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 w-full h-4 flex justify-between items-center">
            <p className="text-xs text-center text-secondary-foreground"> </p>
            <p className="text-xs leading-4 text-center uppercase tracking-wider text-secondary-foreground">Jan</p>
            <p className="text-xs text-center text-secondary-foreground">Feb</p>
            <p className="text-xs leading-4 text-center uppercase tracking-wider text-secondary-foreground">Mar</p>
            <p className="text-xs leading-4 text-center uppercase tracking-wider text-secondary-foreground">Apr</p>
            <p className="text-xs leading-4 text-center uppercase tracking-wider text-secondary-foreground">May</p>
            <p className="text-xs text-center text-secondary-foreground">Jun</p>
            <p className="text-xs text-center text-secondary-foreground">Jul</p>
            <p className="text-xs leading-4 text-center uppercase tracking-wider text-secondary-foreground">Aug</p>
            <p className="text-xs leading-4 text-center uppercase tracking-wider text-secondary-foreground">Sep</p>
            <p className="text-xs leading-4 text-center uppercase tracking-wider text-secondary-foreground">Oct</p>
            <p className="text-xs leading-4 text-center uppercase tracking-wider text-secondary-foreground">Nov</p>
            <p className="text-xs leading-4 text-center uppercase tracking-wider text-secondary-foreground">Dec</p>
          </div>

          {/* Category titles */}
          <h2 className="absolute text-xs leading-4 text-right uppercase text-secondary-foreground">Title (Category)</h2>
          <h2 className="absolute text-xs leading-4 text-left uppercase text-secondary-foreground">Title (Category)</h2>

          {/* Bottom Chart - Line Chart with 5 data sources */}
          <div className="absolute left-[42px] top-[50%] w-[calc(100%-84px)] h-[50%]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={bottomChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                />
                <YAxis 
                  domain={[0, 300]}
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                />
                <RechartsTooltip content={<UnifiedChartTooltip />} />
                {bottomChartVisibility.avgCycle && (
                  <Line 
                    type="monotone" 
                    dataKey="avgCycle" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
                {bottomChartVisibility.safety && (
                  <Line 
                    type="monotone" 
                    dataKey="safety" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {bottomChartVisibility.received && (
                  <Line 
                    type="monotone" 
                    dataKey="received" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {bottomChartVisibility.forecastReceived && (
                  <Line 
                    type="monotone" 
                    dataKey="forecastReceived" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {bottomChartVisibility.forecastShipped && (
                  <Line 
                    type="monotone" 
                    dataKey="forecastShipped" 
                    stroke="hsl(var(--chart-4))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Secondary Y-axis */}
          <div className="absolute right-0 flex flex-col justify-between items-end w-[42px]">
            <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">300</p>
            <p className="text-xs text-right lowercase text-secondary-foreground">0</p>
          </div>

          {/* Legend labels */}
          <p className="absolute text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">BluePilot™ Forecast</p>
          <p className="absolute text-xs leading-4 text-left uppercase text-muted-foreground">Actual (Last updated: XX-XX-XXXX)</p>

          {/* Confidence percentages */}
          <p className="absolute text-xs leading-4 text-left uppercase tracking-widest font-semibold text-secondary-foreground">95%</p>
          <p className="absolute text-xs leading-4 text-left uppercase tracking-widest font-semibold text-secondary-foreground">82%</p>
          <p className="absolute text-xs leading-4 text-left uppercase tracking-widest font-semibold text-secondary-foreground">78%</p>
          <p className="absolute text-xs leading-4 text-left uppercase tracking-widest font-semibold text-secondary-foreground">89%</p>

          {/* Confidence Interval label */}
          <p className="absolute text-xs leading-4 text-left uppercase tracking-wider text-secondary-foreground">Confidence Interval (CI)</p>

          {/* Right side labels */}
          <div className="absolute right-0 flex flex-col gap-1">
            <div className="flex gap-1 items-center">
              <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">Closing Inv</p>
            </div>
            <div className="flex gap-1 items-center">
              <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">Avg Cycle</p>
            </div>
            <div className="flex gap-1 items-center">
              <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">Safety</p>
            </div>
            <div className="flex gap-1 items-center">
              <p className="text-xs leading-4 text-right uppercase tracking-wider text-secondary-foreground">Received</p>
            </div>
          </div>

        </div>

        {/* Pan + Zoom Controls */}
        <div className="w-full flex gap-6 items-center">
          {/* Zoom Bar */}
          <div className="flex-1 w-full h-9 bg-card border rounded flex gap-1 p-3 justify-between items-center">
            <div className="w-64 h-7 bg-sidebar-border/50 rounded"></div>
            <div className="flex gap-0 items-center flex-1">
              <div className="w-3 h-7 bg-chart-1 flex items-center justify-center shrink-0">
                <SafeIcon name="MoreVertical" className="w-3 h-3 text-accent" />
              </div>
              <div className="h-7 bg-primary/20 shrink-0" style={{ width: handleWidth }}></div>
              <div className="w-3 h-7 bg-chart-1 flex items-center justify-center shrink-0">
                <SafeIcon name="MoreVertical" className="w-3 h-3 text-accent" />
              </div>
            </div>
            <div className="w-64 h-7 bg-sidebar-border/50 rounded"></div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="w-8 h-9 p-0">
                <SafeIcon name="ChevronLeft" className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" className="w-8 h-9 p-0">
                <SafeIcon name="ChevronRight" className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="w-8 h-9 p-0">
                <SafeIcon name="Minus" className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" className="w-8 h-9 p-0">
                <SafeIcon name="Plus" className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold text-card-foreground">
                Fit
              </Button>
              <p className="text-xs font-semibold text-card-foreground">100%</p>
            </div>
          </div>

          {/* Settings Icon */}
          <div className="w-3 h-3 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-popover-foreground"></div>
          </div>
        </div>

        {/* Legend Section */}
        <div className="w-full flex flex-col gap-4">
          <div className="w-full flex gap-9 items-end">
            {/* Actual Section */}
            <div className="flex flex-col gap-2">
              <p className="text-xs leading-4 text-left uppercase tracking-widest font-semibold text-muted-foreground">Actual (C00)</p>
              <div className="flex flex-col gap-0">
                <Separator className="w-full" />
                <div className="flex gap-1 items-center">
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5 border-2" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Closing Stock</p>
                    </div>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, closingStock: !prev.closingStock }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.closingStock ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5 border-2" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Closing Inventory</p>
                    </div>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, closingInventory: !prev.closingInventory }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.closingInventory ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5 border-2" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Received</p>
                    </div>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, received: !prev.received }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.received ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Shipped</p>
                    </div>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, shipped: !prev.shipped }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.shipped ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Ordered</p>
                    </div>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, ordered: !prev.ordered }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.ordered ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Not Shipped</p>
                    </div>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, notShipped: !prev.notShipped }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.notShipped ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Avg Cycle / Safety / Received Section */}
            <div className="flex flex-col gap-0">
              <Separator className="w-full" />
              <div className="flex gap-2 items-center">
                <Separator className="w-9" />
                <div className="flex gap-1 items-center">
                  <Separator className="w-5 border-4" />
                  <p className="text-xs leading-4 uppercase tracking-wider text-right text-card-foreground">Avg Cycle</p>
                  <button
                    onClick={() => setBottomChartVisibility(prev => ({ ...prev, avgCycle: !prev.avgCycle }))}
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    {bottomChartVisibility.avgCycle ? (
                      <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                    ) : (
                      <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                    )}
                  </button>
                </div>
                <Separator className="w-9" />
                <div className="flex gap-1 items-center">
                  <Separator className="w-5" />
                  <p className="text-xs leading-4 uppercase tracking-wider text-right text-card-foreground">Safety</p>
                  <button
                    onClick={() => setBottomChartVisibility(prev => ({ ...prev, safety: !prev.safety }))}
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    {bottomChartVisibility.safety ? (
                      <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                    ) : (
                      <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                    )}
                  </button>
                </div>
                <Separator className="w-9" />
                <div className="flex gap-1 items-center">
                  <Separator className="w-5" />
                  <p className="text-xs leading-4 uppercase tracking-wider text-right text-card-foreground">Received</p>
                  <button
                    onClick={() => setBottomChartVisibility(prev => ({ ...prev, received: !prev.received }))}
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    {bottomChartVisibility.received ? (
                      <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                    ) : (
                      <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Forecast Section */}
            <div className="flex flex-col gap-2">
              <p className="text-xs leading-4 text-left uppercase tracking-widest font-semibold text-muted-foreground">Forecast (C00)</p>
              <div className="flex flex-col gap-0">
                <Separator className="w-full" />
                <div className="flex gap-1 items-center">
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5 border-2" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Closing Inventory</p>
                    </div>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, closingInventory: !prev.closingInventory }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.closingInventory ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5 border-2" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Received</p>
                    </div>
                    <button
                      onClick={() => setBottomChartVisibility(prev => ({ ...prev, forecastReceived: !prev.forecastReceived }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {bottomChartVisibility.forecastReceived ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Shipped</p>
                    </div>
                    <button
                      onClick={() => setBottomChartVisibility(prev => ({ ...prev, forecastShipped: !prev.forecastShipped }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {bottomChartVisibility.forecastShipped ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Ordered</p>
                    </div>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, ordered: !prev.ordered }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.ordered ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <div className="flex gap-1 items-center">
                      <Separator className="w-5" />
                      <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Not Shipped</p>
                    </div>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, notShipped: !prev.notShipped }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.notShipped ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Average Section */}
            <div className="flex flex-col gap-2">
              <p className="text-xs leading-4 text-left uppercase tracking-widest font-semibold text-muted-foreground">Average (C00)</p>
              <div className="flex flex-col gap-0">
                <Separator className="w-full" />
                <div className="flex gap-1 items-center">
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <Separator className="w-5 border-2" />
                    <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Closing Inventory</p>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, closingInventory: !prev.closingInventory }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.closingInventory ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <Separator className="w-5 border-2" />
                    <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Closing Stock</p>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, closingStock: !prev.closingStock }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.closingStock ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <Separator className="w-5" />
                    <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Received</p>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, received: !prev.received }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.received ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <Separator className="w-5" />
                    <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Shipped</p>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, shipped: !prev.shipped }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.shipped ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <Separator className="w-5" />
                    <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Ordered</p>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, ordered: !prev.ordered }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.ordered ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                  <Separator className="w-9" />
                  <div className="flex gap-2 items-center">
                    <Separator className="w-5" />
                    <p className="text-xs leading-4 uppercase tracking-wider text-card-foreground">Not Shipped</p>
                    <button
                      onClick={() => setTopChartVisibility(prev => ({ ...prev, notShipped: !prev.notShipped }))}
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                    >
                      {topChartVisibility.notShipped ? (
                        <SafeIcon name="Eye" className="w-3.5 h-3.5" aria-hidden />
                      ) : (
                        <SafeIcon name="EyeOff" className="w-3.5 h-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Definitions Bar */}
        <div className="w-full h-7 bg-secondary flex flex-col gap-3 justify-center items-start">
          <Separator className="w-full" />
          <div className="flex gap-2 items-center">
            <SafeIcon name="List" className="w-3.5 h-3.5" aria-hidden />
            <p className="text-xs leading-4 uppercase tracking-widest font-semibold text-muted-foreground">Definitions</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InventorySet