"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrandsIcon,
  CategoriesIcon,
  CouponsIcon,
  DashboardIcon,
  ProductsIcon,
  ReviewsIcon,
  SubcategoriesIcon,
} from "./Icons";

const ITEMS = [
  { href: "/admin", label: "Overview", Icon: DashboardIcon, exact: true },
  { href: "/admin/categories", label: "Categories", Icon: CategoriesIcon },
  { href: "/admin/brands", label: "Brands", Icon: BrandsIcon },
  { href: "/admin/subcategories", label: "Subcategories", Icon: SubcategoriesIcon },
  { href: "/admin/reviews", label: "Reviews", Icon: ReviewsIcon },
  { href: "/admin/products", label: "Products", Icon: ProductsIcon },
  { href: "/admin/coupons", label: "Coupons", Icon: CouponsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1 p-3">
      {ITEMS.map(({ href, label, Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
              active
                ? "bg-primary-subdued text-primary"
                : "text-text-subdued hover:bg-surface-subdued hover:text-text",
            ].join(" ")}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
