// components/visualizations/unified/XAxisDateTicks.ts
// Date/time tick generation utilities for X-axis viewports

export type DateTickGranularity = 'hour' | '6hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export type DateTickFormat = 'time' | 'monthDay' | 'month' | 'monthYear' | 'quarterYear' | 'year';

export type DateTicksResult = {
  ticks: number[]; // timestamps (ms) ascending
  granularity: DateTickGranularity;
  format: DateTickFormat;
};

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

/**
 * Pick a sensible tick granularity and produce "nice boundary" ticks for date/time axes.
 *
 * Notes:
 * - ticks are timestamps (ms)
 * - boundary alignment depends on timezone mode:
 *    - 'utc' uses UTC boundaries
 *    - 'local' uses local boundaries (DST can make day lengths irregular; that's OK)
 */
export function getDateTicks(params: {
  viewMin: number;
  viewMax: number;

  targetTickCount?: number; // default 8
  timezone?: 'local' | 'utc'; // default 'local'
  weekStartsOn?: 0 | 1; // 0=Sunday, 1=Monday; default 1
  clampToView?: boolean; // default true
}): DateTicksResult {
  const {
    viewMin,
    viewMax,
    targetTickCount = 8,
    timezone = 'local',
    weekStartsOn = 1,
    clampToView = true
  } = params;

  if (!isFiniteNumber(viewMin) || !isFiniteNumber(viewMax) || viewMax <= viewMin) {
    return { ticks: [], granularity: 'day', format: 'monthDay' };
  }

  const spanMs = viewMax - viewMin;
  const spanDays = spanMs / MS_DAY;

  // 1) Choose base granularity
  let granularity: DateTickGranularity;
  if (spanDays <= 2) granularity = 'hour';
  else if (spanDays <= 14) granularity = 'day';
  else if (spanDays <= 60) granularity = 'week';
  else if (spanDays <= 365) granularity = 'month';
  else if (spanDays <= 3 * 365) granularity = 'quarter';
  else granularity = 'year';

  // 2) Choose a step size within that granularity to keep ticks near target count
  // For 'hour' we may upgrade to '6hour' if needed.
  const maxTicksAllowed = Math.max(3, Math.floor(targetTickCount * 1.5));

  // Candidate steps by granularity (small → large)
  const steps: Record<DateTickGranularity, number[]> = {
    hour: [1, 2, 3, 4, 6, 12],
    '6hour': [6, 12],
    day: [1, 2, 3, 7],
    week: [1, 2, 4],
    month: [1, 2, 3, 6],
    quarter: [1, 2, 4], // step is quarters
    year: [1, 2, 5, 10]
  };

  // Estimate count given granularity+step (rough; calendar ones are approximate but good enough for choosing)
  function estimateTickCount(g: DateTickGranularity, step: number): number {
    if (g === 'hour') return Math.ceil(spanMs / (step * MS_HOUR));
    if (g === '6hour') return Math.ceil(spanMs / (step * MS_HOUR));
    if (g === 'day') return Math.ceil(spanMs / (step * MS_DAY));
    if (g === 'week') return Math.ceil(spanMs / (step * 7 * MS_DAY));
    if (g === 'month') return Math.ceil(spanDays / (step * 30));
    if (g === 'quarter') return Math.ceil(spanDays / (step * 90));
    return Math.ceil(spanDays / (step * 365));
  }

  // Hour granularity: if too many ticks at 1h, switch to 6-hour mode first.
  if (granularity === 'hour') {
    const est1h = estimateTickCount('hour', 1);
    if (est1h > maxTicksAllowed) {
      // Prefer 6-hour labels for dense <2d spans
      granularity = '6hour';
    }
  }

  // Find smallest step that stays under maxTicksAllowed
  let step = steps[granularity][0] ?? 1;
  for (const s of steps[granularity]) {
    const est = estimateTickCount(granularity, s);
    if (est <= maxTicksAllowed) {
      step = s;
      break;
    }
    step = s; // if all exceed, use largest
  }

  // 3) Choose label format hint
  const format: DateTickFormat = (() => {
    if (granularity === 'hour' || granularity === '6hour') return 'time';
    if (granularity === 'day' || granularity === 'week') return 'monthDay';
    if (granularity === 'month') return 'month';
    if (granularity === 'quarter') return 'quarterYear';
    return 'year';
  })();

  // 4) Generate ticks
  const first = ceilToBoundary(viewMin, granularity, step, { timezone, weekStartsOn });
  const ticks: number[] = [];

  // safety cap
  const HARD_CAP = 200;

  let t = first;
  let guard = 0;

  while (t <= viewMax && guard < HARD_CAP) {
    if (!clampToView || (t >= viewMin && t <= viewMax)) ticks.push(t);
    t = addStep(t, granularity, step, { timezone, weekStartsOn });
    guard++;
  }

  return { ticks, granularity, format };
}

