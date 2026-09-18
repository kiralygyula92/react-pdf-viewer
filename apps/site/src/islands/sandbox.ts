import type { Project } from '@stackblitz/sdk';

const PACKAGE = '@kiralygyula92/react-pdf-viewer';

/**
 * A runnable Vite + React project for a demo. Bundled
 * sample paths are rewritten to absolute URLs on the docs origin so the sandbox can load them.
 */
export function stackblitzProject(title: string, source: string, origin: string): Project {
  const demo = source.replace(/(['"`])\/samples\//g, `$1${origin}/samples/`);
  return {
    title: `${title} · React PDF Viewer`,
    description: `Live demo from the React PDF Viewer documentation: ${title}.`,
    template: 'node',
    files: {
      'package.json': JSON.stringify(
        {
          name: 'react-pdf-viewer-demo',
          private: true,
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build' },
          dependencies: {
            [PACKAGE]: 'latest',
            'pdfjs-dist': '^6.3.289',
            react: '^19.3.0',
            'react-dom': '^19.3.0',
          },
          devDependencies: {
            '@vitejs/plugin-react': '^6.1.1',
            typescript: '~6.0.0',
            vite: '^8.3.0',
          },
        },
        null,
        2,
      ),
      'vite.config.ts':
        "import react from '@vitejs/plugin-react';\nimport { defineConfig } from 'vite';\n\nexport default defineConfig({ plugins: [react()] });\n",
      'index.html':
        '<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Demo</title></head>\n  <body style="font-family: system-ui, sans-serif; margin: 24px">\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
      'src/main.tsx': `import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport '${PACKAGE}/styles.css';\nimport Demo from './Demo';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <Demo />\n  </StrictMode>,\n);\n`,
      'src/Demo.tsx': demo,
    },
  };
}
