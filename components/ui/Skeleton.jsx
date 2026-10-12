export default function Skeleton({ className = "", ...rest }) {
  return (
    <div
      aria-hidden="true"
      className={["skeleton-shimmer h-4 w-full rounded-sm", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

Skeleton.Card = function SkeletonCard({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "overflow-hidden rounded-md border border-border bg-surface shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="skeleton-shimmer aspect-square w-full" />
      <div className="space-y-2 p-4">
        <div className="skeleton-shimmer h-4 w-3/4 rounded-sm" />
        <div className="skeleton-shimmer h-4 w-1/2 rounded-sm" />
      </div>
    </div>
  );
};

Skeleton.Grid = function SkeletonGrid({ count = 8, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton.Card key={i} />
      ))}
    </div>
  );
};
