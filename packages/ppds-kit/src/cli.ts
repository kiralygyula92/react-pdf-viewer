#!/usr/bin/env node
/**
 * Site kit command line.
 *
 *   node packages/ppds-kit/src/cli.ts conformance <contentRoot> <distDir> [--report <file>]
 *   node packages/ppds-kit/src/cli.ts reference   <contentRoot> <packageEntry> [--check]
 *   node packages/ppds-kit/src/cli.ts version     <contentRoot> <packageDir> [--date YYYY-MM-DD]
 */
import { resolve } from 'node:path';

const [command, ...args] = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const positional = args.filter(
  (arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'),
);

async function main() {
  switch (command) {
    case 'conformance': {
      const { runConformance } = await import('./conformance.ts');
      return runConformance({
        contentRoot: resolve(positional[0] ?? '.'),
        distDir: resolve(positional[1] ?? 'dist'),
        report: option('--report'),
        repoRoot: resolve(option('--repo-root') ?? '.'),
      });
    }
    case 'reference': {
      // Loaded by URL: the generator pulls in TypeDoc, which the other commands never need.
      const { runReference } = (await import(
        new URL('./reference/generate.ts', import.meta.url).href
      )) as {
        runReference: (options: {
          contentRoot: string;
          entry: string;
          check: boolean;
        }) => Promise<number>;
      };
      return runReference({
        contentRoot: resolve(positional[0] ?? '.'),
        entry: resolve(positional[1] ?? 'src/index.ts'),
        check: args.includes('--check'),
      });
    }
    case 'version': {
      const { runVersion } = await import('./release.ts');
      return runVersion({
        contentRoot: resolve(positional[0] ?? '.'),
        packageDir: resolve(positional[1] ?? '.'),
        date: option('--date'),
      });
    }
    default:
      console.error('Usage: ppds <conformance|reference|version> …');
      return 2;
  }
}

process.exitCode = await main();
