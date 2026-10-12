"use client";

import Button from "./Button";

export default function ErrorState({
  title = "Something went wrong",
  description = "",
  onRetry = null,
  icon = null,
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      {icon && (
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-danger-bg text-danger"
        >
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-text-subdued">{description}</p>
      )}
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
