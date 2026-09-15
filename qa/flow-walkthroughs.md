# Flow walkthroughs

Phase 6 (Ship) of the PPDS restructure, 2026-09-15, against the production build of `apps/site`
(`pnpm build`, served by `astro preview`). Placeholder origin: `https://react-pdf-viewer.pages.dev`
(GAPS G-49).

Every click path below is executed by [`apps/site/e2e/flows.spec.ts`](../apps/site/e2e/flows.spec.ts):
each step clicks the named link on the page (opening a collapsed sidebar section first, as a
visitor would), so a missing or broken link fails the flow. Result: **7 of 7 applicable flows pass**
(Chromium). F6 does not apply.

## Required flows (PPDS §9)

### F1 Evaluate — pass

Pricing and the feature matrix are omitted (free only, DECISIONS D-02), so the flow exits at install.

1. `/` → **Explore React PDF Viewer**
2. `/products/react-pdf-viewer/` → capability showcase “Everything a document viewer needs” → **Search**
3. `/react-pdf-viewer/search/` (capability page, live demo) → header **React PDF Viewer**
4. `/react-pdf-viewer/` (docs overview) → sidebar _Features_ → **All features**
5. `/react-pdf-viewer/all-features/` (features index) → sidebar _Getting started_ → **Installation**
6. Exit: `/react-pdf-viewer/getting-started/installation/`

### F2 Adopt — pass

1. `/react-pdf-viewer/` → _Start now_ card **Installation**
2. `/react-pdf-viewer/getting-started/installation/` → _Minimal example_ (copyable code) → _Next steps_ **Usage**
3. `/react-pdf-viewer/getting-started/usage/` → **Controlled state**
4. Exit: `/react-pdf-viewer/controlled-state/` (first capability, Basics demo first)

### F3 Implement — pass

1. `/react-pdf-viewer/getting-started/usage/` → header **Search** → type “rotation” → result **Rotation**
2. `/react-pdf-viewer/rotation/` → first demo → **Show source** (Copy and Open in StackBlitz in the same toolbar)
3. `## API` → **PdfViewerProps**
4. `/react-pdf-viewer/api/pdf-viewer-props/` (generated reference) → browser **Back**
5. Exit: `/react-pdf-viewer/rotation/`

### F4 Customise — pass

1. `/react-pdf-viewer/zoom/` → `## Customization` → **customization guide**
2. `/react-pdf-viewer/customization/` → _Ways to customize_ → **Theming**
3. `/react-pdf-viewer/customization/theming/` → **CSS variables**
4. Exit: `/react-pdf-viewer/api/css-variables/` (every token with its default, generated)

### F5 Upgrade — pass

1. `/react-pdf-viewer/zoom/` → header version selector → **All versions…**
2. `/react-pdf-viewer/getting-started/versions/` → **Migration**
3. `/react-pdf-viewer/migration/` → **changelog**
4. Exit: `/react-pdf-viewer/discover-more/changelog/` (release `0.1.0`; RSS at `rss.xml`)

The selector's “All versions…” entry was added in this phase: before it, the selector listed only
the current version and had no route to the Versions page.

### F6 Convert — not applicable

The plugin has a single free tier (D-02): no tier badges, pricing page or licence activation exist.

### F7 Support — pass

1. `/react-pdf-viewer/zoom/` → sidebar _Getting started_ → **Support**
2. `/react-pdf-viewer/getting-started/support/` → _Free channels_ → **issue**
3. Exit: `https://github.com/kiralygyula92/react-pdf-viewer/issues/new/choose` (link target
   verified; the repository must be public for anonymous visitors, G-04 / G-49). Security reports go
   to GitHub security advisories (_Reporting a security issue_).

### F8 Agent — pass

1. `GET /react-pdf-viewer/llms.txt` → 92 entries
2. `GET` every `.md` twin listed → all 200, each starting with an H1
3. No MCP endpoint (optional in §9).

## Metadata sample (brief §6.5)

