import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PluginConfig } from './types.ts';

/** The changelog page, relative to the content root. */
const CHANGELOG_PAGE = 'discover-more/changelog.mdx';

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The label the version selector shows for a version: `1.2.3` → `v1.2`. */
export function versionLabel(version: string): string {
  const [major = '0', minor = '0'] = version.split('.');
  return `v${major}.${minor}`;
}

/** The site model at a released version: its current version, and the current selector label. */
export function releaseConfig(config: PluginConfig, version: string): PluginConfig {
  return {
    ...config,
    currentVersion: version,
    ...(config.versions && {
      versions: config.versions.map((entry) =>
        entry.current ? { ...entry, label: versionLabel(version) } : entry,
      ),
    }),
  };
}

/**
 * The changelog page with a dated entry for `version`. A prepared `## 1.2.3` or
 * `## 1.2.3 (unreleased)` heading gets the date; without one, the package changelog's section for
 * the version is added above the previous release. An entry that already has a date is kept as
 * it is, and the page's `date` becomes the release date.
 */
export function releaseChangelogPage(
  page: string,
  packageChangelog: string,
  version: string,
  date: string,
): string {
  const heading = new RegExp(`^## ${escapeRegExp(version)}(?: \\(([^)]*)\\))?[ \\t]*$`, 'm');
  const prepared = heading.exec(page);
  if (prepared?.[1] !== undefined && prepared[1] !== 'unreleased') return page;

  let next: string;
  if (prepared) {
    next = page.replace(heading, `## ${version} (${date})`);
  } else {
    const section = new RegExp(
      `^## ${escapeRegExp(version)}[ \\t]*\\r?\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`,
      'm',
    ).exec(packageChangelog)?.[1];
    if (section === undefined) {
      throw new Error(`The package changelog has no section for ${version}`);
    }
    // Changesets starts each entry with its commit; the page leaves it out.
    const body = section.replace(/^- [0-9a-f]{7,40}: /gm, '- ').trim();
    const entry = `## ${version} (${date})\n\n${body}\n\n`;
    const previous = /^## /m.exec(page);
    next = previous
      ? page.slice(0, previous.index) + entry + page.slice(previous.index)
      : `${page.trimEnd()}\n\n${entry}`;
  }
  return next.replace(
    /^(---\r?\n[\s\S]*?)^date:.*$/m,
    (_all, before: string) => `${before}date: '${date}'`,
  );
}

export interface VersionOptions {
  contentRoot: string;
  /** The published package's directory: its `package.json` and `CHANGELOG.md`. */
  packageDir: string;
  /** Release date, `YYYY-MM-DD`; today by default. */
  date?: string | undefined;
}

/**
 * Brings the documentation to the package's version after `changeset version`, so the release
 * pull request updates the package and its documentation together.
 */
export function runVersion({
  contentRoot,
  packageDir,
  date = new Date().toISOString().slice(0, 10),
}: VersionOptions): number {
  const { version } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
    version: string;
  };
  const configPath = join(contentRoot, 'plugin.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as PluginConfig;
  writeFileSync(configPath, `${JSON.stringify(releaseConfig(config, version), null, 2)}\n`);

  const pagePath = join(contentRoot, CHANGELOG_PAGE);
  const changelogPath = join(packageDir, 'CHANGELOG.md');
  const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : '';
  writeFileSync(
    pagePath,
    releaseChangelogPage(readFileSync(pagePath, 'utf8'), changelog, version, date),
  );
  console.log(`Documentation brought to ${version} (${date})`);
  return 0;
}
