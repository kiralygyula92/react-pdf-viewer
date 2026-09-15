# Contributing

Thanks for helping improve `@kiralygyula92/react-pdf-viewer`! Bug reports, docs fixes and pull
requests are all welcome.

## Getting started

Requirements: Node 20+ and pnpm (run `corepack enable` to use the pinned version).

```sh
git clone https://github.com/kiralygyula92/react-pdf-viewer.git
cd react-pdf-viewer
pnpm install
pnpm build
pnpm --filter demo dev
```

The [root README](README.md#development) lists every command.

## Making a change

1. Open an issue first for larger changes, so we can agree on the API before you build it.
2. Create a branch from `main`.
3. Add or update tests: unit tests in `packages/react-pdf-viewer/test`, end-to-end tests in
   `apps/demo/e2e`. Every behavior should be covered by at least one of them.
4. Run the checks:

   ```sh
   pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e
   ```

   If you changed the layout, run `pnpm --filter demo e2e:visual` (requires Docker) and, when the
   change is intended, regenerate the baselines with `e2e:visual:update`. Review the image diffs
   before committing.

5. Add a changeset for anything users will notice: `pnpm changeset`. Pick `patch` for fixes,
   `minor` for new features and `major` for breaking changes.
6. For public API changes, update `packages/react-pdf-viewer/README.md` and the demo's docs data
   in `apps/demo/src/docs/reference.ts`. The demo's type check fails if a prop is left undocumented.
7. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, e.g.
   `feat(toolbar): add a zoom preset menu` or `fix(render): cancel stale renders`.

## Design principles

- **Opt-in by default:** new behavior goes behind a prop, so upgrades never change existing viewers.
- **No runtime dependencies** besides the peer dependencies `react`, `react-dom` and `pdfjs-dist`.
- **Accessible:** keyboard operable, labeled, with visible focus; axe checks run in CI.
- **SSR-safe and typed:** no browser globals at module scope, strict TypeScript, TSDoc on exports.
- **Themeable:** styling hooks are `rpv-` classes and `--rpv-*` CSS variables.

## Licensing of contributions

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
Only submit code and assets you wrote yourself or that are available under a compatible
permissive license. Note any third-party material in the pull request so it can be added to
`packages/react-pdf-viewer/NOTICE`.

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
