/** “Edit this page” and “Was this page helpful?” (PPDS §7.3): layout, not content. */
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
  const feedback = (answer: 'yes' | 'no') => {
    const params = new URLSearchParams({
      title: `Docs feedback: ${title}`,
      labels: 'docs-feedback',
      body: `Page: ${url}\nHelpful: ${answer}\n\nWhat could be better?\n`,
    });
    return `${repo}/issues/new?${params.toString()}`;
  };
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
        <div className="ppds-feedback" data-action="feedback">
          <span id="ppds-feedback-label">Was this page helpful?</span>
          <a
            className="ppds-feedback__answer"
            href={feedback('yes')}
            rel="noopener"
            aria-describedby="ppds-feedback-label"
          >
            Yes
          </a>
          <a
            className="ppds-feedback__answer"
            href={feedback('no')}
            rel="noopener"
            aria-describedby="ppds-feedback-label"
          >
            No
          </a>
        </div>
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
