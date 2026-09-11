import type { ReactNode } from 'react';
import '@your-scope/react-pdf-viewer/styles.css';

export const metadata = { title: 'Next.js consumer smoke test' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
