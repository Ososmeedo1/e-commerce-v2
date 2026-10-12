import Container from "../../components/layout/Container";
import Skeleton from "../../components/ui/Skeleton";

export default function Loading() {
  return (
    <Container className="py-8">
      <Skeleton className="h-7 w-32" />
      <p className="sr-only">Loading brands…</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton.Card key={i} />
        ))}
      </div>
    </Container>
  );
}
