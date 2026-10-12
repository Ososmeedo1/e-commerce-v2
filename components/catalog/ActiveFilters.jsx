"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Badge from "../ui/Badge";

function lookup(list, id) {
  const found = list.find((x) => String(x._id) === String(id));
  return found ? found.name : id;
}

export default function ActiveFilters({ categories = [], subCategories = [], brands = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pills = [];
  const search = searchParams.get("search");
  if (search) pills.push({ key: "search", label: `Search: ${search}` });
  const categoryId = searchParams.get("categoryId");
  if (categoryId)
    pills.push({ key: "categoryId", label: lookup(categories, categoryId) });
  const subCategoryId = searchParams.get("subCategoryId");
  if (subCategoryId)
    pills.push({ key: "subCategoryId", label: lookup(subCategories, subCategoryId) });
  const brandId = searchParams.get("brandId");
  if (brandId) pills.push({ key: "brandId", label: lookup(brands, brandId) });

  if (pills.length === 0) return null;

  const remove = (key) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete(key);
    qs.delete("page");
    const next = qs.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  };

  return (
    <div className="flex flex-wrap gap-2" aria-label="Active filters">
      {pills.map((p) => (
        <span key={p.key} className="inline-flex items-center gap-1">
          <Badge variant="subdued">{p.label}</Badge>
          <button
            type="button"
            onClick={() => remove(p.key)}
            aria-label={`Remove ${p.label} filter`}
            className="inline-flex h-5 w-5 items-center justify-center rounded-pill text-xs text-text-subdued hover:bg-surface-subdued hover:text-text"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
