# Part 3 — Agent Implementation Brief

Execution instructions for an AI agent restructuring one existing plugin presentation website onto the standard in `02-plugin-docs-standard.md` (PPDS v1.1).

Run this brief once per plugin. Do not run two plugins in parallel until the standard has been frozen (see PPDS §12).

---

## 0. Operating rules

1. **`02-plugin-docs-standard.md` is the contract.** Where this brief and the standard disagree, the standard wins. Where the standard and the existing site disagree, the standard wins unless a documented exception is recorded in `EXCEPTIONS.md` with a reason.
2. **Never delete content or URLs.** Retire by redirect, never by removal.
3. **Never hand-write reference documentation.** If a settings/API table exists in the legacy site, treat it as *input to the generator*, then delete the source and regenerate.
4. **Do not invent capabilities, metrics, testimonials, prices, or compatibility claims.** If a required block has no source data, emit a `TODO:` placeholder and add it to `GAPS.md`. A fabricated testimonial or a guessed compatibility matrix is a critical failure.
5. **Work in phases; stop at each gate.** Do not start Phase 3 before the Phase 2 artefacts are approved. Phases 1–2 are cheap to redo, Phase 4 is not.
6. **Every phase produces files, not just changes.** The artefacts listed are the deliverable.
7. Commit per phase, with the phase name in the message.

---

## 1. Phase 1 — Audit

**Goal:** a complete, factual inventory of the existing site. No restructuring yet.

**Inputs:** the live site, its repository, its analytics if available, the plugin's source code, its marketplace/store listing, its changelog.

**Do:**

1. Crawl every reachable URL. Record: URL, page title, H1, word count, primary content type, inbound internal links, last modified.
2. Classify each page's content type: `marketing` · `capability` · `how-to` · `reference` · `install` · `faq` · `changelog` · `legal` · `blog` · `orphan`.
3. Extract the **real capability list** from three independent sources and reconcile:
   - the plugin's source code (public settings, hooks, commands, exported symbols);
   - the current site's feature claims;
   - the marketplace/store listing.
   Discrepancies go in `GAPS.md` — they usually mean either an undocumented feature or a marketing claim with no implementation.
4. Record every existing demo/screenshot/video asset and what it demonstrates.
5. Identify the plugin's machine-readable source of truth for reference docs (TS declarations, PHP docblocks, JSON schema, OpenAPI spec, CLI parser). If none exists, record this in `GAPS.md` as a blocker for Phase 4 — **do not substitute hand-written tables.**
6. Pull the top 50 pages by traffic and the top 30 internal search queries, if available.

**Artefacts:**
- `audit/pages.csv` — the crawl inventory
- `audit/capabilities.md` — reconciled capability list with source-of-evidence per item
- `audit/assets.csv` — existing demos/screenshots/videos
- `GAPS.md` — everything missing, contradictory or unverifiable

**Gate:** capability list reconciled and reviewed by a human.

---

## 2. Phase 2 — Model

**Goal:** the data files that define the new site. Still no page authoring.

**Do:**

1. Write `plugin.config.json`, validated against `plugin-site.schema.json`. The `tagline` and `description` written here are reused site-wide (P10) — get them right now.
2. Assign each reconciled capability to:
   - a stable `capabilityId` and kebab-case slug (P2/R3 — slugs never change again);
   - a `group` from the portfolio taxonomy (PPDS §5). Do not invent a group without a portfolio-level decision;
   - a `plan` and a `lifecycle`.
3. Write `nav.json`: the full ordered tree for all enabled sections. Ordering is editorial — capabilities in the order a new user meets them, not alphabetical.
4. Write `titles.json`.
5. Write `pricing.json` if the plugin is tiered. Every matrix row must point at a capability slug that exists in `nav.json`.
6. Produce `migration/url-map.csv` — the full mapping table from PPDS §10, one row per legacy URL, every row with an action and a redirect target.

