"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ForecastDataPoint } from "./forecast-chart"
import { ForecastDecisionChart, type ChartT } from "./forecast-decision-chart"
import { getWeeklyDecisionForecast } from "./get-weekly-decision-forecast"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ForecastFullscreenModalProps {
  /** Controls modal visibility */
  open: boolean
  /** Callback when open state changes (ESC, outside click, close button) */
  onOpenChange: (open: boolean) => void
  /** Raw forecast data points (unsorted, mixed actual/forecast) */
  data: ForecastDataPoint[]
  /** ISO date string representing "today" or anchor point for the forecast window */
  anchorDate: string
  /** Optional i18n translation function */
  t?: ChartT
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const defaultT: ChartT = (key) => key

export function ForecastFullscreenModal({
  open,
  onOpenChange,
  data,
  anchorDate,
  t: tProp,
}: ForecastFullscreenModalProps) {
  const t = tProp ?? defaultT
  // Process raw data into weekly decision buckets
  const { weeks } = React.useMemo(
    () => getWeeklyDecisionForecast({ data, anchorDate }),
    [data, anchorDate]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex w-[90vw] max-w-[1200px] h-[70vh] max-h-[700px] flex-col gap-0 p-0"
      >
        {/* Header */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="text-lg font-semibold">
            {t("forecast_modal_title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("forecast_modal_desc")}
          </DialogDescription>
        </DialogHeader>

        {/* Chart container - ~60% of modal height */}
        <div className="flex-1 min-h-0 p-6">
          {weeks.length > 0 ? (
            <div className="h-full w-full">
              <ForecastDecisionChart data={weeks} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {t("no_forecast_data")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ForecastFullscreenModal
