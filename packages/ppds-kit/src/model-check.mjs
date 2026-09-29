#!/usr/bin/env node
/**
 * Validates the site data model.
 *
 * 1. JSON Schema: plugin.config.json (root schema), nav.json ($defs/navTree), titles.json
 *    ($defs/titleMap) and pricing.json ($defs/pricing, when present) against
 *    packages/ppds-kit/schema/plugin-site.schema.json (draft 2020-12).
 * 2. Model rules the schema cannot express: section order, nav depth, taxonomy and tier
 *    membership, title coverage, slug rules, and redirects.json: every old URL leads to a page.
 *
 * Usage (from the repository root): node packages/ppds-kit/src/model-check.mjs <plugin-id>
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

// Repository root: content/ and the package entry are relative to it.
const root = process.cwd();
const pluginId = process.argv[2];
if (!pluginId) {
  console.error('Usage: node packages/ppds-kit/src/model-check.mjs <plugin-id>');
  process.exit(2);
}
const contentDir = resolve(root, 'content', pluginId);
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

const errors = [];
const fail = (rule, message) => errors.push(`${rule}: ${message}`);
let passed = 0;
const check = (rule, ok, message) => (ok ? passed++ : fail(rule, message));

// ── 1. JSON Schema ──────────────────────────────────────────────────────────
const schema = JSON.parse(
  readFileSync(new URL('../schema/plugin-site.schema.json', import.meta.url), 'utf8'),
);
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema, 'ppds');

function validate(label, ref, data) {
  const fn = ajv.getSchema(ref);
  const ok = fn(data);
  check(
    'schema',
    ok,
    `${label} is invalid:\n${(fn.errors ?? []).map((e) => `    ${e.instancePath || '/'} ${e.message} ${JSON.stringify(e.params)}`).join('\n')}`,
  );
  console.log(`${ok ? '✔' : '✖'} ${label} validates against ${ref}`);
}

const config = readJson(`content/${pluginId}/plugin.config.json`);
const nav = readJson(`content/${pluginId}/nav.json`);
const titles = readJson(`content/${pluginId}/titles.json`);
validate('plugin.config.json', 'ppds', config);
validate('nav.json', 'ppds#/$defs/navTree', nav);
validate('titles.json', 'ppds#/$defs/titleMap', titles);
const tiered = config.tiers.some((tier) => tier.id !== 'free');
const pricingPath = resolve(contentDir, 'pricing.json');
if (existsSync(pricingPath))
  validate('pricing.json', 'ppds#/$defs/pricing', JSON.parse(readFileSync(pricingPath, 'utf8')));
check('pricing', !tiered || existsSync(pricingPath), 'tiered plugin without pricing.json');
console.log(tiered ? '' : '· pricing.json not required: single free tier');

// ── 2. Model rules ──────────────────────────────────────────────────────────
const P = `/${config.id}/`;
const SECTIONS = [
  'getting-started',
  'features',
  'demos',
  'reference',
  'customization',
  'guides',
  'integrations',
  'resources',
  'migration',
  'discover-more',
  'design-resources',
];
const CONDITIONAL = new Set(['demos', 'resources', 'design-resources']);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Sections: all 11, canonical order, mandatory ones enabled.
check(
  'sections',
  JSON.stringify(config.sections.map((s) => s.id)) === JSON.stringify(SECTIONS),
  'sections must list all 11 canonical ids in canonical order',
);
for (const section of config.sections) {
  check(
    'sections',
    section.enabled !== false || CONDITIONAL.has(section.id),
    `mandatory section "${section.id}" is disabled`,
  );
  check(
    'sections',
    section.title === undefined,
    `section "${section.id}" overrides its canonical title`,
  );
}
check(
  'urlPrefix',
  config.urlPrefix === '' || KEBAB.test(config.urlPrefix.replace(/-$/, '')),
  'invalid urlPrefix',
);

// Nav walk.
const nodes = [];
(function walk(list, depth, parent) {
  for (const node of list) {
    nodes.push({ ...node, depth, parent });
    if (node.children) walk(node.children, depth + 1, node);
  }
})(nav, 1, null);

const sectionOfGroup = {
  [`${P}getting-started-group`]: 'getting-started',
  [`${P}features-group`]: 'features',
  [`${P}demos-group`]: 'demos',
  [`${P}api-group`]: 'reference',
  [`${P}customization-group`]: 'customization',
  [`${P}guides-group`]: 'guides',
  [`${P}integrations-group`]: 'integrations',
  [`${P}resources-group`]: 'resources',
  [`${P}migration-group`]: 'migration',
  [`${P}discover-more-group`]: 'discover-more',
  [`${P}design-resources-group`]: 'design-resources',
};
const enabled = config.sections.filter((s) => s.enabled !== false).map((s) => s.id);
check(
  'sidebar order',
  JSON.stringify(nav.map((n) => sectionOfGroup[n.pathname])) === JSON.stringify(enabled),
  `top-level nav must be the enabled sections in canonical order, got ${JSON.stringify(nav.map((n) => n.pathname))}`,
);

const seen = new Set();
const capabilityIds = new Set();
const subheaders = [];
for (const node of nodes) {
  const virtual = node.pathname.endsWith('-group');
  check('depth', node.depth <= 3, `${node.pathname} is at depth ${node.depth}`);
  check('unique', !seen.has(node.pathname), `duplicate pathname ${node.pathname}`);
  seen.add(node.pathname);
  check('namespace', node.pathname.startsWith(P), `${node.pathname} is outside ${P}`);
  if (virtual) {
    check(
      'virtual groups',
      Array.isArray(node.children) && node.children.length > 0,
      `virtual group ${node.pathname} has no children`,
    );
  } else {
    const isFile = /\.[a-z]+$/.test(node.pathname);
    check(
      'trailing slash',
      isFile || node.pathname.endsWith('/'),
      `${node.pathname} lacks a trailing slash`,
    );
    const segments = node.pathname.slice(P.length).split('/').filter(Boolean);
    for (const segment of segments)
      check(
        'slugs',
        isFile && segment === segments.at(-1) ? /^[a-z0-9.-]+$/.test(segment) : KEBAB.test(segment),
        `${node.pathname}: segment "${segment}" is not kebab-case`,
      );
    check(
      'slugs',
      !/(^|[-/])v?\d+(\.\d+)+|\d{4}-\d{2}/.test(node.pathname.slice(P.length)),
      `${node.pathname} contains a version or date`,
    );
    check(
      'titles',
      typeof titles[node.pathname] === 'string' || node.title,
      `${node.pathname} has no title in titles.json`,
    );
  }
  if (node.subheader) {
    subheaders.push(node.subheader);
    check(
      'taxonomy',
      config.taxonomy.includes(node.subheader),
      `subheader "${node.subheader}" is not in plugin.config.json taxonomy`,
    );
    check(
      'structure',
      node.depth === 2,
      `subheader group ${node.pathname} must sit directly under a section`,
    );
  } else if (virtual) {
    check(
      'titles',
      typeof titles[node.pathname] === 'string',
      `section group ${node.pathname} has no title in titles.json`,
    );
  }
  if (node.plan !== undefined)
    check(
      'plans',
      config.tiers.some((tier) => tier.id === node.plan),
      `${node.pathname}: plan "${node.plan}" is not a declared tier`,
    );
  if (node.capabilityId !== undefined) {
    check(
      'capabilityId',
      KEBAB.test(node.capabilityId),
      `${node.pathname}: capabilityId "${node.capabilityId}" is not kebab-case`,
    );
    check(
      'capabilityId',
      !capabilityIds.has(node.capabilityId),
      `duplicate capabilityId ${node.capabilityId}`,
    );
    capabilityIds.add(node.capabilityId);
    check(
      'flat capability URLs',
      node.pathname === `${P}${config.urlPrefix}${node.capabilityId}/`,
      `${node.pathname} must be ${P}${config.urlPrefix}${node.capabilityId}/`,
    );
    check(
      'capability placement',
      node.parent?.subheader !== undefined &&
        sectionOfGroup[nodes.find((n) => n.children?.includes(node.parent))?.pathname] ===
          'features',
      `${node.pathname} must sit under a Features subheader group`,
    );
    const title = titles[node.pathname] ?? '';
    check(
      'title',
      title.length > 0 && title.length <= 40 && !/[.!?]$/.test(title),
      `${node.pathname}: capability title "${title}" must be 1–40 chars and not a sentence`,
    );
  }
}
check(
  'taxonomy order',
  JSON.stringify(subheaders) === JSON.stringify(config.taxonomy),
  `Features subheaders ${JSON.stringify(subheaders)} must equal taxonomy ${JSON.stringify(config.taxonomy)} (same terms, sidebar order)`,
);
check(
  'vocabulary',
  !config.taxonomy.some((term) => nav.some((section) => titles[section.pathname] === term)),
  'a taxonomy term duplicates a section name in the sidebar',
);

const pagePaths = new Set(
  nodes.filter((n) => !n.pathname.endsWith('-group')).map((n) => n.pathname),
);

/**
 * The archetype a docs page must use, derived from its path.
 * Returns null for machine surfaces and for paths outside the docs namespace.
 */
