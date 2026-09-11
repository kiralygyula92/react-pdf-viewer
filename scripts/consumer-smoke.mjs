#!/usr/bin/env node
/**
 * Consumer smoke tests: packs the library (`pnpm pack`, i.e. exactly what would be published),
 * installs the tarball into fresh apps from smoke/ with npm, builds them and checks the output.
 *
 *   node scripts/consumer-smoke.mjs          # all apps
 *   node scripts/consumer-smoke.mjs next     # one app
 *
 * - vite: strict type-check against the packed .d.ts files, production build, the self-hosted
 *   worker is emitted and the stylesheet is bundled.
 * - next: App Router production build; the page is prerendered on the server, proving the
 *   package imports and renders during SSR ("use client" boundary, no browser globals).
 */
import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = join(root, 'packages', 'react-pdf-viewer');
const sample = join(root, 'apps', 'demo', 'public', 'samples', 'letter-3pages.pdf');
const selected = process.argv.slice(2);

function run(command, cwd) {
  console.log(`\n$ ${command}   (${cwd})`);
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', CI: process.env.CI ?? '1' },
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(`Smoke check failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

const checks = {
  vite(app) {
    const assets = readdirSync(join(app, 'dist', 'assets'));
    assert(existsSync(join(app, 'dist', 'index.html')), 'vite: index.html built');
    assert(
      assets.some((file) => /^pdf\.worker.*\.m?js$/.test(file)),
      'vite: PDF.js worker emitted',
    );
    const css = assets
      .filter((file) => file.endsWith('.css'))
      .map((file) => readFileSync(join(app, 'dist', 'assets', file), 'utf8'))
      .join('');
    assert(css.includes('.rpv-root'), 'vite: viewer stylesheet bundled');
  },
  next(app) {
    const html = readFileSync(join(app, '.next', 'server', 'app', 'index.html'), 'utf8');
    assert(html.includes('class="rpv-root"'), 'next: viewer rendered on the server');
    assert(html.includes('Loading PDF...'), 'next: loading state in the prerendered HTML');
    assert(html.includes('No document'), 'next: empty viewer rendered from a Server Component');
  },
};

const work = mkdtempSync(join(tmpdir(), 'rpv-smoke-'));
let failed = false;
try {
  run(`pnpm pack --pack-destination "${work}"`, packageDir);
  const tarballName = readdirSync(work).find((file) => file.endsWith('.tgz'));
  if (!tarballName) throw new Error('pnpm pack produced no tarball');
  const tarball = join(work, tarballName).replaceAll('\\', '/');

  for (const name of Object.keys(checks)) {
    if (selected.length > 0 && !selected.includes(name)) continue;
    const app = join(work, name);
    cpSync(join(root, 'smoke', name), app, { recursive: true });
    cpSync(sample, join(app, 'public', 'sample.pdf'));
    const manifestPath = join(app, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.dependencies['@your-scope/react-pdf-viewer'] = `file:${tarball}`;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    run('npm install --no-audit --no-fund --loglevel=error', app);
    run('npm run build', app);
    checks[name](app);
  }
  console.log('\nConsumer smoke tests passed.');
} catch (error) {
  failed = true;
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  console.error(`Work directory kept for inspection: ${work}`);
  process.exitCode = 1;
} finally {
  if (!failed) rmSync(work, { recursive: true, force: true });
}
