import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { REPO_ROOT } from './site';

export interface Metric {
  value: string;
  label: string;
  /** Where the number comes from, shown under it: metrics are measured, never typed (brief §0.4). */
  source: string;
}

const PACKAGE = join(REPO_ROOT, 'packages/react-pdf-viewer');

function files(dir: string, pattern: RegExp, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'node_modules' && name !== 'dist') files(path, pattern, out);
    } else if (pattern.test(name)) out.push(path);
  }
  return out;
}

/** Product metrics measured from the repository at build time. */
export function productMetrics(): Metric[] {
  const metrics: Metric[] = [];
  const bundle = join(PACKAGE, 'dist/index.js');
  if (existsSync(bundle)) {
    const kb = gzipSync(readFileSync(bundle)).length / 1024;
    metrics.push({
      value: `${kb.toFixed(1)} kB`,
      label: 'gzipped JavaScript',
      source: 'dist/index.js, measured at build',
    });
  }
  const manifest = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    license?: string;
  };
  metrics.push({
    value: String(Object.keys(manifest.dependencies ?? {}).length),
    label: 'runtime dependencies',
    source: 'package.json',
  });
  const testSources = [
    ...files(join(PACKAGE, 'test'), /\.test\.tsx?$/),
    ...files(join(REPO_ROOT, 'apps/site/e2e'), /\.spec\.ts$/),
  ];
  const tests = testSources.reduce(
    (sum, file) => sum + (readFileSync(file, 'utf8').match(/^\s*(?:it|test)\(/gm)?.length ?? 0),
    0,
  );
  metrics.push({
    value: String(tests),
    label: 'automated tests',
    source: 'unit + browser test files',
  });
  const variables = new Set(
    files(join(PACKAGE, 'src/styles'), /\.css$/).flatMap(
      (file) => readFileSync(file, 'utf8').match(/--rpv-[a-z0-9-]+/g) ?? [],
    ),
  );
  metrics.push({
    value: String(variables.size),
    label: 'CSS variables',
    source: 'src/styles/*.css',
  });
  metrics.push({ value: manifest.license ?? '—', label: 'license', source: 'package.json' });
  return metrics;
}
