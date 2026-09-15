# Part 1 — mui.com: Architecture Research Report

Descriptive analysis of how `mui.com` is structured, as observed on 15 September 2026 (Material UI v9.4.0, MUI X v9.13.0). Everything here is evidence for the standard defined in Part 2. Nothing here is a recommendation.

---

## 1. The two-surface model

mui.com is not one site. It is two sites sharing a domain, a footer, and a design system.

### 1.1 Marketing surface

Root-level, marketing-owned, conversion-oriented. Chrome: a slim announcement bar, a logo, two mega-menu triggers (**Products**, **Docs**), three flat links (**Pricing**, **About us**, **Blog**), search, GitHub icon.

| Path | Role |
|---|---|
| `/` | Company home — positioning for the whole portfolio |
| `/core/` | Product-family landing (free/open-source family) |
| `/x/` | Product-family landing (commercial family) |
| `/templates/` | Ready-made artefact catalogue |
| `/design-kits/` | Adjacent-tool artefacts (Figma/Sketch) |
| `/store/` | Commerce |
| `/pricing/` | Plans, comparison matrix, licensing FAQ |
| `/about/`, `/careers/` | Company |
| `/blog/`, `/feed/blog/rss.xml` | Editorial + syndication |
| `/legal/privacy/`, `/legal/mui-x-eula/`, `/legal/technical-support-sla/` | Legal |

The **Products** mega-menu lists purchasable/consumable things (Core, X, Templates, Design Kits). The **Docs** mega-menu lists documentable things (Material UI, Base UI, MUI System, MUI X). Each entry is a title plus a one-sentence value proposition — never a bare link. This is the single most reusable pattern on the marketing surface: *navigation entries carry their own positioning copy*.

### 1.2 Docs surface

