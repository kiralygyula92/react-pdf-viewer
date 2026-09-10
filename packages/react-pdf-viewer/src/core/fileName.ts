import type { PdfSource } from '../types.js';

/** Name used when nothing better is known. */
export const DEFAULT_FILE_NAME = 'document.pdf';

/** Last path segment of `url` when it ends in `.pdf`, otherwise `null`. */
export function fileNameFromUrl(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url, 'https://base.invalid/').pathname;
  } catch {
    return null;
  }
  const segment = pathname.split('/').pop() ?? '';
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Malformed escape: use the raw segment.
  }
  return /\.pdf$/i.test(decoded) ? decoded : null;
}

/**
 * Download file name: the explicit `fileName`, then a `File`'s name, then the URL's last
 * `.pdf` segment, then {@link DEFAULT_FILE_NAME}.
 */
export function resolveFileName(
  fileName: string | undefined,
  source: PdfSource | null | undefined,
): string {
  if (fileName) {
    return fileName;
  }
  if (typeof Blob !== 'undefined' && source instanceof Blob && 'name' in source) {
    const name = (source as File).name;
    if (name) {
      return name;
    }
  }
  if (typeof source === 'string' || source instanceof URL) {
    const fromUrl = fileNameFromUrl(source.toString());
    if (fromUrl) {
      return fromUrl;
    }
  }
  return DEFAULT_FILE_NAME;
}
