"use client";

import { useId } from "react";

export default function Input({
  label,
  error = "",
  helper = "",
  id = "",
  type = "text",
  value,
  onChange,
  disabled = false,
  required = false,
  className = "",
  ...rest
}) {
  const autoId = useId();
  const inputId = id || `input-${autoId}`;
  const describedBy = error
    ? `${inputId}-error`
    : helper
      ? `${inputId}-helper`
      : undefined;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-text"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-danger">
              {" *"}
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={[
          "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text",
          "placeholder:text-text-disabled",
          "disabled:cursor-not-allowed disabled:bg-surface-subdued disabled:text-text-disabled",
          error ? "border-danger" : "border-border-strong",
        ].join(" ")}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : helper ? (
        <p id={`${inputId}-helper`} className="mt-1 text-xs text-text-subdued">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
