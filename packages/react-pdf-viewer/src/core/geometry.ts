import type { Rotation } from '../types.js';

/** Default canvas pixel budget: 4096², the iOS Safari limit. */
export const DEFAULT_MAX_CANVAS_PIXELS = 16_777_216;

// Largest canvas side accepted by every supported browser.
const MAX_CANVAS_DIMENSION = 32_767;

/** Clamps a 1-based page number to `[1, numPages]`. */
export function clampPage(page: number, numPages: number): number {
  const rounded = Number.isFinite(page) ? Math.round(page) : 1;
  return Math.min(Math.max(rounded, 1), Math.max(numPages, 1));
}

/** Snaps any angle to the nearest quarter turn in `[0, 360)`. */
export function normalizeRotation(degrees: number): Rotation {
  const quarter = Math.round(degrees / 90);
  return ((((quarter % 4) + 4) % 4) * 90) as Rotation;
}

/** Page rotation actually rendered: the page's intrinsic `/Rotate` plus the user rotation. */
export function effectiveRotation(intrinsic: number, user: number): Rotation {
  return normalizeRotation(intrinsic + user);
}

/**
 * Canvas backing-store multiplier: the device pixel ratio, reduced when the canvas would exceed
 * `maxCanvasPixels` or the largest side browsers accept. Resolution degrades; CSS size does not.
 */
export function getOutputScale(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  maxCanvasPixels: number,
): number {
  let scale = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const area = cssWidth * cssHeight;
  if (area <= 0) {
    return scale;
  }
  if (maxCanvasPixels > 0) {
    scale = Math.min(scale, Math.sqrt(maxCanvasPixels / area));
  }
  return Math.min(scale, MAX_CANVAS_DIMENSION / Math.max(cssWidth, cssHeight));
}

/** Constrains the rendered page to a box. */
export interface FitOptions {
  /** Available width in CSS pixels, including the page's border and padding. */
  width?: number | undefined;
  /** Available height in CSS pixels, including the page's border and padding. */
  height?: number | undefined;
  /** When `true` the page is scaled to fill the box; otherwise it only ever shrinks. */
  upscale?: boolean | undefined;
}

/** Scale that satisfies `fit` for a page whose size at scale 1 is `baseWidth × baseHeight`. */
export function fitScale(
  requested: number,
  baseWidth: number,
  baseHeight: number,
  fit: FitOptions | undefined,
): number {
  if (!fit) {
    return requested;
  }
  const ratios: number[] = [];
  if (fit.width !== undefined && fit.width > 0 && baseWidth > 0) {
    ratios.push(fit.width / baseWidth);
  }
  if (fit.height !== undefined && fit.height > 0 && baseHeight > 0) {
    ratios.push(fit.height / baseHeight);
  }
  if (ratios.length === 0) {
    return requested;
  }
  const fitted = Math.min(...ratios);
  return fit.upscale ? fitted : Math.min(requested, fitted);
}
