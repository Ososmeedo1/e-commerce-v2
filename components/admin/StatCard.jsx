import Skeleton from "../ui/Skeleton";

/**
 * Admin stat card: number + label + icon. Per-card states — a failed card
 * shows a dash plus an inline note, never blanks its siblings.
 */
export default function StatCard({ label, value, icon, loading = false, error = null }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-subdued text-primary"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-text-subdued">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold text-text" aria-live="polite">
              {error ? "—" : value}
            </p>
          )}
        </div>
      </div>
      {error && !loading && (
        <p role="status" className="mt-2 text-xs text-text-subdued">
          Couldn&apos;t load — showing — .
        </p>
      )}
    </div>
  );
}
