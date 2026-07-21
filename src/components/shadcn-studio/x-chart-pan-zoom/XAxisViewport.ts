'use client';

/**
 * XAxisViewport - Unified X-axis pan/zoom system for charts
 * 
 * This is the main entry point for adding pan/zoom functionality to any chart with an X-axis.
 * It combines viewport state management, tick generation, and control UI into a single, easy-to-use API.
 * 
 * ## Portability
 * 
 * This unified system is designed to be portable and can be dropped into any project. The entire
 * `unified/` directory is self-contained with minimal external dependencies.
 * 
 * ## Dependencies
 * 
 * The unified system requires:
 * - **React** (standard React hooks: useState, useEffect, useMemo, useRef)
 * - **Tailwind CSS** (for styling the controls component - can be replaced with custom styles)
 * - **lucide-react** (for icons - install with `npm install lucide-react`)
 * 
 * ## Installation in Another Project
 * 
 * 1. Copy the entire `unified/` directory to your project
 * 2. Install dependencies: `npm install lucide-react` (if not already installed)
 * 3. Ensure Tailwind CSS is configured in your project (or replace Tailwind classes with your own styling)
 * 4. Import and use:
 * 
 * ```typescript
 * import { useXAxisViewport } from './unified/XAxisViewport';
 * import { XAxisPanZoomControls } from './unified/XAxisPanZoomControls';
 * 
 * const xAxis = useXAxisViewport({
 *   axisType: 'numeric',
 *   worldMin: 0,
 *   worldMax: 1000,
 *   worldWidth: 1000,
 *   maxZoom: 500
 * });
 * ```
 * 
 * ## Files in the Unified System
 * 
 * - **XAxisViewport.ts** - Main hook (this file) - manages viewport state and tick generation
 * - **XAxisPanZoomControls.tsx** - UI component for zoom/pan controls
 * - **XAxisNumericTicks.ts** - Utilities for numeric tick generation
 * - **XAxisDateTicks.ts** - Utilities for date/time tick generation
 * 
 * All files are self-contained and have no project-specific dependencies.
 * 
 * @module XAxisViewport
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { getNumericTickStep, getNumericTicks } from './XAxisNumericTicks';
import { getDateTicks, formatDateTick, type DateTickGranularity, type DateTicksResult } from './XAxisDateTicks';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type DragType = 'left' | 'right' | 'bar';

/**
 * Configuration for numeric X-axis viewport
 */
export type NumericXAxisConfig = {
  /** Type of axis - must be 'numeric' */
  axisType: 'numeric';
  /** Minimum value in the full data range */
  worldMin: number;
  /** Maximum value in the full data range */
  worldMax: number;
  /** Width of the full data range (typically max(worldMax - worldMin, 1)) */
  worldWidth: number;
  /** Maximum zoom level (percentage, e.g., 500 = 500%) */
  maxZoom: number;
  /** Target number of ticks to display (default: 8) */
  targetTickCount?: number;
  /** Whether to initialize viewport to full range (default: true) */
  initialToFullRange?: boolean;
  /** Whether viewport controls are enabled (default: true) */
  isEnabled?: boolean;
};

/**
 * Configuration for date/time X-axis viewport
 */
export type DateXAxisConfig = {
  /** Type of axis - must be 'date' */
  axisType: 'date';
  /** Minimum timestamp (ms) in the full data range */
  worldMin: number;
  /** Maximum timestamp (ms) in the full data range */
  worldMax: number;
  /** Width of the full data range (typically max(worldMax - worldMin, 1)) */
  worldWidth: number;
  /** Maximum zoom level (percentage, e.g., 500 = 500%) */
  maxZoom: number;
  /** Target number of ticks to display (default: 8) */
  targetTickCount?: number;
  /** Timezone mode: 'local' or 'utc' (default: 'local') */
  timezone?: 'local' | 'utc';
  /** Week start day: 0 = Sunday, 1 = Monday (default: 1) */
  weekStartsOn?: 0 | 1;
  /** Whether to initialize viewport to full range (default: true) */
  initialToFullRange?: boolean;
  /** Whether viewport controls are enabled (default: true) */
  isEnabled?: boolean;
};

