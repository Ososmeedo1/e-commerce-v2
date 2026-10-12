import Container from "../../components/layout/Container";
import SubCategoryTile from "../../components/catalog/SubCategoryTile";
import FilterBar from "../../components/catalog/FilterBar";
import EmptyState from "../../components/ui/EmptyState";
import { serverGet } from "../../lib/serverApi";
import { listCategories, listSubCategories } from "../../lib/endpoints";

export const metadata = {
  title: "Subcategories",
  description: "Browse the product subcategories on Masar.",
};

export default async function SubCategoriesPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const categoryId = sp.categoryId || "";

  let subs = null;
  let cats = null;
  try {
    [subs, cats] = await Promise.all([
      serverGet(listSubCategories(), { params: { limit: 100, categoryId } }),
      serverGet(listCategories(), { params: { limit: 100 } }),
    ]);
  } catch (err) {
    console.error("[serverGet] SubCategoriesPage: backend unavailable, rendering degraded state.", err);
  }

  if (!subs || !cats) {
    return (
      <Container className="py-8">
        <h1 className="text-2xl font-bold text-text">Subcategories</h1>
        <div className="mt-6">
          <EmptyState
            title="Catalog temporarily unavailable"
            description="We could not reach the catalog. Please try again in a bit."
          />
        </div>
      </Container>
    );
  }
  const subCategories = subs.data || [];
  const categories = cats.data || [];

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-text">Subcategories</h1>
      <div className="mt-4">
        <FilterBar categories={categories} visible={["category"]} />
      </div>
      {subCategories.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No subcategories found"
            description="Try a different category."
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          {subCategories.map((s) => (
            <SubCategoryTile key={s._id} subCategory={s} />
          ))}
        </div>
      )}
    </Container>
  );
}
