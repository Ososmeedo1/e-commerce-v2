// Server-safe catalog constants (importable from server AND client
// components). NOTE: do NOT export these from a "use client" module —
// server components importing them would receive throwing client-reference
// proxies instead of values.

export const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "price", label: "Price: Low to High" },
  { value: "-price", label: "Price: High to Low" },
  { value: "-rating", label: "Highest rated" },
  { value: "name", label: "Name: A–Z" },
];

export const DEFAULT_SORT = "-createdAt";
