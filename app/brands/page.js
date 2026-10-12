import Container from "../../components/layout/Container";
import BrandCard from "../../components/catalog/BrandCard";
import SearchBar from "../../components/catalog/SearchBar";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import { serverGet } from "../../lib/serverApi";
import { listBrands } from "../../lib/endpoints";

export const metadata = {
  title: "Brands",
  description: "Browse the brands available on Masar.",
};

const LIMIT = 12;

export default async function BrandsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const page = Math.max(1, parseInt(sp.page, 10) || 1);
  const search = sp.search || "";

  let res = null;
  try {
    res = await serverGet(listBrands(), {
      params: { page, limit: LIMIT, search },
    });
  } catch (err) {
    console.error("[serverGet] BrandsPage: backend unavailable, rendering degraded state.", err);
  }
  if (res === null) {
    return (
      <Container className="py-8">
        <h1 className="text-2xl font-bold text-text">Brands</h1>
        <div className="mt-6">
          <EmptyState
            title="Catalog temporarily unavailable"
            description="We could not reach the catalog. Please try again in a bit."
          />
        </div>
      </Container>
    );
  }
  const brands = res.data || [];
  // Backend total is unreliable when filtered (Phase 4 finding); use data.length
  const isFiltered = Boolean(search);
  const total = isFiltered ? brands.length : (res.total ?? 0);

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  const baseHref = qs.toString() ? `/brands?${qs.toString()}` : "/brands";

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-text">Brands</h1>
      <p className="mt-1 text-sm text-text-subdued" role="status">
        {total} brand{total === 1 ? "" : "s"}
      </p>
      <div className="mt-4 md:w-64">
        <SearchBar placeholder="Search brands" />
      </div>
      {brands.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No brands found"
            description="Try a different search."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
            {brands.map((b) => (
              <BrandCard key={b._id} brand={b} />
            ))}
          </div>
          {!isFiltered && (
            <div className="mt-8">
              <Pagination page={page} total={total} limit={LIMIT} baseHref={baseHref} />
            </div>
          )}
        </>
      )}
    </Container>
  );
}
