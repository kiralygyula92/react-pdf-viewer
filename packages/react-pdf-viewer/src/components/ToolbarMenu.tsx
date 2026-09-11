import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { MoreVertIcon } from './icons.js';

/** An entry of the toolbar's overflow menu. */
export interface ToolbarMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean | undefined;
}

interface ToolbarMenuProps {
  /** Accessible name of the button and the menu. */
  label: string;
  items: readonly ToolbarMenuItem[];
  /** Opens above the toolbar (`'top'`, toolbar at the bottom) or below it. */
  placement: 'top' | 'bottom';
  tabIndex: number;
  onFocus: () => void;
}

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

/**
 * The "More actions" button and its menu (WAI-ARIA menu button pattern): arrow keys, Home and
 * End move between items, `Esc` closes and returns focus to the button, `Tab` or a click outside
 * closes it.
 */
export function ToolbarMenu({ label, items, placement, tabIndex, onFocus }: ToolbarMenuProps) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<false | 'first' | 'last'>(false);

  const enabledItems = () => [
    ...(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []),
  ];

  useEffect(() => {
    if (!open) return;
    const initial = enabledItems();
    (open === 'last' ? initial.at(-1) : initial[0])?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = enabledItems();
    const index = enabled.indexOf(event.target as HTMLElement);
    const last = enabled.length - 1;
    let next: HTMLElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = enabled[index >= last ? 0 : index + 1];
        break;
      case 'ArrowUp':
        next = enabled[index <= 0 ? last : index - 1];
        break;
      case 'Home':
        next = enabled[0];
        break;
      case 'End':
        next = enabled[last];
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case 'Tab':
        close(false);
        return;
      default:
        return;
    }
    // Keep the toolbar's own arrow-key handling and the viewer shortcuts out of the menu.
    event.preventDefault();
    event.stopPropagation();
    next?.focus();
  };

  return (
    <div className="rpv-menu-anchor">
      <button
        ref={buttonRef}
        type="button"
        className="rpv-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(open)}
        aria-controls={open ? menuId : undefined}
        data-action="more"
        tabIndex={tabIndex}
        onFocus={onFocus}
        onClick={() => setOpen((current) => (current ? false : 'first'))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(event.key === 'ArrowUp' ? 'last' : 'first');
          }
        }}
      >
        <MoreVertIcon />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          className="rpv-menu"
          data-placement={placement}
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className="rpv-menu__item"
              tabIndex={-1}
              aria-disabled={item.disabled || undefined}
              onClick={() => {
                if (item.disabled) return;
                close(true);
                item.onSelect();
              }}
            >
              <span className="rpv-menu__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="rpv-menu__label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
