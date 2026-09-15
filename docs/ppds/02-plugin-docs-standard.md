# Part 2 — The Plugin Presentation & Documentation Standard (PPDS v1.1)

Normative specification. Derived from the mui.com analysis in Part 1, abstracted to be product-agnostic so that several unrelated plugins can share one information architecture.

**Conformance language:** MUST / SHOULD / MAY carry their usual meaning. A site is *conformant* if it satisfies every MUST in §2–§8 and passes the checks in §11.

**Revision history:** v1.0, initial standard. **v1.1** (2026-09-15), portfolio decisions D-05 and D-06 recorded in the repository `DECISIONS.md`: archetypes J (Guide), K (Section index) and L (Demo scenario) added to §6; the §5 group term *Integrations* replaced by *Connectivity*. The standard is not yet frozen (§12: it freezes after plugin #2).

---

## 1. Design principles

These are the invariants. When a specific rule in this document conflicts with a product's reality, resolve in favour of the principle.

| # | Principle | Consequence |
|---|---|---|
| P1 | **Two surfaces, one system.** Marketing and documentation are separate experiences sharing a footer and a design system. | A docs page never renders marketing chrome, and vice versa. |
| P2 | **Navigation is data, not files.** The sidebar is an explicit, hand-ordered tree. | Recategorising a feature never changes its URL. |
| P3 | **One capability, one page, one URL.** | No mega-pages. If a capability needs more than ~8 H2s, it becomes a section with sub-pages. |
| P4 | **Runnable before explainable.** Every capability page opens with the simplest working example. | Concepts, theory and architecture come after, or in a Resources page. |
| P5 | **Reference is generated, prose is written.** Anything derivable from the plugin's source (settings, hooks, events, CLI flags, schema) MUST be generated. | Hand-maintained option tables are a defect. |
| P6 | **Structure and language are separate data.** Machine-derived structure in one file, human prose in another. | Translation and regeneration never fight. |
| P7 | **Tier status is declared once.** Plan/lifecycle badges are properties of a nav node, rendered everywhere from that one declaration. | Sidebar, page heading and pricing matrix can never disagree. |
| P8 | **The paywall is met at the feature, not the nav.** | Users discover a paid capability while wanting it. |
| P9 | **Every page has a machine twin.** `.md` twin + `llms.txt` entry. | The site is consumable by AI agents without scraping. |
| P10 | **Write the title and description once.** They feed H1 subtitle, `<title>`, meta description, OG image, nav tooltip and `llms.txt`. | Single source of truth for positioning copy. |
| P11 | **Honesty is a section.** Every capability page has a `Limitations` slot. | Constraints are documented, with workarounds, not hidden. |
| P12 | **Nothing is deleted.** Old versions, migrated pages and deprecated features keep their URLs. | Redirects and version archives are part of the deliverable. |

---

## 2. Surfaces and global chrome

### 2.1 Marketing surface

MUST exist at the root. MUST use: announcement bar (optional, one campaign max) → header with logo, mega-menus, flat links, search, repo/store link → page content → newsletter capture (optional) → global footer.

Header link model — MUST follow the "entry carries its own positioning" rule: every mega-menu entry is `{ title, oneLineDescription, href }`. Never a bare label.

Recommended mega-menus for a plugin portfolio:

- **Products** — one entry per plugin you sell/ship, plus bundles, templates, add-ons.
- **Docs** — one entry per plugin's documentation root.
- Flat links — **Pricing**, **Blog**, **About** (or **Support**).

### 2.2 Docs surface

MUST be namespaced per plugin: `/{plugin-id}/…`. MUST use: announcement bar → docs header (logo, plugin name, **version selector**, search, repo link) → three-column layout (sidebar · content · right rail with ToC) → page footer actions.

Docs header MUST NOT contain the marketing mega-menus. It MUST contain a link back to the marketing surface (the logo).

### 2.3 Shared footer

Identical on both surfaces. Four columns:

| Column | Contents |
|---|---|
| Products | every plugin, plus bundles |
| Resources | templates, assets, compatibility, customization entry point |
| Explore | documentation, store/marketplace, blog, showcase, roadmap |
| Company | about, support, privacy, terms, contact, changelog feed |

Plus: newsletter capture, copyright line, social/repo icons, RSS.

---

## 3. URL taxonomy

```
/{plugin-id}/                                    → docs root = Overview page
/{plugin-id}/getting-started/{page}/
/{plugin-id}/{capability-slug}/                  → capability page (flat, prefixed)
/{plugin-id}/{capability-slug}/{sub-capability}/ → only when the capability needs depth
/{plugin-id}/api/{symbol}/                       → generated reference
/{plugin-id}/customization/{page}/
/{plugin-id}/guides/{page}/
/{plugin-id}/integrations/{target}/
/{plugin-id}/migration/{version-jump}/
/{plugin-id}/discover-more/{page}/
/{plugin-id}/llms.txt
```

Rules:

- **R1** Capability pages MUST be flat under the plugin namespace and MUST NOT encode their category in the URL. Category lives in nav data (§4).
- **R2** A section's index page MUST be the bare section path (`/getting-started/` is Overview; there is no `/getting-started/overview/`).
- **R3** Slugs MUST be kebab-case, lowercase, stable, and MUST NOT contain version numbers or dates.
- **R4** Trailing slash is canonical. Every page MUST emit `<link rel="canonical">`.
- **R5** A capability prefix MAY be used to namespace capability pages within a crowded site (MUI uses `react-`). Pick one per plugin and never change it.
- **R6** Every URL that existed before the restructure MUST 301 to its new location. The mapping table is a required deliverable (§10).

---

## 4. Navigation data model

The sidebar MUST be generated from an explicit ordered tree, not from the filesystem.

```ts
type NavNode = {
  pathname: string;        // route, or a virtual grouping path ending in "-group"
  title?: string;          // omit when derivable from the i18n title map
  subheader?: string;      // renders as a non-clickable group label
  icon?: string;           // section icon key
  plan?: 'free' | 'pro' | 'premium' | 'enterprise';
  lifecycle?: 'new' | 'preview' | 'beta' | 'planned' | 'deprecated' | 'legacy';
  children?: NavNode[];    // max depth 3
};
```

- **N1** Ordering is editorial and MUST be reviewed like code. Alphabetical ordering is forbidden except inside generated API lists.
- **N2** `title` SHOULD be omitted and resolved from a single title map, so a rename touches one file.
- **N3** Generated API nodes MUST be injected from a generated array, never typed by hand.
- **N4** `plan` and `lifecycle` are the *only* source of badge state. No component may hardcode a badge.
- **N5** Max depth is three: Section → Group (`subheader`) → Page. Anything deeper becomes a sub-section with its own index page.

---

## 5. Canonical section model

Every plugin's docs surface MUST expose these sections, in this order. Sections marked *conditional* MAY be omitted when genuinely not applicable; all others are mandatory even if thin.

| # | Section | Path | Purpose | Required pages |
|---|---|---|---|---|
| 1 | **Getting started** | `/{id}/getting-started/` | Route and onboard | Overview (= `/{id}/`), Installation, Quickstart/Usage, Requirements & compatibility, FAQ, Support, Versions, `llms.txt` |
| 2 | **Features** | `/{id}/` (flat pages) | Showcase every capability | Features index (`/all-features/` or `/features/`) + one page per capability, grouped by `subheader` |
| 3 | **Demos / Showcase** *(conditional)* | `/{id}/demos/{scenario}/` | End-to-end realistic scenarios | ≥1 scenario page |
| 4 | **Reference** | `/{id}/api/…` | Generated settings/API/hooks/events/CLI | One page per public symbol or settings group |
| 5 | **Customization** | `/{id}/customization/` | Theming, overrides, templates, styling | How to customize, Theming/Tokens, Overriding structure, Recipes |
| 6 | **Guides** | `/{id}/guides/` | Long-form task and concept guides | Best practices, Performance, Testing, Localization, Accessibility, Security |
| 7 | **Integrations** | `/{id}/integrations/` | Third-party targets | One page per named target |
| 8 | **Resources** *(conditional)* | `/{id}/resources/` | Internals: state, events, objects, performance | As applicable |
| 9 | **Migration** | `/{id}/migration/` | Upgrade paths | One page per version jump, kept forever |
| 10 | **Discover more** | `/{id}/discover-more/` | Showcase, roadmap, related, vision, changelog | Showcase, Roadmap, Changelog |
| 11 | **Design/Assets** *(conditional)* | `/{id}/design-resources/` | Figma kits, brand assets, icon sets | As applicable |

**Feature grouping.** Within section 2, capabilities MUST be grouped under `subheader` labels. Use a fixed, portfolio-wide vocabulary so that different plugins feel like the same family. Recommended default vocabulary — pick the applicable subset per plugin, never invent synonyms:

```
Core features · Advanced features · Content & data · Display & layout ·
Interaction · Automation · Connectivity · Administration · Developer tools
```

If a plugin's capabilities genuinely don't fit, extend the vocabulary **once, centrally**, and apply it across the portfolio.

> **v1.1 amendment (portfolio decision D-06).** The group term *Integrations* is replaced by **Connectivity** everywhere. It collided with the mandatory **Integrations** section (row 7), so every plugin's sidebar showed the same label twice with two meanings. *Connectivity* covers how a plugin reaches things outside itself: network requests, authentication, workers, CDNs, asset hosting and external services. *Integrations* remains the name of section 7, which holds one page per named third-party target (a framework, bundler or platform).

---

## 6. Page archetypes

Twelve templates (A–I, plus J–L added in v1.1 by portfolio decision D-05, because §5 requires Guides, Customization, Integrations, Migration and Demos pages that A–I did not cover). Every page on every plugin site MUST be an instance of exactly one. `llms.txt`, `.md` twins, feeds and the sitemap are machine surfaces (§7.7), not pages. Each archetype below lists **[R]** required blocks and **[O]** optional blocks, in order.

### A. Docs Overview (`/{plugin-id}/`)

| | Block |
|---|---|
| R | H1 `"{Plugin} — Overview"` |
| R | One-sentence subtitle (identical to meta description and `llms.txt` line) |
| R | `## Introduction` — 2–4 short paragraphs: what it is, what it implements, explicit scope boundary |
| R | `## Why {Plugin}` — exactly 4–6 benefit bullets, each `**Benefit:** one-or-two-sentence explanation` |
| R | `## Start now` — card grid of 4–6 next steps, each `{title, one-line, href}` |
| O | `## {Plugin} vs. alternatives` — named comparisons, 3 differentiator bullets each. **Required if the plugin is commercial.** |
| O | `## Editions / packages` — one sub-heading per tier, each with its own install line and its own demo, the demo chosen to be impossible at the tier below. **Required if the plugin is tiered.** |
| R | Page footer actions (§7.3) |

Hard rule: this page **routes, it does not teach**. Target 400–700 words. If it explains how to do anything, the content belongs on a capability page.

### B. Capability page (`/{plugin-id}/{capability}/`)

The most important archetype. This is what "showcase the plugin's capabilities in a standardised way" means concretely.

| | Block | Notes |
|---|---|---|
| R | Frontmatter | `pluginId, title, capabilityId, symbols, plan, lifecycle, links{}` |
| R | H1 — short capability name | Two or three words. Not a sentence. |
| R | One-line description | Reused verbatim in nav tooltip, meta, `llms.txt` |
| R | Resource chip row | Feedback/issues · Source · Standard/spec reference · Design asset · Size/perf. Rendered from frontmatter `links{}`, never hand-written |
| O | Context paragraph + bullet list of "where you'd use this" | ≤ 80 words |
| R | `## Basics` | **First content block. MUST contain a runnable demo before any prose beyond one sentence.** |
| R | `### {variant}` per variation axis | One H3 per axis (mode, size, colour, direction…). Each: one sentence + demo |
| O | `## {Common task}` recipes | Named after the user's goal ("File upload", "Server-side data"), not the mechanism |
| O | Callouts `:::info` / `:::warning` | For edge cases and anti-patterns. Anti-patterns MUST show the wrong code, marked |
| R | `## Customization` | Always present. Demo of one customised instance + link to the central customization guide |
| O | `## Advanced / escape hatch` | The lower-level primitive for users who need to go under the abstraction |
| R | `## Limitations` | Present even if the body is "None known." Each limitation states the constraint and at least one workaround |
| R | `## API` | Links to the generated reference pages for every symbol in `symbols` |
| R | Page footer actions |

Section ordering is normative: **basics → variations → recipes → customization → escape hatch → limitations → API.** A reviewer may reject a page purely for reordering these.

Depth rule: if a capability page exceeds ~8 H2s or ~2,000 words, split it into a sub-section with an index page and sub-pages (`/{capability}/`, `/{capability}/{sub}/`).

### C. Features index (`/{plugin-id}/all-features/`)

| | Block |
|---|---|
| R | H1 + 1–2 paragraphs of scope-setting (what's in, what's deliberately out) |
| R | One `##` per `subheader` group, in the same order as the sidebar |
| R | Card grid inside each group: `{name, one-line, href, plan badge, lifecycle badge}` |
| O | Filter/search control over the grid |

This page and the sidebar MUST be rendered from the same nav data. Divergence between them is a defect.

### D. Feature matrix (`/{plugin-id}/features/`) — required for tiered plugins

| | Block |
|---|---|
| R | H1 + one line |
| R | Interactive or static matrix: rows = capabilities grouped hierarchically, columns = editions/tiers |
| R | **Every capability row links to its own capability page** |
| O | "TBD"/planned cells that link to a feedback or roadmap entry |
| R | Legend for the badge/tier iconography |

### E. Reference page (`/{plugin-id}/api/{symbol}/`) — generated

| | Block |
|---|---|
| R | H1 `"{Symbol} reference"` + standard one-line description |
| R | `## Used by` — back-links to every capability page that declares this symbol (generated by inverting the `symbols` frontmatter) |
| R | `## Import / Registration` — every valid way to load or call it |
| R | `## Options` / `## Props` / `## Settings` — table: Name · Type · Default · Required · Description |
| O | `## Inheritance / Extends` |
| O | `## Defaults / Theme keys` |
| O | `## Events` · `## Hooks & filters` · `## CSS classes & slots` · `## CLI flags` |
| R | `## Source` — deep link to the implementation |

**MUST be generated** from the plugin's own source of truth (TypeScript declarations, PHP docblocks, JSON schema, OpenAPI, CLI parser). Hand-authored reference tables are non-conformant.

### F. Getting-started page (Installation / Quickstart / Requirements)

| | Block |
|---|---|
| R | H1 + one line |
| R | Prerequisites, explicitly versioned |
| R | Installation — every supported channel, tabbed (marketplace / package manager / manual / CLI) |
| R | Minimal working example — copy-pasteable, complete, no ellipses |
| R | Verification step — "you should now see…" |
| R | Next steps — 3 links |
| O | Troubleshooting — the 3 most common install failures |

### G. Marketing product landing (`/products/{plugin-id}/` or `/{plugin-id}-landing`)

Repeating rhythm per section: **eyebrow → H2 → one-line subtitle → content.**

| | Block |
|---|---|
| R | Hero: product mark, H1 (outcome-led, not feature-led), one paragraph, one primary CTA + one secondary |
| R | Credibility strip: logos, install count, rating, or download metric |
| R | Capability showcase: 3–6 cards, each mapping to a real capability page |
| R | Value pillars: exactly 4, each a short H3 + 2 sentences |
| R | Live demo or product visual |
| O | Comparison block vs named alternatives |
| R | Social proof: metrics block + 2–4 testimonials `{quote, name, role, org, logo}` |
| R | Pricing teaser → `/pricing/` |
| R | Final CTA |

The metrics block and testimonial block MUST be shared components reused across all plugin landings — same layout, different data.

### H. Pricing (`/pricing/`)

| | Block |
|---|---|
| R | Eyebrow, H1, one-line subtitle |
| O | Billing-model toggle |
| R | Plan cards: icon · name · "best for" line · price · price-equivalent · plan-specific CTA verb · licence note · `"Everything in {previous} and…"` + 3–6 headline entitlements |
| R | Mobile fallback: plan tabs, not squeezed cards |
| R | Full comparison matrix, hierarchically grouped, **every feature row hyperlinked to its docs page** |
| R | Support entitlement rows (response time, channel, duration, escalation) |
| R | `## Key information about the paid plans` — licensing model in prose |
| R | `## Frequently asked questions` — licensing-focused, with worked numeric examples |
| R | Social proof block |

CTA verbs MUST differ by plan: *Get started* (free) · *Buy now* (self-serve) · *Contact sales* (enterprise).

### I. Editorial (blog post, showcase entry, roadmap, changelog, about)

| | Block |
|---|---|
| R | H1, date, author (where applicable) |
| R | One-line summary |
| R | Body |
| R | Canonical + OG metadata from the same title/description pair |
| O | Related links back into docs |

Changelog MUST be its own page under Discover more, MUST follow a stated versioning policy, and SHOULD have a feed.

### J. Guide (`/getting-started/{faq|support|versions}/`, `/customization/{page}/`, `/guides/{page}/`, `/integrations/{target}/`, `/migration/{version-jump}/`) — added in v1.1

Task- or topic-oriented prose that spans capabilities. Guides teach *how to combine* what capability pages document one at a time; they never replace a capability page.

| | Block |
|---|---|
| R | H1 + one-line description (same single-source rule as P10) |
| O | `## Before you start` — explicitly versioned prerequisites |
| R | One `##` per task, named after the user's goal. Every task with code contains a complete, copy-pasteable example (§7.2 fallback ladder applies) |
| O | Callouts `:::info` / `:::warning` (anti-patterns shown as marked wrong code) |
| R | `## Related` — links to every capability page and reference page the guide touches |
| R | Page footer actions |

Required variants: the extra blocks below are **[R]** in addition to the base blocks.

| Variant | Extra required blocks |
|---|---|
| Integration target (`/integrations/{target}/`) | `## Before you start` with the tested target versions · `## Setup` · `## Verify` (“you should now see…”) · `## Known issues` (“None known.” is acceptable) |
| Migration (`/migration/{from}-to-{to}/`) | `## Breaking changes` table (change · why · how to update) · `## Step by step` · `## Verify` |
| FAQ (`/getting-started/faq/`) | Questions as `###` under topic `##`s; licensing questions link to `/pricing/` when the plugin is tiered |
| Support (`/getting-started/support/`) | `## Free channels` · `## Paid channels` (omitted when single-tier) · `## Reporting a security issue` |
| Versions (`/getting-started/versions/`) | `## Supported versions` table · `## Versioning policy` · `## Older versions` (links that never break, P12) |
| Customization index (`/customization/`) | `## Ways to customize`, a decision table from goal → mechanism → page |

Depth rule as for B: past ~8 H2s or ~2,000 words, split.

### K. Section index (`/{id}/api/`, `/{id}/migration/`, `/{id}/demos/`, any section index without its own archetype) — added in v1.1

| | Block |
|---|---|
| R | H1 + one-line description |
| R | ≤ 80 words of scope-setting prose |
| R | Card grid of the section's pages `{title, one-line, href, badges}`, **rendered from nav data** (or, for `/api/`, from the generated reference) — never typed by hand |
| R | Page footer actions |

A section index routes, it does not teach (same hard rule as A).

### L. Demo scenario (`/{id}/demos/{scenario}/`) — added in v1.1

An end-to-end, realistic use of the plugin, larger than any single capability demo.

| | Block |
|---|---|
| R | H1 + one-line description |
| R | The live scenario, first, full width, with the §7.2 demo toolbar |
| R | `## What this shows` — bullet list linking every capability page the scenario uses (generated from the scenario's `symbols`/`capabilities` frontmatter) |
| R | `## Source` — deep link to the scenario's source |
| O | `## Try it with your own data` |
| R | Page footer actions |

---

## 7. Cross-cutting requirements

### 7.1 Badge vocabulary

Exactly six badges. No synonyms, no additions without a portfolio-wide decision.

| Badge | Meaning | Where rendered |
|---|---|---|
| `New` | Shipped within the last 2 minor versions | Sidebar node, feature card, matrix row |
| `Preview` | Usable, API may change | Sidebar node, page heading, matrix |
| `Beta` | Feature-complete, stabilising | as above |
| `Planned` | Page exists, implementation doesn't | Sidebar node, matrix cell |
| `Deprecated` | Works, will be removed; page links to its migration target | Sidebar node, page banner |
| `Pro` / `Premium` / tier names | Commercial tier gate | Sidebar node, heading, matrix, pricing card |

All six are declared on the nav node (§4) and rendered from there. A page MUST NOT hardcode a badge.

Tier badges MUST be explained once, on the Docs Overview, with the exact sentence pattern: *"Throughout the documentation, {Tier}-only features are denoted with the {icon} icon."*

### 7.2 Demo blocks

Every capability page demo MUST offer: copy · show/hide source · open in a live sandbox · reset. Where a plugin can't be sandboxed live, the fallback order is: recorded interaction (video/GIF) → annotated screenshot → static code block. A static code block alone is the least acceptable form and MUST NOT be the only demo on a capability page.

Demo source files MUST be colocated with the page's Markdown, not in a central demos folder.

### 7.3 Page footer actions

Every docs page MUST end with: **Edit this page** (deep link to the exact source file) and **Was this page helpful?** (per-page feedback). Both are layout, not content.

### 7.4 Right rail

Auto-generated ToC from H2/H3 with active-section highlighting. Fixed slots for any promotional/sponsor content — never inline in the article body.

### 7.5 Versioning

- Version selector on every docs page.
- A `Versions` page explaining the support policy.
- Previous major versions remain online at a stable location (`v{n}.{domain}` or `/{id}/v{n}/`).
- `docsearch:version` (or equivalent) meta on every page so search is version-scoped.

### 7.6 Metadata contract

Every page MUST emit, derived from exactly one `title` + one `description`:

```
canonical · title · description
og:title · og:description · og:image · og:type · og:url
twitter:card · twitter:title · twitter:description · twitter:image
theme-color · viewport
search:language · search:version
plugin:id · plugin:categoryId
```

`og:image` for docs pages MUST be generated from the title/description (edge function or build-time template). Hand-made social cards are only for marketing pages.

### 7.7 Machine-readable surface

- **`/{plugin-id}/llms.txt`** — MUST exist. Format: `# {Plugin}`, a two-line description, then `## {Section}` groups of `- [{Title}]({url}.md): {one-line description}`.
- **Markdown twin** — appending `.md` to any docs URL MUST return the authored Markdown with the generated reference for that page's symbols concatenated.
- **Sitemap + RSS** — `sitemap.xml` covering both surfaces; RSS for blog and changelog.
- The `llms.txt` description, the meta description and the H1 subtitle MUST be the same string, from the same field.

### 7.8 Accessibility & performance floor

- Skip-to-content link, visible focus, logical heading order (exactly one H1), landmark regions.
- Code blocks keyboard-reachable; demos labelled.
- Docs pages SHOULD render without JS for content and navigation; interactivity is enhancement.

---

## 8. Content model (the data structures)

The point of this section: **content is data**, so the same generator can build every plugin's site.

### 8.1 Files per plugin

```
content/{plugin-id}/
├── plugin.config.json              ← identity, tiers, links, nav taxonomy  (§8.2)
├── nav.json                        ← ordered NavNode tree                  (§4)
├── titles.json                     ← pathname → title map                  (N2)
├── features/
│   └── {capability-slug}/
│       ├── index.md                ← frontmatter + body                    (§8.3)
│       ├── demo-basics.{ext}
│       └── demo-{variant}.{ext}
├── getting-started/{page}.md
├── guides/{page}.md
├── customization/{page}.md
├── integrations/{target}.md
├── migration/{version-jump}.md
├── discover-more/{page}.md
├── reference/                      ← GENERATED, never edited by hand
│   ├── {symbol}.schema.json        ← structure                            (§8.4)
│   └── {symbol}.strings.json       ← prose                                (§8.5)
├── pricing.json                    ← plans + matrix                       (§8.6)
└── llms.txt                        ← GENERATED
```

### 8.2 `plugin.config.json`

Identity and everything the templates need to render chrome. Schema: `plugin-site.schema.json`. Abridged shape:

```jsonc
{
  "id": "acme-forms",
  "name": "Acme Forms",
  "tagline": "…",                  // one line, reused everywhere
  "description": "…",              // meta description
  "categoryId": "content",
  "urlPrefix": "",                 // e.g. "react-" if capability pages are prefixed
  "repo": "https://github.com/…",
  "currentVersion": "3.2.0",
  "versions": [ { "label": "v3", "href": "/acme-forms/" }, … ],
  "tiers": [ { "id": "free", "name": "Free", "badge": null }, … ],
  "links": { "issues": "…", "support": "…", "store": "…", "figma": "…" },
  "taxonomy": ["Core features", "Advanced features", "Connectivity"],
  "sections": [ … ]                // which of the 11 canonical sections are enabled
}
```

### 8.3 Capability page frontmatter

```yaml
---
pluginId: acme-forms
capabilityId: conditional-logic
title: Conditional logic
description: Show, hide and require fields based on what the user has already answered.
symbols: [ConditionalRule, useConditionalLogic]
plan: pro
lifecycle: new
group: Advanced features
links:
  issues: https://github.com/acme/forms/labels/scope%3A%20logic
  source: packages/forms/src/conditional
  spec: https://www.w3.org/WAI/ARIA/apg/
  design: https://figma.com/…
---
```

`symbols` is load-bearing: it drives the page's `## API` links **and** the reverse "Used by" list on each reference page. Never maintain either by hand.

### 8.4 Reference structure file (generated)

```json
{
  "name": "ConditionalRule",
  "kind": "type",
  "imports": ["import { ConditionalRule } from '@acme/forms';"],
  "options": {
    "when": { "type": { "name": "string" }, "required": true },
    "operator": { "type": { "name": "union", "description": "'eq' | 'neq' | 'gt' | 'lt'" }, "default": "'eq'" },
    "target": { "type": { "name": "string[]" } }
  },
  "events": { "onRuleMatch": { "type": { "name": "func" } } },
  "classes": [ { "key": "root", "className": "AcmeRule-root" } ],
  "inheritance": { "symbol": "BaseRule", "pathname": "/acme-forms/api/base-rule/" },
  "usedBy": ["/acme-forms/conditional-logic/", "/acme-forms/validation/"],
  "filename": "/packages/forms/src/conditional/ConditionalRule.ts",
  "sourceUrl": "https://github.com/…"
}
```

### 8.5 Reference strings file (generated skeleton, human-edited prose)

```json
{
  "symbolDescription": "A single rule that links a source field to one or more targets.",
  "optionDescriptions": {
    "when": "The <code>name</code> of the field whose value is evaluated.",
    "operator": "How the value is compared. Defaults to strict equality."
  },
  "classDescriptions": {
    "root": { "description": "Styles applied to the rule wrapper." }
  }
}
```

**The split is mandatory (P6).** Regeneration overwrites `.schema.json` and only *adds keys* to `.strings.json`; it never overwrites existing prose. Missing prose keys are a build warning, not a build failure.

### 8.6 `pricing.json`

```jsonc
{
  "billingModels": ["annual", "perpetual"],
  "plans": [
    { "id": "free", "name": "Free", "bestFor": "…", "price": {"annual": 0},
      "cta": {"label": "Get started", "href": "/acme-forms/getting-started/"},
      "highlights": ["…"], "inheritsFrom": null }
  ],
  "matrix": [
    { "group": "Core features",
      "rows": [
        { "label": "Field types", "href": "/acme-forms/field-types/",
          "cells": { "free": true, "pro": true, "premium": true } },
        { "label": "Conditional logic", "href": "/acme-forms/conditional-logic/",
          "cells": { "free": false, "pro": true, "premium": true } },
        { "label": "Team templates", "href": "/acme-forms/templates/",
          "cells": { "free": false, "pro": false, "premium": "TBD" } }
      ] }
  ],
  "support": [ { "label": "Guaranteed response time", "cells": { "premium": "1 business day" } } ],
  "faq": [ { "q": "…", "a": "…" } ]
}
```

**Invariant:** every `matrix.rows[].href` MUST resolve to an existing capability page, and every capability whose nav node has a `plan` MUST appear in the matrix. Both directions are build-checked (§11).

---

## 9. Required user flows

The structure MUST make each of these completable without a dead end. The agent should verify each as a clickable path.

| Flow | Required path | Entry | Exit |
|---|---|---|---|
| **F1 Evaluate** | landing → capability showcase → docs overview → features index → feature matrix → pricing | marketing home / search | pricing or install |
| **F2 Adopt** | overview → installation → quickstart → first capability | docs overview | working installation |
| **F3 Implement** | search → capability page → demo → reference → back | any | copied working code |
| **F4 Customise** | capability `## Customization` → customization guide → tokens/theming | capability page | customised instance |
| **F5 Upgrade** | version selector → Versions → Migration → changelog | any docs page | migrated project |
| **F6 Convert** | tier badge on a capability → tier explanation → pricing → purchase → licence activation | capability page | activated licence |
| **F7 Support** | Support page → free channel (issues/community) or paid channel | any docs page | ticket or answer |
| **F8 Agent** | `llms.txt` → `.md` twins → optional MCP endpoint | machine | complete corpus |

**F6 is structural, not editorial:** the badge next to the feature is the paywall's entry point. There MUST NOT be a "Pro features" nav section that lists paid capabilities separately from free ones — tiering is a property of each capability, shown in place.

---

## 10. Migrating an existing site onto the standard

For each legacy page, produce one row of a mapping table:

| Legacy URL | Content type found | Target archetype | Target URL | Action | Redirect |
|---|---|---|---|---|---|

`Action` ∈ `{port, split, merge, generate, rewrite, retire}`.

Decision rules:

- A legacy "Features" mega-page → **split**, one capability page per H2.
- A legacy "Documentation" wall of text → **split** into Getting started + Guides.
- A legacy hand-maintained options/settings table → **generate** (E), and retire the hand-written version.
- A legacy FAQ mixing licensing and usage → **split**: licensing to `/pricing/`, usage to `/getting-started/faq/`.
- A legacy changelog on the homepage → **move** to `/discover-more/changelog/`.
- A legacy screenshot gallery → **merge** into the relevant capability pages as demos; keep the gallery only if it becomes a Demos/Showcase section (archetype C/I).
- Anything with traffic but no home → `retire` is forbidden; find it an archetype or redirect it to the nearest parent.

Every legacy URL MUST appear exactly once in the table, and every row MUST have a redirect target.

---

## 11. Conformance checks (automatable)

A site is conformant when all of these pass. These are the gate; implement them as a CI script.

**Structure**
1. Every docs page resolves to exactly one archetype and contains all its required blocks.
2. Exactly one H1 per page; heading levels never skip.
3. Every capability page contains `## Basics`, `## Customization`, `## Limitations`, `## API`, in that relative order.
4. No capability page exceeds 8 H2s or ~2,000 words without being split.
5. Section order in the sidebar matches §5.

**Navigation & data**
6. Sidebar, features index and feature matrix are all rendered from the same nav data; no divergence.
7. Nav depth ≤ 3.
8. Every nav node's `pathname` resolves to a real page or is an explicit virtual group.
9. Every badge on a rendered page traces back to a nav-node `plan`/`lifecycle` value.

**Reference**
10. No file under `reference/*.schema.json` has been hand-edited since the last generation (checksum).
11. Every `symbols` entry in every capability frontmatter has a reference page.
12. Every reference page's `usedBy` is non-empty or explicitly marked internal.

**Pricing**
13. Every pricing-matrix row `href` resolves.
14. Every capability with a non-free `plan` appears in the matrix.
15. Every plan card has a distinct CTA verb.

**Machine surface**
16. `llms.txt` exists, lists every published docs page, and every entry resolves.
17. Every docs URL + `.md` returns Markdown.
18. `sitemap.xml` covers both surfaces.

**Metadata**
19. Every page emits the full §7.6 meta set.
20. `llms.txt` description == meta description == H1 subtitle, per page.
21. Every page has a canonical URL with trailing slash.

**Migration**
22. Every legacy URL 301s.
23. No internal link 404s.
24. Old version docs still resolve.

**Portfolio consistency (multi-plugin)**
25. All plugins use the same section names, the same badge vocabulary, the same footer columns and the same taxonomy terms.
26. Shared components (metrics block, testimonial block, plan cards, demo toolbar, ToC) are imported from one place, not forked per plugin.

---

## 12. Portfolio strategy for N plugins

The whole point of the standard is that plugin sites differ only in data.

**Shared, never forked:** design system and tokens; layout shells for both surfaces; all twelve archetype templates; badge components; demo toolbar; ToC; search integration; footer; metrics/testimonial blocks; pricing matrix renderer; reference generator; `llms.txt` generator; conformance script.

**Per plugin, always:** `plugin.config.json`, `nav.json`, `titles.json`, the Markdown content and demos, `pricing.json`, brand accent colour and product mark, generated `reference/`.

**Allowed variation:** accent colour, product mark, hero illustration, which of the 11 sections are enabled, the subset of taxonomy terms used, tier names.

**Forbidden variation:** section names and order; badge vocabulary; URL taxonomy; capability-page section order; metadata contract; footer column names; the `llms.txt` format.

Rollout order across a portfolio: pick the plugin with the **most capabilities** first (it stress-tests the archetypes), then the **most commercially important**, then the rest. Freeze the standard after plugin #2; changes after that require updating every plugin.
