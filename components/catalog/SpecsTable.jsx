function humanize(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function SpecsTable({ specs }) {
  const entries = specs ? Object.entries(specs) : [];
  if (!entries.length) return null;
  return (
    <section aria-labelledby="specs-heading" className="mt-8">
      <h2 id="specs-heading" className="text-lg font-semibold text-text">
        Specifications
      </h2>
      <dl className="mt-3 overflow-hidden rounded-md border border-border bg-surface shadow-sm">
        {entries.map(([key, value], i) => (
          <div
            key={key}
            className={["grid grid-cols-2 gap-2 px-4 py-2", i % 2 ? "" : "bg-surface-subdued"].join(" ")}
          >
            <dt className="break-words text-sm text-text-subdued">{humanize(key)}</dt>
            <dd className="min-w-0 break-words text-sm text-text">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
