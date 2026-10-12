const VARIANTS = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  subdued: "bg-surface-subdued text-text-subdued",
};

export default function Badge({
  variant = "subdued",
  className = "",
  children,
  ...rest
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium",
        VARIANTS[variant] || VARIANTS.subdued,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
