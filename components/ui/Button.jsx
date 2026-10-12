import Link from "next/link";

const VARIANTS = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed",
  secondary:
    "border border-border-strong bg-surface text-text hover:bg-surface-subdued",
  plain: "text-primary hover:underline",
  destructive: "bg-danger text-white hover:brightness-95 active:brightness-90",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  href = null,
  as: As = null,
  className = "",
  disabled = false,
  children,
  ...rest
}) {
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? "w-full" : "",
    loading || disabled ? "cursor-not-allowed opacity-60" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading && <Spinner />}
      {children}
    </>
  );

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <span className={classes} aria-disabled="true" {...rest}>
        {content}
      </span>
    );
  }
  if (As) {
    return (
      <As className={classes} disabled={disabled || loading} {...rest}>
        {content}
      </As>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
