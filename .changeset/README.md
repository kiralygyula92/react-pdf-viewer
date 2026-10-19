# Changesets

Run `pnpm changeset` to record a change to the published package. Every user-facing change to
`packages/react-pdf-viewer` (features, fixes, public API) needs a changeset in the same pull
request; see [CONTRIBUTING.md](../CONTRIBUTING.md).

A release pull request runs `pnpm version-packages`, which applies pending changesets (version
bump and `CHANGELOG.md`) and brings the docs to the new version; see
[RELEASING.md](../RELEASING.md).
