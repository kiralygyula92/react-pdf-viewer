# EXCEPTIONS

Documented deviations from PPDS v1.0 (`docs/ppds/02-plugin-docs-standard.md`) for the `react-pdf-viewer` site. Brief §0.1: where the standard and the site disagree, the standard wins unless the deviation is recorded here with a reason.

Every entry starts as **Proposed** and needs owner approval before Phase 3 builds on it. E-01 to E-04 were accepted on 2026-09-15 under the delegated decisions in `DECISIONS.md`. `scripts/ppds/validate-model.mjs` fails if `migration/url-map.csv` cites an exception that is not recorded here.

---

## E-01 — Client-side redirects for legacy hash URLs

- **Status:** Accepted (D-03: path-based routing on Cloudflare Pages)
- **Rule deviated from:** R6 and conformance check 22 (“Every legacy URL MUST 301”).
- **Scope:** the 32 `/#/…` rows in `migration/url-map.csv`.
- **Reason:** every legacy URL is a fragment of the single demo document (`/index.html#/docs?s=…`). Browsers never send the fragment to the server, so no server, CDN or GitHub Pages rule can distinguish `/#/docs?s=theming` from `/#/examples`. An HTTP 301 per legacy URL is technically impossible on any host, including Cloudflare Pages (D-03), whose `_redirects` rules match paths only.
- **Mitigation:** the new site's root document keeps a small redirect script that reads `location.hash`, looks the fragment up in a map generated from `migration/url-map.csv`, and calls `location.replace(target)`. Query strings are preserved where the map says so. Unknown fragments go to `/react-pdf-viewer/`. The redirect table stays generated from the CSV, so it can't drift.
- **Verification (Phase 6):** a Playwright check visits every legacy fragment and asserts the final URL equals `target_url`. This replaces the HTTP-status check in `qa/redirect-check.csv`.

## E-02 — Repository Markdown files are not redirected

- **Status:** Accepted (D-03)
- **Rule deviated from:** PPDS §10 (“every row MUST have a redirect target”).
- **Scope:** the 11 `repo:/…` rows in `migration/url-map.csv`.
- **Reason:** these are files in the Git repository (and, for the package README, LICENSE and NOTICE, the npm tarball). They are not served by the site, and GitHub and npm rely on them at fixed paths. Replacing them with redirects would break the repository landing page, the npm listing and license compliance.
- **Mitigation:** each row names the site page that becomes the canonical home of its content (`target_url`). The files stay, shortened where noted, and link to that page.

## E-03 — Internal test harness outside the docs namespace

- **Status:** Accepted (D-03)
- **Rule deviated from:** §6 (“Every page … MUST be an instance of exactly one [archetype]”) and §3 namespacing.
- **Scope:** `/#/harness` and its query variants → `/_internal/harness/`.
- **Reason:** the harness renders the viewer without chrome, for deterministic e2e and visual-regression tests (18 committed baselines). It is a test fixture, not documentation, and forcing it into an archetype would add chrome and break the baselines.
- **Mitigation:** served with `noindex`; excluded from `nav.json`, the sitemap and `llms.txt`; removed from the site header. Only the test suites link to it.

## E-04 — Unknown routes return 404 instead of redirecting

- **Status:** Accepted (D-03)
- **Rule deviated from:** PPDS §10 (“every row MUST have a redirect target”), for the crawl probe row only.
- **Scope:** `/#/does-not-exist` in `migration/url-map.csv`.
- **Reason:** the audit probed an arbitrary unknown route to record the legacy “Page not found” behaviour (HTTP 200). It is not a legacy page and has no traffic or content. Redirecting unknown URLs would hide broken links, which check 23 is meant to catch.
- **Mitigation:** unknown paths get a real HTTP 404 page (`/404.html`) with links to the docs root and search. Unknown legacy _fragments_ follow E-01's fallback.
