import { memo, type ReactNode } from 'react';
import type { ToolbarAction } from '../types.js';

interface ToolbarButtonProps {
  action: ToolbarAction;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean | undefined;
  tabIndex: number;
  onFocus: (action: ToolbarAction) => void;
}

function ToolbarButtonImpl({
  action,
  label,
  icon,
  onClick,
  disabled,
  tabIndex,
  onFocus,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className="rpv-button"
      aria-label={label}
      data-action={action}
      disabled={disabled}
      tabIndex={tabIndex}
      onClick={onClick}
      onFocus={() => onFocus(action)}
    >
      {icon}
    </button>
  );
}

/** Round icon button used by the toolbar. */
export const ToolbarButton = memo(ToolbarButtonImpl);
