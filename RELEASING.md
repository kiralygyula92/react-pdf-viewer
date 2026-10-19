# Releasing

A release is a version bump merged to `main` plus a `v*` tag on that commit. Pushing the tag runs
the `Release` workflow (`.github/workflows/release.yml`), which tests and builds the library and
stages it on npm through [trusted publishing](https://docs.npmjs.com/trusted-publishers). No npm
token exists anywhere, and every version carries
[provenance](https://docs.npmjs.com/generating-provenance-statements). A staged version goes live
only after a maintainer approves it on npmjs.com with a passkey.

## First publish

npm only connects a trusted publisher to a package that already exists, so `1.0.0` was published
once by hand (`npm publish` from `packages/react-pdf-viewer`) and tagged `v1.0.0`. Every later
version is staged from a tag.

## How it is wired

- **npm:** `@kingtech/react-pdf-viewer` trusts this repository's `release.yml`, run in the `npm`
  environment, for staged publishing only, and its publishing access requires two-factor
  authentication and disallows tokens. Check with `npm trust list @kingtech/react-pdf-viewer`.
- **GitHub:** the `npm` environment accepts deployments from `v*` tags only, and a ruleset stops
  anyone but an admin from creating, moving or deleting those tags. Changes reach `main` only
  through pull requests that pass the CI `build` job. Only GitHub-made actions may run, and the
  default workflow token is read-only. The workflow also refuses a tag that isn't on `main` or
  doesn't match the version in `packages/react-pdf-viewer/package.json`.
- **Private vulnerability reporting** is on; [SECURITY.md](SECURITY.md) sends reporters there.

## Every release

1. Pull requests add changesets (`pnpm changeset`). Check that CI is green on `main`.
2. Apply them on a release branch:

   ```sh
   git switch main && git pull --ff-only
   git switch -c release/vX.Y.Z
   pnpm version-packages
   ```

   `pnpm version-packages` bumps the version, writes `CHANGELOG.md`, and brings the documentation
   along: the site's current version and version selector, and a dated entry on the changelog page
   (a prepared `## x.y.z (unreleased)` entry is dated; otherwise the new `CHANGELOG.md` section is
   added).

3. Review the changelog page, commit as `release: vX.Y.Z`, open a pull request and merge it once
   CI passes. The merge also redeploys the documentation site.
4. Tag the merged commit on `main` and push the tag:

   ```sh
   git switch main && git pull --ff-only
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

5. When **Actions → Release** finishes, approve the staged version on npmjs.com (_Staged
   Packages_), then create the GitHub release from the changelog section:
   `gh release create vX.Y.Z --title vX.Y.Z --notes-file <section.md>`.

Tags can't be moved and npm never accepts a version number twice, so if a release run fails, fix
the cause and release the next patch version.

## Documentation site

1. **Hosting:** the site is hosted on Vercel
   (<https://react-pdf-viewer-chi.vercel.app/react-pdf-viewer/>), built from `apps/site` with the
   settings in `apps/site/vercel.json`. Canonical URLs, the sitemap, `llms.txt` and social images
   use that address; set the `SITE_ORIGIN` environment variable when the site moves to another
   domain, and update the links in both READMEs and the package's `homepage`.
2. **Analytics (Vercel only):** in the Vercel project, turn on **Web Analytics** and **Speed
   Insights** (Project → Analytics / Speed Insights → Enable). The site loads their scripts only
   when the build runs on Vercel, and both are cookieless, so no consent banner is needed. To
   check the wiring locally, build with `ANALYTICS=1` and look for the two `/_vercel/…` scripts.
3. **Cloudflare Pages (optional):** the `Deploy site` workflow can also publish the site there:
   add the `CLOUDFLARE_API_TOKEN` (with _Cloudflare Pages: Edit_) and `CLOUDFLARE_ACCOUNT_ID`
   repository secrets and a `SITE_ORIGIN` repository variable. Without the secrets it still builds
   and checks the site but skips the upload.

## Before a release, check

- CI is green on `main` (lint, types, unit, docs conformance, e2e, visual, React 18, consumer smoke).
- `pnpm qa` passes (publint, are-the-types-wrong, size-limit).
- `pnpm --filter @kingtech/react-pdf-viewer pack --dry-run` lists only `dist/`, `README.md`,
  `CHANGELOG.md`, `LICENSE`, `NOTICE` and `package.json`.