/**
 * Format a numeric tick timestamp according to a chosen granularity and span hint.
 * - If includeYear is undefined, caller can decide based on whether view span crosses years.
 */
export function formatDateTick(
  ts: number,
  opts: {
    granularity: DateTickGranularity;
    timezone?: 'local' | 'utc';
    includeYear?: boolean;
  }
): string {
  const { granularity, timezone = 'local', includeYear } = opts;

  const useUTC = timezone === 'utc';

  // Quarter label needs custom formatting
  if (granularity === 'quarter') {
    const d = new Date(ts);
    const year = useUTC ? d.getUTCFullYear() : d.getFullYear();
    const month = useUTC ? d.getUTCMonth() : d.getMonth();
    const q = Math.floor(month / 3) + 1;
    return `Q${q} ${year}`;
  }

  if (granularity === 'year') {
    const d = new Date(ts);
    const year = useUTC ? d.getUTCFullYear() : d.getFullYear();
    return String(year);
  }

  if (granularity === 'hour' || granularity === '6hour') {
    // HH:mm
    const fmt = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: useUTC ? 'UTC' : undefined
    });
    return fmt.format(new Date(ts));
  }

  if (granularity === 'month') {
    // "MMM" or "MMM yyyy"
    const fmt = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      year: includeYear ? 'numeric' : undefined,
      timeZone: useUTC ? 'UTC' : undefined
    });
    return fmt.format(new Date(ts));
  }

  // day/week -> "MMM d" or "MMM d, yyyy"
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined,
    timeZone: useUTC ? 'UTC' : undefined
  });
  return fmt.format(new Date(ts));
}

/* -----------------------------
   Boundary alignment + stepping
------------------------------ */

function ceilToBoundary(
  ts: number,
  granularity: DateTickGranularity,
  step: number,
  opts: { timezone: 'local' | 'utc'; weekStartsOn: 0 | 1 }
): number {
  const { timezone, weekStartsOn } = opts;
  const useUTC = timezone === 'utc';

  if (granularity === 'hour') {
    // next full hour aligned to step hours
    const d = new Date(ts);
    if (useUTC) {
      const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), 0, 0, 0);
      const hour = d.getUTCHours();
      const nextAligned = alignUp(hour, step);
      const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), nextAligned, 0, 0, 0);
      return base < ts ? addStep(base, 'hour', step, opts) : base;
    } else {
      d.setMinutes(0, 0, 0);
      const hour = d.getHours();
      const nextAligned = alignUp(hour, step);
      d.setHours(nextAligned);
      let out = d.getTime();
      if (out < ts) out = addStep(out, 'hour', step, opts);
      return out;
    }
  }

  if (granularity === '6hour') {
    // align to 00/06/12/18, and allow step in hours (6 or 12)
    const baseStep = step; // hours
    const d = new Date(ts);
    if (useUTC) {
      const hour = d.getUTCHours();
      const alignedHour = alignUpToSet(hour, [0, 6, 12, 18]);
      const base0 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), alignedHour, 0, 0, 0);
      let out = base0;
      // ensure alignment to step (e.g., 12h means skip every other 6h tick)
      if (baseStep > 6) {
        out = alignHourToStepUTC(base0, baseStep);
      }
      if (out < ts) out = addStep(out, '6hour', baseStep, opts);
      return out;
    } else {
      d.setMinutes(0, 0, 0);
      const hour = d.getHours();
      const alignedHour = alignUpToSet(hour, [0, 6, 12, 18]);
      d.setHours(alignedHour);
      let out = d.getTime();
      if (baseStep > 6) out = alignHourToStepLocal(out, baseStep);
      if (out < ts) out = addStep(out, '6hour', baseStep, opts);
      return out;
    }
  }

  if (granularity === 'day') {
    // align to midnight, then step in days
    const d = new Date(ts);
    if (useUTC) {
      const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
      let out = base;
      if (out < ts) out = addStep(out, 'day', step, opts);
      return out;
    } else {
      d.setHours(0, 0, 0, 0);
      let out = d.getTime();
      if (out < ts) out = addStep(out, 'day', step, opts);
      return out;
    }
  }

  if (granularity === 'week') {
    // align to week start at midnight
    const d = new Date(ts);
    const dayOfWeek = useUTC ? d.getUTCDay() : d.getDay(); // 0=Sun
    const desired = weekStartsOn; // 0 Sun, 1 Mon
    const delta = (dayOfWeek - desired + 7) % 7;

    if (useUTC) {
      const baseMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
      const weekStart = baseMidnight - delta * MS_DAY;
      let out = weekStart;
      if (out < ts) out = addStep(out, 'week', step, opts);
      return out;
    } else {
      d.setHours(0, 0, 0, 0);
      const baseMidnight = d.getTime();
      const weekStart = baseMidnight - delta * MS_DAY;
      let out = weekStart;
      if (out < ts) out = addStep(out, 'week', step, opts);
      return out;
    }
  }

  if (granularity === 'month') {
    // align to first of month midnight
    const d = new Date(ts);
    if (useUTC) {
      const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0);
      let out = base;
      if (out < ts) out = addStep(out, 'month', step, opts);
      return out;
    } else {
      const base = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
      let out = base;
      if (out < ts) out = addStep(out, 'month', step, opts);
      return out;
    }
  }

  if (granularity === 'quarter') {
    // align to Jan/Apr/Jul/Oct 1 midnight
    const d = new Date(ts);
    if (useUTC) {
      const m = d.getUTCMonth();
      const qStartMonth = Math.floor(m / 3) * 3;
      const base = Date.UTC(d.getUTCFullYear(), qStartMonth, 1, 0, 0, 0, 0);
      let out = base;
      if (out < ts) out = addStep(out, 'quarter', step, opts);
      return out;
    } else {
      const m = d.getMonth();
      const qStartMonth = Math.floor(m / 3) * 3;
      const base = new Date(d.getFullYear(), qStartMonth, 1, 0, 0, 0, 0).getTime();
      let out = base;
      if (out < ts) out = addStep(out, 'quarter', step, opts);
      return out;
    }
  }

  // year
  {
    const d = new Date(ts);
    if (useUTC) {
      const base = Date.UTC(d.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      let out = base;
      if (out < ts) out = addStep(out, 'year', step, opts);
      return out;
    } else {
      const base = new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
      let out = base;
      if (out < ts) out = addStep(out, 'year', step, opts);
      return out;
    }
  }
}

