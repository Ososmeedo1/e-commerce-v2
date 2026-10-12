// Server layout for the client-only addresses page: a closer title so the
// account template renders "Addresses · Account · Masar".
export const metadata = {
  title: "Addresses",
  description: "Manage your Masar delivery addresses.",
  robots: { index: false },
};

export default function AddressesLayout({ children }) {
  return children;
}
