#!/usr/bin/env node
/**
 * PPDS Phase 2 gate: validates the site data model.
 *
 * 1. JSON Schema: plugin.config.json (root schema), nav.json ($defs/navTree), titles.json
 *    ($defs/titleMap) and pricing.json ($defs/pricing, when present) against
 *    docs/ppds/plugin-site.schema.json (draft 2020-12).
 * 2. Model rules the schema cannot express (PPDS §3–§5, brief Phase 2 gate): section order,
 *    nav depth, taxonomy and tier membership, title coverage, slug rules, the URL map covering
 *    every audited legacy URL exactly once with a resolvable target, and every audited
 *    capability being assigned.
 *
 * Usage: node scripts/ppds/validate-model.mjs [plugin-id]   (default: react-pdf-viewer)
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = resolve(import.meta.dirname, '../..');
const pluginId = process.argv[2] ?? 'react-pdf-viewer';
const contentDir = resolve(root, 'content', pluginId);
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

const errors = [];
const fail = (rule, message) => errors.push(`${rule}: ${message}`);
let passed = 0;
const check = (rule, ok, message) => (ok ? passed++ : fail(rule, message));

// ── 1. JSON Schema ──────────────────────────────────────────────────────────
const schema = readJson('docs/ppds/plugin-site.schema.json');
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
console.log(
  tiered
    ? ''
    : '· pricing.json not required: single free tier (PPDS §5, archetypes D/H conditional)',
);

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

// Sections: all 11, canonical order, mandatory ones enabled (§5).
check(
  '§5 sections',
  JSON.stringify(config.sections.map((s) => s.id)) === JSON.stringify(SECTIONS),
  'sections must list all 11 canonical ids in canonical order',
);
for (const section of config.sections) {
  check(
    '§5 sections',
    section.enabled !== false || CONDITIONAL.has(section.id),
    `mandatory section "${section.id}" is disabled`,
  );
  check(
    '§12 sections',
    section.title === undefined,
    `section "${section.id}" overrides its canonical title`,
  );
}
check(
  'R5 urlPrefix',
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
  '§11.5 sidebar order',
  JSON.stringify(nav.map((n) => sectionOfGroup[n.pathname])) === JSON.stringify(enabled),
  `top-level nav must be the enabled sections in canonical order, got ${JSON.stringify(nav.map((n) => n.pathname))}`,
);

const seen = new Set();
const capabilityIds = new Set();
const subheaders = [];
for (const node of nodes) {
  const virtual = node.pathname.endsWith('-group');
  check('N5 depth', node.depth <= 3, `${node.pathname} is at depth ${node.depth}`);
  check('P2 unique', !seen.has(node.pathname), `duplicate pathname ${node.pathname}`);
  seen.add(node.pathname);
  check('§3 namespace', node.pathname.startsWith(P), `${node.pathname} is outside ${P}`);
  if (virtual) {
    check(
      '§11.8 virtual groups',
      Array.isArray(node.children) && node.children.length > 0,
      `virtual group ${node.pathname} has no children`,
    );
  } else {
    const isFile = /\.[a-z]+$/.test(node.pathname);
    check(
      'R4 trailing slash',
      isFile || node.pathname.endsWith('/'),
      `${node.pathname} lacks a trailing slash`,
    );
    const segments = node.pathname.slice(P.length).split('/').filter(Boolean);
    for (const segment of segments)
      check(
        'R3 slugs',
        isFile && segment === segments.at(-1) ? /^[a-z0-9.-]+$/.test(segment) : KEBAB.test(segment),
        `${node.pathname}: segment "${segment}" is not kebab-case`,
      );
    check(
      'R3 slugs',
      !/(^|[-/])v?\d+(\.\d+)+|\d{4}-\d{2}/.test(node.pathname.slice(P.length)),
      `${node.pathname} contains a version or date`,
    );
    check(
      'N2 titles',
      typeof titles[node.pathname] === 'string' || node.title,
      `${node.pathname} has no title in titles.json`,
    );
  }
  if (node.subheader) {
    subheaders.push(node.subheader);
    check(
      'N4 taxonomy',
      config.taxonomy.includes(node.subheader),
      `subheader "${node.subheader}" is not in plugin.config.json taxonomy`,
    );
    check(
      'N5 structure',
      node.depth === 2,
      `subheader group ${node.pathname} must sit directly under a section`,
    );
  } else if (virtual) {
    check(
      'N2 titles',
      typeof titles[node.pathname] === 'string',
      `section group ${node.pathname} has no title in titles.json`,
    );
  }
  if (node.plan !== undefined)
    check(
      'N4 plans',
      config.tiers.some((tier) => tier.id === node.plan),
      `${node.pathname}: plan "${node.plan}" is not a declared tier`,
    );
  if (node.capabilityId !== undefined) {
    check(
      '§8.3 capabilityId',
      KEBAB.test(node.capabilityId),
      `${node.pathname}: capabilityId "${node.capabilityId}" is not kebab-case`,
    );
    check(
      '§8.3 capabilityId',
      !capabilityIds.has(node.capabilityId),
      `duplicate capabilityId ${node.capabilityId}`,
    );
    capabilityIds.add(node.capabilityId);
    check(
      'R1 flat capability URLs',
      node.pathname === `${P}${config.urlPrefix}${node.capabilityId}/`,
      `${node.pathname} must be ${P}${config.urlPrefix}${node.capabilityId}/`,
    );
    check(
      '§4 capability placement',
      node.parent?.subheader !== undefined &&
        sectionOfGroup[nodes.find((n) => n.children?.includes(node.parent))?.pathname] ===
          'features',
      `${node.pathname} must sit under a Features subheader group`,
    );
    const title = titles[node.pathname] ?? '';
    check(
      '§8.3 title',
      title.length > 0 && title.length <= 40 && !/[.!?]$/.test(title),
      `${node.pathname}: capability title "${title}" must be 1–40 chars and not a sentence`,
    );
  }
}
check(
  '§5 taxonomy order',
  JSON.stringify(subheaders) === JSON.stringify(config.taxonomy),
  `Features subheaders ${JSON.stringify(subheaders)} must equal taxonomy ${JSON.stringify(config.taxonomy)} (same terms, sidebar order)`,
);
// The group vocabulary is read from the standard itself (§5 code block), so a term can only be
// added or renamed centrally (PPDS §5, §12; D-06).
const standard = read('docs/ppds/02-plugin-docs-standard.md');
const vocabularyBlock =
  /\*\*Feature grouping\.\*\*[\s\S]*?```\n([\s\S]*?)```/.exec(standard)?.[1] ?? '';
const vocabulary = vocabularyBlock
  .split(/·|\n/)
  .map((term) => term.trim())
  .filter(Boolean);
check(
  '§5 vocabulary',
  vocabulary.length > 0,
  'could not read the group vocabulary from the standard',
);
for (const term of config.taxonomy)
  check(
    '§5 vocabulary',
    vocabulary.includes(term),
    `taxonomy term "${term}" is not in the portfolio vocabulary (${vocabulary.join(', ')})`,
  );
check(
  '§5 vocabulary',
  !config.taxonomy.some((term) => nav.some((section) => titles[section.pathname] === term)),
  'a taxonomy term duplicates a section name in the sidebar',
);

const pagePaths = new Set(
  nodes.filter((n) => !n.pathname.endsWith('-group')).map((n) => n.pathname),
);

/**
 * The archetype a docs page must use, derived from its path (PPDS §6, v1.1 archetypes J–L).
 * Returns null for machine surfaces (§7.7) and for paths outside the docs namespace.
 */
