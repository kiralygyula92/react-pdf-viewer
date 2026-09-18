# Docs & site structure

The documentation site is built from `content/react-pdf-viewer` (site model, MDX pages and
colocated demos) with the kit in `packages/ppds-kit`. See `CLAUDE.md` for the project rules and
`CONTRIBUTING.md` for the documentation workflow.

Hard rules:

- Never hand-write reference/settings/API tables — they are generated (`pnpm ppds:reference`).
- Never delete a URL. When a page moves, add its old URL to `redirects.json`.
- Never invent metrics, testimonials, prices or compatibility claims.
  Emit `TODO:` instead; conformance fails until it is resolved.
- Badges (New/Preview/Beta/Planned/Deprecated/tier names) are declared on
  nav nodes only, never hardcoded in page content.
- Capability pages keep the section order:
  Basics → variations → recipes → Customization → escape hatch →
  Limitations → API.
- After a docs change, `pnpm build` and `pnpm ppds:conformance` must pass.
