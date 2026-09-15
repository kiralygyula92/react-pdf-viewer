import { ErrorOutlineIcon } from './icons.js';

interface ErrorViewProps {
  message: string;
  retryLabel: string;
  onRetry?: (() => void) | undefined;
  /** `document` fills a 400px area; `page` sits inside the page box. */
  variant?: 'document' | 'page' | undefined;
}

/** Red error alert with an optional Retry button. */
export function ErrorView({ message, retryLabel, onRetry, variant = 'document' }: ErrorViewProps) {
  return (
    <div className={variant === 'page' ? 'rpv-error rpv-error--page' : 'rpv-error'}>
      <div className="rpv-alert" role="alert">
        <span className="rpv-alert__icon">
          <ErrorOutlineIcon />
        </span>
        <div className="rpv-alert__message">{message}</div>
      </div>
      {onRetry && (
        <button type="button" className="rpv-text-button" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