**Artefacts:** `plugin.config.json`, `nav.json`, `titles.json`, `pricing.json`, `migration/url-map.csv`

**Gate:** schema validation passes; no legacy URL is unmapped; no matrix row points at a non-existent slug.

---

## 3. Phase 3 — Scaffold

**Goal:** every page exists as a valid stub in the right place, with correct frontmatter and required headings.

**Do:**

1. Generate the file tree from `nav.json` per PPDS §8.1.
2. For each page, emit its archetype's **required blocks as empty headings** with frontmatter filled from `nav.json` + `plugin.config.json`.
3. Wire routing, sidebar rendering, ToC, page footer actions, badge rendering from nav data, and the metadata contract (PPDS §7.6).
4. Install the redirect table from `migration/url-map.csv`.
5. Stand up the conformance script (PPDS §11) and run it — expect content checks to fail, structural checks to pass.

**Gate:** every URL in `nav.json` returns 200; every legacy URL 301s; structural checks 1–2, 5–9, 18–23 pass.

---

## 4. Phase 4 — Generate reference

**Goal:** the entire reference section, generated.

**Do:**

1. Build the extractor from the plugin's source of truth into `reference/{symbol}.schema.json` (PPDS §8.4).
2. Emit `reference/{symbol}.strings.json` skeletons; port any usable existing prose from the legacy site into the strings files — **and only into the strings files**.
3. Generate `usedBy` by inverting every capability page's `symbols` frontmatter.
4. Wire the generator into the build with the overwrite rule: schema files always overwritten; strings files only ever gain keys.
5. Add the checksum check (conformance check 10) so hand-edits to schema files fail CI.

**Gate:** checks 10–12 pass; every symbol has a page; no symbol page is hand-written.

---

## 5. Phase 5 — Author

**Goal:** fill the scaffold. This is the bulk of the work and the part where quality is won or lost.

Order of work — do capability pages first, they're the product:

1. **Capability pages (archetype B), highest-traffic first.** For each:
   - Port the legacy content into the correct slots. Content that doesn't fit a slot is a signal the page is mis-scoped, not a reason to add a slot.
   - `## Basics` must open with a runnable demo. If no demo asset exists, create one; if the plugin can't be sandboxed, use the fallback ladder in PPDS §7.2 and record the shortfall in `GAPS.md`.
   - One H3 per variation axis. If you can't name the axis in two words, it's probably a recipe, not a variation.
   - `## Limitations` is mandatory. Mine it from the issue tracker, support inbox and FAQ. "None known." is acceptable; omission is not.
   - `## API` links generated from `symbols`.
2. **Getting started (archetype F).** The minimal example must be complete and copy-pasteable — no ellipses, no "configure as needed".
3. **Docs Overview (archetype A).** Write it *after* the capability pages, so the "Start now" cards point at what actually exists. Keep it 400–700 words and make sure it teaches nothing.
4. **Features index (C) and feature matrix (D).** Both rendered from nav data — you are writing the scope-setting prose only.
5. **Guides, customization, integrations, migration, discover-more.**
6. **Marketing landing (G) and pricing (H).** Every capability card must link to a real capability page. Metrics and testimonials must come from real sources or be omitted.

**Writing rules:**
- The one-line description is written once and used in frontmatter, meta, nav tooltip and `llms.txt`. Never write it twice differently.
- Name recipes after the user's goal, not the mechanism.
- Anti-patterns are shown as marked wrong code inside a `:::warning`, not described in prose.
- No marketing voice in docs; no feature lists in marketing without a link to the capability page.

**Gate:** checks 1–4 pass for every page; `GAPS.md` reviewed.

---

## 6. Phase 6 — Machine surface, QA, ship

**Do:**

