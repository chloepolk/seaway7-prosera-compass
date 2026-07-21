# X-Axis Pan & Zoom Component

A unified, portable X-axis pan/zoom system for charts that works with any charting library (Recharts, D3, Chart.js, Plotly, etc.).

## Overview

This directory contains a complete solution for adding interactive pan and zoom functionality to chart X-axes. The system is **charting-library agnostic** and provides:

- **Viewport state management** - Handles zoom levels, panning, and viewport boundaries
- **Automatic tick generation** - Intelligently generates appropriate tick marks for numeric or date/time axes
- **UI controls** - Ready-to-use zoom/pan controls component
- **Type safety** - Full TypeScript support with comprehensive type definitions

## Files

| File | Purpose |
|------|---------|
| `XAxisViewport.ts` | Main hook (`useXAxisViewport`) - manages viewport state and tick generation |
| `XAxisPanZoomControls.tsx` | UI component for zoom/pan controls (buttons, slider, input) |
| `XAxisNumericTicks.ts` | Utilities for numeric tick generation |
| `XAxisDateTicks.ts` | Utilities for date/time tick generation with timezone support |

## Dependencies

- **React** (standard hooks: `useState`, `useEffect`, `useMemo`, `useRef`)
- **Tailwind CSS** (for styling the controls component - can be replaced with custom styles)
- **lucide-react** (for icons - install with `npm install lucide-react`)

## Quick Start

### Basic Usage (Numeric Axis)

```tsx
import { useXAxisViewport } from '@/components/shadcn-studio/x-chart-pan-zoom/XAxisViewport'
import { XAxisPanZoomControls } from '@/components/shadcn-studio/x-chart-pan-zoom/XAxisPanZoomControls'

function MyChart() {
  // Initialize viewport for numeric X-axis (e.g., 0-1000)
  const xAxis = useXAxisViewport({
    axisType: 'numeric',
    worldMin: 0,        // Minimum value in full data range
    worldMax: 1000,     // Maximum value in full data range
    worldWidth: 1000,   // Width of full range (typically max - min)
    maxZoom: 500        // Maximum zoom level (500% = 5x zoom)
  })

  // Filter data to visible range
  const visibleData = data.filter(
    point => point.x >= xAxis.viewMin && point.x <= xAxis.viewMax
  )

  return (
    <div>
      {/* Use with Recharts */}
      <LineChart data={visibleData}>
        <XAxis 
          domain={xAxis.domain}  // [viewMin, viewMax]
          ticks={xAxis.ticks}    // Auto-generated tick positions
        />
        <Line dataKey="value" />
      </LineChart>

      {/* Add controls */}
      <XAxisPanZoomControls {...xAxis.controls} />
    </div>
  )
}
```

### Date/Time Axis

```tsx
const xAxis = useXAxisViewport({
  axisType: 'date',
  worldMin: startTimestamp,      // Start timestamp (ms)
  worldMax: endTimestamp,        // End timestamp (ms)
  worldWidth: endTimestamp - startTimestamp,
  maxZoom: 500,
  timezone: 'local',             // or 'utc'
  weekStartsOn: 1                // 0 = Sunday, 1 = Monday
})

// Use with Recharts
<XAxis 
  domain={xAxis.domain}
  ticks={xAxis.ticks}
  tickFormatter={xAxis.tickFormatter}  // Formats dates automatically
/>
```

## API Reference

### `useXAxisViewport(config)`

Main hook that manages viewport state and generates ticks.

#### Configuration Options

**For Numeric Axes:**
```typescript
{
  axisType: 'numeric'
  worldMin: number           // Minimum value in full data range
  worldMax: number           // Maximum value in full data range
  worldWidth: number         // Width of full range (typically max - min)
  maxZoom: number            // Maximum zoom level (e.g., 500 = 500%)
  targetTickCount?: number   // Target number of ticks (default: 8)
  initialToFullRange?: boolean  // Start with full range visible (default: true)
  isEnabled?: boolean        // Enable/disable controls (default: true)
}
```

**For Date/Time Axes:**
```typescript
{
  axisType: 'date'
  worldMin: number           // Start timestamp (milliseconds)
  worldMax: number           // End timestamp (milliseconds)
  worldWidth: number         // Width of full range (typically max - min)
  maxZoom: number            // Maximum zoom level (e.g., 500 = 500%)
  targetTickCount?: number   // Target number of ticks (default: 8)
  timezone?: 'local' | 'utc'  // Timezone mode (default: 'local')
  weekStartsOn?: 0 | 1       // Week start: 0 = Sunday, 1 = Monday (default: 1)
  initialToFullRange?: boolean  // Start with full range visible (default: true)
  isEnabled?: boolean        // Enable/disable controls (default: true)
}
```

#### Return Value

The hook returns an object with:

**Viewport State:**
- `viewMin` - Current minimum visible value
- `viewMax` - Current maximum visible value
- `viewWidth` - Width of current viewport
- `zoomPercent` - Current zoom level (100% = full range visible)
- `maxZoom` - Maximum allowed zoom level

