"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Button from "../ui/Button";
import Drawer from "../ui/Drawer";

const selectCls =
  "h-10 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-text";

function setParam(searchParams, pathname, router, key, value) {
  const qs = new URLSearchParams(searchParams.toString());
  if (value) qs.set(key, value);
  else qs.delete(key);
  qs.delete("page");
  const next = qs.toString();
  router.replace(next ? `${pathname}?${next}` : pathname);
}

function FilterSelects({ categories, subCategories, brands, visible, searchParams, pathname, router }) {
  const categoryId = searchParams.get("categoryId") || "";
  const subCategoryId = searchParams.get("subCategoryId") || "";
  const brandId = searchParams.get("brandId") || "";
  const visibleSubs = categoryId
    ? subCategories.filter((s) => String(s.categoryId) === categoryId)
    : subCategories;
  const cols = visible.length >= 3 ? "sm:grid-cols-3" : visible.length === 2 ? "sm:grid-cols-2" : "";

  return (
    <div className={`grid gap-2 ${cols}`}>
      {visible.includes("category") && (
      <div>
        <label htmlFor="filter-category" className="mb-1 block text-xs font-medium text-text-subdued">
          Category
        </label>
        <select
          id="filter-category"
          value={categoryId}
          onChange={(e) => {
            // Changing category invalidates the sub-category choice.
            const qs = new URLSearchParams(searchParams.toString());
            if (e.target.value) qs.set("categoryId", e.target.value);
            else qs.delete("categoryId");
            qs.delete("subCategoryId");
            qs.delete("page");
            const next = qs.toString();
            router.replace(next ? `${pathname}?${next}` : pathname);
          }}
          className={selectCls}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      )}
      {visible.includes("subCategory") && (
      <div>
        <label htmlFor="filter-subcategory" className="mb-1 block text-xs font-medium text-text-subdued">
          Sub-category
        </label>
        <select
          id="filter-subcategory"
          value={subCategoryId}
          onChange={(e) => setParam(searchParams, pathname, router, "subCategoryId", e.target.value)}
          className={selectCls}
        >
          <option value="">All sub-categories</option>
          {visibleSubs.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      )}
      {visible.includes("brand") && (
      <div>
        <label htmlFor="filter-brand" className="mb-1 block text-xs font-medium text-text-subdued">
          Brand
        </label>
        <select
          id="filter-brand"
          value={brandId}
          onChange={(e) => setParam(searchParams, pathname, router, "brandId", e.target.value)}
          className={selectCls}
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      )}
    </div>
  );
}

// Products-page filter row. Dropdown data is fetched SERVER-SIDE by the page
// and passed as props — this component only reads/writes the URL.
// `visible` narrows the selects (subcategories page uses ["category"]).
export default function FilterBar({ categories = [], subCategories = [], brands = [], visible = ["category", "subCategory", "brand"] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const clearAll = () => {
    const qs = new URLSearchParams(searchParams.toString());
    for (const k of ["search", "categoryId", "subCategoryId", "brandId", "page"]) {
      qs.delete(k);
    }
    const next = qs.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
    setDrawerOpen(false);
  };

  return (
    <div>
      {/* Desktop: inline row */}
      <div className="hidden md:block">
        <FilterSelects
          categories={categories}
          subCategories={subCategories}
          brands={brands}
          visible={visible}
          searchParams={searchParams}
          pathname={pathname}
          router={router}
        />
        <div className="mt-2">
          <Button variant="plain" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      </div>
      {/* Mobile: collapsed into a Drawer */}
      <div className="md:hidden">
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
          Filters
        </Button>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters">
          <div className="flex items-center justify-between border-b border-border p-4">
            <span className="text-base font-semibold text-text">Filters</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close filters"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-subdued hover:bg-surface-subdued hover:text-text"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="p-4">
            <FilterSelects
              categories={categories}
              subCategories={subCategories}
              brands={brands}
              visible={visible}
              searchParams={searchParams}
              pathname={pathname}
              router={router}
            />
            <div className="mt-3">
              <Button variant="plain" onClick={clearAll}>
                Clear all
              </Button>
            </div>
          </div>
        </Drawer>
      </div>
    </div>
  );
}
