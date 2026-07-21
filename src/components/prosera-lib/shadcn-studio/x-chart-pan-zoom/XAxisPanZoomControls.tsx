'use client';

import * as React from 'react';
import { SafeIcon } from "@/components/prosera-lib/safe-icon";

export function XAxisPanZoomControls(props: {
  zoomPercent: number;
  maxZoom: number;
  zoomInput: string;

  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;

  onZoomInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onZoomInputBlur: () => void;

  sliderPercents: [number, number];
  sliderRef: React.RefObject<HTMLDivElement>;
  onSliderMouseDown: (e: React.MouseEvent, type: 'left' | 'right' | 'bar') => void;

  helperText?: string;
}) {
  const {
    zoomPercent,
    maxZoom,
    zoomInput,
    onZoomOut,
    onZoomIn,
    onReset,
    onZoomInputChange,
    onZoomInputBlur,
    sliderPercents,
    sliderRef,
    onSliderMouseDown,
    helperText = 'Drag handles to zoom • Drag bar to pan'
  } = props;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onZoomOut}
          disabled={zoomPercent <= 50}
          className="w-10 h-10 p-0 flex items-center justify-center border border-border rounded-md bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-card-foreground"
          title="Zoom out (-10%)"
        >
          <SafeIcon name="ZoomOut" className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={zoomInput}
            onChange={onZoomInputChange}
            onBlur={onZoomInputBlur}
            min="50"
            max={maxZoom}
            className="w-16 px-2 py-1 text-center border border-border rounded text-sm bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            title={`Zoom level (50-${maxZoom}%)`}
          />
          <span className="text-sm text-card-foreground">%</span>
        </div>

        <button
          onClick={onZoomIn}
          disabled={zoomPercent >= maxZoom}
          className="w-10 h-10 p-0 flex items-center justify-center border border-border rounded-md bg-card hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-card-foreground"
          title={zoomPercent >= maxZoom ? `Maximum zoom reached (${maxZoom}%)` : 'Zoom in (+10%)'}
        >
          <SafeIcon name="ZoomIn" className="w-4 h-4" />
        </button>

        <button
          onClick={onReset}
          className="px-3 py-1.5 flex items-center gap-2 border border-border rounded-md bg-card hover:bg-accent transition-colors text-sm text-card-foreground"
        >
          <SafeIcon name="Maximize2" className="w-4 h-4" />
          Reset View
        </button>
      </div>

      {/* Pan/Zoom Bar */}
      <div className="px-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12">Left</span>

          <div ref={sliderRef} className="flex-1 relative h-8 flex items-center">
            <div className="absolute w-full h-2 bg-slate-200 rounded-full" />

            <div
              className="absolute h-2 bg-blue-600 rounded-full transition-none"
              style={{
                left: `${sliderPercents[0]}%`,
                width: `${sliderPercents[1] - sliderPercents[0]}%`,
                cursor: 'grab'
              }}
              onMouseDown={(e) => onSliderMouseDown(e, 'bar')}
            />

            <div
              className="absolute w-5 h-5 bg-blue-600 border-2 border-blue-900 rounded-full shadow-md transition-none hover:scale-110"
              style={{
                left: `${sliderPercents[0]}%`,
                transform: 'translateX(-50%)',
                cursor: 'grab',
                zIndex: 10
              }}
              onMouseDown={(e) => onSliderMouseDown(e, 'left')}
            />

            <div
              className="absolute w-5 h-5 bg-blue-600 border-2 border-blue-900 rounded-full shadow-md transition-none hover:scale-110"
              style={{
                left: `${sliderPercents[1]}%`,
                transform: 'translateX(-50%)',
                cursor: 'grab',
                zIndex: 10
              }}
              onMouseDown={(e) => onSliderMouseDown(e, 'right')}
            />
          </div>

          <span className="text-xs text-muted-foreground w-12 text-right">Right</span>
        </div>

        <div className="text-center mt-1">
          <p className="text-xs text-muted-foreground">{helperText}</p>
          {zoomPercent >= maxZoom && (
            <p className="text-xs text-amber-600 dark:text-amber-500 font-semibold mt-1">
              ⚠️ Maximum useful zoom reached ({maxZoom}%)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

