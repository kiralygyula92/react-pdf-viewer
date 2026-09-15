import { useControllableState } from '@kiralygyula92/react-pdf-viewer';
import { useState } from 'react';

interface CounterProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
}

/** A component with the same value / defaultValue / onValueChange contract as the viewer. */
function Counter({ value, defaultValue = 0, onValueChange }: CounterProps) {
  const [count, setCount] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
    name: 'value',
  });
  return (
    <button
      type="button"
      className="demo-button"
      onClick={() => setCount((previous) => previous + 1)}
    >
      Clicked {count} times
    </button>
  );
}

export default function Demo() {
  const [controlled, setControlled] = useState(10);

  return (
    <div className="demo-controls">
      <span>Uncontrolled:</span>
      <Counter defaultValue={0} />
      <span>Controlled (capped at 12):</span>
      <Counter value={controlled} onValueChange={(next) => setControlled(Math.min(12, next))} />
    </div>
  );
}
