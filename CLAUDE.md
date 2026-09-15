# CLAUDE.md — react-pdf-viewer

Guidance for AI coding agents working in this repository. Humans: see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this repo is

A pnpm monorepo:

- `packages/react-pdf-viewer`: the published library `@kiralygyula92/react-pdf-viewer`, an accessible, themeable React PDF viewer built on `pdfjs-dist`.
- `content/react-pdf-viewer`: documentation content (site model, MDX pages, colocated demos, generated reference).
- `apps/site`: the static documentation site (Astro) that doubles as the Playwright e2e and visual test bed.
- `packages/ppds-kit`: the plugin-agnostic site kit (layouts, reference generator, conformance checks); the standard is in `docs/ppds`.
- `smoke/`: minimal Vite, Next.js and webpack apps that install the packed tarball.

## Rules

1. **Backwards-compatible defaults.** New UX behavior is opt-in behind a prop; changing a default is a breaking change.
2. **Generic and app-agnostic.** No app-specific coupling in the package: no auth stores, hard-coded routes, domain file names or theme-library lookups. Integration points are props, callbacks or CSS variables.
3. **No runtime dependencies.** No UI kits, CSS-in-JS or icon libraries. Plain CSS in `@layer rpv` with `rpv-` prefixed classes and `--rpv-*` custom properties; inline SVG icons.
4. **`pdfjs-dist` is a lazily imported ESM peer dependency.** Never inject `<script>` tags or touch `window.pdfjsLib`.
5. **Security defaults:** `isEvalSupported: false`; the peer range excludes versions affected by CVE-2024-4367.
6. **SSR-safe:** no `window` / `document` / `navigator` at module scope; the entry starts with `'use client'`.
7. **Strict TypeScript:** no `any` in public types; every public export has TSDoc.
8. **Every behavior has an automated test:** unit (Vitest + Testing Library, mocked PDF.js) or e2e (Playwright against the site).
9. **Accessibility is required:** toolbar and menu semantics, labeled controls, keyboard operability, visible focus; axe must pass.
10. **Consistent API:** every controlled value `x` has `x` / `defaultX` / `onXChange`.
11. **Only original or permissively licensed material.** Third-party code or assets need a compatible license and an entry in `packages/react-pdf-viewer/NOTICE`.

## Workflow

- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm ppds:conformance` and `pnpm e2e` before committing; `pnpm qa` for packaging changes.
- Conventional Commits (`feat(toolbar): …`, `fix(render): …`), small and focused.
- Public API changes: write TSDoc on the export, run `pnpm ppds:reference` (never hand-write reference tables; edit prose only in `reference/*.strings.json`), update the capability page in `content/react-pdf-viewer`, and add a changeset (`pnpm changeset`). Keep the package README short: it links to the site.
- Docs changes: `pnpm build` then `pnpm ppds:conformance` must pass; moved pages need a row in `migration/url-map.csv` (URLs are never deleted).
- Never publish to npm or push tags yourself; releases go through the Release workflow.
