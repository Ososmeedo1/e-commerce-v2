"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import {
  listBrands,
  listCategories,
  listProducts,
  listSubCategories,
} from "@/lib/endpoints";
import { listAllReviews } from "@/lib/admin";
import { useAsyncData } from "@/hooks/useAsyncData";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/ui/Badge";
import {
  BrandsIcon,
  CategoriesIcon,
  ProductsIcon,
  ReviewsIcon,
  SubcategoriesIcon,
} from "@/components/admin/Icons";

// Module-scope fetchers (stable identity → each effect below runs once).
// All admin reads go through apiFetch with auth:true — serverGet is never
// used here because the token lives in localStorage (client-only).
const fetchTotal = (builder) => () =>
  apiFetch(builder(), { auth: true, params: { limit: 1 } }).then(
    (res) => (typeof res?.total === "number" ? res.total : 0)
  );

const fetchPendingReviews = () =>
  apiFetch(listAllReviews(), { auth: true })
    .then((res) => {
      const data = Array.isArray(res?.data) ? res.data : [];
      // reviewStatus values per backend enum (pending/accepted/rejected).
      return data.filter((r) => r?.reviewStatus === "pending").length;
    })
    .catch((err) => {
      // Empty collection answers 404 "No Reviews yet" — that's zero pending,
      // not a failure (same rule as the reviews page).
      if (err?.status === 404) return 0;
      throw err;
    });

const fetchRecentProducts = () =>
  apiFetch(listProducts(), {
    auth: true,
    params: { sort: "-createdAt", limit: 5 },
  }).then((res) => (Array.isArray(res?.data) ? res.data : []));

// One fetch, one state triple. Sections never share state, so a failed card
// can't blank its siblings (no fail-fast Promise.all anywhere here).
// Per-page log tag: the shared hook stays pure, pages own their logging.
const logged = (tag, fetcher) => () =>
  fetcher().catch((err) => {
    console.error(tag, err);
    throw err;
  });

const TAG = "[admin/overview]";

const RECENT_COLUMNS = [
  {
    key: "title",
    label: "Product",
    render: (p) => (
      <span className="flex items-center gap-2">
        {p.Images?.URLs?.[0]?.fileUrl && (
          <Image
            src={p.Images.URLs[0].fileUrl}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-sm object-cover"
          />
        )}
        <span className="font-medium">{p.title}</span>
      </span>
    ),
  },
  {
    key: "price",
    label: "Price",
    render: (p) => (p.appliedPrice ?? p.price ?? "—"),
  },
  {
    key: "stock",
    label: "Stock",
    render: (p) => (
      <Badge variant={(p.stock ?? 0) > 0 ? "success" : "danger"}>
        {(p.stock ?? 0) > 0 ? `${p.stock} in stock` : "Out of stock"}
      </Badge>
    ),
  },
];

export default function AdminOverviewPage() {
  const products = useAsyncData(logged(TAG, fetchTotal(listProducts)));
  const categories = useAsyncData(logged(TAG, fetchTotal(listCategories)));
  const subcategories = useAsyncData(logged(TAG, fetchTotal(listSubCategories)));
  const brands = useAsyncData(logged(TAG, fetchTotal(listBrands)));
  const pending = useAsyncData(logged(TAG, fetchPendingReviews));
  const [retryKey, setRetryKey] = useState(0);
  const recent = useAsyncData(logged(TAG, fetchRecentProducts), [retryKey]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Overview</h1>
      <p className="mt-1 text-sm text-text-subdued">
        Live storefront counts and the newest arrivals.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-5 lg:grid-cols-3">
        <StatCard
          label="Products"
          value={products.data}
          icon={<ProductsIcon />}
          loading={products.loading}
          error={products.error}
        />
        <StatCard
          label="Categories"
          value={categories.data}
          icon={<CategoriesIcon />}
          loading={categories.loading}
          error={categories.error}
        />
        <StatCard
          label="Subcategories"
          value={subcategories.data}
          icon={<SubcategoriesIcon />}
          loading={subcategories.loading}
          error={subcategories.error}
        />
        <StatCard
          label="Brands"
          value={brands.data}
          icon={<BrandsIcon />}
          loading={brands.loading}
          error={brands.error}
        />
        <StatCard
          label="Pending reviews"
          value={pending.data}
          icon={<ReviewsIcon />}
          loading={pending.loading}
          error={pending.error}
        />
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Recent products</h2>
          <Link
            href="/admin/products"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        <DataTable
          columns={RECENT_COLUMNS}
          rows={recent.data}
          loading={recent.loading}
          error={recent.error}
          emptyMessage="No products yet."
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}
