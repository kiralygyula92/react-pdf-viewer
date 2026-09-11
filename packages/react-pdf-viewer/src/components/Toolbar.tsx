import { memo, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { scaleToPercent } from '../core/scale.js';
import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect.js';
import { useLabelContext, useLabels, type PdfViewerLabels } from '../labels.js';
import type { PdfViewerApi, ToolbarAction, ToolbarConfig } from '../types.js';
import {
  DownloadIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  NavigateBeforeIcon,
  NavigateNextIcon,
  PrintIcon,
  RestartIcon,
  RotateRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './icons.js';
import { ToolbarButton } from './ToolbarButton.js';
import { ToolbarMenu, type ToolbarMenuItem } from './ToolbarMenu.js';

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
const GROUP_NAMES = ['zoom', 'pages', 'actions'] as const;

/**
 * Actions moved into the "More actions" menu at each collapse level. The toolbar always stays a
 * single row: when it does not fit, the secondary actions collapse first, then the zoom controls.
 * Page navigation always stays visible.
 */
const COLLAPSED: readonly (readonly ToolbarAction[])[] = [
  [],
  ['fullscreen', 'rotate', 'download', 'print'],
  ['zoomOut', 'zoomLevel', 'zoomIn', 'fullscreen', 'rotate', 'download', 'print'],
];
const MAX_LEVEL = COLLAPSED.length - 1;

const px = (value: string) => Number.parseFloat(value) || 0;

/** Width the toolbar needs on one row: its groups (which never shrink), gaps and padding. */
function naturalWidth(toolbar: HTMLElement): number {
  const style = getComputedStyle(toolbar);
  const groups = [...toolbar.children] as HTMLElement[];
  const content = groups.reduce((sum, group) => sum + group.offsetWidth, 0);
  return (
    content +
    px(style.columnGap) * Math.max(0, groups.length - 1) +
    px(style.paddingLeft) +
    px(style.paddingRight)
  );
}

/** The element whose width bounds the toolbar: the viewer root, or (standalone) the parent. */
function widthHost(toolbar: HTMLElement): HTMLElement | null {
  const wrapper = toolbar.parentElement;
  return wrapper?.classList.contains('rpv-toolbar-wrapper') ? wrapper.parentElement : wrapper;
}

/**
 * Width the toolbar may use. Like the original, it may overhang its container by its own side
 * padding (it stays centred), but never the screen.
 */
function availableWidth(toolbar: HTMLElement): number {
  const host = widthHost(toolbar);
  if (!host) return 0;
  const hostStyle = getComputedStyle(host);
  const hostWidth = host.clientWidth - px(hostStyle.paddingLeft) - px(hostStyle.paddingRight);
  if (hostWidth <= 0) return 0;
  const toolbarStyle = getComputedStyle(toolbar);
  const overhang = px(toolbarStyle.paddingLeft) + px(toolbarStyle.paddingRight);
  const screen = toolbar.ownerDocument.documentElement.clientWidth || Number.POSITIVE_INFINITY;
  return Math.min(hostWidth + overhang, screen);
}

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
  /** Where the "More actions" menu opens: `'top'` (above; default) or `'bottom'`. */
  menuPlacement?: 'top' | 'bottom' | undefined;
}

interface ButtonSpec {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled: boolean;
}

type FocusKey = ToolbarAction | 'more';

function PdfToolbarImpl({
  api,
  labels: labelOverrides,
  config,
  compact = false,
  locale,
  zoomReset = false,
  pageIndicator,
  menuPlacement = 'top',
}: PdfToolbarProps) {
  const labels = useLabels(labelOverrides);
  const context = useLabelContext(locale);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [focusedAction, setFocusedAction] = useState<FocusKey | null>(null);

  const hiddenWhenCompact = config?.hiddenWhenCompact ?? DEFAULT_HIDDEN_WHEN_COMPACT;
  const visible = new Set(
    (config?.actions ?? DEFAULT_TOOLBAR_ACTIONS).filter(
      (action) => !(compact && !api.fullscreen && hiddenWhenCompact.includes(action)),
    ),
  );
  const ready = api.status === 'ready';
  const zoomText = labels.zoomLevel(scaleToPercent(api.scale), context);
  const extended = zoomReset || pageIndicator !== undefined;

  // ── Collapse level: the smallest level whose single row fits the available width ──────────
  const layoutKey = `${[...visible].join(',')}|${extended ? 'x' : ''}`;
  const [layout, setLayout] = useState({ key: layoutKey, level: 0 });
  if (layout.key !== layoutKey) {
    setLayout({ key: layoutKey, level: 0 });
  }
  const level = layout.key === layoutKey ? layout.level : 0;
  const widths = useRef(new Map<string, number[]>());
  const fit = useRef<() => void>(() => undefined);
  useIsomorphicLayoutEffect(() => {
    fit.current = () => {
      const toolbar = toolbarRef.current;
      if (!toolbar) return;
      const available = availableWidth(toolbar);
      if (available <= 0) return;
      let measured = widths.current.get(layoutKey);
      if (!measured) {
        measured = [];
        widths.current.set(layoutKey, measured);
      }
      measured[level] = naturalWidth(toolbar);
      let next = level;
      // Expand when a roomier level is known to fit (it is re-measured once shown).
      while (next > 0 && (measured[next - 1] ?? Infinity) <= available) next -= 1;
      if (next === level && (measured[level] ?? 0) > available + 0.5 && level < MAX_LEVEL) {
        next = level + 1;
      }
      if (next !== level) setLayout({ key: layoutKey, level: next });
    };
    fit.current();
  });
  useEffect(() => {
    const toolbar = toolbarRef.current;
    const host = toolbar ? widthHost(toolbar) : null;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => fit.current());
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

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

  const collapsed = (COLLAPSED[level] ?? []).filter((action) => visible.has(action));
  const inline = (action: ToolbarAction) => visible.has(action) && !collapsed.includes(action);
  const menuItems: ToolbarMenuItem[] = collapsed.flatMap((action): ToolbarMenuItem[] => {
    if (action === 'zoomLevel') {
      return [
        {
          key: action,
          label: `${labels.resetZoom} (${zoomText})`,
          icon: <RestartIcon />,
          onSelect: api.resetZoom,
        },
      ];
    }
    const button = buttons[action];
    return button
      ? [
          {
            key: action,
            label: button.label,
            icon: button.icon,
            onSelect: button.onClick,
            disabled: button.disabled,
          },
        ]
      : [];
  });

  // Roving tab index: one tab stop for the whole toolbar; arrow keys move between controls.
  const focusable: FocusKey[] = DEFAULT_TOOLBAR_ACTIONS.filter((action) => {
    if (!inline(action) || action === 'pageIndicator') return false;
    if (action === 'zoomLevel') return zoomReset;
    const button = buttons[action];
    return button !== undefined && !button.disabled;
  });
  if (menuItems.length > 0) focusable.push('more');
  const tabStop =
    focusedAction !== null && focusable.includes(focusedAction) ? focusedAction : focusable[0];

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key) || !toolbarRef.current) {
      return;
    }
    // Toolbar-level controls only (menu items and the page input handle their own keys).
    const controls = [
      ...toolbarRef.current.querySelectorAll<HTMLButtonElement>('[data-action]:not(:disabled)'),
    ];
    const index = controls.indexOf(event.target as HTMLButtonElement);
    if (index === -1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const last = controls.length - 1;
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
    controls[next]?.focus();
  };

  const renderAction = (action: ToolbarAction) => {
    if (action === 'zoomLevel') {
      return zoomReset ? (
        <button
          key={action}
          type="button"
          className="rpv-toolbar__label rpv-toolbar__zoom rpv-zoom-reset"
          aria-label={`${labels.resetZoom} (${zoomText})`}
          title={labels.resetZoom}
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
      data-extended={extended ? '' : undefined}
      data-level={level}
      onKeyDown={handleKeyDown}
    >
      {GROUPS.map((group, index) => {
        const items = group.filter(inline);
        const withMenu = index === GROUPS.length - 1 && menuItems.length > 0;
        if (items.length === 0 && !withMenu) return null;
        return (
          <div
            key={GROUP_NAMES[index]}
            className="rpv-toolbar__group"
            data-group={GROUP_NAMES[index]}
          >
            {items.map(renderAction)}
            {withMenu && (
              <ToolbarMenu
                label={labels.moreActions}
                items={menuItems}
                placement={menuPlacement}
                tabIndex={tabStop === 'more' ? 0 : -1}
                onFocus={() => setFocusedAction('more')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The default toolbar: zoom, page navigation, fullscreen, rotate, download and print, on one
 * row. When the row does not fit, secondary actions collapse into a "More actions" menu. Usable
 * on its own, e.g. inside `renderToolbar`.
 */
export const PdfToolbar = memo(PdfToolbarImpl);
