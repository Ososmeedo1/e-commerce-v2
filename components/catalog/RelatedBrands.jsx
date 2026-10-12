"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getRelatedBrands } from "@/lib/endpoints";
import BrandCard from "./BrandCard";

// Decorative section: never throws, never blocks the page — any failure or
// empty result hides the section entirely.
export default function RelatedBrands({ categoryId }) {
  const [brands, setBrands] = useState(null);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    // Public endpoint: apiFetch WITHOUT auth sends no token (verified: no
    // `token` header unless auth:true). Plain fetch would work too; apiFetch
    // keeps base-URL + querystring handling in one place.
    apiFetch(getRelatedBrands(), { params: { category: categoryId } })
      .then((res) => {
        if (!cancelled) setBrands(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setBrands([]);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  if (!brands || brands.length === 0) return null;
  return (
    <section aria-labelledby="related-brands-heading" className="mt-8">
      <h2 id="related-brands-heading" className="text-lg font-semibold text-text">
        Related brands
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {brands.map((b) => (
          <BrandCard key={b._id} brand={b} />
        ))}
      </div>
    </section>
  );
}
