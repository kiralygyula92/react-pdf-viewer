import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCallback, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomPdfViewer, type CustomPdfViewerCompatProps } from '../src/compat';
import { installMockPdfjs } from './pdfjsMock';

/** Verbatim copy of the original `CustomPdfViewerProps` (docs/handoff/reference/supporting-code.md). */
interface OriginalCustomPdfViewerProps {
  pdfUrl: string;
  documentName?: string;
  onError?: (error: string) => void;
  isFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
}

// Compile-time: the original props are accepted verbatim.
type Assert<T extends true> = T;
export type AcceptsOriginalProps = Assert<
  OriginalCustomPdfViewerProps extends CustomPdfViewerCompatProps ? true : false
>;

const BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

beforeEach(() => {
  installMockPdfjs({ autoResolveDocument: true, autoResolveRender: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The host app's lifted-state pattern (ViewReportSection). */
function Host(props: Partial<OriginalCustomPdfViewerProps>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const handleError = useCallback((error: string) => props.onError?.(error), [props]);
  const viewerProps: OriginalCustomPdfViewerProps = {
    pdfUrl: '/treatment.pdf',
    documentName: 'report-2026-09-10.pdf',
    onError: handleError,
    isFullscreen,
    onFullscreenChange: setIsFullscreen,
    currentPage,
    onPageChange: setCurrentPage,
    scale,
    onScaleChange: setScale,
    rotation,
    onRotationChange: setRotation,
    ...props,
  };
  return <CustomPdfViewer {...viewerProps} />;
}

describe('compat CustomPdfViewer', () => {
  it('accepts the original props and drives the lifted state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(BYTES))),
    );
    const user = userEvent.setup();
    render(<Host />);
    await screen.findByRole('img', { name: 'Page 1 of 3' });
    const toolbar = screen.getByRole('toolbar');
    await user.click(within(toolbar).getByRole('button', { name: 'Next page' }));
    await user.click(within(toolbar).getByRole('button', { name: 'Zoom in' }));
    await user.click(within(toolbar).getByRole('button', { name: 'Enter fullscreen' }));
    expect(within(toolbar).getByText('2 / 3')).toBeInTheDocument();
    expect(within(toolbar).getByText('105%')).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Exit fullscreen' })).toBeInTheDocument();
    // Controlled fullscreen is layout-only: the parent presents it (no dialog, no portal).
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('.rpv-root')).toHaveAttribute('data-fullscreen');
  });

  it('passes error messages as strings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ detail: 'Nope' }), { status: 404 })),
      ),
    );
    const onError = vi.fn();
    render(<CustomPdfViewer pdfUrl="/missing.pdf" onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Nope'));
  });

  it('routes HTTP 401 to onUnauthorized instead of an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 401 }))),
    );
    const onUnauthorized = vi.fn();
    const onError = vi.fn();
    render(
      <CustomPdfViewer pdfUrl="/secure.pdf" onError={onError} onUnauthorized={onUnauthorized} />,
    );
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledOnce());
    expect(onError).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
