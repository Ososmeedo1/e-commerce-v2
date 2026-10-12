import Container from "../../components/layout/Container";
import Skeleton from "../../components/ui/Skeleton";

export default function Loading() {
  return (
    <Container className="py-8">
      <Skeleton className="h-7 w-40" />
      <p className="sr-only">Loading products…</p>
      <div className="mt-4">
        <Skeleton.Grid count={12} />
      </div>
    </Container>
  );
}
