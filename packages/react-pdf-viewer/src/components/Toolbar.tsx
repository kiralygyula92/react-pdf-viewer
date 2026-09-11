import { memo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { scaleToPercent } from '../core/scale.js';
import { useLabelContext, useLabels, type PdfViewerLabels } from '../labels.js';
import type { PdfViewerApi, ToolbarAction, ToolbarConfig } from '../types.js';
import {
  DownloadIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  NavigateBeforeIcon,
  NavigateNextIcon,
  PrintIcon,
  RotateRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './icons.js';
import { ToolbarButton } from './ToolbarButton.js';

/** Every toolbar action, in the original order. */
export const DEFAULT_TOOLBAR_ACTIONS: readonly ToolbarAction[] = [
  'zoomOut',
  'zoomLevel',
  'zoomIn',
  'previousPage',
  'pageIndicator',
  'nextPage',
  'fullscreen',
  'rotate',
  'download',
  'print',
];

/** Actions hidden in compact, non-fullscreen mode by default (original behavior). */
export const DEFAULT_HIDDEN_WHEN_COMPACT: readonly ToolbarAction[] = ['rotate', 'print'];

const GROUPS: readonly (readonly ToolbarAction[])[] = [
  ['zoomOut', 'zoomLevel', 'zoomIn'],
  ['previousPage', 'pageIndicator', 'nextPage'],
  ['fullscreen', 'rotate', 'download', 'print'],
];

/** Props for {@link PdfToolbar}. */
export interface PdfToolbarProps {
  /** The viewer API (from a `ref` or `renderToolbar`). */
  api: PdfViewerApi;
  /** Label overrides. */
  labels?: Partial<PdfViewerLabels> | undefined;
  /** Which actions to show and where. */
  config?: ToolbarConfig | undefined;
  /** Compact layout (narrow viewport): hides `hiddenWhenCompact` actions outside fullscreen. */
  compact?: boolean | undefined;
  /** Locale for number formatting. */
  locale?: string | undefined;
  /** The zoom label becomes a button that resets zoom. Default `false`. */
  zoomReset?: boolean | undefined;
  /** Replaces the page indicator text (e.g. with a page-number input). */
  pageIndicator?: ReactNode;
}

interface ButtonSpec {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled: boolean;
}

function PdfToolbarImpl({
  api,
  labels: labelOverrides,
  config,
  compact = false,
  locale,
  zoomReset = false,
  pageIndicator,
}: PdfToolbarProps) {
  const labels = useLabels(labelOverrides);
  const context = useLabelContext(locale);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [focusedAction, setFocusedAction] = useState<ToolbarAction | null>(null);

  const hiddenWhenCompact = config?.hiddenWhenCompact ?? DEFAULT_HIDDEN_WHEN_COMPACT;
  const visible = new Set(
    (config?.actions ?? DEFAULT_TOOLBAR_ACTIONS).filter(
      (action) => !(compact && !api.fullscreen && hiddenWhenCompact.includes(action)),
    ),
  );
  const ready = api.status === 'ready';
  const zoomText = labels.zoomLevel(scaleToPercent(api.scale), context);

  const buttons: Partial<Record<ToolbarAction, ButtonSpec>> = {
    zoomOut: {
      label: labels.zoomOut,
      icon: <ZoomOutIcon />,
      onClick: api.zoomOut,
      disabled: !api.canZoomOut,
    },
    zoomIn: {
      label: labels.zoomIn,
      icon: <ZoomInIcon />,
      onClick: api.zoomIn,
      disabled: !api.canZoomIn,
    },
    previousPage: {
      label: labels.previousPage,
      icon: <NavigateBeforeIcon />,
      onClick: api.previousPage,
      disabled: !ready || api.page <= 1,
    },
    nextPage: {
      label: labels.nextPage,
      icon: <NavigateNextIcon />,
      onClick: api.nextPage,
      disabled: !ready || api.page >= api.numPages,
    },
    fullscreen: {
      label: api.fullscreen ? labels.exitFullscreen : labels.enterFullscreen,
      icon: api.fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />,
      onClick: api.toggleFullscreen,
      disabled: false,
    },
    rotate: {
      label: labels.rotate,
      icon: <RotateRightIcon />,
      onClick: () => api.rotate('cw'),
      disabled: false,
    },
    download: {
      label: labels.download,
      icon: <DownloadIcon />,
      onClick: () => void api.download(),
      disabled: !ready,
    },
    print: {
      label: labels.print,
      icon: <PrintIcon />,
      onClick: () => void api.print(),
      disabled: !ready,
    },
  };

  // Roving tab index: one tab stop for the whole toolbar; arrow keys move between controls.
  const focusable = DEFAULT_TOOLBAR_ACTIONS.filter((action) => {
    if (!visible.has(action)) return false;
    if (action === 'zoomLevel') return zoomReset;
    const button = buttons[action];
    return button !== undefined && !button.disabled;
  });
  const tabStop =
    focusedAction !== null && focusable.includes(focusedAction) ? focusedAction : focusable[0];

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key) || !toolbarRef.current) {
      return;
    }
    const enabled = [
      ...toolbarRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    ];
    const index = enabled.indexOf(event.target as HTMLButtonElement);
    if (index === -1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const last = enabled.length - 1;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : event.key === 'ArrowRight'
            ? index === last
              ? 0
              : index + 1
            : index === 0
              ? last
              : index - 1;
    enabled[next]?.focus();
  };

  const renderAction = (action: ToolbarAction) => {
    if (!visible.has(action)) {
      return null;
    }
    if (action === 'zoomLevel') {
      return zoomReset ? (
        <button
          key={action}
          type="button"
          className="rpv-toolbar__label rpv-toolbar__zoom rpv-zoom-reset"
          aria-label={`${labels.resetZoom} (${zoomText})`}
          data-action={action}
          tabIndex={action === tabStop ? 0 : -1}
          onFocus={() => setFocusedAction(action)}
          onClick={api.resetZoom}
        >
          {zoomText}
        </button>
      ) : (
        <span key={action} className="rpv-toolbar__label rpv-toolbar__zoom">
          {zoomText}
        </span>
      );
    }
    if (action === 'pageIndicator') {
      return pageIndicator ? (
        <span
          key={action}
          className="rpv-toolbar__label rpv-toolbar__pages rpv-toolbar__pages--input"
        >
          {pageIndicator}
        </span>
      ) : (
        <span
          key={action}
          className="rpv-toolbar__label rpv-toolbar__pages"
          aria-live="polite"
          aria-atomic="true"
        >
          {api.numPages > 0
            ? labels.pageIndicator(api.page, api.numPages, context)
            : labels.pageIndicator(0, 0, context)}
        </span>
      );
    }
    const button = buttons[action];
    if (!button) {
      return null;
    }
    return (
      <ToolbarButton
        key={action}
        action={action}
        label={button.label}
        icon={button.icon}
        onClick={button.onClick}
        disabled={button.disabled}
        tabIndex={action === tabStop ? 0 : -1}
        onFocus={setFocusedAction}
      />
    );
  };

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={labels.toolbar}
      aria-orientation="horizontal"
      className="rpv-toolbar"
      onKeyDown={handleKeyDown}
    >
      {GROUPS.map((group, index) => {
        const items = group.filter((action) => visible.has(action));
        return items.length === 0 ? null : (
          <div key={index} className="rpv-toolbar__group">
            {items.map(renderAction)}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The default toolbar: zoom, page navigation, fullscreen, rotate, download and print. Usable on
 * its own, e.g. inside `renderToolbar`.
 */
export const PdfToolbar = memo(PdfToolbarImpl);
