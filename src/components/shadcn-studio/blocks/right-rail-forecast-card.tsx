"use client"

import * as React from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SafeIcon } from "@/components/prosera-lib/safe-icon"
import { ForecastDecisionChart, type ChartT } from "./forecast-decision-chart"
import { getWeeklyDecisionForecast } from "./get-weekly-decision-forecast"
import type { ForecastDataPoint } from "./forecast-chart"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RightRailForecastCardProps {
  /** Raw forecast data points (unsorted, mixed actual/forecast) */
  data: ForecastDataPoint[]
  /** ISO date string representing "today" or anchor point for the forecast window */
  anchorDate: string
  /** Optional callback when expand button is clicked (modal logic handled externally) */
  onExpand?: () => void
  /** Optional class name for the card container */
  className?: string
  /** Optional i18n translation function for chart and labels */
  t?: ChartT
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const defaultT: ChartT = (key) => key

export function RightRailForecastCard({
  data,
  anchorDate,
  onExpand,
  className,
  t: tProp,
}: RightRailForecastCardProps) {
  const t = tProp ?? defaultT
  // Process raw data into weekly decision points
  const { weeks } = React.useMemo(
    () => getWeeklyDecisionForecast({ data, anchorDate }),
    [data, anchorDate]
  )

  // Handle expand click - modal implementation is external via onExpand callback
  const handleExpand = React.useCallback(() => {
    onExpand?.()
  }, [onExpand])

  return (
    <Card className={`overflow-hidden ${className ?? ""}`}>
      <CardHeader className="py-2 px-3 gap-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {t("forecast")}
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleExpand}
            aria-label="Expand forecast"
            className="h-6 w-6"
          >
            <SafeIcon name="Expand" size={14} aria-hidden />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        {weeks.length > 0 ? (
          <div className="h-[100px] w-full">
            <ForecastDecisionChart data={weeks} variant="compact" t={t} />
          </div>
        ) : (
          <div className="flex h-[100px] items-center justify-center">
            <p className="text-xs text-muted-foreground">{t("no_forecast_data")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RightRailForecastCard
