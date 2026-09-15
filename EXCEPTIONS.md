# EXCEPTIONS

Deliberate deviations from the documentation standard (`docs/ppds/02-plugin-docs-standard.md`). Where the standard and the site disagree, the standard wins unless the deviation is recorded here. The model check fails if `migration/url-map.csv` cites an exception that is not listed.

## E-01 — Client-side redirects for legacy hash URLs

- **Rule:** R6, check 22 (“every legacy URL MUST 301”).
- **Scope:** the `/#/…` rows in `migration/url-map.csv`.
- **Why:** the old site used hash routing. Browsers never send the fragment to the server, so no host can answer `/#/docs?s=theming` with a 301.
- **Instead:** `/` and `404.html` run a script generated from `migration/url-map.csv` that replaces the URL with its new page (unknown fragments go to the docs root). `apps/site/e2e/redirects.spec.ts` visits every legacy URL.

## E-02 — Repository files are not redirected

- **Rule:** §10 (“every row MUST have a redirect target”).
- **Scope:** the `repo:/…` rows in `migration/url-map.csv`.
- **Why:** README, LICENSE and similar files must stay at fixed paths for GitHub and npm.
- **Instead:** each row names the site page that is the canonical home of that content, and the file links to it.

## E-03 — Internal test pages outside the docs namespace

- **Rule:** §6 (every page is one archetype) and §3 namespacing.
- **Scope:** `/_internal/harness/` and `/_internal/viewer/`.
- **Why:** chrome-free viewer fixtures for the e2e and visual-regression suites, not documentation.
- **Instead:** `noindex`, and left out of the nav, sitemap and `llms.txt`.

## E-04 — Unknown legacy routes return 404

- **Rule:** §10 (“every row MUST have a redirect target”), for one probe row.
- **Scope:** `/#/does-not-exist` in `migration/url-map.csv`.
- **Why:** it records the old site's behaviour for unknown routes; redirecting unknown URLs would hide broken links.
- **Instead:** unknown paths get the real `404.html`.

## E-05 — Plugin metadata only on plugin pages

- **Rule:** §7.6 (every page emits `search:version`, `plugin:id`, `plugin:categoryId`).
- **Scope:** `404.html`.
- **Why:** the 404 page belongs to no version; tagging it would skew search and analytics.
- **Instead:** every docs page emits the full set (check 19). `plugin:categoryId` is `none` until a category is chosen.

## E-06 — Docs-only site without a marketing surface

- **Rule:** §2.1 (portfolio home, product landing, marketing header) and check 18 (sitemap covers both surfaces).
- **Scope:** the whole site; `content/portfolio.json` declares `"surfaces": ["docs"]`.
- **Why:** one free product does not need a portfolio home or a separate landing page (D-07).
- **Instead:** `/` is a noindex page that resolves legacy links and redirects to `/react-pdf-viewer/`; `/products/react-pdf-viewer/` and `/react-pdf-viewer/demos/document-viewer/` 301 to the docs root and the Playground. The Overview carries the positioning.

## E-07 — llms.txt is not listed in the sidebar

- **Rule:** §5 row 1 (Getting started includes `llms.txt`).
- **Scope:** `content/react-pdf-viewer/nav.json`.
- **Why:** it is a file for AI agents, not a page people read.
- **Instead:** it is still generated at `/react-pdf-viewer/llms.txt` with a Markdown twin per page, and checks 16–17 verify it.
