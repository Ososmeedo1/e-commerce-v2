import Container from "../../../components/layout/Container";
import ProductDetailSkeleton from "../../../components/catalog/ProductDetailSkeleton";

export default function Loading() {
  return (
    <Container className="py-8">
      <p className="sr-only">Loading product…</p>
      <ProductDetailSkeleton />
    </Container>
  );
}
