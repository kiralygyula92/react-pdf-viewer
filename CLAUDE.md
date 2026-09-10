# CLAUDE.md — react-pdf-viewer

> Place this file at the repository root. The detailed specs live in `docs/handoff/`.

## What this repo is

A monorepo containing:

- `packages/react-pdf-viewer` — a publishable React component library: a PDF viewer built on `pdfjs-dist`.
- `apps/demo` — a static demo site that showcases the viewer with bundled sample PDFs and user-supplied URLs/files.

The library is a clean-room re-implementation of an existing in-house component (`CustomPdfViewer`) with its known defects fixed. The original's behavior and look are the **parity contract**.

## Required reading (in order, before writing code)

1. `docs/handoff/README.md`
2. `docs/handoff/01-current-implementation.md`: the parity contract
3. `docs/handoff/02-known-issues.md`: what to fix, and which fixes are on by default
4. `docs/handoff/03-package-spec.md`: the target API and architecture
5. `docs/handoff/04-demo-app-spec.md`
6. `docs/handoff/05-implementation-plan.md`: the work order and acceptance criteria
7. `docs/handoff/reference/*`: the original source, for reference only

When a spec is ambiguous, prefer (in order): **05 acceptance criteria → 03 API spec → 01 parity spec → original source**. If they still conflict, stop and ask. Do not guess.

## Non-negotiable rules

1. **Parity first, then improvements.** Default props must reproduce the original UX (toolbar below the page, single-page view, 5% zoom steps, 25–500% range, same controls in the same order, same labels, same colors and sizes). New UX behavior is **opt-in** unless `02-known-issues.md` marks it *fix by default*.
2. **No host-app coupling in the package.** No auth stores, no hard-coded redirects such as `/auth/sign-in`, no domain file names such as `treatment-report.pdf`, and no MUI theme lookups. Every coupling becomes a prop, callback or CSS variable (see `03-package-spec.md` §5 and §7).
3. **No runtime UI-kit dependency.** The package must not depend on MUI, Emotion, Tailwind or an icon library. Use plain CSS with `rpv-` prefixed classes and CSS custom properties, and inline SVG icons.
4. **`pdfjs-dist` is a peer dependency, imported as ESM and loaded lazily.** Never inject `<script>` tags, and never read or write `window.pdfjsLib`.
5. **Security defaults:** `isEvalSupported: false`, and a `pdfjs-dist` version that is not affected by CVE-2024-4367 (≥ 4.2.67).
6. **SSR-safe:** no `window`, `document` or `navigator` access at module scope. The entry file starts with `'use client'`.
7. **Strict TypeScript.** `strict: true`, no `any` in public types, and every public export has TSDoc.
8. **Every behavior in the parity matrix (`05-implementation-plan.md` §3) has an automated test**, either unit (Vitest + Testing Library) or e2e (Playwright against the demo).
9. **Accessibility is a requirement, not a nice-to-have.** Toolbar semantics, labeled buttons, keyboard operability, and visible focus.
10. Keep the public API small and consistent. Every controlled value `x` has the trio `x` / `defaultX` / `onXChange`.

## Tech stack (decided — do not substitute without asking)

| Concern | Choice |
|---------|--------|
| Package manager | pnpm workspaces |
| Language | TypeScript (strict) |
| Library build | Vite library mode + `vite-plugin-dts`, ESM-only output, separate `styles.css` |
| Demo | Vite + React + TypeScript, static build |
| Unit tests | Vitest + @testing-library/react + jsdom (mock `pdfjs-dist`) |
| E2E / visual | Playwright against the built demo |
| Lint/format | ESLint (flat config, `typescript-eslint`, `eslint-plugin-react-hooks`, `jsx-a11y`) + Prettier |
| Package QA | `publint`, `@arethetypeswrong/cli`, `size-limit` |
| Versioning | Changesets |
| CI | GitHub Actions: lint → typecheck → unit → build → e2e → package QA |

## Workflow

- Work milestone by milestone as defined in `05-implementation-plan.md`. At the end of each milestone, run the full check suite and report which acceptance criteria pass or fail.
- Small, focused commits using Conventional Commits (`feat(viewer): …`, `fix(render): …`).
- Do not publish to npm. Do not choose the final package name. A human owner does both.
- If you change public API, update `packages/react-pdf-viewer/README.md` and add a changeset in the same change.
