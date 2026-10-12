import Container from "@/components/layout/Container";
import AccountNav from "@/components/account/AccountNav";

export const metadata = {
  title: {
    default: "Profile",
    template: "%s · Account · Masar",
  },
  description: "Manage your Masar profile, addresses, and orders.",
  robots: { index: false },
};

export default function AccountLayout({ children }) {
  return (
    <Container className="py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <AccountNav />
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </Container>
  );
}
