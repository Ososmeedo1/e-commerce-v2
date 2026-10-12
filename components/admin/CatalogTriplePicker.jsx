"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  getRelatedBrands,
  listCategories,
  listSubCategories,
} from "@/lib/endpoints";
import { useAsyncData } from "@/hooks/useAsyncData";

const fetchAll = (builder, params) => () =>
  apiFetch(builder(), { auth: true, params }).then((res) =>
    Array.isArray(res?.data) ? res.data : []
  );

// Cascading catalog picker: Category → Subcategory (filtered by category)
// → Brand (related endpoint filtered by category + subcategory). Changing a
// parent resets its children (backend validates the triple — never offer a
// combination it would 404).
export default function CatalogTriplePicker({
  value, // { category, subCategory, brand } (controlled ids)
  onChange, // ({ category, subCategory, brand }) => void
  disabled = false,
}) {
  // Picker sources stay small; single capped fetches (no pager needed).
  const cats = useAsyncData(fetchAll(listCategories, { limit: 200 }));
  const subs = useAsyncData(fetchAll(listSubCategories, { limit: 200 }), []);
  const [brandQuery, setBrandQuery] = useState(null); // { category, subCategory } | null
  const brands = useAsyncData(
    brandQuery
      ? () =>
          apiFetch(getRelatedBrands(), {
            auth: true,
            params: { category: brandQuery.category, subCategory: brandQuery.subCategory },
          }).then((res) => (Array.isArray(res?.data) ? res.data : []))
      : () => Promise.resolve([]),
    [brandQuery?.category, brandQuery?.subCategory]
  );

  const categories = cats.data ?? [];
  const subCategories = (subs.data ?? []).filter(
    (s) =>
      !value.category ||
      String(s.categoryId?._id ?? s.categoryId ?? "") === value.category
  );

  const pick = (patch) => {
    const next = { ...value, ...patch };
    // Parent change resets children AND the brand query (stale options out).
    if (patch.category !== undefined && patch.category !== value.category) {
      next.subCategory = "";
      next.brand = "";
      setBrandQuery(null);
    }
    if (patch.subCategory !== undefined && patch.subCategory !== value.subCategory) {
      next.brand = "";
      setBrandQuery(null);
    }
    // Brand options load only once both parents are picked.
    if (next.category && next.subCategory && !next.brand) {
      setBrandQuery({ category: next.category, subCategory: next.subCategory });
    }
    onChange(next);
  };

  // Create-only picker: parents start empty and pick() latches the brand
  // query as soon as both are chosen. No mount sync needed.

  const selectClass =
    "h-10 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-text";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <label htmlFor="triple-category" className="mb-1 block text-sm font-medium text-text">
          Category <span aria-hidden="true" className="text-danger"> *</span>
        </label>
        <select
          id="triple-category"
          value={value.category}
          onChange={(e) => pick({ category: e.target.value })}
          disabled={disabled}
          required
          className={selectClass}
        >
          <option value="">Pick…</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="triple-subcategory" className="mb-1 block text-sm font-medium text-text">
          Subcategory <span aria-hidden="true" className="text-danger"> *</span>
        </label>
        <select
          id="triple-subcategory"
          value={value.subCategory}
          onChange={(e) => pick({ subCategory: e.target.value })}
          disabled={disabled || !value.category}
          required
          className={selectClass}
        >
          <option value="">
            {value.category ? "Pick…" : "Pick a category first"}
          </option>
          {subCategories.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="triple-brand" className="mb-1 block text-sm font-medium text-text">
          Brand <span aria-hidden="true" className="text-danger"> *</span>
        </label>
        <select
          id="triple-brand"
          value={value.brand}
          onChange={(e) => pick({ brand: e.target.value })}
          disabled={disabled || !value.subCategory}
          required
          className={selectClass}
        >
          <option value="">
            {value.subCategory ? "Pick…" : "Pick a subcategory first"}
          </option>
          {(brands.data ?? []).map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
