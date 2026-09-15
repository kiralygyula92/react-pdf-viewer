/** Indeterminate circular spinner. */
export function Spinner() {
  return (
    <span className="rpv-spinner" aria-hidden="true">
      <svg viewBox="22 22 44 44" focusable="false">
        <circle cx="44" cy="44" r="20.2" fill="none" strokeWidth="3.6" />
      </svg>
    </span>
  );
}

/** Centered spinner with a status text, shown while the document loads. */
export function LoadingView({ label }: { label: string }) {
  return (
    <div className="rpv-loading" role="status">
      <Spinner />
      <p className="rpv-loading__text">{label}</p>
    </div>
  );
}