function addStep(
  ts: number,
  granularity: DateTickGranularity,
  step: number,
  opts: { timezone: 'local' | 'utc'; weekStartsOn: 0 | 1 }
): number {
  const useUTC = opts.timezone === 'utc';

  if (granularity === 'hour' || granularity === '6hour') {
    return ts + step * MS_HOUR;
  }

  if (granularity === 'day') {
    return ts + step * MS_DAY;
  }

  if (granularity === 'week') {
    return ts + step * 7 * MS_DAY;
  }

  if (granularity === 'month') {
    const d = new Date(ts);
    if (useUTC) {
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      return Date.UTC(y, m + step, 1, 0, 0, 0, 0);
    } else {
      const y = d.getFullYear();
      const m = d.getMonth();
      return new Date(y, m + step, 1, 0, 0, 0, 0).getTime();
    }
  }

  if (granularity === 'quarter') {
    const d = new Date(ts);
    const months = step * 3;
    if (useUTC) {
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const qStart = Math.floor(m / 3) * 3;
      return Date.UTC(y, qStart + months, 1, 0, 0, 0, 0);
    } else {
      const y = d.getFullYear();
      const m = d.getMonth();
      const qStart = Math.floor(m / 3) * 3;
      return new Date(y, qStart + months, 1, 0, 0, 0, 0).getTime();
    }
  }

  // year
  {
    const d = new Date(ts);
    if (useUTC) {
      const y = d.getUTCFullYear();
      return Date.UTC(y + step, 0, 1, 0, 0, 0, 0);
    } else {
      const y = d.getFullYear();
      return new Date(y + step, 0, 1, 0, 0, 0, 0).getTime();
    }
  }
}

/* -----------------------------
   small helpers
------------------------------ */

function alignUp(value: number, step: number) {
  const s = Math.max(step, 1);
  return Math.ceil(value / s) * s;
}

function alignUpToSet(value: number, set: number[]) {
  // Find first element in set >= value, else wrap to next day's first element
  for (const v of set) if (v >= value) return v;
  return set[0] ?? 0;
}

// These are only used when granularity='6hour' and step=12, to ensure we land on 00/12 instead of 06/18, etc.
function alignHourToStepUTC(baseTs: number, stepHours: number) {
  const d = new Date(baseTs);
  const hour = d.getUTCHours();
  const aligned = alignUp(hour, stepHours) % 24;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), aligned, 0, 0, 0);
}

function alignHourToStepLocal(baseTs: number, stepHours: number) {
  const d = new Date(baseTs);
  const hour = d.getHours();
  const aligned = alignUp(hour, stepHours) % 24;
  d.setHours(aligned, 0, 0, 0);
  return d.getTime();
}

