import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useCallback, useState } from 'react';

const TOKEN = 'demo-token';

/** Stand-in for your API: rejects requests without a bearer token. */
async function api(url: string, init: RequestInit): Promise<Response> {
  if (new Headers(init.headers).get('Authorization') !== `Bearer ${TOKEN}`) {
    return new Response(JSON.stringify({ title: 'Unauthorized', status: 401 }), {
      status: 401,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }
  return fetch(url, { signal: init.signal ?? null });
}

export default function Demo() {
  const [signedIn, setSignedIn] = useState(false);
  const [notice, setNotice] = useState('');

  const fetcher = useCallback(
    (url: string, init: RequestInit) =>
      api(url, { ...init, headers: signedIn ? { Authorization: `Bearer ${TOKEN}` } : {} }),
    [signedIn],
  );

  return (
    <>
      <p className="demo-controls">
        <label>
          <input
            type="checkbox"
            checked={signedIn}
            onChange={(event) => {
              setSignedIn(event.target.checked);
              setNotice('');
            }}
          />
          Signed in
        </label>
        {notice && <span role="status">{notice}</span>}
      </p>
      <PdfViewer
        // The fetcher applies to the next load: remount to load again with the new token.
        key={String(signedIn)}
        source="/samples/letter-3pages.pdf"
        fetcher={fetcher}
        onHttpError={(response) => {
          if (response.status === 401) {
            setNotice('401 Unauthorized: sign in to load the document.');
            return true; // handled: empty state, no error view, no onError
          }
          return false;
        }}
      />
    </>
  );
}
