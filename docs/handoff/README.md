# React PDF Viewer — Handoff Documentation

This folder is a **self-contained handoff package**. It describes an existing, production PDF viewer component (built on Mozilla PDF.js) in enough detail that an engineer or AI agent working in a **fresh, empty repository** can:

1. Re-implement it **1:1** (same behavior, same look, same public contract), then
2. Fix its known defects and extend it, and
3. Ship it as a **reusable npm package** (working name: `react-pdf-viewer`, final name TBD — see [03-package-spec.md](03-package-spec.md#1-package-identity)), plus
4. A **demo application** that showcases the viewer with bundled static PDFs and arbitrary URLs.

The original code lives in a private application (`skimmer.retail.client`) and cannot be referenced from the new repo. Everything needed is in this folder.

---

## How to use this folder

1. Create the new repository.
2. Copy this whole folder into it as `docs/handoff/`.
3. Move `docs/handoff/CLAUDE.md` to the **repository root** as `CLAUDE.md`. It is the agent's standing instruction file and points back into `docs/handoff/`.
4. Optional but strongly recommended: add screenshots of the original viewer in its four layout states to `docs/handoff/reference/screenshots/`. The states are desktop inline, desktop fullscreen, mobile inline, and mobile fullscreen, at 100% zoom, plus one zoomed to 150%. They are the visual source of truth for parity.
5. Start the agent with a prompt such as:

   > Read `CLAUDE.md`, then read every file in `docs/handoff/` in the order listed in `docs/handoff/README.md`. Execute `docs/handoff/05-implementation-plan.md` milestone by milestone. Stop at the end of each milestone, report which acceptance criteria pass, and list any open questions.

---

## Reading order

| # | File | What it gives you |
|---|------|-------------------|
| 1 | [CLAUDE.md](CLAUDE.md) | Standing rules for the agent in the new repo (move to repo root) |
| 2 | [01-current-implementation.md](01-current-implementation.md) | Exhaustive behavioral + visual spec of the original component. **The parity contract.** |
| 3 | [02-known-issues.md](02-known-issues.md) | Defects, risks and limitations found in the original, each with the fix and whether it is on by default |
| 4 | [03-package-spec.md](03-package-spec.md) | Target architecture, public API, theming, PDF.js integration, packaging, and publishing |
| 5 | [04-demo-app-spec.md](04-demo-app-spec.md) | The demo/showcase app: static samples, URL viewer, playground, deploy |
| 6 | [05-implementation-plan.md](05-implementation-plan.md) | Milestones, tasks, acceptance criteria, parity test matrix, definition of done |
| 7 | [reference/](reference/) | Verbatim original source + supporting types/constants/theme values |

### Reference folder

| File | Content |
|------|---------|
| `reference/CustomPdfViewer.original.tsx` | The original component, verbatim |
| `reference/ViewReportSection.original.tsx` | The only consumer in the host app, verbatim. It shows the lifted-state and fullscreen-dialog pattern. |
| `reference/supporting-code.md` | Prop and PDF.js type definitions, constants, `useIsMobile` hook, theme values, and the global `window.pdfjsLib` declaration |

> The original files import host-app modules (`useAuthStore`, `../../constants`, `../../types/uiInterfaces`, `../../hooks/useIsMobile`). Those are documented in `supporting-code.md`. **Do not recreate the host-app coupling** (auth store, sign-in redirect, domain-specific file names) inside the package; [03-package-spec.md](03-package-spec.md) shows how each coupling becomes a generic extension point.

---

## Provenance snapshot

| Item | Value |
|------|-------|
| Source app | `skimmer.retail.client` (React SPA, Vite 7, TypeScript ~5.8) |
| Component | `src/components/common/CustomPdfViewer.tsx` (~800 lines) |
| Consumer | `src/pages/lab/sections/poolReport/ViewReportSection.tsx` (water-test treatment report) |
| React | ^19.1 |
| UI kit | MUI (`@mui/material`, `@mui/icons-material`) ^7.3, Emotion |
| PDF engine | PDF.js **3.11.174**, loaded at runtime from public CDNs as a UMD global (`window.pdfjsLib`) |
| Snapshot date | 2026-09-10 |

## Glossary

| Term | Meaning |
|------|---------|
| **Parity** | Behavior and visuals identical to the original, apart from items in `02-known-issues.md` explicitly marked *fix by default* |
| **Compact / mobile** | Viewport width below the host theme's `md` breakpoint (**960px**). The original calls this `isMobile`. |
| **Inline vs fullscreen** | The two layout modes. In the original, the *parent* decides fullscreen, and the viewer only adapts its layout. |
| **Scale 1.0 / 100%** | 1 PDF point = 1 CSS pixel (a US-Letter page is 612×792 CSS px) |
| **Controlled prop** | A value owned by the parent and passed in with an `onXChange` callback (React "controlled component" pattern) |
