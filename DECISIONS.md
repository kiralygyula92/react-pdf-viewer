# DECISIONS

Owner and portfolio decisions for the React PDF Viewer site and plugin, made at the Phase 2 gate of the PPDS restructure (`docs/ppds/03-agent-implementation-brief.md`). Each decision is final until superseded by a later entry; superseded entries are never deleted.

Decisions D-03 to D-06 were delegated by the owner (“decide what's best for having a professional website and plugin”) and are recorded with their reasoning so they can be reviewed.

| ID   | Decision                                                                                             | Resolves                                           | Date       |
| ---- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------- |
| D-01 | Plugin id `react-pdf-viewer`, display name “React PDF Viewer”                                        | GAPS G-40 (identity), G-08 (partly)                | 2026-09-15 |
| D-02 | Free only for now: one `free` tier, no pricing surface                                               | GAPS G-09                                          | 2026-09-15 |
| D-03 | Path-based, pre-rendered static site on Cloudflare Pages; client-side redirects for legacy hash URLs | GAPS G-06, G-02 (partly); EXCEPTIONS E-01 accepted | 2026-09-15 |
| D-04 | Astro 7 site with a separate, plugin-agnostic `ppds-kit` package                                     | GAPS G-07                                          | 2026-09-15 |
| D-05 | PPDS v1.1: archetypes J (Guide), K (Section index), L (Demo scenario)                                | GAPS G-38                                          | 2026-09-15 |
| D-06 | PPDS v1.1: group term _Integrations_ → _Connectivity_                                                | GAPS G-45                                          | 2026-09-15 |
| D-07 | Docs-only site: minimal header, root redirects to the docs, Playground replaces the Document viewer  | GAPS G-23, G-48; EXCEPTIONS E-06                   | 2026-09-15 |

---

## D-01 — Plugin identity

- **Decision:** `id: "react-pdf-viewer"` is the permanent docs namespace (`/react-pdf-viewer/…`); `name: "React PDF Viewer"`.
- **Made by:** owner.
- **Consequences:** slugs under `/react-pdf-viewer/` are permanent from Phase 3 on (R3). The npm package name `@kiralygyula92/react-pdf-viewer` is unaffected. `categoryId` and branding stay open (GAPS G-50).

## D-02 — Free only for now

- **Decision:** `tiers: [{ id: "free", badge: null }]`; every capability node has `plan: "free"`; no `pricing.json`. Archetypes D (feature matrix) and H (pricing) and flow F6 are omitted as conditional.
- **Made by:** owner.
- **Consequences:** no tier badges render anywhere. Adding a paid edition later means new tiers in `plugin.config.json`, per-node `plan` values, a `pricing.json` and the two archetypes. No URL changes are needed, because tiering is a node property, not a nav section (P8).

## D-03 — Routing and hosting

- **Decision:**
  1. Every page is a real path URL with a trailing slash (`/react-pdf-viewer/zoom/`), pre-rendered to static HTML at build time, with no client routing for content.
  2. The site is served from the **root of its own origin**, so the namespace is `/react-pdf-viewer/` and never `/<repo>/react-pdf-viewer/`.
  3. The primary host is **Cloudflare Pages**: real HTTP 301s from a generated `_redirects` file, a preview deployment for every pull request, custom domains and HTTP/2+ with a global CDN, all on the free plan. Deploys run from GitHub Actions with `wrangler pages deploy`.
  4. The build output stays host-agnostic: `_redirects` plus `404.html`, and HTML fallback redirect pages (`<meta http-equiv="refresh">` + `rel="canonical"`) for hosts without redirect rules.
  5. Legacy `/#/…` URLs are redirected in the browser from a map generated from `migration/url-map.csv` (EXCEPTIONS E-01, now accepted).
- **Rationale:** the standard's URL taxonomy (§3), canonicals (R4), 301s (R6), per-page metadata (§7.6) and Markdown twins (§7.7) all need real, server-visible paths. Hash routing cannot provide any of them. GitHub Pages has no redirect rules, and as a project site it prefixes the repository name, which would double the namespace.
- **Alternatives considered:**
  - GitHub Pages (no 301s; base-path problem).
  - Netlify (equivalent features, stricter free build minutes).
  - Vercel (equivalent features, but it pulls toward a Next.js runtime we don't need).
  - Keeping the SPA with prerendered snapshots (fragile, and still no per-URL HTML for the demo routes).
- **Consequences:** the existing `pages.yml` workflow is replaced in Phase 3. The owner must create the Cloudflare Pages project and a domain (GAPS G-49). Until a domain exists, the canonical origin is a single build setting.

## D-04 — Site technology and shared infrastructure

- **Decision:**

  | Concern                             | Choice                                                                                                                                                                           |
  | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Site framework                      | **Astro 7** (`output: 'static'`, `trailingSlash: 'always'`, `build.format: 'directory'`) with `@astrojs/mdx` and `@astrojs/react`                                                |
  | Content contract                    | Astro content collections with Zod schemas generated from `docs/ppds/plugin-site.schema.json` (frontmatter validated at build)                                                   |
  | Live demos                          | React islands importing the real package from the workspace; demo files colocated with page Markdown (§7.2)                                                                      |
  | Demo toolbar                        | copy · show/hide source · **open in StackBlitz** (generated Vite project posted through the StackBlitz SDK; no account needed) · reset (remount)                                 |
  | Search                              | **Pagefind** (static index, no external service), filtered by `plugin` and `version`                                                                                             |
  | Reference generation                | **TypeDoc JSON** from the package's TSDoc → `reference/{symbol}.schema.json` + `.strings.json` skeletons (Phase 4); fallback `ts-morph` if TypeDoc lags TypeScript 6 (GAPS G-51) |
  | OG images                           | Generated at build time from `title` + `description` (SVG template rendered to PNG)                                                                                              |
  | Machine surface                     | Generated `llms.txt`, `.md` twins, `sitemap.xml`, RSS for changelog                                                                                                              |
  | Feedback (“Was this page helpful?”) | Prefilled GitHub issue link carrying the page URL and answer; no tracking, no backend                                                                                            |
  | Analytics                           | Cloudflare Web Analytics (cookieless, no consent banner), which also closes GAPS G-03 after launch                                                                               |
  | Hosting                             | Cloudflare Pages (D-03)                                                                                                                                                          |

- **Repository layout (Phase 3):**

  ```
  packages/react-pdf-viewer/   the plugin (unchanged)
  packages/ppds-kit/           private, PLUGIN-AGNOSTIC: layout shells for both surfaces, the 12 archetype
                               templates, nav/sidebar/ToC/badges, demo toolbar, footer, metadata, Zod schemas,
                               generators (llms.txt, .md twins, sitemap, _redirects, legacy-fragment map),
                               conformance script (grown from scripts/ppds/validate-model.mjs), reference core
  apps/site/                   Astro app: marketing + docs surfaces for this plugin, consuming the kit
  content/react-pdf-viewer/    the plugin's content model and pages (PPDS §8.1), demos colocated
  apps/demo/                   kept until its demos and e2e tests are ported (Phase 5), then its URLs redirect
  ```

- **Rationale:**
  - The standard needs a data-driven sidebar (`nav.json`), twelve custom page templates, two surfaces and generated reference. Opinionated doc frameworks (Starlight, Docusaurus, Nextra, Fumadocs) derive the sidebar from files or their own config and impose their own chrome, so every standard rule would be a fight with the theme.
  - Astro keeps full control of HTML, pre-renders everything, ships no JavaScript by default (content works without JS, §7.8) and runs the real React package only where a demo needs it.
  - Astro is also framework-agnostic, which matters for a portfolio of _unrelated_ plugins that may not all be React.
- **Anti-fork rule:** `packages/ppds-kit` must not contain plugin-specific code or strings. The conformance script fails if the kit references a plugin id, package name or plugin content path. The kit moves to its own repository and is published privately when plugin #2 starts, which is also when the standard freezes (§12).
- **Alternatives considered:**
  - Starlight (fastest start, but its sidebar and page layout conflict with P2/N1 and archetypes A–L).
  - Docusaurus (React-only, heavy, filesystem sidebars).
  - Next.js with Fumadocs or Nextra (server runtime not needed, Next-specific).
  - Extending the current Vite SPA (would need a custom prerenderer, metadata and routing: re-implementing Astro).

## D-05 — PPDS v1.1: archetypes J, K, L

- **Decision:** amend §6 centrally in `docs/ppds/02-plugin-docs-standard.md`:
  - **J Guide:** guides, customization pages, integration targets, migration pages, FAQ, Support and Versions, with per-variant required blocks.
  - **K Section index:** `/api/`, `/migration/`, `/demos/`; card grids rendered from nav data.
  - **L Demo scenario:** `/demos/{scenario}/`.
  - `llms.txt`, `.md` twins, feeds and the sitemap are machine surfaces, not pages.
- **Rationale:** §5 makes these pages mandatory but §6 gave them no template, so conformance check 1 (“every page resolves to exactly one archetype”) could not be met by any plugin. Three generic templates cover every required page. Forcing guides into I (Editorial) would have demanded dates and authors and allowed unstructured bodies.
- **Consequences:** `migration/url-map.csv` uses A–L; `scripts/ppds/validate-model.mjs` derives each target's archetype from its path and checks the URL map against it.

## D-06 — PPDS v1.1: _Integrations_ → _Connectivity_

- **Decision:** in the §5 group vocabulary, _Integrations_ becomes **Connectivity**, portfolio-wide. Section 7 keeps the name **Integrations**.
- **Rationale:** section names are forbidden variation (§12) and _Integrations_ is a mandatory section, so the group term would collide in every plugin's sidebar. Renaming the group once, centrally, removes the clash for the whole portfolio.
- **Candidates considered:**

  | Term                 | Verdict                                                                                                                                                                   |
  | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **Connectivity**     | **Chosen.** Generic across unrelated plugins; covers network requests, authentication, workers, CDNs, asset hosting and external services; no clash with any section name |
  | Data sources         | Too narrow: excludes worker and asset configuration, webhooks, outbound services                                                                                          |
  | Networking           | Too low-level; wrong for plugins that connect through SDKs rather than HTTP                                                                                               |
  | Services             | Vague; also collides with “Support” and pricing language                                                                                                                  |
  | Extensions / Add-ons | Implies optional installable modules, which §2.1 already uses for products                                                                                                |

- **Consequences:** this plugin's `Connectivity` group holds `pdfjs-configuration` and `authenticated-requests`. The validator checks every taxonomy term against the vocabulary in the standard.

## D-07 — Docs-only site for a single product

- **Decision (owner, 2026-09-15):** the site is documentation-centric for one product.
  - The header is minimal: product name (linking to `/react-pdf-viewer/`), version selector, search, GitHub and theme toggle. No portfolio logo, no marketing menus and no menu button; on narrow screens the sidebar becomes a “Browse documentation” disclosure above the page.
  - `/` redirects to `/react-pdf-viewer/` (after resolving legacy `#/…` links). The portfolio home and the product landing page `/products/react-pdf-viewer/` are removed; the landing URL 301s to the docs root.
  - The Document viewer demo is removed: the Playground already covers it. Its URL 301s to the Playground, legacy `#/view?src=…` links open the document in the Playground, and the URL-driven viewer the e2e suites use moves to `/_internal/viewer/` (E-03).
- **Rationale:** a single product does not need a portfolio home or a separate marketing page, and one demo that covers every option is clearer than two overlapping ones.
- **Consequences:** `content/portfolio.json` declares `"surfaces": ["docs"]`; conformance check 18 no longer requires a marketing-surface URL, check 25 reads the footer on the docs root, and noindex redirect pages are excluded from the sitemap and the page checks. The removed URLs were never publicly deployed, but both redirect anyway (R6).
