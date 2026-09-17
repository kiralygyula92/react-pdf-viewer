import { useEffect, useId, useState, type ReactNode } from 'react';

export interface SandboxProject {
  title: string;
  description: string;
  files: Record<string, string>;
  openFile: string;
}

export interface DemoToolbarProps {
  /** Accessible name of the demo region. */
  title: string;
  source: string;
  language: string;
  /** Remounts the demo. */
  onReset: () => void;
  /** Opens the live sandbox; omitted when the demo cannot be sandboxed. */
  openSandbox?: (() => void) | undefined;
  children: ReactNode;
}

/**
 * Demo block with the standard toolbar (PPDS §7.2): copy · show/hide source · open in a live
 * sandbox · reset. The source panel is keyboard-reachable (§7.8).
 */
export function DemoToolbar({
  title,
  source,
  language,
  onReset,
  openSandbox,
  children,
}: DemoToolbarProps) {
  const sourceId = useId();
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
    } catch {
      setShowSource(true);
    }
  };

  return (
    <figure className="ppds-demo" aria-label={`Demo: ${title}`}>
      <div className="ppds-demo__stage">{children}</div>
      <figcaption className="ppds-demo__bar">
        <span className="ppds-demo__title">{title}</span>
        <span className="ppds-demo__actions">
          <button type="button" className="ppds-demo__button" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            className="ppds-demo__button"
            aria-expanded={showSource}
            aria-controls={sourceId}
            onClick={() => setShowSource((value) => !value)}
          >
            {showSource ? 'Hide source' : 'Show source'}
          </button>
          {openSandbox && (
            <button type="button" className="ppds-demo__button" onClick={openSandbox}>
              Open in StackBlitz
            </button>
          )}
          <button type="button" className="ppds-demo__button" onClick={onReset}>
            Reset
          </button>
        </span>
        <span className="ppds-visually-hidden" aria-live="polite">
          {copied ? 'Source copied to clipboard' : ''}
        </span>
      </figcaption>
      <div
        id={sourceId}
        className="ppds-demo__source"
        role="region"
        tabIndex={0}
        aria-label={`${title} source`}
        hidden={!showSource}
      >
        <pre>
          <code className={`language-${language}`}>{source}</code>
        </pre>
      </div>
    </figure>
  );
}
