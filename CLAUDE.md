# CLAUDE.md — react-pdf-viewer

Guidance for AI coding agents working in this repository. Humans: see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this repo is

A pnpm monorepo:

- `packages/react-pdf-viewer`: the published library `@kiralygyula92/react-pdf-viewer`, an accessible, themeable React PDF viewer built on `pdfjs-dist`.
- `apps/demo`: a static demo site (playground, viewer, examples, API docs) that doubles as the Playwright e2e and visual test bed.
- `smoke/`: minimal Vite and Next.js apps that install the packed tarball.

## Rules

1. **Backwards-compatible defaults.** New UX behavior is opt-in behind a prop; changing a default is a breaking change.
2. **Generic and app-agnostic.** No app-specific coupling in the package: no auth stores, hard-coded routes, domain file names or theme-library lookups. Integration points are props, callbacks or CSS variables.
3. **No runtime dependencies.** No UI kits, CSS-in-JS or icon libraries. Plain CSS in `@layer rpv` with `rpv-` prefixed classes and `--rpv-*` custom properties; inline SVG icons.
4. **`pdfjs-dist` is a lazily imported ESM peer dependency.** Never inject `<script>` tags or touch `window.pdfjsLib`.
5. **Security defaults:** `isEvalSupported: false`; the peer range excludes versions affected by CVE-2024-4367.
6. **SSR-safe:** no `window` / `document` / `navigator` at module scope; the entry starts with `'use client'`.
7. **Strict TypeScript:** no `any` in public types; every public export has TSDoc.
8. **Every behavior has an automated test:** unit (Vitest + Testing Library, mocked PDF.js) or e2e (Playwright against the demo).
9. **Accessibility is required:** toolbar and menu semantics, labeled controls, keyboard operability, visible focus; axe must pass.
10. **Consistent API:** every controlled value `x` has `x` / `defaultX` / `onXChange`.
11. **Only original or permissively licensed material.** Third-party code or assets need a compatible license and an entry in `packages/react-pdf-viewer/NOTICE`.

## Workflow

- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm e2e` before committing; `pnpm qa` for packaging changes.
- Conventional Commits (`feat(toolbar): …`, `fix(render): …`), small and focused.
- Public API changes: update `packages/react-pdf-viewer/README.md`, the demo docs data (`apps/demo/src/docs/reference.ts`, type-checked against the package) and add a changeset (`pnpm changeset`).
- Never publish to npm or push tags yourself; releases go through the Release workflow.
