import { describe, expect, it } from 'vitest';
import {
  createPdfViewerError,
  isAbortError,
  isPdfViewerError,
  isRenderCancelled,
  toPdfViewerError,
} from '../src/core/errors';
import { DEFAULT_FILE_NAME, fileNameFromUrl, resolveFileName } from '../src/core/fileName';
import {
  clampPage,
  effectiveRotation,
  fitScale,
  getOutputScale,
  normalizeRotation,
} from '../src/core/geometry';
import {
  DEFAULT_MAX_SCALE,
  DEFAULT_MIN_SCALE,
  DEFAULT_SCALE_STEP,
  nextScale,
  normalizeScale,
  roundScale,
  scalesEqual,
  scaleToPercent,
} from '../src/core/scale';
import { InvalidPDFException, PasswordException, RenderingCancelledException } from './pdfjsMock';

const zoom = {
  minScale: DEFAULT_MIN_SCALE,
  maxScale: DEFAULT_MAX_SCALE,
  scaleStep: DEFAULT_SCALE_STEP,
};

describe('scale', () => {
  it('KI-16: ten 5% steps from 100% land exactly on 150%', () => {
    let scale = 1;
    for (let i = 0; i < 10; i++) {
      scale = nextScale(scale, 1, zoom) ?? scale;
    }
    expect(scale).toBe(1.5);
    expect(1 + 0.05 * 10).not.toBe(1.5 + Number.EPSILON * 10); // sanity: raw float math drifts
    expect(roundScale(1.5000000000000004)).toBe(1.5);
  });

  it('U-04: steps by 5% and clamps to 25%–500%', () => {
    expect(nextScale(1, -1, zoom)).toBe(0.95);
    expect(nextScale(0.27, -1, zoom)).toBe(0.25);
    expect(nextScale(0.25, -1, zoom)).toBeNull();
    expect(nextScale(4.98, 1, zoom)).toBe(5);
    expect(nextScale(5, 1, zoom)).toBeNull();
  });

  it('steps between zoom presets when a ladder is given', () => {
    const ladder = { ...zoom, zoomLevels: [0.5, 1, 1.5, 2, 9] };
    expect(nextScale(1, 1, ladder)).toBe(1.5);
    expect(nextScale(1.2, -1, ladder)).toBe(1);
    expect(nextScale(0.5, -1, ladder)).toBeNull();
    // Presets beyond maxScale are clamped into range.
    expect(nextScale(2, 1, ladder)).toBe(5);
    expect(nextScale(5, 1, ladder)).toBeNull();
  });

  it('compares with tolerance and formats percentages', () => {
    expect(scalesEqual(1, 1.0000000001)).toBe(true);
    expect(scalesEqual(1, 1.01)).toBe(false);
    expect(scaleToPercent(1.5000000000000004)).toBe(150);
    expect(normalizeScale(12, zoom)).toBe(5);
    expect(normalizeScale(0.1, zoom)).toBe(0.25);
  });
});

describe('geometry', () => {
  it('E-06: clamps pages to [1, numPages]', () => {
    expect(clampPage(5, 3)).toBe(3);
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(Number.NaN, 3)).toBe(1);
    expect(clampPage(2, 0)).toBe(1);
  });

  it('E-08 / KI-03: adds the user rotation to the intrinsic /Rotate', () => {
    expect(effectiveRotation(90, 0)).toBe(90);
    expect(effectiveRotation(90, 90)).toBe(180);
    expect(effectiveRotation(270, 180)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
  });

  it('KI-04 / KI-26: uses the device pixel ratio but caps the canvas area', () => {
    expect(getOutputScale(612, 792, 2, 16_777_216)).toBe(2);
    const capped = getOutputScale(3060, 3960, 3, 16_777_216);
    expect(capped).toBeLessThan(3);
    expect(3060 * 3960 * capped * capped).toBeLessThanOrEqual(16_777_216 + 1);
    expect(getOutputScale(612, 792, 0, 16_777_216)).toBe(1);
  });

  it('KI-15: fit shrinks but never enlarges unless upscale is set', () => {
    expect(fitScale(1, 612, 792, { width: 306 })).toBe(0.5);
    expect(fitScale(1, 612, 792, { width: 2000 })).toBe(1);
    expect(fitScale(1, 612, 792, { width: 1224, upscale: true })).toBe(2);
    expect(fitScale(1, 612, 792, { width: 1224, height: 396, upscale: true })).toBe(0.5);
    expect(fitScale(1.5, 612, 792, undefined)).toBe(1.5);
  });
});

describe('errors', () => {
  it('maps PDF.js exceptions by name', () => {
    expect(
      toPdfViewerError(new InvalidPDFException('Invalid PDF structure.'), 'UNKNOWN'),
    ).toMatchObject({
      code: 'INVALID_PDF',
      message: 'Invalid PDF structure.',
    });
    expect(toPdfViewerError(new PasswordException('No password given', 1), 'UNKNOWN').code).toBe(
      'PASSWORD_REQUIRED',
    );
    expect(toPdfViewerError(new PasswordException('Incorrect Password', 2), 'UNKNOWN').code).toBe(
      'INCORRECT_PASSWORD',
    );
    expect(toPdfViewerError(new Error('boom'), 'RENDER_FAILED')).toMatchObject({
      code: 'RENDER_FAILED',
      message: 'boom',
    });
    expect(toPdfViewerError(42, 'UNKNOWN').message).toBe('Failed to load PDF document');
  });

  it('passes viewer errors through and recognises aborts and cancellations', () => {
    const error = createPdfViewerError('HTTP_ERROR', 'Nope', { status: 500 });
    expect(isPdfViewerError(error)).toBe(true);
    expect(toPdfViewerError(error, 'UNKNOWN')).toBe(error);
    expect(error.status).toBe(500);
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isRenderCancelled(new RenderingCancelledException('x'))).toBe(true);
    expect(isRenderCancelled(new Error('x'))).toBe(false);
  });
});

describe('fileName', () => {
  it('KI-11: resolves prop → File name → URL segment → default', () => {
    expect(resolveFileName('report.pdf', 'https://x.test/a.pdf')).toBe('report.pdf');
    expect(resolveFileName(undefined, new File([], 'upload.pdf'))).toBe('upload.pdf');
    expect(resolveFileName(undefined, 'https://x.test/files/My%20Doc.pdf?x=1')).toBe('My Doc.pdf');
    expect(resolveFileName(undefined, new URL('https://x.test/b.PDF'))).toBe('b.PDF');
    expect(resolveFileName(undefined, 'https://x.test/download?id=1')).toBe(DEFAULT_FILE_NAME);
    expect(resolveFileName(undefined, new Uint8Array())).toBe(DEFAULT_FILE_NAME);
    expect(fileNameFromUrl('/samples/letter.pdf')).toBe('letter.pdf');
  });
});
