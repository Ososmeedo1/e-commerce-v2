"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { getProductById } from "@/lib/endpoints";
import { adminDeleteProduct, adminUpdateProduct } from "@/lib/admin";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/hooks/useToast";
import {
  fieldErrorsFromStack,
  formatDate,
  friendlyError,
  serverFormError,
} from "@/lib/format";
import { productFormErrors } from "@/lib/validation";
import ProductGallery from "@/components/catalog/ProductGallery";
import PriceBlock from "@/components/catalog/PriceBlock";
import RatingStars from "@/components/catalog/RatingStars";
import SpecsTable from "@/components/catalog/SpecsTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import ProductFields from "@/components/admin/ProductFields";
import { specsError, specsToObject, specsToRows } from "@/components/admin/SpecsEditor";

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
  // In-place edit (no separate route): the detail fetch above already holds
  // every field, and the gallery stays visible for reference while editing.
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(null); // seeded from product on edit
  const [specsRows, setSpecsRows] = useState([]);
  const [editErrors, setEditErrors] = useState({});
  const [editBanner, setEditBanner] = useState("");
  const [saving, setSaving] = useState(false);
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

  const startEdit = (p) => {
    // Stored discount types are title-case ("Percentage") while the update
    // Joi contract wants uppercase — normalize for the radio, and compare
    // normalized on save so untouched discounts are never re-sent (the
    // Mongoose enum only accepts the title-case values; re-sending the
    // uppercase contract value would 500 — backend bug, see README).
    const storedType = String(p.appliedDiscount?.type ?? "PERCENTAGE").toUpperCase();
    setValues({
      title: p.title ?? "",
      overview: p.overview ?? "",
      price: p.price ?? "",
      discountAmount: p.appliedDiscount?.amount ?? 0,
      discountType: storedType === "FIXED" ? "FIXED" : "PERCENTAGE",
      stock: p.stock ?? "",
    });
    setSpecsRows(specsToRows(p.specs));
    setEditErrors({});
    setEditBanner("");
    setEditing(true);
  };

  const onField = (key) => (e) => {
    const v = e.target.value;
    setValues((prev) => ({ ...prev, [key]: v }));
    setEditErrors((prev) => ({ ...prev, [key]: undefined }));
    setEditBanner("");
  };

  const saveEdit = async (e, p) => {
    e.preventDefault();
    const local = productFormErrors(values);
    const specsErr = specsError(specsRows);
    if (specsErr) local.specs = specsErr;
    if (Object.values(local).some(Boolean)) {
      setEditErrors(local);
      return;
    }
    // Partial JSON update (NOT FormData — PUT has no multer): only changed
    // fields travel. Specs go as an OBJECT here (update schema says object;
    // create takes a JSON string — asymmetric by backend design).
    const body = {};
    const put = (k, v) => {
      body[k] = v;
    };
    if (values.title.trim() !== (p.title ?? "")) put("title", values.title.trim());
    if (values.overview.trim() !== (p.overview ?? "")) put("overview", values.overview.trim());
    if (Number(values.price) !== Number(p.price)) put("price", Number(values.price));
    if (Number(values.stock) !== Number(p.stock)) put("stock", Number(values.stock));
    const origDiscount = p.appliedDiscount ?? {};
    const origType = String(origDiscount.type ?? "PERCENTAGE").toUpperCase();
    // Send each discount field ONLY if it changed: omitting an unchanged
    // type keeps the stored title-case value, which is the only spelling
    // Mongoose accepts (sending the uppercase contract value 500s).
    if (Number(values.discountAmount) !== Number(origDiscount.amount ?? 0)) {
      put("discountAmount", Number(values.discountAmount));
    }
    if (values.discountType !== origType) {
      put("discountType", values.discountType);
    }
    const specsObj = specsToObject(specsRows);
    if (JSON.stringify(specsObj) !== JSON.stringify(p.specs ?? {})) {
      put("specs", specsObj);
    }
    if (Object.keys(body).length === 0) {
      setEditBanner("No changes to save.");
      return;
    }
    setSaving(true);
    setEditErrors({});
    setEditBanner("");
    try {
      await apiFetch(adminUpdateProduct(id), {
        method: "PUT",
        auth: true,
        body,
      });
      toast.success("Product updated");
      setEditing(false);
      setRetryKey((k) => k + 1);
    } catch (err) {
      console.error("[admin/products]", err);
      const fields = fieldErrorsFromStack(err?.data?.stack);
      const top = fields[""];
      delete fields[""];
      setEditErrors(fields);
      setEditBanner(top || serverFormError(err, "Could not update product. Try again."));
    } finally {
      setSaving(false);
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
        <span className="inline-flex gap-2">
          {!editing && (
            <Button variant="secondary" size="sm" onClick={() => startEdit(p)}>
              Edit
            </Button>
          )}
          <Button variant="plain" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </span>
      </div>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div>
          <ProductGallery images={images} title={p.title} />
          {!editing && p.overview && (
            <p className="mt-4 text-sm leading-6 text-text">{p.overview}</p>
          )}
          {editing && (
            <p className="mt-4 rounded-md bg-surface-subdued px-3 py-2 text-sm text-text-subdued">
              Images cannot be changed after creation (backend limitation).
            </p>
          )}
        </div>
        <div>
          {editing ? (
            <form onSubmit={(e) => saveEdit(e, p)} noValidate>
              <ProductFields
                values={values}
                onField={onField}
                specsRows={specsRows}
                onSpecsChange={(rows) => {
                  setSpecsRows(rows);
                  setEditErrors((prev) => ({ ...prev, specs: undefined }));
                  setEditBanner("");
                }}
                errors={editErrors}
                disabled={saving}
              />
              {editBanner && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {editBanner}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
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
                <p className="text-xs text-text-subdued">
                  Catalog parents cannot be changed after creation (update schema accepts no parent ids).
                </p>
              </dl>
            </form>
          ) : (
          <>
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
          </>
          )}
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
