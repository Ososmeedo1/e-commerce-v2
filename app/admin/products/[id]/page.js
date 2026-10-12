"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { getProductById } from "@/lib/endpoints";
import { adminDeleteProduct } from "@/lib/admin";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/hooks/useToast";
import { formatDate, friendlyError } from "@/lib/format";
import ProductGallery from "@/components/catalog/ProductGallery";
import PriceBlock from "@/components/catalog/PriceBlock";
import RatingStars from "@/components/catalog/RatingStars";
import SpecsTable from "@/components/catalog/SpecsTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";

function refName(ref, fallback) {
  if (ref && typeof ref === "object") return ref.name || ref.title || fallback;
  return fallback;
}

function truncId(value) {
  const s = String(value ?? "");
  return s.length > 8 ? `${s.slice(0, 8)}…` : s || "—";
}

const fetchProduct = (id) => () =>
  apiFetch(getProductById(id), { auth: true }).then((res) => res?.data || null);

export default function AdminProductDetailPage() {
  const toast = useToast();
  const router = useRouter();
  const { id } = useParams();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const product = useAsyncData(fetchProduct(id), [id, retryKey]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(adminDeleteProduct(id), { method: "DELETE", auth: true });
      toast.success("Product deleted");
      router.replace("/admin/products");
    } catch (err) {
      console.error("[admin/products]", err);
      toast.error(friendlyError(err, "Could not delete product. Try again."));
    } finally {
      setDeleting(false);
    }
  };

  if (product.loading) {
    return (
      <div>
        <Skeleton className="h-7 w-48" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }
  if (product.error || !product.data) {
    return (
      <div>
        <Link href="/admin/products" className="text-sm font-medium text-primary hover:underline">
          ← Back to products
        </Link>
        <div className="mt-4">
          <ErrorState
            description={product.error ? friendlyError(product.error, "Could not load product.") : "Product not found."}
            onRetry={() => setRetryKey((k) => k + 1)}
          />
        </div>
      </div>
    );
  }

  const p = product.data;
  const images = p.Images?.URLs || [];
  const inStock = (p.stock ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/products" className="text-sm font-medium text-primary hover:underline">
          ← Back to products
        </Link>
        <Button variant="plain" onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </div>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div>
          <ProductGallery images={images} title={p.title} />
          {p.overview && (
            <p className="mt-4 text-sm leading-6 text-text">{p.overview}</p>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">{p.title}</h1>
          {p.rating !== undefined && p.rating !== null && (
            <div className="mt-2">
              <RatingStars rating={p.rating} />
            </div>
          )}
          <div className="mt-3">
            <PriceBlock
              price={p.price}
              appliedPrice={p.appliedPrice}
              appliedDiscount={p.appliedDiscount}
            />
          </div>
          <div className="mt-3">
            <Badge variant={inStock ? "success" : "danger"}>
              {inStock ? `${p.stock} in stock` : "Out of stock"}
            </Badge>
          </div>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-text-subdued">Category</dt>
              <dd className="text-text" title={String(p.categoryId ?? "")}>
                {refName(p.categoryId, truncId(p.categoryId))}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-text-subdued">Subcategory</dt>
              <dd className="text-text" title={String(p.subCategoryId ?? "")}>
                {refName(p.subCategoryId, truncId(p.subCategoryId))}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-text-subdued">Brand</dt>
              <dd className="text-text" title={String(p.brandId ?? "")}>
                {refName(p.brandId, truncId(p.brandId))}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-text-subdued">Created</dt>
              <dd className="text-text">{p.createdAt ? formatDate(p.createdAt) : "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-text-subdued">Updated</dt>
              <dd className="text-text">{p.updatedAt ? formatDate(p.updatedAt) : "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <SpecsTable specs={p.specs} />

      <DeleteConfirmModal
        open={confirmOpen}
        onClose={() => (deleting ? undefined : setConfirmOpen(false))}
        title="Delete this product?"
        itemName={p.title}
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
