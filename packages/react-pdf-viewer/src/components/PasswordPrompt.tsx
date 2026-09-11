import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { PdfViewerLabels } from '../labels.js';

interface PasswordPromptProps {
  labels: PdfViewerLabels;
  /** The previous attempt was wrong. */
  incorrect: boolean;
  onSubmit: (password: string) => void;
}

/** Built-in password form for encrypted documents. */
export function PasswordPrompt({ labels, incorrect, onSubmit }: PasswordPromptProps) {
  const inputId = useId();
  const titleId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, [incorrect]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(value);
    setValue('');
  };

  return (
    <form className="rpv-password" aria-labelledby={titleId} onSubmit={submit}>
      <p id={titleId} className="rpv-password__title">
        {labels.passwordPrompt}
      </p>
      {incorrect && (
        <p id={errorId} className="rpv-password__error" role="alert">
          {labels.passwordIncorrect}
        </p>
      )}
      <label htmlFor={inputId}>{labels.passwordLabel}</label>
      <input
        ref={inputRef}
        id={inputId}
        type="password"
        autoComplete="current-password"
        value={value}
        aria-invalid={incorrect || undefined}
        aria-describedby={incorrect ? errorId : undefined}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="rpv-text-button">
        {labels.passwordSubmit}
      </button>
    </form>
  );
}
