"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/orders", label: "Orders" },
];

function isActive(pathname, href) {
  if (pathname === href) return true;
  // Order detail (/orders/<id>) still belongs to the Orders tab.
  if (href === "/orders" && pathname.startsWith("/orders/")) return true;
  return false;
}

export default function AccountNav() {
  const pathname = usePathname() || "";
  return (
    <nav aria-label="Account">
      <ul className="flex gap-1 overflow-x-auto border-b border-border pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:pb-0 lg:pr-6">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "block rounded-md px-3 py-2 text-sm",
                  active
                    ? "bg-primary-subdued font-semibold text-primary"
                    : "text-text-subdued hover:bg-surface-subdued hover:text-text",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
