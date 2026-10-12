const ICONS = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="m8 12.5 2.5 2.5L16 9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7v6m0 4v.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 11v5m0-8.5v.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const TONES = {
  success: "text-success",
  error: "text-danger",
  info: "text-info",
};

export default function Toast({ toast, onClose }) {
  const { type, message, actionLabel, onAction } = toast;
  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full items-start gap-2 rounded-md border border-border bg-surface p-3 shadow-md"
    >
      <span aria-hidden="true" className={`mt-0.5 shrink-0 ${TONES[type]}`}>
        {ICONS[type]}
      </span>
      <p className="min-w-0 flex-1 text-sm text-text">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={() => {
            onAction();
            onClose();
          }}
          className="shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-sm p-0.5 text-text-subdued hover:text-text"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
