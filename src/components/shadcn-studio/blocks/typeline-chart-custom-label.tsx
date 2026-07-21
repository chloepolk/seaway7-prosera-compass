"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"

const data = [
  { month: "Jan", visitors: 186 },
  { month: "Feb", visitors: 305 },
  { month: "Mar", visitors: 237 },
  { month: "Apr", visitors: 273 },
  { month: "May", visitors: 209 },
  { month: "Jun", visitors: 214 }
]

const TypeLineChartCustomLabel = () => {
  return (
    <Card className="w-full max-w-[397px] rounded-xl border">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <SafeIcon name="LineChart" className="size-3.5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Line Chart</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-base font-semibold">Line Chart - Custom Label</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">January - June 2024</CardDescription>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                stroke="hsl(var(--border))"
                width={40}
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
              />
              <Line 
                type="monotone" 
                dataKey="visitors" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', r: 3 }}
                activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <SafeIcon name="TrendingUp" className="size-4" />
          <p className="text-sm font-medium">Trending up by 5.2% this month</p>
        </div>
        <p className="text-sm text-muted-foreground">Showing total visitors for the last 6 months</p>
      </CardFooter>
    </Card>
  )
}

export default TypeLineChartCustomLabel