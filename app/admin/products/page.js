"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  listCategories,
  listProducts,
} from "@/lib/endpoints";
import { adminDeleteProduct } from "@/lib/admin";
import { DEFAULT_SORT, SORT_OPTIONS } from "@/lib/catalog";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/hooks/useToast";
import { formatDate, friendlyError } from "@/lib/format";
import DataTable from "@/components/admin/DataTable";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";

const LIMIT = 12; // buyer list convention

function truncId(value) {
  const s = String(value ?? "");
  return s.length > 8 ? `${s.slice(0, 8)}…` : s || "—";
}

function stockBadge(stock) {
  const n = stock ?? 0;
  // UI-only thresholds (no backend rule): 0 = out, ≤5 = low.
  if (n <= 0) return <Badge variant="danger">Out of stock</Badge>;
  if (n <= 5) return <Badge variant="warning">Low ({n})</Badge>;
  return <Badge variant="success">{n} in stock</Badge>
;
}

// Query is the source of truth (URL-driven, buyer convention): Pagination
// links and back/forward all work without extra state sync.
function queryFor(searchParams, patch) {
  const qs = new URLSearchParams(searchParams.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v) qs.set(k, v);
    else qs.delete(k);
  }
  const s = qs.toString();
  return s ? `/admin/products?${s}` : "/admin/products";
}

const fetchCategories = () =>
  apiFetch(listCategories(), { auth: true, params: { limit: 200 } }).then(
    (res) => (Array.isArray(res?.data) ? res.data : [])
  );

export default function AdminProductsPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const sort = searchParams.get("sort") || DEFAULT_SORT;
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";

  // Debounced 300ms write to ?search= (buyer SearchBar pattern, replace).
  // key={search} below resets the draft on external URL changes
  // (back/forward) without a sync setState effect.
  const [draft, setDraft] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => {
      if (draft.trim() === search) return;
      router.replace(
        queryFor(searchParams, { search: draft.trim(), page: "" })
      );
    }, 300);
    return () => clearTimeout(t);
  }, [draft, search, searchParams, router]);

  const [retryKey, setRetryKey] = useState(0);
  // Optimistic delete override, pinned to the query it belongs to — a
  // filter/page change naturally drops it (no stale masks, no sync effects).
  const [override, setOverride] = useState(null); // { query, rows } | null
  const [target, setTarget] = useState(null); // product | null
  const [deleting, setDeleting] = useState(false);

  const cats = useAsyncData(fetchCategories);
  // { rows, total } travel together so filters never show a stale count.
  // State transitions happen in promise callbacks only (no sync setState).
  const result = useAsyncData(
    () =>
      apiFetch(listProducts(), {
        auth: true,
        params: { page, limit: LIMIT, search, sort, categoryId },
      })
        .then((res) => ({
          rows: Array.isArray(res?.data) ? res.data : [],
          total: typeof res?.total === "number" ? res.total : 0,
        }))
        .catch((err) => {
          console.error("[admin/products]", err);
          throw err;
        }),
    [page, search, sort, categoryId, retryKey]
  );
  const queryKey = `${page}|${search}|${sort}|${categoryId}|${retryKey}`;
  const rows = override && override.query === queryKey ? override.rows : (result.data?.rows ?? []);
  const total = result.data?.total ?? 0;
  const loading = result.loading;
  const error = result.error;

  const confirmDelete = async () => {
    if (!target) return;
    const snapshot = rows;
    setDeleting(true);
    // Optimistic remove; reverted below on failure.
    setOverride({ query: queryKey, rows: snapshot.filter((p) => p._id !== target._id) });
    try {
      // Path per backend source: DELETE /products/:id (NOT /delete/:_id —
      // that shape is categories-only). See products.routes.js:14.
      await apiFetch(adminDeleteProduct(target._id), { method: "DELETE", auth: true });
      toast.success("Product deleted");
      setTarget(null);
    } catch (err) {
      console.error("[admin/products]", err);
      setOverride({ query: queryKey, rows: snapshot });
      toast.error(friendlyError(err, "Could not delete product. Try again."));
    } finally {
      setDeleting(false);
    }
  };

  const categories = cats.data ?? [];

  const columns = [
    {
      key: "title",
      label: "Product",
      render: (p) => (
        <Link
          href={`/admin/products/${p._id}`}
          className="flex items-center gap-2 font-medium text-primary hover:underline"
        >
          {p.Images?.URLs?.[0]?.fileUrl && (
            <Image
              src={p.Images.URLs[0].fileUrl}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-sm object-cover"
            />
          )}
          {p.title}
        </Link>
      ),
    },
    {
      key: "price",
      label: "Price",
      render: (p) => p.appliedPrice ?? p.price ?? "—",
    },
    { key: "stock", label: "Stock", render: (p) => stockBadge(p.stock) },
    {
      key: "category",
      label: "Category",
      render: (p) => {
        const c = p.categoryId && typeof p.categoryId === "object" ? p.categoryId : null;
        return (
          <span title={String(p.categoryId ?? "")}>
            {c?.name || truncId(p.categoryId)}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Created",
      render: (p) => (p.createdAt ? formatDate(p.createdAt) : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (p) => (
        <Button variant="plain" onClick={() => setTarget(p)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Products</h1>
          <p className="mt-1 text-sm text-text-subdued" role="status">
            {total} product{total === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="primary" href="/admin/products/new">
          + New product
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="md:w-64">
          <label htmlFor="admin-product-search" className="sr-only">
            Search products
          </label>
          <input
            id="admin-product-search"
            key={search}
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search products"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-disabled"
          />
        </div>
        <div>
          <label htmlFor="admin-product-sort" className="sr-only">
            Sort products
          </label>
          <select
            id="admin-product-sort"
            value={sort}
            onChange={(e) =>
              router.replace(queryFor(searchParams, { sort: e.target.value, page: "" }))
            }
            className="h-10 rounded-md border border-border-strong bg-surface px-2 text-sm text-text"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-product-category" className="sr-only">
            Filter by category
          </label>
          <select
            id="admin-product-category"
            value={categoryId}
            onChange={(e) =>
              router.replace(queryFor(searchParams, { categoryId: e.target.value, page: "" }))
            }
            className="h-10 rounded-md border border-border-strong bg-surface px-2 text-sm text-text"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          emptyMessage="No products match these filters."
          onRetry={() => setRetryKey((k) => k + 1)}
          footer={
            total > 0 ? (
              <Pagination
                page={page}
                total={total}
                limit={LIMIT}
                // Strip page: Pagination appends ?page=N itself (page=2&page=1
                // duplicates were observed in dev logs before this fix).
                baseHref={queryFor(searchParams, { page: "" })}
              />
            ) : null
          }
        />
      </div>

      <DeleteConfirmModal
        open={target !== null}
        onClose={() => (deleting ? undefined : setTarget(null))}
        title="Delete this product?"
        itemName={target?.title}
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
