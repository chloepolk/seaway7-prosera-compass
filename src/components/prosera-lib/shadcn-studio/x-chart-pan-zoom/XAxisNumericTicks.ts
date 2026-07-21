// components/visualizations/unified/XAxisNumericTicks.ts
// Numeric tick generation utilities for X-axis viewports

/**
 * Determines an appropriate tick step size based on the viewport width.
 * Returns a step value that will produce readable tick marks for numeric axes.
 * 
 * @param viewWidth - The width of the current viewport (max - min)
 * @returns The recommended tick step size
 */
export function getNumericTickStep(viewWidth: number): number {
  const w = Math.max(viewWidth, 1);

  if (w < 100) return 10;
  if (w < 500) return 25;
  if (w < 1000) return 50;
  if (w < 5000) return 100;
  if (w < 10000) return 250;
  if (w < 50000) return 500;
  if (w < 100000) return 1000;
  if (w < 500000) return 5000;
  if (w < 1000000) return 10000;
  return 25000;
}

/**
 * Generates an array of tick positions for a numeric X-axis within the specified viewport.
 * 
 * @param params - Configuration object
 * @param params.viewMin - Minimum value of the viewport
 * @param params.viewMax - Maximum value of the viewport
 * @param params.tickStep - Step size between ticks (use getNumericTickStep to determine)
 * @returns Array of tick positions (numbers) in ascending order
 */
export function getNumericTicks(params: {
  viewMin: number;
  viewMax: number;
  tickStep: number;
}): number[] {
  const { viewMin, viewMax, tickStep } = params;

  if (!isFinite(viewMin) || !isFinite(viewMax) || !isFinite(tickStep) || tickStep <= 0) return [];
  if (viewMax <= viewMin) return [];

  const ticks: number[] = [];
  const first = Math.ceil(viewMin / tickStep) * tickStep;

  for (let t = first; t <= viewMax; t += tickStep) ticks.push(t);

  return ticks;
}

