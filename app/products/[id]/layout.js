// Server layout for the client-only detail page. A generic title only:
// per-id metadata would require a server fetch of a token-gated endpoint,
// which this phase deliberately avoids (see report).
export const metadata = {
  title: "Product",
  description: "Product details on Masar.",
};

export default function ProductDetailLayout({ children }) {
  return children;
}
