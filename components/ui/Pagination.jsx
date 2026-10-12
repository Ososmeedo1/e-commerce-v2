"use client";

function pageHref(baseHref, page) {
  const sep = baseHref.includes("?") ? "&" : "?";
  return `${baseHref}${sep}page=${page}`;
}

function pageList(current, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const window = [current - 1, current, current + 1].filter(
    (p) => p > 1 && p < totalPages
  );
  const pages = [1, ...window, totalPages];
  const out = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export default function Pagination({
  page,
  total,
  limit,
  onPageChange = () => {},
  baseHref = "",
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;
  const items = pageList(page, totalPages);

  const btn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border bg-surface px-2 text-sm text-text hover:bg-surface-subdued disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-surface";
  const active = "border-primary bg-primary-subdued font-semibold";

  const renderItem = (item, key) => {
    if (item === "…") {
      return (
        <span
          key={key}
          aria-hidden="true"
          className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-text-disabled"
        >
          …
        </span>
      );
    }
    const isCurrent = item === page;
    if (baseHref) {
      return (
        <a
          key={key}
          href={pageHref(baseHref, item)}
          aria-current={isCurrent ? "page" : undefined}
          aria-label={`Page ${item}`}
          className={`${btn} ${isCurrent ? active : ""}`}
        >
          {item}
        </a>
      );
    }
    return (
      <button
        key={key}
        type="button"
        onClick={() => onPageChange(item)}
        disabled={isCurrent}
        aria-current={isCurrent ? "page" : undefined}
        aria-label={`Page ${item}`}
        className={`${btn} ${isCurrent ? active : ""}`}
      >
        {item}
      </button>
    );
  };

  const prevNext = (label, target, disabled) =>
    baseHref && !disabled ? (
      <a
        href={pageHref(baseHref, target)}
        aria-label={label}
        className={btn}
      >
        {label === "Previous page" ? "←" : "→"}
      </a>
    ) : (
      <button
        type="button"
        onClick={() => onPageChange(target)}
        disabled={disabled}
        aria-label={label}
        className={btn}
      >
        {label === "Previous page" ? "←" : "→"}
      </button>
    );

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {prevNext("Previous page", page - 1, page <= 1)}
      {items.map((item, i) => renderItem(item, i))}
      {prevNext("Next page", page + 1, page >= totalPages)}
    </nav>
  );
}
