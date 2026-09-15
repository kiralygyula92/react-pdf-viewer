# Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets) and the
`Release` workflow (`.github/workflows/release.yml`).

## One-time setup

1. **npm account:** make sure you can publish under the `@kiralygyula92` scope (`npm login`, then
   `npm whoami`).
2. **Token:** create an npm _granular access token_ with read and write access to the
   `@kiralygyula92` scope, and add it as the `NPM_TOKEN` repository secret
   (_Settings → Secrets and variables → Actions_). The workflow requests `id-token: write`, so
   packages are published with [provenance](https://docs.npmjs.com/generating-provenance-statements).
3. **GitHub:** in _Settings → Actions → General_, allow GitHub Actions to create pull requests.
4. **Documentation site (Cloudflare Pages):** create a Pages project named `react-pdf-viewer`, then
   add the `CLOUDFLARE_API_TOKEN` (with _Cloudflare Pages: Edit_) and `CLOUDFLARE_ACCOUNT_ID`
   repository secrets. Once a custom domain is attached, set the `SITE_ORIGIN` repository variable
   (for example `https://docs.example.com`) so canonical URLs, the sitemap, `llms.txt` and social
   images use it. Without the secrets, the `Deploy site` workflow still builds and checks the site
   but skips the upload.

The first publish can also be done locally instead:

```sh
pnpm install && pnpm build && pnpm qa
pnpm changeset version          # applies .changeset/*.md → version 0.1.0 + CHANGELOG.md
git commit -am "chore(release): v0.1.0"
pnpm release                    # builds and runs `changeset publish` (public access)
git push --follow-tags
```

## Every release

1. Pull requests add changesets (`pnpm changeset`).
2. On `main`, the Release workflow opens or updates a **Version Packages** pull request that bumps
   the version and writes `CHANGELOG.md`.
3. Merge it. The workflow builds, runs the package QA and publishes to npm, then pushes the
   `@kiralygyula92/react-pdf-viewer@x.y.z` tag and a GitHub release.
4. Update the documentation site: copy the new `CHANGELOG.md` section into
   `content/react-pdf-viewer/discover-more/changelog.mdx` (for the first release, replace
   “unreleased” with the date), and bump `currentVersion` in
   `content/react-pdf-viewer/plugin.config.json` for a new minor or major version.

## Before a release, check

- CI is green on `main` (lint, types, unit, docs conformance, e2e, visual, React 18, consumer smoke).
- `pnpm qa` passes (publint, are-the-types-wrong, size-limit).
- `pnpm --filter @kiralygyula92/react-pdf-viewer pack --dry-run` lists only `dist/`, `README.md`,
  `CHANGELOG.md`, `LICENSE`, `NOTICE` and `package.json`.
