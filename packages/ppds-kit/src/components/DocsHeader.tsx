/**
 * Docs header, minimal: plugin name back to the docs root, version selector, search,
 * repository link and theme toggle. No marketing menus and no menu button.
 */
import type { PluginConfig } from '../types.ts';
import { Search } from './Search.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';

export function DocsHeader({ config }: { config: PluginConfig }) {
  const versions = config.versions ?? [
    { label: `v${config.currentVersion}`, href: `/${config.id}/`, current: true },
  ];
  return (
    <header className="ppds-header ppds-header--docs">
      <div className="ppds-header__inner">
        <a className="ppds-header__plugin" href={`/${config.id}/`}>
          {config.name}
        </a>
        <label className="ppds-version">
          <span className="ppds-visually-hidden">Documentation version</span>
          <select data-version-select defaultValue={versions.find((v) => v.current)?.href}>
            {versions.map((version) => (
              <option key={version.href} value={version.href}>
                {version.label}
              </option>
            ))}
            <option value={`/${config.id}/getting-started/versions/`}>All versions…</option>
          </select>
        </label>
        <div className="ppds-header__spacer" />
        <Search pluginId={config.id} version={config.currentVersion} />
        <a
          className="ppds-icon-button"
          href={config.repo}
          rel="noopener"
          aria-label="Source repository on GitHub"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
            />
          </svg>
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
