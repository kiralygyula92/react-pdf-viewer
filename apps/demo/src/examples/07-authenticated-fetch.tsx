import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';
import { useCallback, useState } from 'react';
import { sampleUrl } from '../samples';

export const meta = {
  title: '7. Authenticated fetch',
  description:
    'A fetcher adds an Authorization header; onHttpError handles 401 (for example by redirecting to sign-in). The endpoint here is mocked in the browser.',
};

const TOKEN = 'demo-token';

/** Stand-in for an API that rejects requests without a bearer token. */
async function mockApi(url: string, init: RequestInit): Promise<Response> {
  if (new Headers(init.headers).get('Authorization') !== `Bearer ${TOKEN}`) {
    return new Response(JSON.stringify({ title: 'Unauthorized', status: 401 }), {
      status: 401,
      headers: { 'Content-Type': 'application/problem+json' },
    });
  }
  return fetch(url, { signal: init.signal ?? null });
}

export default function AuthenticatedFetchExample() {
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState('');

  const fetcher = useCallback(
    (url: string, init: RequestInit) =>
      mockApi(url, {
        ...init,
        headers: signedIn ? { Authorization: `Bearer ${TOKEN}` } : {},
      }),
    [signedIn],
  );

  return (
    <div className="demo-stack">
      <label className="demo-check">
        <input
          type="checkbox"
          checked={signedIn}
          onChange={(event) => {
            setSignedIn(event.target.checked);
            setMessage('');
          }}
        />
        Signed in (send the bearer token)
      </label>
      {message && (
        <p className="demo-callout" role="status">
          {message}
        </p>
      )}
      <PdfViewer
        // A new fetcher applies to the next load; remount to load again with it.
        key={String(signedIn)}
        source={sampleUrl('letter-3pages.pdf')}
        fetcher={fetcher}
        onHttpError={(response) => {
          if (response.status === 401) {
            setMessage('401 Unauthorized. Tick “Signed in” to load the document.');
            return true;
          }
          return false;
        }}
      />
    </div>
  );
}
