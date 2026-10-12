import Skeleton from "../ui/Skeleton";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";

/**
 * Plain-<table> admin grid. No library: pages own data + actions, this owns
 * the four states (loading / error / empty / populated) plus an optional
 * footer slot (callers pass their Pagination there).
 */
export default function DataTable({
  columns,
  rows,
  loading = false,
  error = null,
  emptyMessage = "Nothing here yet.",
  onRetry = null,
  footer = null,
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-hidden="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (error) {
    const text =
      typeof error === "string" ? error : error?.message || "Could not load data.";
    return <ErrorState description={text} onRetry={onRetry} />;
  }
  if (!rows || rows.length === 0) {
    return <EmptyState title="No results" description={emptyMessage} />;
  }
  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subdued">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="px-3 py-2.5 font-semibold text-text"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row._id || row.id || i}
                className="border-b border-border last:border-0 hover:bg-surface-subdued"
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-2.5 text-text">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
