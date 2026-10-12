"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_ROLE } from "@/lib/config";
import { useCart } from "@/hooks/useCart";
import ThemeToggle from "./ThemeToggle";
import Button from "../ui/Button";
import Skeleton from "../ui/Skeleton";
import Drawer from "../ui/Drawer";
import CartDrawer, { CART_OPEN_EVENT } from "../cart/CartDrawer";

const CATALOG_LINKS = [
  { href: "/products", label: "Products" },
  { href: "/brands", label: "Brands" },
  { href: "/categories", label: "Categories" },
  { href: "/subcategories", label: "Subcategories" },
];

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3h2l2.4 12.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20.5 8H6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AccountMenu({ onNavigate }) {
  const auth = useAuth();
  const isAdmin = auth.user?.userType === ADMIN_ROLE;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const initial = (auth.user?.username || auth.user?.email || "?")
    .charAt(0)
    .toUpperCase();

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open ]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKeyDown = (e) => {
    const items = Array.from(
      wrapRef.current.querySelectorAll('[role="menuitem"]')
    );
    const idx = items.indexOf(document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      (items[idx + 1] || items[0])?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      (items[idx - 1] || items[items.length - 1])?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  const itemCls =
    "flex w-full items-center px-4 py-2 text-left text-sm text-text hover:bg-surface-subdued";

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) close();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-pill bg-primary-subdued text-sm font-bold text-primary"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md"
        >
          {(
            isAdmin
              ? [{ href: "/admin", label: "Dashboard" }]
              : [
                  { href: "/account", label: "My account" },
                  { href: "/orders", label: "Orders" },
                  { href: "/account/addresses", label: "Addresses" },
                  { href: "/cart", label: "View cart" },
                ]
          ).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className={itemCls}
            >
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              auth.logout();
              onNavigate?.();
            }}
            className={itemCls}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function AuthSlot({ onNavigate }) {
  const auth = useAuth();
  if (auth.status === "loading") {
    return (
      <div aria-hidden="true" className="flex items-center gap-2">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-20" />
      </div>
    );
  }
  if (auth.status === "user") {
    return <AccountMenu onNavigate={onNavigate} />;
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="plain" href="/login" onClick={onNavigate}>
        Log in
      </Button>
      <Button variant="primary" href="/register" onClick={onNavigate}>
        Sign up
      </Button>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { status: authStatus, user } = useAuth();
  const { count: cartCount } = useCart();
  const isAdmin = user?.userType === ADMIN_ROLE;

  // The two drawers never open simultaneously: opening one closes the
  // other (avoids overlapping z-50 overlays + competing focus traps).
  const openNavDrawer = () => {
    setCartOpen(false);
    setDrawerOpen(true);
  };
  const openCartDrawerView = () => {
    setDrawerOpen(false);
    setCartOpen(true);
  };

  // Opened remotely after successful add-to-cart (see CartDrawer).
  useEffect(() => {
    const open = () => {
      setDrawerOpen(false);
      setCartOpen(true);
    };
    window.addEventListener(CART_OPEN_EVENT, open);
    return () => window.removeEventListener(CART_OPEN_EVENT, open);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    setDrawerOpen(false);
  };

  const linkCls = (href) =>
    pathname === href
      ? "font-semibold text-text"
      : "text-text-subdued hover:text-text";

  // Admin surface has its own shell (app/admin/layout.js) — the buyer
  // Navbar never renders there (Footer mirrors this, see Footer.jsx).
  // Placed after all hooks: an early return above would break hook order.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={openNavDrawer}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-subdued hover:bg-surface-subdued hover:text-text md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-text"
        >
          Masar
        </Link>

        {/* Center catalog links (md+) */}
        <nav aria-label="Catalog" className="ml-4 hidden items-center gap-4 md:flex">
          {CATALOG_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`text-sm ${linkCls(l.href)}`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              className={`text-sm ${linkCls("/admin")}`}
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Search (stub form — navigates, Phase 4 fetches) */}
          <form
            role="search"
            onSubmit={submitSearch}
            className="hidden items-center sm:flex"
          >
            <label htmlFor="nav-search" className="sr-only">
              Search products
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled">
                <SearchIcon />
              </span>
              <input
                id="nav-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products"
                className="h-9 w-40 rounded-md border border-border bg-surface pl-8 pr-2 text-sm text-text placeholder:text-text-disabled lg:w-52"
              />
            </div>
          </form>

          <ThemeToggle />

          {/* Cart requires login; admins use the dashboard, not the cart. */}
          {authStatus === "user" && !isAdmin && (
          <button
            type="button"
            onClick={openCartDrawerView}
            aria-label={cartCount > 0 ? `Open cart, ${cartCount} items` : "Open cart"}
            aria-haspopup="dialog"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-text-subdued hover:bg-surface-subdued hover:text-text"
          >
            <CartIcon />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-primary px-1 text-[10px] font-bold text-white"
              >
                {cartCount}
              </span>
            )}
          </button>
          )}
          <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

          <div className="hidden md:block">
            <AuthSlot />
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Menu"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <span className="text-lg font-bold text-text">Masar</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-subdued hover:bg-surface-subdued hover:text-text"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <nav aria-label="Mobile catalog" className="flex flex-col p-2">
          {CATALOG_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              onClick={() => setDrawerOpen(false)}
              className={`rounded-md px-3 py-2.5 text-sm ${linkCls(l.href)} hover:bg-surface-subdued`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              onClick={() => setDrawerOpen(false)}
              className={`rounded-md px-3 py-2.5 text-sm ${linkCls("/admin")} hover:bg-surface-subdued`}
            >
              Dashboard
            </Link>
          )}
        </nav>
        {/* Mobile search — the header search field is hidden below sm, so the
            drawer carries an equivalent form (same submit → /products?search=). */}
        <form
          role="search"
          onSubmit={submitSearch}
          className="flex items-center gap-2 border-t border-border p-4"
        >
          <label htmlFor="drawer-search" className="sr-only">
            Search products
          </label>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled">
              <SearchIcon />
            </span>
            <input
              id="drawer-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              className="h-10 w-full rounded-md border border-border bg-surface pl-8 pr-2 text-sm text-text placeholder:text-text-disabled"
            />
          </div>
          <Button variant="secondary" type="submit">
            Go
          </Button>
        </form>
        <div className="mt-auto border-t border-border p-4">
          <AuthSlot onNavigate={() => setDrawerOpen(false)} />
        </div>
      </Drawer>
    </header>
  );
}