1. Generate `llms.txt` and the `.md` twins; verify every entry resolves (checks 16–17).
2. Generate `sitemap.xml` across both surfaces; wire RSS for blog/changelog.
3. Run the full conformance script; fix until green.
4. Click through each of the eight required flows (PPDS §9) manually and record the click path.
5. Verify the metadata contract on a sample of 10 pages including one of each archetype, and confirm the generated OG images render.
6. Accessibility pass: one H1, heading order, skip link, focus visibility, demo labelling.
7. Verify every redirect with a live check, not just the config.

**Artefacts:** `qa/conformance-report.md`, `qa/flow-walkthroughs.md`, `qa/redirect-check.csv`

---

## 7. Acceptance criteria

The restructure is done when **all** of the following hold:

1. All 26 conformance checks in PPDS §11 pass in CI.
2. All eight flows in PPDS §9 are completable, with the click path recorded.
3. Zero hand-written reference tables remain anywhere in the repository.
4. Every legacy URL resolves, via 301 if moved.
5. Every capability identified in `audit/capabilities.md` has exactly one capability page, or an explicit entry in `GAPS.md` explaining why not.
6. `llms.txt` lists every published page and every entry returns Markdown.
7. `GAPS.md` contains no unreviewed item.
8. `EXCEPTIONS.md` contains no undocumented deviation from the standard.
9. Shared components are imported from the shared package — `grep` finds no forked copy of the metrics block, testimonial block, plan card, demo toolbar or ToC inside the plugin's own tree.

---

## 8. Anti-patterns — reject on sight

| Anti-pattern | Why it fails |
|---|---|
| One "Features" page with 20 H2s | Violates P3. Split it. |
| Capability page that opens with architecture or philosophy | Violates P4. Demo first. |
| Hand-maintained settings table | Violates P5. Generate it. |
| A "Pro features" section in the sidebar | Violates P8. Tier is a per-capability property. |
| Badge hardcoded in page content | Violates P7. Declare it on the nav node. |
| Category encoded in the URL (`/features/advanced/foo/`) | Violates R1. Category lives in nav data. |
| Description written twice, differently, in meta and in the H1 subtitle | Violates P10. |
| `## Limitations` omitted because "there aren't any" | Violates P11. Write "None known." |
| Demo replaced by a screenshot on every page | PPDS §7.2 — screenshots are the fallback, not the norm. |
| Legacy page deleted because it was thin | Violates P12. Redirect it. |
| A new taxonomy group invented for one plugin | Violates PPDS §12 portfolio consistency. |
| Invented metrics, testimonials or compatibility claims | Operating rule 4. Critical failure. |
| Plugin-specific fork of a shared component | Violates §12. The next plugin inherits the fork. |

---

## 9. Working context to hand the agent

Provide, in this order:

1. `02-plugin-docs-standard.md` (full)
2. This brief
3. `plugin-site.schema.json`
4. The plugin's `plugin.config.json` once Phase 2 is approved
5. Read access to the plugin's source repository (required for Phase 4)
6. The legacy site crawl from Phase 1

Do **not** hand the agent `01-mui-architecture-research.md` as instructions — it is background evidence and will tempt the agent to copy MUI-specific details (React, Material Design, Figma kits, `react-` prefixes) that don't apply. Use it for human review and for settling arguments about *why* a rule exists.

---

## 10. Effort shape (orientation, not a commitment)

For a plugin with ~20 capabilities and a ~40-page legacy site, assuming the shared component library already exists:

| Phase | Relative effort | Notes |
|---|---|---|
| 1 Audit | 10% | Mostly mechanical; reconciliation is the slow part |
| 2 Model | 10% | Highest leverage per hour. Rushing here costs everywhere else |
| 3 Scaffold | 10% | Fully automatable |
| 4 Generate reference | 15% | Front-loaded: the extractor is written once per language/runtime, then reused portfolio-wide |
| 5 Author | 45% | Dominated by demo creation, not prose |
| 6 QA & ship | 10% | Automatable after the first plugin |

For plugin #2 onward, phases 3, 4 and 6 drop sharply — the shared infrastructure is already there. That reduction *is* the return on standardising.
