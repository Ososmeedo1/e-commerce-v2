"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SearchBar({ placeholder = "Search products" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") || "");

  // Debounced 300ms write to ?search= (replace, not push). Resets page to 1.
  useEffect(() => {
    const t = setTimeout(() => {
      const current = searchParams.get("search") || "";
      if (value === current) return;
      const qs = new URLSearchParams(searchParams.toString());
      if (value.trim()) qs.set("search", value.trim());
      else qs.delete("search");
      qs.delete("page");
      const next = qs.toString();
      router.replace(next ? `${pathname}?${next}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [value, pathname, router, searchParams]);

  return (
    <div className="relative">
      <label htmlFor="catalog-search" className="sr-only">
        {placeholder}
      </label>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <input
        id="catalog-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border-strong bg-surface pl-8 pr-2 text-sm text-text placeholder:text-text-disabled"
      />
    </div>
  );
}
