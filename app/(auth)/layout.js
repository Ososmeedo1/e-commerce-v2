// Route-group layout for auth pages (no URL effect). Root layout already sets
// the `%s · Masar` title template — this fallback title applies if a child
// route has no closer title. Client pages below cannot export metadata.
export const metadata = {
  title: "Account",
};

export default function AuthGroupLayout({ children }) {
  return children;
}