Namespaced per product: `/material-ui/…`, `/x/…`, `/system/…`. Chrome is completely different: logo + product name + **version selector** (`v9.4.0`), persistent left sidebar (the product's page tree), right-hand table of contents, an ad slot, and a sponsor slot.

The two surfaces are deliberately not blended. A docs page never shows the marketing mega-menu; a marketing page never shows the sidebar.

---

## 2. URL taxonomy

```
/{productId}/{sectionSlug}/{pageSlug}/#{anchor}
```

Observed instances:

```
/material-ui/getting-started/                     section index (Overview)
/material-ui/getting-started/installation/        section page
/material-ui/react-button/                        capability page (flat, prefix-namespaced)
/material-ui/api/button/                          generated API page
/material-ui/customization/how-to-customize/
/material-ui/guides/composition/
/material-ui/integrations/nextjs/
/material-ui/migration/upgrade-to-v9/
/material-ui/discover-more/showcase/
/material-ui/experimental-api/classname-generator/
/x/react-data-grid/                               product overview
/x/react-data-grid/filtering/                     feature page
/x/react-data-grid/filtering/quick-filter/        sub-feature page
/x/api/data-grid/data-grid-pro/                   generated API page
```

Three rules are visible:

1. **Capability pages are flat and prefixed, not nested.** `/material-ui/react-button/`, not `/material-ui/components/inputs/button/`. Categorisation lives in the *navigation data*, not the URL. This means a component can be recategorised without a redirect.
2. **Sections are directories.** Guides, customization, migration, integrations, discover-more all nest.
3. **Section index = bare section path.** `/material-ui/getting-started/` *is* the Overview page. There is no `/getting-started/overview/`.

Trailing slashes are canonical, and every page declares `canonical:` in meta.

---

## 3. Navigation data structure

The sidebar is not derived from the filesystem. It is an explicit, hand-ordered tree in `docs/data/{product}/pages.ts`, typed as `MuiPage[]`, with generated API pages injected from `docs/data/{product}/pagesApi`.

```ts
import { standardNavIcons } from '@mui/internal-core-docs/AppLayout';
import pagesApi from 'docs/data/material/pagesApi';
import { MuiPage } from '@mui/internal-core-docs/MuiPage';

const pages: MuiPage[] = [
  {
    pathname: '/material-ui/getting-started-group',
    title: 'Getting started',
    children: [
      { pathname: '/material-ui/getting-started', title: 'Overview' },
      { pathname: '/material-ui/getting-started/installation' },
      { pathname: '/material-ui/getting-started/usage' },
      { pathname: '/material-ui/getting-started/mcp', newFeature: true, title: 'MCP' },
      { pathname: '/material-ui/llms.txt', newFeature: true, title: 'llms.txt' },
      { pathname: '/material-ui/getting-started/faq', title: 'FAQs' },
      // …
    ],
  },
  {
    pathname: '/material-ui/react-',
    title: 'Components',
    children: [
      { pathname: '/material-ui/all-components', title: 'All components' },
      {
        pathname: '/material-ui/components/inputs',
        subheader: 'inputs',
        children: [
          { pathname: '/material-ui/react-autocomplete' },
          { pathname: '/material-ui/react-button' },
          { pathname: '/material-ui/react-button-group', title: 'Button Group' },
          // …
        ],
      },
      // …more subheader groups
    ],
  },
  {
    title: 'Component API',
    pathname: '/material-ui/api',
    icon: standardNavIcons.CodeIcon,
    children: pagesApi,          // generated
  },
];
```

### 3.1 Node fields observed

| Field | Meaning |
|---|---|
| `pathname` | Route, or a **virtual grouping path** (`/material-ui/react-`, `…-group`) for nodes that are containers only |
| `title` | Display label. **Omitted when it can be derived** from the pathname via `pageToTitle()` + the translations file |
| `subheader` | Renders the node as a non-clickable group label inside a section (e.g. `inputs`, `data display`) |
| `children` | Recursive; up to three levels deep in practice |
| `icon` | Section icon; either a standard key or an imported icon component |
| `newFeature` | Renders a **New** badge |
| `plan: 'pro' \| 'premium'` | Renders the plan badge |
| `planned`, `unstable` / preview | Render **Planned** / **Preview** badges (observed in MUI X: `Columns Panel Planned`, `Scheduler Preview`) |

### 3.2 Why this matters

Three consequences worth copying:

- Titles live in one translations map (`docs/translations/translations.json`, populated by walking the page tree), so a rename happens in one place and the sidebar, breadcrumbs and search all follow.
- Ordering is editorial, not alphabetical, and is reviewed in code review like any other change.
- Badges are **data on the nav node**, so a feature's lifecycle/plan status is declared once and rendered consistently in sidebar, page header and pricing matrix.

---

## 4. Content pipeline and data structures

### 4.1 Authoring layout

```
docs/data/material/components/button/
├── button.md                     ← the page
├── BasicButtons.tsx              ← demo source (TypeScript, authoritative)
├── BasicButtons.js               ← generated JS twin
├── ContainedButtons.tsx
├── IconLabelButtons.tsx
└── …
docs/pages/material-ui/react-button.js   ← thin route file
```

The route file is a 5-line shim:

```jsx
import * as React from 'react';
import MarkdownDocs from 'docs/src/modules/components/MarkdownDocs';
import * as pageProps from 'docs/data/material/components/button/button.md?@mui/markdown';

export default function Page() {
  return <MarkdownDocs {...pageProps} />;
}
```

**Content is data; routes are plumbing.** Demos are colocated with the page that uses them, not in a global demo folder.

### 4.2 Page frontmatter

```yaml
---
productId: material-ui
title: React Button component
components: Button, IconButton, ButtonBase
materialDesign: https://m2.material.io/components/buttons
githubLabel: 'scope: button'
waiAria: https://www.w3.org/WAI/ARIA/apg/patterns/button/
githubSource: packages/mui-material/src/Button
---
```

`components:` drives which generated API blocks are attached to the page. The link fields (`materialDesign`, `githubLabel`, `waiAria`, plus Figma/Sketch/bundle-size links) drive the **ComponentLinkHeader** — the row of resource chips under the H1. On the Data Grid page that row is: Feedback · Bundle size · WAI-ARIA · Figma · Sketch.

### 4.3 Markdown extensions

| Syntax | Effect |
|---|---|
| `{{"demo": "BasicButtons.js", "bg": true}}` | Embeds a live demo with toolbar (copy, show code, edit in CodeSandbox/StackBlitz, reset). `bg` controls the demo surface; `hideToolbar`, `bg: "inline"` also observed |
| `{{"component": "docs/src/modules/components/ExampleCollection.js"}}` | Embeds a custom React component rendered with the **branding theme** rather than the demo theme. Demos are sandboxed from branding; components are not |
| `:::info` / `:::warning` / `:::success` … `:::` | Callout blocks |
| `## Heading` | Auto-anchored, auto-collected into the right-hand ToC |

### 4.4 Generated API reference

API pages are **never hand-written**. They are produced from JSDoc in the TypeScript declarations and from `propTypes`, via a build step (`pnpm proptypes`), into two separate JSON files per component:

**Schema file** (`docs/pages/material-ui/api/button.json`) — structure only:

```json
{
  "props": {
    "children": { "type": { "name": "node" } },
    "color": {
      "type": { "name": "union", "description": "'inherit' | 'primary' | …" },
      "default": "'primary'"
    },
    "sx": { "type": { "name": "object" } }
  },
  "name": "Button",
  "imports": ["import Button from '@mui/material/Button';", "import { Button } from '@mui/material';"],
  "classes": [ { "key": "root", "className": "MuiButton-root" } ],
  "muiName": "MuiButton",
  "filename": "/packages/mui-material/src/Button/Button.js",
  "inheritance": { "component": "ButtonBase", "pathname": "/material-ui/api/button-base/" },
  "demos": "<ul><li><a href=\"/material-ui/react-button/\">Button</a></li></ul>",
  "styledComponent": true,
  "cssComponent": false
}
```

**Translations file** (`docs/translations/api-docs/button/button.json`) — prose only:

```json
{
  "componentDescription": "",
  "propDescriptions": {
    "sx": "The system prop that allows defining system overrides as well as additional CSS styles.",
    "loading": "If <code>true</code>, the loading indicator is visible and the button is disabled."
  },
  "classDescriptions": {
    "root": { "description": "Styles applied to the root element." }
  }
}
```

**This split is the single most important data-architecture decision on the site.** Structure (types, defaults, class keys, inheritance) is machine-derived and never translated; description text is human-written and fully translatable. The two are joined at render time.

### 4.5 Machine-readable surface (AI consumption)

Recent and highly relevant to your use case:

- **`/{product}/llms.txt`** — a single plaintext index of every documentation page, grouped by section, each line `- [Title](url.md): one-line description`. It is a first-class nav entry, badged **New**.
- **Markdown twin of every page.** Appending `.md` to any docs URL returns the raw authored Markdown *with the generated API reference concatenated onto the end*. `…/react-button.md` returns the Button page followed by the full Button API, ButtonBase API and IconButton API blocks.
- **MCP server** (`/material-ui/getting-started/mcp/`, `/x/introduction/mcp/`) — official docs exposed to AI clients.

The `.md` twin means every page's description already exists in both a human-rendered and an agent-consumable form, from one source. The one-line description in `llms.txt` is the same string as the page's `meta-description` and the H1 subtitle.

---

## 5. Page anatomies

### 5.1 Product Overview (`/material-ui/getting-started/`)

```
H1: "Material UI - Overview"
Subtitle (= meta description): one sentence, what it is + who it's for
## Introduction            2–4 short paragraphs; what it implements; scope caveat
## Advantages of X         5 bullets, each "**Benefit:** explanation"
                           (Ship faster / Beautiful by default / Customizability /
                            Cross-team collaboration / Trusted by thousands)
## Start now               card grid of 6 next-step links, each title + one line:
                           Installation · Usage · Example projects ·
                           Customizing components · Templates · Design resources
Footer: Edit this page · Was this page helpful?
```

Length: short. It does not attempt to teach anything; it routes.

The MUI X overview adds two sections that the free product doesn't need: `## Advantages of MUI X` and `## MUI X vs. Core` (an explicit "when to use which of our things" section), plus an upfront statement of the open-core model and of the badge vocabulary used throughout the docs.

### 5.2 Capability page — Material UI style (`/material-ui/react-button/`)

```
Frontmatter (productId, title, components, external links)
H1: "Button"
One-line description
ComponentLinkHeader chips: Feedback · Bundle size · WAI-ARIA · Figma · Sketch
Short "where you'd use this" paragraph + bullet list of contexts

## Basic button            ← simplest possible working example, first
   demo + 1–2 sentences
   ### Text button / ### Contained button / ### Outlined button
       each: link to the design rationale, demo, one sentence

## Handling clicks         ← the most common integration question
## Color                   ← variation axes, one H2 per axis
## Sizes
## Buttons with icons and label
## Icon button             ← sibling components covered on the same page
   ### Sizes / ### Colors / ### Loading / ### Badge
## File upload             ← recipes for common real-world tasks
## Loading
   :::warning  edge case + "don't do this" code
## Rendering non-native buttons
## Customization           ← always present, always links to the central
                             customization guide, demo of a themed variant
## Complex button          ← escape hatch: the lower-level primitive
## Third-party routing library
## Limitations             ← honest constraints
   ### Cursor not-allowed  ← with two documented workarounds
## API                     ← links to generated API pages

Footer: Edit this page · Was this page helpful?
Right rail: auto ToC of all H2/H3
```

The ordering is an invariant: **basic → variations → integration → recipes → customization → escape hatch → limitations → API**. Nothing conceptual appears before something runnable.

### 5.3 Capability page — MUI X style (`/x/react-data-grid/`)

The commercial product's overview page carries extra blocks the free one doesn't:

```
H1 + description + link chips
## Overview                        what it is
## Why choose the MUI X Data Grid? positioning
   ### Comparisons
       #### AG Grid                3 differentiator bullets
       #### TanStack Table         3 differentiator bullets
## Data Grid packages              the tiering, made concrete
   ### Community version (free forever)   import line + demo
   ### Pro version [pro badge]            import line + demo at scale
   ### Premium version [premium badge]    import line + demo of premium-only work
## API                             links to the three package API pages
```

Note what is being done: **each tier gets its own import statement, its own demo, and a demo chosen to be impossible at the tier below** (100k rows for Pro; row grouping + Excel export for Premium). The paywall is demonstrated, not asserted.

### 5.4 Feature-section structure (MUI X Data Grid sidebar)

This is the closest analogue to "a plugin with many capabilities" and the most directly transferable structure in the whole site:

```
Data Grid
├── Overview
├── Quickstart
├── Features                       ← interactive feature-matrix page
├── Demos                          ← real-world scenario demos
├── Main features                  (subheader)
│   ├── Layout, Columns, Rows, Cells, Editing, Sorting, Filtering,
│   │   Pagination, Selection, Virtualization, Accessibility, Localization
├── Advanced features              (subheader)
│   ├── Tree data, Row grouping, Aggregation, Formulas [New], Pivoting [New],
│   │   Export, Copy and paste, Undo and redo [New], Scrolling, List view,
│   │   Server-side data [New], Charts integration [New], AI Assistant [New]
├── Components [New]               (subheader)
│   ├── Usage, Toolbar, Export, Quick Filter, Columns Panel [Planned],
│   │   Filter Panel [Planned], Prompt Field, Formula Bar [New],
│   │   Pivot Panel [Planned], Charts Panel [Planned], AI Assistant Panel [Planned]
├── Customization                  (subheader)
│   ├── Styling basics, Styling recipes, Overlays, Custom subcomponents
├── Resources                      (subheader)
│   ├── API object, Events, State, Performance
├── API reference
└── Tutorials                      (subheader)
    ├── Server-side data, Aggregation and row grouping
```

Observations:

- **One page per capability.** Filtering is not a section of a mega-page; it is `/x/react-data-grid/filtering/`, with sub-pages `/filtering/quick-filter/`, `/filtering/header-filters/`, `/filtering/multi-filters/`.
- **Main vs Advanced** is the primary split, and it correlates with — but is not identical to — the free/paid split.
- **Planned pages exist and are linked.** Roadmap items have URLs before they have implementations. This is deliberate: it lets the pricing matrix link to a real page for an unreleased feature.
- **Resources** groups the "how it works internally" pages (state, events, API object, performance) away from the "how do I do X" pages.
- **Tutorials** are separate from feature pages: long-form, task-oriented, not reference.

### 5.5 Generated API page (`…/api/button/`, or the tail of `react-button.md`)

```
H1: "Button API"
Description: "API reference docs for the React Button component.
              Learn about the props, CSS, and other APIs of this exported module."
## Demos               back-links to every demo page that uses this component
## Import              both import forms + link to the bundle-size guide
## Props               table: Name | Type | Default | Required | Description
                       + note: props of <Parent> are also available
                       + note: ref is forwarded to <element>
                       + note: other props spread to the root element
## Inheritance         explicit statement of the parent component
## Theme default props "You can use MuiButton to change the default props…"
## CSS                 table: Global class | Rule name | Description
## Source code         deep link to the implementation file
```

Every one of those blocks is derived from the schema JSON + translations JSON described in §4.4. The "Demos" back-link list is generated by inverting the `components:` frontmatter across all pages — you never maintain it by hand.

### 5.6 Feature index page (`/material-ui/all-components/`)

Bare structure: H1, two paragraphs of scope-setting, then one H2 per category, each containing a card grid of every item in it. Categories observed: **Inputs · Data display · Feedback · Surface · Navigation · Layout · Lab · Utils**. This is the same taxonomy as the `subheader` values in `pages.ts` — one taxonomy, two renderings.

### 5.7 Pricing page (`/pricing/`)

The most structurally elaborate page on the site:

```
Eyebrow "Pricing" + H1 + one-line subtitle
Billing-model toggle: Perpetual | Annual
4 plan cards, each: icon · plan name · one-line "best for" ·
   price · price-equivalent line · CTA (different per plan:
   "Get started" / "Buy now" / "Buy now" / "Contact Sales") ·
   licence note · "Everything in X plan and…" + 3–6 headline entitlements
Mobile: plan selector tabs instead of side-by-side cards
────────────────────────────────────────────────────────
Full comparison matrix, grouped hierarchically:
   Product family (MUI Core / MUI X)
   └── Product (Data Grid / Charts / Scheduler / Tree View)
       └── Feature group (Column features / Row features / Filtering / …)
           └── Feature row — LINKED to its own docs page, with per-plan cells
   Cross-cutting rows: Perpetual use in production · Development license ·
                       Access to new releases
   Support block: Priority support · CSM · Technical support ·
                  Support duration · Guaranteed response time ·
                  Pre-screening · Issue escalation · Security questionnaire
────────────────────────────────────────────────────────
## Key information about the paid plans
   Required quantity · Perpetual model · Perpetual vs Annual ·
   Annual model · Maintenance and support · Volume discounts · Price increases
## Frequently asked questions
   9 questions, licensing-focused, with worked numeric examples
   ("Company A has 5 front-end and 10 back-end developers… purchases 5 licenses")
Social proof block (shared component)
```

Two things to steal regardless of your pricing model:

1. **Every feature row in the matrix is a hyperlink to that feature's docs page.** The matrix is a navigation surface, not just a comparison.
2. **Unreleased features appear in the matrix with a "TBD" cell linking to a feedback form.** Roadmap is monetised in place.

### 5.8 Marketing home (`/`)

```
Announcement bar (single current campaign, link out to blog post)
Hero: H1 + one paragraph + single primary CTA
Logo wall + one-line credibility claim
── Products    eyebrow + H2 + one line + 4 product cards
── Why build with MUI?  eyebrow + H2 + 4 value pillars
   (Timeless aesthetics · Intuitive customization ·
    Unrivalled documentation · Dedicated to accessibility)
── Production-ready components  eyebrow + H2 + live interactive demo
── Join the community  4 metrics (npm downloads, GitHub stars,
   contributors, followers) + 4 testimonials (quote, photo, name, role, logo)
── Sponsors  tiered (Diamond / Gold / others)
Newsletter capture
Footer: 4 columns — Products · Resources · Explore · Company
```

The **eyebrow → H2 → one-line subtitle → content** rhythm repeats for every marketing section. The community metrics block and the testimonial block are shared components reused verbatim on `/core/` and `/pricing/`.

### 5.9 Product-family landing (`/core/`)

Much thinner than home: hero with product logo, H1, one paragraph, then a card per member product (title + one-sentence description), then the shared community/testimonial block. No feature depth, no pricing. Its job is disambiguation and routing into docs.

---

## 6. Cross-cutting conventions

| Element | Behaviour |
|---|---|
| **Version switcher** | On every docs page, next to the product name; links to a `/getting-started/versions/` page and to versioned subdomains (`v5.mui.com`, `v7.mui.com`, …). Old versions stay online permanently |
| **Right-hand ToC** | Auto-generated from H2/H3; sticky; current-section highlighting |
| **"Was this page helpful?"** | Per-page feedback widget, bottom of every docs page |
| **"Edit this page"** | Deep link to the exact source file on GitHub, bottom of every docs page |
| **Search** | Algolia DocSearch, scoped by `docsearch:language` and `docsearch:version` meta tags |
| **Badges** | `New` · `Pro` · `Premium` · `Planned` · `Preview` · `Deprecated`. Rendered identically in the sidebar, in section headings, and in the pricing matrix. Pro/Premium use distinct coloured cube icons, explained once on the overview page |
| **Demo toolbar** | Copy · show/hide source · TS/JS toggle · open in CodeSandbox / StackBlitz · reset |
| **Ad + sponsor slots** | Fixed positions in the docs right rail; part of the layout contract, not injected ad-hoc |
| **Announcement bar** | One global campaign string, sitewide, on both surfaces |
| **Footer** | Identical on both surfaces: newsletter capture + 4 link columns + legal line + social icons |

### 6.1 SEO / metadata contract

Every page emits the same meta set, with values derived from one title and one description:

```
canonical, title, meta-description
og:title, og:description, og:image, og:type, og:url, og:ttl
twitter:card, twitter:title, twitter:description, twitter:image, twitter:site
theme-color, viewport
docsearch:language, docsearch:version
mui:productCategoryId      e.g. "core" | "x" | null
mui:productId              e.g. "material-ui" | "x-data-grid" | null
```

`og:image` is **generated at request time by an edge function** from the same title/description strings:

```
https://mui.com/edge-functions/og-image?product=MUI X&title=React Data Grid component&description=…
```

Marketing pages use hand-made static previews (`/static/social-previews/pricing-preview.jpg`); docs pages use the generated one. Nobody makes a social card by hand for a docs page.

The `productCategoryId` / `productId` pair is the machine-readable answer to "which product does this page belong to" and drives the sidebar, search scoping and analytics segmentation.

---

## 7. User flows encoded in the structure

| Flow | Path through the site |
|---|---|
| **Evaluate** | `/` → product card → `/x/` → `/x/introduction/` → comparisons + `MUI X vs. Core` → `/x/react-data-grid/features/` → `/pricing/` |
| **Adopt** | Overview → Installation → Usage → first capability page → demo → copy |
| **Implement** | Search → capability page → nearest demo → API reference → copy code → back to demo |
| **Customise** | Capability page `## Customization` → central customization guide → theming → `Themed components` |
| **Upgrade** | Version switcher → `Versions` → `Migration → Upgrade to v9` → changelog |
| **Convert** | Any page with a Pro/Premium badge → licensing page → pricing → store item → licence key install |
| **Support** | `Support` page → community (GitHub/Stack Overflow) for free tiers, priority channels for paid |
| **Agent/AI consumption** | `llms.txt` → `.md` twin of a page → MCP server |

Two of these are worth naming explicitly because they are structural, not editorial:

- **The paywall is always reached from a capability page, never from a nav link.** A user meets Pro when they want a Pro feature, and the badge next to the feature is the entry point to pricing.
- **The upgrade flow is a first-class section**, not a changelog footnote. Migration has its own top-level sidebar section with one page per version jump, kept forever.

---

## 8. What MUI does that most product sites don't

Condensed, for the abstraction in Part 2:

1. Marketing and documentation are separate surfaces with separate chrome, joined only by footer and design system.
2. Navigation is explicit ordered data, decoupled from both the URL structure and the filesystem.
3. Categorisation lives in nav data, so recategorising costs nothing.
4. One page per capability, always ordered basic → advanced → customisation → limitations → API.
5. Every capability page leads with a runnable example, not a concept.
6. API reference is generated from source, split into structure-JSON and prose-JSON.
7. Limitations are documented on the page, with workarounds.
8. Every feature row in the pricing matrix links to its own docs page.
9. Planned features get URLs before they get code.
10. Every page has a Markdown twin and an `llms.txt` entry, for AI agents.
11. Titles and descriptions are written once and reused in nav, meta, OG image, and `llms.txt`.
12. Old documentation versions are never deleted.

---

## 9. Sources

Primary (fetched 15 Sep 2026): `mui.com/`, `/core/`, `/pricing/`, `/material-ui/getting-started/`, `/material-ui/llms.txt`, `/material-ui/react-button.md`, `/material-ui/all-components.md`, `/x/introduction/`, `/x/react-data-grid/`, `/x/react-data-grid/features/`.

Secondary: `mui/material-ui` repository — `docs/data/{material,base,system}/pages.ts`, `docs/data/docs-infra/pages.ts`, `docs/scripts/i18n.ts`, `docs/src/modules/components/MarkdownDocs.js`, `docs/data/material/guides/api/api.md`, and pull requests documenting the `{{"demo"}}` / `{{"component"}}` markdown loader and the generated `api-docs` JSON pair.
