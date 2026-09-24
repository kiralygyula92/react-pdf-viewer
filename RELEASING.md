# Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets) and the
`Release` workflow (`.github/workflows/release.yml`).

## One-time setup

1. **npm account:** the package is published under the `@kiralygyula92` scope, which needs an
   npm account (or organization) of that name. Check with `npm login` and `npm whoami`.
2. **Token:** create an npm _granular access token_ with read and write access to the
   `@kiralygyula92` scope, and add it as the `NPM_TOKEN` repository secret
   (_Settings → Secrets and variables → Actions_). The workflow requests `id-token: write`, so
   packages are published with [provenance](https://docs.npmjs.com/generating-provenance-statements).
3. **GitHub:** in _Settings → Actions → General → Workflow permissions_, tick **Allow GitHub
   Actions to create and approve pull requests**. Without it the workflow cannot open the
   "Version Packages" pull request and fails on every push to `main`.
4. **Site analytics (Vercel only):** in the Vercel project, turn on **Web Analytics** and **Speed
   Insights** (Project → Analytics / Speed Insights → Enable). The site loads their scripts only
   when the build runs on Vercel, and both are cookieless, so no consent banner is needed. To
   check the wiring locally, build with `ANALYTICS=1` and look for the two `/_vercel/…` scripts.
5. **Documentation site:** the site is hosted on Vercel
   (<https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/>), built from `apps/site` with the
   settings in `apps/site/vercel.json`. Canonical URLs, the sitemap, `llms.txt` and social images
   use that address; set the `SITE_ORIGIN` environment variable when the site moves to another
   domain, and update the links in both READMEs and the package's `homepage`. The optional
   `Deploy site` workflow can also publish it to Cloudflare Pages: add the `CLOUDFLARE_API_TOKEN`
   (with _Cloudflare Pages: Edit_) and `CLOUDFLARE_ACCOUNT_ID` repository secrets and a
   `SITE_ORIGIN` repository variable. Without the secrets it still builds and checks the site but
   skips the upload.

## Every release

1. Pull requests add changesets (`pnpm changeset`).
2. On `main`, the Release workflow opens or updates a **Version Packages** pull request. Its
   `pnpm version-packages` step bumps the version, writes `CHANGELOG.md`, and brings the
   documentation along: the site's current version and version selector, and a dated entry on the
   changelog page (a prepared `## x.y.z (unreleased)` entry is dated; otherwise the new
   `CHANGELOG.md` section is added).
3. Review the pull request, including the changelog page, and merge it. The workflow builds, runs
   the package QA and publishes to npm, then pushes the `@kiralygyula92/react-pdf-viewer@x.y.z` tag
   and a GitHub release. The merge also redeploys the documentation site.

The first publish can also be done locally instead, from a clean `main`:

```sh
pnpm install && pnpm build && pnpm qa
pnpm version-packages           # applies .changeset/*.md → 1.0.0, CHANGELOG.md and the docs
git commit -am "chore(release): v1.0.0"
pnpm release                    # builds and runs `changeset publish` (public access)
git push --follow-tags
```

## Before a release, check

- CI is green on `main` (lint, types, unit, docs conformance, e2e, visual, React 18, consumer smoke).
- `pnpm qa` passes (publint, are-the-types-wrong, size-limit).
- `pnpm --filter @kiralygyula92/react-pdf-viewer pack --dry-run` lists only `dist/`, `README.md`,
  `CHANGELOG.md`, `LICENSE`, `NOTICE` and `package.json`.
