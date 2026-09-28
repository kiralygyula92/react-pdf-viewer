/** Default zoom floor (25%). */
export const DEFAULT_MIN_SCALE = 0.25;
/** Default zoom ceiling (500%). */
export const DEFAULT_MAX_SCALE = 5;
/** Default zoom increment (5%). */
export const DEFAULT_SCALE_STEP = 0.05;
/** 100%: one PDF point per CSS pixel. */
export const DEFAULT_SCALE = 1;

const EPSILON = 1e-6;

/** Removes floating-point noise (`1.5000000000000004` → `1.5`). */
export function roundScale(scale: number): number {
  return Math.round(scale * 10_000) / 10_000;
}

/** Tolerance-based scale comparison. */
export function scalesEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

function clampScale(scale: number, min: number, max: number): number {
  return Math.min(Math.max(scale, min), max);
}

/** Zoom constraints shared by the buttons, shortcuts and imperative API. */
export interface ZoomOptions {
  minScale: number;
  maxScale: number;
  scaleStep: number;
  /** Preset ladder; when non-empty the zoom buttons step between presets instead of by `scaleStep`. */
  zoomLevels?: readonly number[] | undefined;
}

function ladder({ zoomLevels, minScale, maxScale }: ZoomOptions): number[] {
  const levels = (zoomLevels ?? [])
    .filter((level) => Number.isFinite(level) && level > 0)
    .map((level) => roundScale(clampScale(level, minScale, maxScale)));
  return [...new Set(levels)].sort((a, b) => a - b);
}

/** The next zoom value in `direction`, or `null` when already at the bound. */
export function nextScale(current: number, direction: 1 | -1, options: ZoomOptions): number | null {
  const levels = ladder(options);
  let next: number | undefined;
  if (levels.length > 0) {
    next =
      direction > 0
        ? levels.find((level) => level > current + EPSILON)
        : levels.findLast((level) => level < current - EPSILON);
  } else {
    next = roundScale(
      clampScale(current + direction * options.scaleStep, options.minScale, options.maxScale),
    );
  }
  return next === undefined || scalesEqual(next, current) ? null : next;
}

/** Normalizes an arbitrary requested scale: clamps to the bounds and removes float noise. */
export function normalizeScale(scale: number, options: Pick<ZoomOptions, 'minScale' | 'maxScale'>) {
  return roundScale(clampScale(scale, options.minScale, options.maxScale));
}

/** Integer percentage shown in the zoom label (`Math.round(scale * 100)`). */
export function scaleToPercent(scale: number): number {
  return Math.round(scale * 100);
}
