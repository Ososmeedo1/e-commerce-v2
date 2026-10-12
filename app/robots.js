// Public catalog is crawlable; cart/checkout/orders/account are private.
// NOTE: relative sitemap reference (no canonical frontend domain is
// documented) — crawlers resolve it against the serving host.
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/products", "/brands", "/categories", "/subcategories"],
        disallow: ["/cart", "/checkout", "/orders/", "/account/"],
      },
    ],
    sitemap: "sitemap.xml",
  };
}
