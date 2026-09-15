import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useId, useState } from 'react';

function UnlockForm({
  incorrect,
  submit,
}: {
  incorrect: boolean;
  submit: (password: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState('');

  return (
    <form
      style={{ display: 'grid', gap: 8, maxWidth: 320, margin: '48px auto', textAlign: 'center' }}
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
    >
      <strong>🔒 This file is protected</strong>
      <label htmlFor={id}>Enter the document password (hint: demo)</label>
      <input
        id={id}
        type="password"
        value={value}
        aria-invalid={incorrect}
        onChange={(event) => setValue(event.target.value)}
      />
      {incorrect && <span role="alert">That password didn’t work.</span>}
      <button type="submit">Unlock</button>
    </form>
  );
}

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/password.pdf"
      passwordPrompt
      renderPasswordPrompt={(context) => <UnlockForm {...context} />}
    />
  );
}
