export default function EmptyState({
  icon = null,
  title,
  titleAs: TitleAs = "h2",
  description = "",
  action = null,
  className = "",
}) {
  return (
    <div
      className={["mx-auto max-w-md px-4 py-12 text-center", className]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-surface-subdued text-text-subdued"
        >
          {icon}
        </div>
      )}
      <TitleAs className="text-lg font-semibold text-text">{title}</TitleAs>
      {description && (
        <p className="mt-2 text-sm text-text-subdued">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