function archetypeOf(pathname) {
  if (!pathname.startsWith(P)) return null;
  const rest = pathname.slice(P.length);
  if (rest === '') return 'A';
  if (/\.[a-z]+$/.test(rest)) return null;
  if (rest === 'all-features/') return 'C';
  if (rest === 'features/') return 'D';
  if (/^getting-started\/(installation|usage|requirements)\/$/.test(rest)) return 'F';
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
  check('§11.1 archetype', archetype !== undefined, `${page} matches no archetype`);
  if (archetype) archetypeCounts[archetype] = (archetypeCounts[archetype] ?? 0) + 1;
}
for (const key of Object.keys(titles))
  check('N2 titles', seen.has(key), `titles.json has an entry for unknown pathname ${key}`);
check(
  '§5 required pages',
  pagePaths.has(P) && pagePaths.has(`${P}all-features/`) && pagePaths.has(`${P}llms.txt`),
  'Overview, All features and llms.txt are required',
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
    check(
      '§7.5 versions',
      pagePaths.has(version.href),
      `version href ${version.href} does not resolve`,
    );
}

// ── 3. URL map (PPDS §10) ───────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') cell += c;
  }
  const [header, ...body] = rows;
  return body.map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])),
  );
}

const legacy = parseCsv(read('audit/pages.csv'));
const urlMap = parseCsv(read('migration/url-map.csv'));
const exceptions = existsSync(resolve(root, 'EXCEPTIONS.md')) ? read('EXCEPTIONS.md') : '';

// Generated reference pages: /{id}/api/{kebab(export)}/ for every public export.
const kebab = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
const exportsSource = read('packages/react-pdf-viewer/src/index.ts');
const exported = new Set(
  [...exportsSource.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)].flatMap((m) =>
    m[1]
      .split(',')
      .map((s) => s.replace(/\btype\b/, '').trim())
      .filter(Boolean),
  ),
);
const apiPages = new Set([...exported].map((name) => `${P}api/${kebab(name)}/`));

