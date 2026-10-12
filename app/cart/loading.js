import Container from "../../components/layout/Container";
import Skeleton from "../../components/ui/Skeleton";

export default function Loading() {
  return (
    <Container className="py-8">
      <div className="h-7 w-40 skeleton-shimmer rounded-sm" aria-hidden="true" />
      <p className="sr-only">Loading cart…</p>
      <div className="mt-6 space-y-3" aria-hidden="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </Container>
  );
}