**Tick Information:**
- `ticks` - Array of tick positions (numbers or timestamps)
- `domain` - `[viewMin, viewMax]` tuple ready for chart libraries
- For numeric: `tickStep` - Step size between ticks
- For date: `tickGranularity`, `tickFormat`, `tickFormatter` - Date formatting

**Controls Props:**
- `controls` - Object with all props needed for `<XAxisPanZoomControls>`

**Advanced Methods:**
- `setViewMin(value)` - Set minimum viewport value
- `setViewMax(value)` - Set maximum viewport value
- `setZoomTo(percent)` - Set zoom level directly
- `handleZoomIn()` - Zoom in by 10%
- `handleZoomOut()` - Zoom out by 10%
- `handleReset()` - Reset to full range

### `XAxisPanZoomControls`

UI component for zoom/pan controls.

**Props:**
```typescript
{
  zoomPercent: number        // Current zoom level
  maxZoom: number            // Maximum zoom level
  zoomInput: string         // Zoom input field value
  onZoomOut: () => void     // Zoom out handler
  onZoomIn: () => void      // Zoom in handler
  onReset: () => void       // Reset handler
  onZoomInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onZoomInputBlur: () => void
  sliderPercents: [number, number]  // Slider position [left%, right%]
  sliderRef: React.RefObject<HTMLDivElement>
  onSliderMouseDown: (e: React.MouseEvent, type: 'left' | 'right' | 'bar') => void
  helperText?: string        // Optional helper text (default: "Drag handles to zoom • Drag bar to pan")
}
```

**Note:** All props are automatically provided by `xAxis.controls` - just spread them:
```tsx
<XAxisPanZoomControls {...xAxis.controls} />
```

## Features

### Automatic Tick Generation

The system automatically generates appropriate tick marks based on:
- **Viewport width** - More ticks when zoomed in, fewer when zoomed out
- **Axis type** - Different strategies for numeric vs. date/time
- **Target count** - Configurable target number of ticks (default: 8)

**Numeric ticks** use "nice" step sizes (10, 25, 50, 100, etc.) for readability.

**Date ticks** automatically choose appropriate granularity:
- Hours (for day views)
- Days (for week/month views)
- Weeks (for month views)
- Months (for year views)
- Quarters/Years (for multi-year views)

### Timezone Support

Date axes support both local timezone and UTC:
- `timezone: 'local'` - Uses browser's local timezone (respects DST)
- `timezone: 'utc'` - Uses UTC boundaries

### Interactive Controls

The controls component provides:
- **Zoom buttons** - Increment/decrement zoom by 10%
- **Zoom input** - Direct zoom level entry
- **Reset button** - Return to full range
- **Slider** - Drag handles to zoom, drag bar to pan
- **Visual feedback** - Shows current zoom level and viewport position

## Integration Examples

### With Recharts

```tsx
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

const xAxis = useXAxisViewport({
  axisType: 'numeric',
  worldMin: 0,
  worldMax: 1000,
  worldWidth: 1000,
  maxZoom: 500
})

const filteredData = data.filter(
  d => d.x >= xAxis.viewMin && d.x <= xAxis.viewMax
)

<ResponsiveContainer width="100%" height={400}>
  <LineChart data={filteredData}>
    <XAxis 
      dataKey="x"
      type="number"
      domain={xAxis.domain}
      ticks={xAxis.ticks}
    />
    <YAxis />
    <Line dataKey="y" />
  </LineChart>
</ResponsiveContainer>

<XAxisPanZoomControls {...xAxis.controls} />
```

### With Other Chart Libraries

The hook returns standard values that work with any charting library:

```tsx
// D3.js example
const xScale = d3.scaleLinear()
  .domain(xAxis.domain)  // [viewMin, viewMax]
  .range([0, width])

// Chart.js example
const chartData = {
  labels: xAxis.ticks.map(t => t.toString()),
  datasets: [{
    data: filteredData
  }]
}

// Plotly example
const layout = {
  xaxis: {
    range: xAxis.domain  // [viewMin, viewMax]
  }
}
```

## Portability

This system is designed to be **portable** and can be dropped into any project:

1. Copy the entire `x-chart-pan-zoom/` directory
2. Install dependencies: `npm install lucide-react` (if not already installed)
3. Ensure Tailwind CSS is configured (or replace Tailwind classes with custom styles)
4. Import and use

The system has **no project-specific dependencies** - it only requires React, Tailwind CSS (for controls styling), and lucide-react (for icons).

## Best Practices

1. **Filter data** - Always filter your data array to only include points within `[viewMin, viewMax]` for better performance
2. **Memoize filtered data** - Use `useMemo` to avoid recalculating filtered data on every render
3. **Set appropriate maxZoom** - Higher values allow more zoom but may impact performance
4. **Use targetTickCount** - Adjust based on your chart width (more ticks for wider charts)
5. **Handle edge cases** - The system handles edge cases automatically, but ensure your data is valid

## Example: Complete Chart with Pan/Zoom

See `typeline-chart-inventory-panzoom.tsx` in `/src/components/shadcn-studio/blocks/` for a complete working example.

