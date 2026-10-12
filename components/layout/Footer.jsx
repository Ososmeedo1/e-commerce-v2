"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTACT_URL } from "@/lib/config";

const SHOP_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/brands", label: "Brands" },
  { href: "/categories", label: "Categories" },
  { href: "/subcategories", label: "Subcategories" },
];

const ACCOUNT_LINKS = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Sign up" },
  { href: "/account", label: "My account" },
  { href: "/orders", label: "Orders" },
];

const COMPANY_LINKS = [
  // TODO Phase 4+: point at real pages once they exist (currently no route).
  { href: "#", label: "About" },
  { href: "#", label: "Contact" },
];

export default function Footer() {
  const pathname = usePathname();
  // Admin surface has its own shell (app/admin/layout.js) — the buyer
  // footer never renders there (Navbar mirrors this, see Navbar.jsx).
  if (pathname === "/admin" || pathname?.startsWith("/admin/")) return null;
  const colTitle = "text-sm font-semibold text-text";
  const colLink =
    "text-sm text-text-subdued hover:text-text hover:underline";

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <p className="text-lg font-bold tracking-tight text-text">Masar</p>
            <p className="mt-2 text-sm text-text-subdued">
              Everyday goods, one path.
            </p>
          </div>
          <nav aria-label="Shop">
            <p className={colTitle}>Shop</p>
            <ul className="mt-3 space-y-2">
              {SHOP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={colLink}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Account">
            <p className={colTitle}>Account</p>
            <ul className="mt-3 space-y-2">
              {ACCOUNT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={colLink}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Company">
            <p className={colTitle}>Company</p>
            <ul className="mt-3 space-y-2">
              {COMPANY_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={colLink}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-1 border-t border-border pt-4 text-xs text-text-subdued sm:flex-row sm:items-center sm:justify-between">
          <p>
            © Masar. All rights reserved.
            {CONTACT_URL ? (
              <>
                {" · "}
                <a
                  href={CONTACT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-text-subdued hover:text-text hover:underline"
                >
                  Contact
                </a>
              </>
            ) : null}
          </p>
          <p>Light and dark themes supported · English</p>
        </div>
      </div>
    </footer>
  );
}