const ACTIONS = new Set(['port', 'split', 'merge', 'generate', 'rewrite', 'retire']);
const mapped = new Map();
for (const row of urlMap) {
  check(
    '§10 unique rows',
    !mapped.has(row.legacy_url),
    `legacy URL ${row.legacy_url} appears more than once`,
  );
  mapped.set(row.legacy_url, row);
  check(
    '§10 action',
    ACTIONS.has(row.action),
    `${row.legacy_url}: action "${row.action}" is not one of ${[...ACTIONS].join(', ')}`,
  );
  check(
    '§10 retire',
    row.action !== 'retire',
    `${row.legacy_url}: retire is forbidden while a home exists`,
  );
  check('§10 redirect', row.redirect.trim() !== '', `${row.legacy_url}: missing redirect`);
  const exception = /EXCEPTIONS (E-\d+)/.exec(row.redirect)?.[1];
  if (exception)
    check(
      '§0.1 exceptions',
      exceptions.includes(`## ${exception}`),
      `${row.legacy_url}: cites ${exception}, which is not recorded in EXCEPTIONS.md`,
    );
  const target = row.target_url.split('?')[0];
  const resolves =
    pagePaths.has(target) ||
    apiPages.has(target) ||
    (exception !== undefined && !target.startsWith(P));
  check(
    '§10 target',
    resolves,
    `${row.legacy_url}: target ${row.target_url} does not resolve to a nav page, a generated API page or a documented exception`,
  );
  const expected = archetypeOf(target);
  check(
    '§10 target archetype',
    expected ? row.target_archetype === expected : row.target_archetype.startsWith('—'),
    `${row.legacy_url}: target archetype "${row.target_archetype}" should be "${expected ?? '— (not a docs page)'}" for ${target}`,
  );
  for (const ref of row.notes.matchAll(/\s(\/[a-z0-9/-]+\/)/g)) {
    const path = ref[1].startsWith(P) ? ref[1] : `${P}${ref[1].slice(1)}`;
    check(
      '§10 split targets',
      pagePaths.has(path) || apiPages.has(path),
      `${row.legacy_url}: note references ${ref[1]}, which is neither a nav page nor a generated API page`,
    );
  }
}
for (const page of legacy)
  check('§10 coverage', mapped.has(page.url), `legacy URL ${page.url} is unmapped`);
check(
  '§10 coverage',
  urlMap.length === legacy.length,
  `url-map has ${urlMap.length} rows for ${legacy.length} audited URLs`,
);

// ── 4. Capability assignment (brief Phase 2 step 2, acceptance criterion 5) ──
const audited = [...read('audit/capabilities.md').matchAll(/^\| (C\d{2}) \|/gm)].map((m) => m[1]);
const assignment = parseCsv(read('migration/capability-assignment.csv'));
const gaps = read('GAPS.md');
check(
  'assignment coverage',
  JSON.stringify(assignment.map((a) => a.audit_id)) === JSON.stringify(audited),
  `capability-assignment.csv must list every audited capability once, in order (${audited.length})`,
);
for (const row of assignment) {
  if (row.capability_id) {
    check(
      'assignment',
      capabilityIds.has(row.capability_id),
      `${row.audit_id}: capability ${row.capability_id} is not in nav.json`,
    );
    check(
      'assignment',
      row.target_url === `${P}${config.urlPrefix}${row.capability_id}/`,
      `${row.audit_id}: target must be the capability page`,
    );
    check(
      'assignment',
      config.taxonomy.includes(row.group),
      `${row.audit_id}: group "${row.group}" is not in taxonomy`,
    );
    const navGroup = nodes.find((n) => n.capabilityId === row.capability_id)?.parent?.subheader;
    check(
      'assignment',
      navGroup === row.group,
      `${row.audit_id}: group "${row.group}" differs from nav subheader "${navGroup}"`,
    );
    check(
      'assignment',
      config.tiers.some((t) => t.id === row.plan),
      `${row.audit_id}: plan "${row.plan}" is not a declared tier`,
    );
  } else {
    check(
      'assignment',
      pagePaths.has(row.target_url),
      `${row.audit_id}: non-page capability target ${row.target_url} does not resolve`,
    );
    check(
      'acceptance 5',
      /GAPS (G-\d+)/.test(row.rationale) &&
        gaps.includes(`| ${/GAPS (G-\d+)/.exec(row.rationale)[1]} |`),
      `${row.audit_id}: a capability without its own page needs a GAPS.md entry`,
    );
  }
}
const assignedIds = new Set(assignment.map((a) => a.capability_id).filter(Boolean));
for (const id of capabilityIds)
  check(
    'assignment',
    assignedIds.has(id),
    `nav capability ${id} has no audited capability behind it (invented?)`,
  );

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} checks passed · ${errors.length} failed`);
console.log(
  `nav: ${nodes.length} nodes, ${pagePaths.size} pages, ${capabilityIds.size} capability pages · url-map: ${urlMap.length} rows · generated API targets available: ${apiPages.size}`,
);
console.log(
  `archetypes: ${Object.entries(archetypeCounts)
    .sort()
    .map(([key, count]) => `${key}=${count}`)
    .join(' ')} (+ ${apiPages.size} generated E pages in Phase 4)`,
);
if (errors.length) {
  console.error(`\n${errors.map((e) => `✖ ${e}`).join('\n')}`);
  process.exit(1);
}
