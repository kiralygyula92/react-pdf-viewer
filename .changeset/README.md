# Changesets

Run `pnpm changeset` to record a change to the published package. Every user-facing change to
`packages/react-pdf-viewer` (features, fixes, public API) needs a changeset in the same pull
request; see [CONTRIBUTING.md](../CONTRIBUTING.md).

On `main`, the Release workflow opens a "Version Packages" pull request that applies pending
changesets (version bump and `CHANGELOG.md`). Merging it publishes to npm.
