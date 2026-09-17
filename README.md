# react-pdf-viewer

[![npm](https://img.shields.io/npm/v/@kiralygyula92/react-pdf-viewer)](https://www.npmjs.com/package/@kiralygyula92/react-pdf-viewer)
[![CI](https://github.com/kiralygyula92/react-pdf-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/kiralygyula92/react-pdf-viewer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An accessible, themeable React PDF viewer built on [PDF.js](https://github.com/mozilla/pdf.js),
published as [`@kiralygyula92/react-pdf-viewer`](packages/react-pdf-viewer), plus its
documentation site with live demos, guides and a generated API reference.

```sh
npm install @kiralygyula92/react-pdf-viewer pdfjs-dist
```

```tsx
import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import '@kiralygyula92/react-pdf-viewer/styles.css';

export function Document() {
  return <PdfViewer source="/files/document.pdf" />;
}
```

**Documentation:** [react-pdf-viewer.pages.dev/react-pdf-viewer/](https://react-pdf-viewer.pages.dev/react-pdf-viewer/)
(sources in [`content/react-pdf-viewer`](content/react-pdf-viewer)).

## Repository layout

| Path                                                     | What it is                                                                                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/react-pdf-viewer`](packages/react-pdf-viewer) | The published library.                                                                                                            |
| [`content/react-pdf-viewer`](content/react-pdf-viewer)   | Documentation content: the site model (`plugin.config.json`, `nav.json`), MDX pages, colocated demos and the generated reference. |
| [`apps/site`](apps/site)                                 | The static documentation site (React + Vite), which doubles as the Playwright e2e and visual test bed.                            |
| [`packages/ppds-kit`](packages/ppds-kit)                 | Plugin-agnostic site kit: layouts, demo toolbar, reference generator, conformance checks and the machine surface.                 |
| [`docs/ppds`](docs/ppds)                                 | The documentation standard (PPDS v1.1) the site is built and checked against.                                                     |
| [`smoke`](smoke)                                         | Minimal Vite, Next.js and webpack apps that install the packed tarball (consumer smoke tests).                                    |
| [`scripts`](scripts)                                     | Repository tooling (consumer smoke runner).                                                                                       |

Site decisions and deliberate deviations from the standard: [`DECISIONS.md`](DECISIONS.md) and
[`EXCEPTIONS.md`](EXCEPTIONS.md). Legacy URL redirects: [`migration/url-map.csv`](migration/url-map.csv).

## Development

Requires Node 22.18+ (the docs tooling runs TypeScript directly) and pnpm (the version is pinned in
`package.json`; `corepack enable` picks it up).

```sh
pnpm install
pnpm build                                                     # library, then the site
pnpm --filter site dev                                         # site at http://localhost:4321
pnpm --filter @kiralygyula92/react-pdf-viewer build --watch    # rebuild the library on change
```

| Command                                | Does                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm lint`                            | ESLint (typescript-eslint strict, react-hooks, jsx-a11y) and Prettier                         |
| `pnpm typecheck`                       | Builds the library, then type-checks every workspace                                          |
| `pnpm test`                            | Unit and integration tests (Vitest; mocked PDF.js plus real PDF.js in Node) and the kit tests |
| `pnpm build`                           | Library (ESM + `.d.ts` + `styles.css`) and the static site                                    |
| `pnpm qa`                              | `publint`, `@arethetypeswrong/cli` and `size-limit` on the packed library                     |
| `pnpm e2e`                             | Playwright suites against the built site (Chromium, Firefox, WebKit)                          |
| `pnpm --filter site e2e:visual`        | Visual regression screenshots, inside the Playwright Linux container                          |
| `pnpm --filter site e2e:visual:update` | Regenerate the visual baselines (review the diff before committing)                           |
| `pnpm smoke`                           | Pack the library and build fresh Vite, Next.js and webpack apps against the tarball           |
| `pnpm --filter site generate-samples`  | Regenerate the bundled sample PDFs (deterministic, generated from scratch)                    |
| `pnpm ppds:reference`                  | Regenerate the API reference from the package's TypeScript and TSDoc                          |
| `pnpm ppds:validate`                   | Validate the site model against `docs/ppds/plugin-site.schema.json`                           |
| `pnpm ppds:conformance`                | Run the PPDS conformance checks against the built site                                        |

Visual baselines are only rendered and compared in `mcr.microsoft.com/playwright` (locally through
Docker via `apps/site/scripts/visual.sh`, and in the CI `visual` job), so they never differ by OS.

## Continuous integration and releases

- **CI** (`.github/workflows/ci.yml`): lint → typecheck → unit → build → package QA → docs model,
  reference drift and conformance checks → e2e, plus the visual job, React 18 unit tests and the
  consumer smoke tests.
- **Release** (`.github/workflows/release.yml`): on `main`, [Changesets](https://github.com/changesets/changesets)
  opens a "Version Packages" pull request; merging it publishes to npm with provenance.
- **Deploy site** (`.github/workflows/deploy-site.yml`): builds the site and deploys it to
  Cloudflare Pages, production from `main` and a preview per pull request.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [RELEASING.md](RELEASING.md) for the
one-time npm and hosting setup.

## License

[MIT](LICENSE) © kiralygyula92. The bundled sample PDFs are generated by
`apps/site/scripts/generate-samples.ts` and are covered by the same license.