/**
 * Union type for all X-axis configurations
 */
export type XAxisViewportConfig = NumericXAxisConfig | DateXAxisConfig;

/**
 * Return type for numeric X-axis viewport
 */
export type NumericXAxisViewport = {
  // Viewport state
  viewMin: number;
  viewMax: number;
  zoomPercent: number;
  maxZoom: number;
  viewWidth: number;
  
  // Tick information
  ticks: number[];
  tickStep: number;
  tickFormatter?: undefined; // Numeric ticks don't need a formatter
  
  // X-axis domain (ready for Recharts)
  domain: [number, number];
  
  // Control props (ready to pass to XAxisPanZoomControls)
  controls: {
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
  };
  
  // Internal state (for advanced use cases)
  minWindowWidth: number;
  setViewMin: (v: number) => void;
  setViewMax: (v: number) => void;
  setZoomTo: (zRaw: number) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleReset: () => void;
};

/**
 * Return type for date X-axis viewport
 */
export type DateXAxisViewport = {
  // Viewport state
  viewMin: number;
  viewMax: number;
  zoomPercent: number;
  maxZoom: number;
  viewWidth: number;
  
  // Tick information
  ticks: number[];
  tickGranularity: DateTickGranularity;
  tickFormat: 'time' | 'monthDay' | 'month' | 'monthYear' | 'quarterYear' | 'year';
  tickFormatter: (ts: number) => string;
  
  // X-axis domain (ready for Recharts)
  domain: [number, number];
  
  // Control props (ready to pass to XAxisPanZoomControls)
  controls: {
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
  };
  
  // Internal state (for advanced use cases)
  minWindowWidth: number;
  setViewMin: (v: number) => void;
  setViewMax: (v: number) => void;
  setZoomTo: (zRaw: number) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleReset: () => void;
};

/**
 * Union type for all X-axis viewport returns
 */
export type XAxisViewport = NumericXAxisViewport | DateXAxisViewport;

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Unified X-axis viewport hook for charts with pan/zoom functionality.
 * 
 * This hook manages viewport state, automatically generates appropriate ticks,
 * and provides everything needed to render the chart and controls.
 * 
 * **Works with any charting library** - The hook is charting-library agnostic. While examples
 * show Recharts usage, you can use the returned values with D3, Chart.js, Plotly, or any
 * other charting library that supports X-axis domains and custom ticks.
 * 
 * @example
 * ```tsx
 * // For numeric X-axis
 * const xAxis = useXAxisViewport({
 *   axisType: 'numeric',
 *   worldMin: 0,
 *   worldMax: 1000,
 *   worldWidth: 1000,
 *   maxZoom: 500
 * });
 * 
 * // Use in Recharts
 * <XAxis domain={xAxis.domain} ticks={xAxis.ticks} />
 * <XAxisPanZoomControls {...xAxis.controls} />
 * 
 * // Or use with any other charting library
 * // xAxis.domain, xAxis.ticks, xAxis.viewMin, xAxis.viewMax are all standard values
 * ```
 * 
 * @example
 * ```tsx
 * // For date/time X-axis
 * const xAxis = useXAxisViewport({
 *   axisType: 'date',
 *   worldMin: startTimestamp,
 *   worldMax: endTimestamp,
 *   worldWidth: endTimestamp - startTimestamp,
 *   maxZoom: 500,
 *   timezone: 'local'
 * });
 * 
 * // Use in chart
 * <XAxis 
 *   domain={xAxis.domain} 
 *   ticks={xAxis.ticks}
 *   tickFormatter={xAxis.tickFormatter}
 * />
 * <XAxisPanZoomControls {...xAxis.controls} />
 * ```
 * 
 * @param config - Configuration object (see XAxisViewportConfig type)
 * @returns X-axis viewport state and utilities (see XAxisViewport type)
 * 
 * @see {@link XAxisViewportConfig} for configuration options
 * @see {@link NumericXAxisViewport} for numeric axis return type
 * @see {@link DateXAxisViewport} for date axis return type
 */
