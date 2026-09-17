/** Static search (Pagefind) in a modal dialog, scoped to one plugin and version (PPDS §7.5). */
export interface SearchProps {
  pluginId?: string | undefined;
  version?: string | undefined;
}

export function Search({ pluginId, version }: SearchProps) {
  return (
    <>
      <button type="button" className="ppds-search-button" data-search-open aria-haspopup="dialog">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"
          />
        </svg>
        <span>Search</span>
        <kbd className="ppds-search-button__key">/</kbd>
      </button>
      <dialog
        className="ppds-search-dialog"
        data-search-dialog
        aria-label="Search the documentation"
      >
        <div className="ppds-search-dialog__header">
          <p className="ppds-search-dialog__title">Search</p>
          <button
            type="button"
            className="ppds-icon-button"
            data-search-close
            aria-label="Close search"
          >
            ✕
          </button>
        </div>
        <div id="ppds-search" data-plugin={pluginId} data-version={version} />
        <noscript>
          Search needs JavaScript. Use the sidebar or <a href="/sitemap.xml">the sitemap</a>.
        </noscript>
      </dialog>
    </>
  );
}
