"use client";

import { useId, useState } from "react";

export default function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
}) {
  const inputId = useId();
  const [draft, setDraft] = useState(null);
  const shown = draft ?? value;

  const clamp = (n) => {
    if (Number.isNaN(n)) return min;
    let v = Math.floor(n);
    if (v < min) v = min;
    if (max !== undefined && max !== null && v > max) v = max;
    return v;
  };

  const commit = (n) => {
    const v = clamp(n);
    setDraft(null);
    if (v !== value) onChange(v);
  };

  return (
    <div className="inline-flex items-center rounded-md border border-border-strong bg-surface">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="flex h-9 w-9 items-center justify-center text-lg text-text hover:bg-surface-subdued disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-surface"
      >
        −
      </button>
      <label htmlFor={inputId} className="sr-only">
        Quantity
      </label>
      <input
        id={inputId}
        type="number"
        min={min}
        max={max}
        value={shown}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value === "" ? "" : Number(e.target.value))}
        onBlur={() => commit(draft === "" || draft === null ? value : draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-label="Quantity"
        className="h-9 w-12 border-x border-border bg-surface text-center text-sm text-text [appearance:textfield] disabled:text-text-disabled [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || (max !== undefined && max !== null && value >= max)}
        onClick={() => onChange(clamp(value + 1))}
        className="flex h-9 w-9 items-center justify-center text-lg text-text hover:bg-surface-subdued disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-surface"
      >
        +
      </button>
    </div>
  );
}