function archetypeOf(pathname) {
  if (!pathname.startsWith(P)) return null;
  const rest = pathname.slice(P.length);
  if (rest === '') return 'A';
  if (/\.[a-z]+$/.test(rest)) return null;
  if (rest === 'all-features/') return 'C';
  if (rest === 'features/') return 'D';
  if (/^getting-started\/(installation|usage|ai-context|requirements)\/$/.test(rest)) return 'F';
  if (/^getting-started\/(faq|support|versions)\/$/.test(rest)) return 'J';
  if (/^(api|migration|demos)\/$/.test(rest)) return 'K';
  if (/^api\/[a-z0-9-]+\/$/.test(rest)) return 'E';
  if (/^demos\/[a-z0-9-]+\/$/.test(rest)) return 'L';
  if (/^(customization|guides|integrations|migration)\/([a-z0-9-]+\/)?$/.test(rest)) return 'J';
  if (/^discover-more\/[a-z0-9-]+\/$/.test(rest)) return 'I';
  if (nodes.some((n) => n.pathname === pathname && n.capabilityId)) return 'B';
  return undefined;
}
const archetypeCounts = {};
for (const page of pagePaths) {
  const archetype = archetypeOf(page);
  check('archetype', archetype !== undefined, `${page} matches no archetype`);
  if (archetype) archetypeCounts[archetype] = (archetypeCounts[archetype] ?? 0) + 1;
}
for (const key of Object.keys(titles))
  check('titles', seen.has(key), `titles.json has an entry for unknown pathname ${key}`);
