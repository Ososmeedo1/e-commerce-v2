"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_SORT, SORT_OPTIONS } from "@/lib/catalog";

export default function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") || DEFAULT_SORT;

  const change = (e) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("sort", e.target.value);
    qs.delete("page");
    router.replace(`${pathname}?${qs.toString()}`);
  };

  return (
    <div>
      <label htmlFor="catalog-sort" className="sr-only">
        Sort products
      </label>
      <select
        id="catalog-sort"
        value={current}
        onChange={change}
        className="h-10 rounded-md border border-border-strong bg-surface px-2 text-sm text-text"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
