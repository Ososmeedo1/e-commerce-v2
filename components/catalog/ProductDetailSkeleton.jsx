import Skeleton from "../ui/Skeleton";

export default function ProductDetailSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex gap-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="skeleton-shimmer aspect-square w-full rounded-md" />
          <div className="mt-2 flex gap-2">
            <div className="skeleton-shimmer h-16 w-16 rounded-sm" />
            <div className="skeleton-shimmer h-16 w-16 rounded-sm" />
            <div className="skeleton-shimmer h-16 w-16 rounded-sm" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-7 w-3/4" />
          <Skeleton className="mt-2 h-4 w-32" />
          <Skeleton className="mt-3 h-6 w-40" />
          <Skeleton className="mt-3 h-5 w-24" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </div>
      <div className="mt-8">
        <Skeleton className="h-6 w-40" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