check(
  'required pages',
  pagePaths.has(P) && pagePaths.has(`${P}all-features/`),
  'Overview and All features are required',
);
for (const link of Object.values(config.links ?? {})) {
  if (link.startsWith('/'))
    check(
      'links',
      pagePaths.has(link),
      `plugin.config.json link ${link} does not resolve to a nav page`,
    );
}
for (const version of config.versions ?? []) {
  if (version.href.startsWith('/'))
    check('versions', pagePaths.has(version.href), `version href ${version.href} does not resolve`);
}

// ── 3. Redirects ────────────────────────────────────────────────────────────
// Generated reference pages: /{id}/api/{kebab(export)}/ for every public export.
const kebab = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
const exportsSource = config.referenceSource?.entry ? read(config.referenceSource.entry) : '';
const exported = new Set(
  [...exportsSource.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)].flatMap((m) =>
    m[1]
      .split(',')
      .map((s) => s.replace(/\btype\b/, '').trim())
      .filter(Boolean),
  ),
);
const apiPages = new Set([...exported].map((name) => `${P}api/${kebab(name)}/`));

// Old URL → new URL. Besides docs pages, a target may be one of the site's internal pages.
const redirectsPath = resolve(contentDir, 'redirects.json');
const redirects = existsSync(redirectsPath) ? JSON.parse(readFileSync(redirectsPath, 'utf8')) : {};
const INTERNAL = new Set(['/404.html']);
for (const [from, to] of Object.entries(redirects)) {
  check('redirects', from.startsWith('/'), `${from}: an old URL must start with /`);
  check(
    'redirects',
    !pagePaths.has(from) && !apiPages.has(from),
    `${from} is a live page, so it cannot redirect`,
  );
  const target = to.split('?')[0];
  check(
    'redirects',
    pagePaths.has(target) || apiPages.has(target) || INTERNAL.has(target),
    `${from}: target ${to} is not a nav page, a generated API page or an internal page`,
  );
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} checks passed · ${errors.length} failed`);
console.log(
  `nav: ${nodes.length} nodes, ${pagePaths.size} pages, ${capabilityIds.size} capability pages · redirects: ${Object.keys(redirects).length} · generated API targets available: ${apiPages.size}`,
);
console.log(
  `archetypes: ${Object.entries(archetypeCounts)
    .sort()
    .map(([key, count]) => `${key}=${count}`)
    .join(' ')} (+ ${apiPages.size} generated E pages)`,
);
if (errors.length) {
  console.error(`\n${errors.map((e) => `✖ ${e}`).join('\n')}`);
  process.exit(1);
}
