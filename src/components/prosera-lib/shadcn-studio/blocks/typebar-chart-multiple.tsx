"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { SafeIcon } from "@/components/prosera-lib/safe-icon";

const chartData = [
  { month: 'Jan', series1: 186, series2: 80 },
  { month: 'Feb', series1: 305, series2: 200 },
  { month: 'Mar', series1: 237, series2: 120 },
  { month: 'Apr', series1: 373, series2: 190 },
  { month: 'May', series1: 209, series2: 130 },
  { month: 'Jun', series1: 214, series2: 140 }
];

const TypeBarChartMultiple = () => {
  return (
    <Card className="w-full max-w-[397px] rounded-xl border">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <SafeIcon name="BarChart3" className="size-3.5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Bar Chart</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-base font-semibold">Bar Chart - Multiple</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">January - June 2024</CardDescription>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                axisLine={true}
                tickLine={true}
                tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                axisLine={true}
                tickLine={true}
                tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                stroke="hsl(var(--border))"
                width={40}
              />
              <Bar dataKey="series1" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="series2" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
            </BarChart>
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
  );
};

export default TypeBarChartMultiple;