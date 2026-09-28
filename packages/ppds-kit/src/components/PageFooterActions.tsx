/** “Edit this page” and “Report a problem”, then the previous and next pages: layout, not content. */
export interface PageFooterActionsProps {
  repo: string;
  /** Source file path relative to the repository root; omitted for generated pages. */
  sourcePath?: string | undefined;
  generatedFrom?: string | undefined;
  title: string;
  url: string;
  previous?: { title: string; pathname: string } | undefined;
  next?: { title: string; pathname: string } | undefined;
}

export function PageFooterActions({
  repo,
  sourcePath,
  generatedFrom,
  title,
  url,
  previous,
  next,
}: PageFooterActionsProps) {
  const report = `${repo}/issues/new?${new URLSearchParams({
    title: `Docs: ${title}`,
    body: `Page: ${url}\n\nWhat is wrong or missing?\n`,
  }).toString()}`;
  const editHref = sourcePath
    ? `${repo}/edit/main/${sourcePath}`
    : generatedFrom
      ? `${repo}/blob/main/${generatedFrom}`
      : undefined;
  return (
    <footer className="ppds-page-footer">
      <div className="ppds-page-footer__actions">
        {editHref && (
          <a className="ppds-page-footer__edit" href={editHref} rel="noopener" data-action="edit">
            {sourcePath ? 'Edit this page' : 'View the source this page is generated from'}
          </a>
        )}
        <a className="ppds-page-footer__report" href={report} rel="noopener" data-action="report">
          Report a problem with this page
        </a>
      </div>
      {(previous || next) && (
        <nav className="ppds-pager" aria-label="Previous and next pages">
          {previous ? (
            <a className="ppds-pager__link ppds-pager__link--previous" href={previous.pathname}>
              <span className="ppds-pager__hint">Previous</span>
              <span>{previous.title}</span>
            </a>
          ) : (
            <span />
          )}
          {next && (
            <a className="ppds-pager__link ppds-pager__link--next" href={next.pathname}>
              <span className="ppds-pager__hint">Next</span>
              <span>{next.title}</span>
            </a>
          )}
        </nav>
      )}
    </footer>
  );
}
