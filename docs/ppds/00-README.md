# MUI-Derived Documentation & Presentation Architecture — Package Index

**Purpose:** standardise the presentational/documentation websites of several unrelated plugins onto one information architecture, modelled on `mui.com`.

**Audience:** an AI coding agent that will plan and execute the restructure, plus the humans reviewing it.

**Research date:** 15 September 2026. Site state: Material UI v9.4.0, MUI X v9.13.0.

---

## Files

| File | What it is | Read it when |
|---|---|---|
| `01-mui-architecture-research.md` | Factual research report on mui.com: sitemap, navigation data structures, page anatomies, content pipeline, conventions. Descriptive, not prescriptive. | You need the evidence base, or to check "what does MUI actually do here?" |
| `02-plugin-docs-standard.md` | **The normative standard.** Abstracted from Part 1 into a product-agnostic spec: URL taxonomy, section model, 12 page archetypes with required/optional blocks, content model, badge system, flows. This is the contract every plugin site must satisfy. | Designing or reviewing any page. This is the source of truth. |
| `03-agent-implementation-brief.md` | Execution brief for the AI agent: phases, per-phase inputs/outputs, audit and mapping procedure, acceptance criteria, anti-patterns, definition of done. | Starting an actual migration of one plugin site. |
| `plugin-site.schema.json` | JSON Schema for the per-plugin content model (`plugin.config.json`, nav tree, feature entries, plan matrix, API descriptors). Machine-validatable. | Generating or validating the data files. |
| `example-plugin.config.json` | A filled-in example conforming to the schema, for a fictional plugin. | Seeing the schema in use before writing your own. |

## How to use this package

1. Read `02` once, end to end. It defines the target.
2. For each plugin: run the audit in `03` Phase 1, produce `plugin.config.json` validated against `plugin-site.schema.json`.
3. Feed `02` + `03` + the plugin's own `plugin.config.json` to the agent as its working context.
4. Gate merges on the acceptance criteria in `03` §7.

## One-paragraph summary of the standard

Every plugin site is split into two surfaces — a **marketing surface** (home, product landing, pricing, blog, company) and a **docs surface** (`/{plugin-id}/...`) — that share a footer and a design system but not their chrome. The docs surface always exposes the same eleven sections in the same order, from Getting started through Migration to Discover more. Capabilities are documented one page per capability, each page progressing from the simplest working example to advanced and customisation, each section anchored and each anchor linkable. Machine-readable API reference is generated, never hand-written. Every page has a Markdown twin and is indexed in `llms.txt`. Commercial tiering is expressed by a single badge vocabulary that appears identically in the sidebar, in headings, and in the pricing comparison matrix.
