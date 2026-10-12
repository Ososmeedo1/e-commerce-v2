import Container from "../../components/layout/Container";
import ProductCard from "../../components/catalog/ProductCard";
import SearchBar from "../../components/catalog/SearchBar";
import SortSelect from "../../components/catalog/SortSelect";
import { DEFAULT_SORT } from "../../lib/catalog";
import FilterBar from "../../components/catalog/FilterBar";
import ActiveFilters from "../../components/catalog/ActiveFilters";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { serverGet } from "../../lib/serverApi";
import {
  listBrands,
  listCategories,
  listProducts,
  listSubCategories,
} from "../../lib/endpoints";

export const metadata = {
  title: "Products",
  description: "Browse and search the Masar product catalog.",
};

const LIMIT = 12;

function baseHref(params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `/products?${s}` : "/products";
}

export default async function ProductsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const page = Math.max(1, parseInt(sp.page, 10) || 1);
  const filters = {
    search: sp.search || "",
    sort: sp.sort || DEFAULT_SORT,
    categoryId: sp.categoryId || "",
    subCategoryId: sp.subCategoryId || "",
    brandId: sp.brandId || "",
  };

  let res = null;
  let cats = null;
  let subs = null;
  let brands = null;
  try {
    [res, cats, subs, brands] = await Promise.all([
      serverGet(listProducts(), {
        params: { page, limit: LIMIT, ...filters },
      }),
      serverGet(listCategories(), { params: { limit: 100 } }),
      serverGet(listSubCategories(), { params: { limit: 100 } }),
      serverGet(listBrands(), { params: { limit: 100 } }),
    ]);
  } catch (err) {
    console.error("[serverGet] ProductsPage: backend unavailable, rendering degraded state.", err);
  }

  if (!res || !cats || !subs || !brands) {
    return (
      <Container className="py-8">
        <h1 className="text-2xl font-bold text-text">Products</h1>
        <div className="mt-6">
          <EmptyState
            title="Catalog temporarily unavailable"
            description="We could not reach the catalog. Please try again in a bit."
          />
        </div>
      </Container>
    );
  }

  // Zero-result shape has no `total`/`page` keys (docs/API_REFERENCE.md §4.2).
  const products = res.data || [];
  const total = res.total ?? 0;
  const categories = cats.data || [];
  const subCategories = subs.data || [];
  const brandList = brands.data || [];

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-text">Products</h1>
      <p className="mt-1 text-sm text-text-subdued" role="status">
        {total} product{total === 1 ? "" : "s"}
      </p>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start">
        <div className="md:w-64 md:shrink-0">
          <SearchBar />
        </div>
        <div className="md:ml-auto">
          <SortSelect />
        </div>
      </div>

      <div className="mt-3">
        <FilterBar
          categories={categories}
          subCategories={subCategories}
          brands={brandList}
        />
      </div>

      <div className="mt-3">
        <ActiveFilters
          categories={categories}
          subCategories={subCategories}
          brands={brandList}
        />
      </div>

      {products.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No products found"
            description="Try a different search or clear the filters."
            action={<Button href="/products">Clear all</Button>}
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={page}
              total={total}
              limit={LIMIT}
              baseHref={baseHref(filters)}
            />
          </div>
        </>
      )}
    </Container>
  );
}
