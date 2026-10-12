import Container from "../../components/layout/Container";
import CategoryTile from "../../components/catalog/CategoryTile";
import EmptyState from "../../components/ui/EmptyState";
import { serverGet } from "../../lib/serverApi";
import { listCategories } from "../../lib/endpoints";

export const metadata = {
  title: "Categories",
  description: "Browse the product categories on Masar.",
};

export default async function CategoriesPage() {
  let categories = null;
  try {
    const res = await serverGet(listCategories(), { params: { limit: 100 } });
    categories = res?.data || [];
  } catch (err) {
    console.error("[serverGet] CategoriesPage: backend unavailable, rendering degraded state.", err);
  }

  if (categories === null) {
    return (
      <Container className="py-8">
        <h1 className="text-2xl font-bold text-text">Categories</h1>
        <div className="mt-6">
          <EmptyState
            title="Catalog temporarily unavailable"
            description="We could not reach the catalog. Please try again in a bit."
          />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-text">Categories</h1>
      {categories.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No categories yet" description="Check back soon." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          {categories.map((c) => (
            <CategoryTile key={c._id} category={c} />
          ))}
        </div>
      )}
    </Container>
  );
}
