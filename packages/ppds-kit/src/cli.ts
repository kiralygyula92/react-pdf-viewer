#!/usr/bin/env node
/**
 * PPDS kit command line.
 *
 *   node packages/ppds-kit/src/cli.ts scaffold    <contentRoot>
 *   node packages/ppds-kit/src/cli.ts conformance <contentRoot> <distDir> [--report qa/conformance-report.md]
 *   node packages/ppds-kit/src/cli.ts reference   <contentRoot> <packageEntry> [--check]
 */
import { resolve } from 'node:path';
import { loadPluginModel } from './model.ts';
import { scaffold } from './scaffold.ts';

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
    case 'scaffold': {
      const model = loadPluginModel(resolve(positional[0] ?? '.'));
      const created = scaffold(model);
      console.log(
        created.length
          ? `Created ${created.length} stubs:\n${created.map((f) => `  ${f}`).join('\n')}`
          : 'All pages already exist.',
      );
      return 0;
    }
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
      const { runReference } = (await import(new URL('./reference/generate.ts', import.meta.url).href)) as {
        runReference: (options: { contentRoot: string; entry: string; check: boolean }) => Promise<number>;
      };
      return runReference({
        contentRoot: resolve(positional[0] ?? '.'),
        entry: resolve(positional[1] ?? 'src/index.ts'),
        check: args.includes('--check'),
      });
    }
    default:
      console.error('Usage: ppds <scaffold|conformance|reference> …');
      return 2;
  }
}

process.exitCode = await main();
