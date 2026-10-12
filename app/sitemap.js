// Public routes only. /products/[id] is intentionally NOT listed: it is
// auth-gated and enumerating ids would require backend calls at build time.
export default function sitemap() {
  const routes = ["/", "/products", "/brands", "/categories", "/subcategories"];
  // Fixed date (not `new Date()`): deterministic at build, no hydration risk.
  const lastModified = new Date("2026-10-09");
  return routes.map((route) => ({ url: route, lastModified }));
}
