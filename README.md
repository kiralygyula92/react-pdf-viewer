# react-pdf-viewer

A React PDF viewer built on [PDF.js](https://github.com/mozilla/pdf.js), with a demo site.
It is a clean-room re-implementation of an in-house `CustomPdfViewer`: with default props it
looks and behaves like the original, with the original's defects fixed; everything else is
opt-in.

| Path                                                     | What it is                                                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/react-pdf-viewer`](packages/react-pdf-viewer) | The publishable library (`@your-scope/react-pdf-viewer`, placeholder name). **Consumer docs live in its [README](packages/react-pdf-viewer/README.md).** |
| [`apps/demo`](apps/demo)                                 | Static demo: playground, deep-linkable viewer, examples, parity harness and the e2e / visual test bed.                                                   |
| [`smoke`](smoke)                                         | Minimal Vite and Next.js apps that install the packed tarball (consumer smoke tests).                                                                    |
| [`docs/handoff`](docs/handoff)                           | The specification this implementation follows.                                                                                                           |

## Development

Requires Node 20+ and pnpm (the version is pinned in `package.json`).

```sh
pnpm install
pnpm --filter demo dev        # demo at http://localhost:5173 (uses the built library)
pnpm --filter @your-scope/react-pdf-viewer build --watch   # rebuild the library on change
```

| Command                                | Does                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm lint`                            | ESLint (typescript-eslint strict, react-hooks, jsx-a11y) and Prettier       |
| `pnpm typecheck`                       | Builds the library, then type-checks every workspace                        |
| `pnpm test`                            | Unit and integration tests (Vitest; mocked PDF.js plus real PDF.js in Node) |
| `pnpm build`                           | Library (ESM + `.d.ts` + `styles.css`) and demo                             |
| `pnpm qa`                              | `publint`, `@arethetypeswrong/cli` and `size-limit` on the packed library   |
| `pnpm e2e`                             | Playwright suites against the built demo (Chromium, Firefox, WebKit)        |
| `pnpm --filter demo e2e:visual`        | Visual parity screenshots, inside the Playwright Linux container (Docker)   |
| `pnpm --filter demo e2e:visual:update` | Regenerate the visual baselines (review the diff before committing)         |
| `pnpm smoke`                           | Pack the library and build fresh Vite and Next.js apps against the tarball  |
| `pnpm --filter demo generate-samples`  | Regenerate the bundled sample PDFs (deterministic)                          |

Visual baselines are only ever rendered and compared in `mcr.microsoft.com/playwright`, locally
through `apps/demo/scripts/visual.sh` and in the CI `visual` job, so they never differ by OS.

## Continuous integration

- **CI** (`.github/workflows/ci.yml`): lint → typecheck → unit → build → package QA → e2e, plus
  the visual job (Playwright container), React 18 unit tests and the consumer smoke tests.
- **Deploy demo** (`.github/workflows/pages.yml`): builds the demo for `/<repository>/` and
  publishes it to GitHub Pages on pushes to `main` (enable Pages in the repository settings).

## Releasing

Changes to the library come with a changeset (`pnpm changeset`). `pnpm version-packages` applies
them (version bump and `CHANGELOG.md`). Publishing is done by the owner, after choosing the final
package name and license.
