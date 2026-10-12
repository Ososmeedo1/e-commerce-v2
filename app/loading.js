import Container from "../components/layout/Container";
import Skeleton from "../components/ui/Skeleton";

export default function Loading() {
  return (
    <Container className="py-10">
      <Skeleton className="h-7 w-40" />
      <p className="sr-only">Loading…</p>
      <div className="mt-8">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
      <div className="mt-10">
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton.Grid count={8} />
      </div>
    </Container>
  );
}