export function useXAxisViewport(config: XAxisViewportConfig): XAxisViewport {
  const {
    worldMin,
    worldMax,
    worldWidth,
    maxZoom,
    initialToFullRange = true,
    isEnabled = true
  } = config;

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  // Source-of-truth window
  const [viewMin, setViewMin] = useState<number>(worldMin);
  const [viewMax, setViewMax] = useState<number>(worldMax);

  // slider DOM ref (instance-local)
  const sliderRef = useRef<HTMLDivElement>(null);

  // Init to full range
  useEffect(() => {
    if (!isEnabled) return;
    if (!initialToFullRange) return;
    setViewMin(worldMin);
    setViewMax(worldMax);
  }, [isEnabled, initialToFullRange, worldMin, worldMax]);

  // Min window width implied by maxZoom
  const minWindowWidth = useMemo(() => {
    const z = Math.max(maxZoom, 1);
    return worldWidth / (z / 100);
  }, [worldWidth, maxZoom]);

  const viewWidth = useMemo(() => {
    const w = Math.max(viewMax - viewMin, 1e-6);
    return Math.min(Math.max(w, minWindowWidth), worldWidth);
  }, [viewMin, viewMax, minWindowWidth, worldWidth]);

  const centerX = useMemo(() => (viewMin + viewMax) / 2, [viewMin, viewMax]);

  const zoomPercent = useMemo(() => {
    const z = (worldWidth / Math.max(viewWidth, 1e-6)) * 100;
    return clamp(Math.round(z), 50, maxZoom);
  }, [worldWidth, viewWidth, maxZoom]);

  // Keep window clamped when world/maxZoom changes
  useEffect(() => {
    if (!isEnabled) return;

    const targetWidth = clamp(viewMax - viewMin, minWindowWidth, worldWidth);

    let nextMin = centerX - targetWidth / 2;
    let nextMax = centerX + targetWidth / 2;

    if (nextMin < worldMin) {
      nextMin = worldMin;
      nextMax = worldMin + targetWidth;
    }
    if (nextMax > worldMax) {
      nextMax = worldMax;
      nextMin = worldMax - targetWidth;
    }

    nextMin = clamp(nextMin, worldMin, worldMax);
    nextMax = clamp(nextMax, worldMin, worldMax);

    if (targetWidth >= worldWidth) {
      nextMin = worldMin;
      nextMax = worldMax;
    }

    setViewMin(nextMin);
    setViewMax(nextMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, maxZoom, worldMin, worldMax, worldWidth, minWindowWidth]);

  const setZoomTo = (zRaw: number) => {
    if (!isEnabled) return;

    const z = clamp(Math.round(zRaw), 50, maxZoom);
    const targetWidth = clamp(worldWidth / (z / 100), minWindowWidth, worldWidth);

    let nextMin = centerX - targetWidth / 2;
    let nextMax = centerX + targetWidth / 2;

    if (nextMin < worldMin) {
      nextMin = worldMin;
      nextMax = worldMin + targetWidth;
    }
    if (nextMax > worldMax) {
      nextMax = worldMax;
      nextMin = worldMax - targetWidth;
    }

    if (targetWidth >= worldWidth) {
      nextMin = worldMin;
      nextMax = worldMax;
    }

    setViewMin(nextMin);
    setViewMax(nextMax);
  };

  const handleZoomIn = () => setZoomTo(zoomPercent + 10);
  const handleZoomOut = () => setZoomTo(zoomPercent - 10);
  const handleReset = () => {
    if (!isEnabled) return;
    setViewMin(worldMin);
    setViewMax(worldMax);
  };

  // Zoom input UX
  const [zoomInput, setZoomInput] = useState<string>('100');
  const zoomEditingRef = useRef(false);

  useEffect(() => {
    if (!zoomEditingRef.current) setZoomInput(String(zoomPercent));
  }, [zoomPercent]);

  const handleZoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    zoomEditingRef.current = true;
    const v = e.target.value;
    setZoomInput(v);

    const parsed = parseInt(v, 10);
    if (!isNaN(parsed)) setZoomTo(parsed);
  };

  const handleZoomInputBlur = () => {
    zoomEditingRef.current = false;
    setZoomInput(String(zoomPercent));
  };

  // Slider percents
  const sliderPercents = useMemo<[number, number]>(() => {
    if (!isEnabled) return [0, 100];
    const leftPct = ((viewMin - worldMin) / worldWidth) * 100;
    const rightPct = ((viewMax - worldMin) / worldWidth) * 100;
    return [clamp(leftPct, 0, 100), clamp(rightPct, 0, 100)];
  }, [isEnabled, viewMin, viewMax, worldMin, worldWidth]);

  const pctToX = (pct: number) => worldMin + (pct / 100) * worldWidth;

  const [dragState, setDragState] = useState<{
    active: boolean;
    type: DragType | null;
    startClientX: number;
    startMin: number;
    startMax: number;
  }>({
    active: false,
    type: null,
    startClientX: 0,
    startMin: 0,
    startMax: 0
  });

  const handleSliderMouseDown = (e: React.MouseEvent, type: DragType) => {
    if (!isEnabled) return;
    e.preventDefault();
    setDragState({
      active: true,
      type,
      startClientX: e.clientX,
      startMin: viewMin,
      startMax: viewMax
    });
  };

  useEffect(() => {
    if (!isEnabled) return;
    if (!dragState.active) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = sliderRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const sliderWidthPx = rect.width;
      if (!sliderWidthPx) return;

      const deltaPx = e.clientX - dragState.startClientX;
      const deltaPct = (deltaPx / sliderWidthPx) * 100;
      const deltaX = (deltaPct / 100) * worldWidth;

      const startWidth = dragState.startMax - dragState.startMin;

      // BAR = pan only
      if (dragState.type === 'bar') {
        let nextMin = dragState.startMin + deltaX;
        let nextMax = dragState.startMax + deltaX;

        if (nextMin < worldMin) {
          nextMin = worldMin;
          nextMax = worldMin + startWidth;
        }
        if (nextMax > worldMax) {
          nextMax = worldMax;
          nextMin = worldMax - startWidth;
        }

        nextMin = clamp(nextMin, worldMin, worldMax);
        nextMax = clamp(nextMax, worldMin, worldMax);

        setViewMin(nextMin);
        setViewMax(nextMax);
        return;
      }

      // LEFT handle
      if (dragState.type === 'left') {
        const startLeftPct = ((dragState.startMin - worldMin) / worldWidth) * 100;
        const nextLeftPct = clamp(startLeftPct + deltaPct, 0, 100);

        let nextMin = pctToX(nextLeftPct);
        let nextMax = dragState.startMax;

        if (nextMax - nextMin < minWindowWidth) nextMin = nextMax - minWindowWidth;

        if (nextMin < worldMin) {
          nextMin = worldMin;
          nextMax = Math.min(worldMin + Math.max(minWindowWidth, nextMax - nextMin), worldMax);
        }

        if (nextMax - nextMin > worldWidth) {
          nextMin = worldMin;
          nextMax = worldMax;
        }

        setViewMin(clamp(nextMin, worldMin, worldMax));
        setViewMax(clamp(nextMax, worldMin, worldMax));
        return;
      }

      // RIGHT handle
      if (dragState.type === 'right') {
        const startRightPct = ((dragState.startMax - worldMin) / worldWidth) * 100;
        const nextRightPct = clamp(startRightPct + deltaPct, 0, 100);

        let nextMax = pctToX(nextRightPct);
        let nextMin = dragState.startMin;

        if (nextMax - nextMin < minWindowWidth) nextMax = nextMin + minWindowWidth;

        if (nextMax > worldMax) {
          nextMax = worldMax;
          nextMin = Math.max(worldMax - Math.max(minWindowWidth, nextMax - nextMin), worldMin);
        }

        if (nextMax - nextMin > worldWidth) {
          nextMin = worldMin;
          nextMax = worldMax;
        }

        setViewMin(clamp(nextMin, worldMin, worldMax));
        setViewMax(clamp(nextMax, worldMin, worldMax));
      }
    };

    const handleMouseUp = () => {
      setDragState(s => ({ ...s, active: false, type: null }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEnabled, dragState, worldWidth, worldMin, worldMax, minWindowWidth]);

  // Generate ticks based on axis type
  const numericTicks = useMemo(() => {
    if (config.axisType !== 'numeric') return null;
    
    const tickStep = getNumericTickStep(viewWidth);
    return {
      ticks: getNumericTicks({ viewMin, viewMax, tickStep }),
      tickStep
    };
  }, [config.axisType, viewMin, viewMax, viewWidth]);

  // Determine if year should be included in formatting (for date axes)
  const includeYear = useMemo(() => {
    if (config.axisType !== 'date') return false;
    const y1 = new Date(viewMin).getFullYear();
    const y2 = new Date(viewMax).getFullYear();
    return y1 !== y2;
  }, [config.axisType, viewMin, viewMax]);

  const dateTicks = useMemo(() => {
    if (config.axisType !== 'date') return null;
    
    const result = getDateTicks({
      viewMin,
      viewMax,
      targetTickCount: config.targetTickCount ?? 8,
      timezone: config.timezone ?? 'local',
      weekStartsOn: config.weekStartsOn ?? 1,
      clampToView: true
    });
    
    return {
      ...result,
      includeYear
    };
  }, [
    config.axisType,
    viewMin,
    viewMax,
    config.targetTickCount,
    config.axisType === 'date' ? config.timezone : undefined,
    config.axisType === 'date' ? config.weekStartsOn : undefined,
    includeYear,
  ]);

  // Build controls object
  const controls = {
    zoomPercent,
    maxZoom,
    zoomInput,
    onZoomOut: handleZoomOut,
    onZoomIn: handleZoomIn,
    onReset: handleReset,
    onZoomInputChange: handleZoomInputChange,
    onZoomInputBlur: handleZoomInputBlur,
    sliderPercents,
    sliderRef,
    onSliderMouseDown: handleSliderMouseDown
  };

  // Return appropriate type based on axis type
  if (config.axisType === 'numeric') {
    if (!numericTicks) {
      throw new Error('Numeric ticks not generated');
    }
    
    return {
      viewMin,
      viewMax,
      zoomPercent,
      maxZoom,
      viewWidth,
      ticks: numericTicks.ticks,
      tickStep: numericTicks.tickStep,
      domain: [viewMin, viewMax] as [number, number],
      controls,
      minWindowWidth,
      setViewMin,
      setViewMax,
      setZoomTo,
      handleZoomIn,
      handleZoomOut,
      handleReset
    } as NumericXAxisViewport;
  } else {
    if (!dateTicks) {
      throw new Error('Date ticks not generated');
    }
    
    const tickFormatter = (ts: number) => 
      formatDateTick(ts, {
        granularity: dateTicks.granularity,
        timezone: config.timezone ?? 'local',
        includeYear: dateTicks.includeYear
      });
    
    return {
      viewMin,
      viewMax,
      zoomPercent,
      maxZoom,
      viewWidth,
      ticks: dateTicks.ticks,
      tickGranularity: dateTicks.granularity,
      tickFormat: dateTicks.format,
      tickFormatter,
      domain: [viewMin, viewMax] as [number, number],
      controls,
      minWindowWidth,
      setViewMin,
      setViewMax,
      setZoomTo,
      handleZoomIn,
      handleZoomOut,
      handleReset
    } as DateXAxisViewport;
  }
}

