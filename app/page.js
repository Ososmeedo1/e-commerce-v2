import Link from "next/link";
import Container from "../components/layout/Container";
import CategoryTile from "../components/catalog/CategoryTile";
import BrandCard from "../components/catalog/BrandCard";
import ProductCard from "../components/catalog/ProductCard";
import EmptyState from "../components/ui/EmptyState";
import HeroTagline from "../components/layout/HeroTagline";
import { serverGet } from "../lib/serverApi";
import { listBrands, listCategories, listProducts } from "../lib/endpoints";

export const metadata = {
  title: "Masar — Shop electronics, home, food & more",
  description: "Browse products, brands, and categories on Masar.",
};

function SectionHead({ title, href }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <Link href={href} className="text-sm font-medium text-primary hover:underline">
        View all →
      </Link>
    </div>
  );
}

export default async function Home() {
  let cats = null;
  let brands = null;
  let arrivals = null;
  try {
    [cats, brands, arrivals] = await Promise.all([
      serverGet(listCategories(), { params: { limit: 8 } }),
      serverGet(listBrands(), { params: { limit: 12 } }),
      serverGet(listProducts(), { params: { sort: "-createdAt", limit: 8 } }),
    ]);
  } catch (err) {
    console.error("[serverGet] Home: backend unavailable, rendering degraded state.", err);
  }

  if (!cats || !brands || !arrivals) {
    return (
      <Container className="py-10">
        <h1 className="text-2xl font-bold text-text">Masar</h1>
        <HeroTagline />
        <div className="mt-8">
          <EmptyState
            title="Catalog temporarily unavailable"
            description="We could not reach the catalog. Please try again in a bit."
          />
        </div>
      </Container>
    );
  }
  const categories = cats.data || [];
  const brandList = brands.data || [];
  const products = arrivals.data || [];

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold text-text">Masar</h1>
      <HeroTagline />

      <section aria-labelledby="home-categories" className="mt-8">
        <div id="home-categories">
          <SectionHead title="Shop by category" href="/categories" />
        </div>
        {categories.length === 0 ? (
          <EmptyState title="No categories yet" description="Check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((c) => (
              <CategoryTile key={c._id} category={c} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="home-brands" className="mt-10">
        <div id="home-brands">
          <SectionHead title="Featured brands" href="/brands" />
        </div>
        {brandList.length === 0 ? (
          <EmptyState title="No brands yet" description="Check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
            {brandList.map((b) => (
              <BrandCard key={b._id} brand={b} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="home-arrivals" className="mt-10">
        <div id="home-arrivals">
          <SectionHead title="New arrivals" href="/products" />
        </div>
        {products.length === 0 ? (
          <EmptyState title="No products yet" description="Check back soon." />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}