One page per archetype present on the site, plus the portfolio home. All pages have exactly one H1,
a canonical URL with a trailing slash, the skip link, and every tag checked
(`description`, `og:title`, `og:description`, `og:image`, `og:type`, `og:url`, `twitter:card`,
`twitter:image`, `theme-color`, `search:language`, `search:version`, `plugin:id`). Conformance check
19 verifies the full set on all 96 pages.

| Archetype       | Page                                              | `<title>`                              | OG image                                              |
| --------------- | ------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| A Overview      | `/react-pdf-viewer/`                              | React PDF Viewer — Overview            | `/og/react-pdf-viewer.png`, 1200×630                  |
| B Capability    | `/react-pdf-viewer/zoom/`                         | Zoom · React PDF Viewer                | `/og/react-pdf-viewer/zoom.png`, 1200×630             |
| C Index         | `/react-pdf-viewer/all-features/`                 | All features · React PDF Viewer        | `/og/react-pdf-viewer/all-features.png`, 1200×630     |
| E Reference     | `/react-pdf-viewer/api/pdf-viewer/`               | PdfViewer reference · React PDF Viewer | `/og/react-pdf-viewer/api/pdf-viewer.png`, 1200×630   |
| F Installation  | `/react-pdf-viewer/getting-started/installation/` | Installation · React PDF Viewer        | `/og/…/getting-started/installation.png`, 1200×630    |
| G Landing       | `/products/react-pdf-viewer/`                     | React PDF Viewer · kiralygyula92       | `/og/products/react-pdf-viewer.png`, 1200×630         |
| I Editorial     | `/react-pdf-viewer/discover-more/changelog/`      | Changelog · React PDF Viewer           | `/og/…/discover-more/changelog.png`, 1200×630         |
| J Guide         | `/react-pdf-viewer/guides/security/`              | Security · React PDF Viewer            | `/og/react-pdf-viewer/guides/security.png`, 1200×630  |
| K Section index | `/react-pdf-viewer/migration/`                    | Migration · React PDF Viewer           | `/og/react-pdf-viewer/migration.png`, 1200×630        |
| L Scenario      | `/react-pdf-viewer/demos/playground/`             | Playground · React PDF Viewer          | `/og/react-pdf-viewer/demos/playground.png`, 1200×630 |
| Portfolio home  | `/`                                               | kiralygyula92                          | `/og/index.png`, 1200×630                             |

The portfolio home has no `search:version` or `plugin:id`, as intended (EXCEPTIONS E-05). Archetypes
D and H are not built (D-02).

OG images were opened and inspected. One defect was found and fixed: the ⌘ key symbol has no glyph
in the bundled Inter font and rendered as a box; the renderer now spells key symbols out
(“Ctrl/Cmd + wheel”).

## Accessibility pass (brief §6.6)

| Check                 | Result                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| One H1, heading order | Pass: conformance check 2 on all pages.                                                                                         |
| Skip link             | Pass: “Skip to content” is the first focusable element on every layout.                                                         |
| Focus visibility      | Pass: keyboard walkthrough e2e test; focus styles on links, demo toolbars, scroll regions and the viewer.                       |
| Demo labelling        | Pass: every demo is a `figure` named “Demo: {title}”; scrollable source and tables are named, focusable regions.                |
| axe (WCAG 2.2 AA)     | Pass: every sitemap page in light and dark colour schemes, plus the viewer's states on desktop and mobile (`e2e/a11y.spec.ts`). |

The sweep found and this restructure fixed: horizontally scrolling tables that keyboard users could
not reach, low-contrast viewer states on the dark site theme, and two package defects recorded as
GAPS G-52 (a page with links exposed as an image; the dark presets leaving the password prompt
light).

## Redirects (brief §6.7)

[`redirect-check.csv`](redirect-check.csv): all 33 legacy URLs from `migration/url-map.csv` visited
in a browser; each lands on its target with HTTP 200 (client-side redirect, EXCEPTIONS E-01). No
path URLs moved, so `_redirects` holds no rules. Re-run against the deployed host after launch
(GAPS G-53).
