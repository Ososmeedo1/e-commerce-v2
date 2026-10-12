import Container from "../../../components/layout/Container";
import Skeleton from "../../../components/ui/Skeleton";

export default function Loading() {
  return (
    <Container className="py-8">
      <div className="h-7 w-56 skeleton-shimmer rounded-sm" aria-hidden="true" />
      <p className="sr-only">Loading order…</p>
      <div className="mt-6 space-y-3" aria-hidden="true">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </Container>
  );
}
