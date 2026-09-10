// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

describe('package source', () => {
  const files = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

  it('KI-18 / KI-25: contains no host-app coupling, UI kits, globals or script injection', () => {
    const forbidden = [
      /treatment-report/,
      /\/auth\/sign-in/,
      /useAuthStore|purgeStoreData/,
      /window\.pdfjsLib/,
      /from ['"]@mui\//,
      /from ['"]@emotion\//,
      /createElement\(\s*['"]script['"]/,
      /waitForPdfJs/,
    ];
    const hits = files.flatMap(({ path, text }) =>
      forbidden.filter((pattern) => pattern.test(text)).map((pattern) => `${path}: ${pattern}`),
    );
    expect(hits).toEqual([]);
  });

  it('KI-19: pdfjs-dist is only loaded through the lazy loader', () => {
    const importers = files
      .filter(({ text }) =>
        /^import (?!type\b)[^;]*?from ['"]pdfjs-dist['"]|import\(['"]pdfjs-dist['"]\)/m.test(text),
      )
      .map(({ path }) => path.slice(SRC.length + 1).replaceAll('\\', '/'));
    // Only `import type` elsewhere; the single runtime import is the dynamic one in core/pdfjs.ts.
    expect(importers).toEqual(['core/pdfjs.ts']);
  });

  it('entry points start with the "use client" directive', () => {
    for (const entry of ['index.ts', 'compat.ts']) {
      expect(readFileSync(join(SRC, entry), 'utf8').startsWith("'use client';")).toBe(true);
    }
  });
});
