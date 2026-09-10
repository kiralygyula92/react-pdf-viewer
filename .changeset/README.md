# Changesets

Run `pnpm changeset` to record a change to a publishable package. Every change to the public API
of `packages/react-pdf-viewer` needs a changeset in the same change (see `CLAUDE.md`).

The owner runs `pnpm version-packages` and publishes. Agents never publish.
