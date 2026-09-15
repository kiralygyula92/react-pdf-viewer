import { useEffect, useState } from 'react';

/** An entry of public/samples/manifest.json (written by scripts/generate-samples.ts). */
export interface Sample {
  file: string;
  title: string;
  pages: number;
  notes: string;
}

/** URL of a bundled sample, correct under any deployment base path. */
export const sampleUrl = (file: string) => `${import.meta.env.BASE_URL}samples/${file}`;

/** Remote URLs for the URL tab. */
export const REMOTE_PRESETS = [
  {
    label: 'PDF.js demo paper (CORS enabled)',
    url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
  },
  {
    label: 'W3C dummy PDF (no CORS headers: blocked)',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  },
] as const;

/** Loads the sample manifest once. */
export function useSamples(): Sample[] {
  const [samples, setSamples] = useState<Sample[]>([]);
  useEffect(() => {
    let active = true;
    fetch(sampleUrl('manifest.json'))
      .then((response) => response.json() as Promise<Sample[]>)
      .then((data) => {
        if (active) setSamples(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return samples;
}
