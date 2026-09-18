/** What the site gives the kit's machine surface (llms.txt, twins, llms-full), in build and dev. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../../..');
const pkg = JSON.parse(
  readFileSync(resolve(repoRoot, 'packages/react-pdf-viewer/package.json'), 'utf8'),
) as { name: string; peerDependencies?: Record<string, string> };

export const machineOptions = {
  contentRoot: resolve(repoRoot, 'content/react-pdf-viewer'),
  package: { name: pkg.name, peerDependencies: pkg.peerDependencies },
  notes: [
    'The examples load sample PDFs from the documentation site, such as ' +
      '`/samples/multipage.pdf`; point `source` at your own document.',
  ],
};
