"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { friendlyError } from "@/lib/format";
import Drawer from "../ui/Drawer";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import CartLineItem from "./CartLineItem";
import CartSummary from "./CartSummary";

// Event fired after a successful add-to-cart so the drawer previews it.
// (Navbar listens; ProductCard/[id] page dispatch. No extra context needed.)
export const CART_OPEN_EVENT = "masar:open-cart";

export function openCartDrawer() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT));
  }
}

export default function CartDrawer({ open, onClose }) {
  const pathname = usePathname();
  const { status: authStatus } = useAuth();
  const { requireAuth } = useAuthGate();
  const { items, subtotal, status, updateQty, removeItem } = useCart();
  const toast = useToast();

  // Auto-close on route change (and after successful nav via links below).
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close-only effect
  }, [pathname]);

  // Cart requires login: never render for guests/loading, even if opened
  // programmatically (the navbar icon that opens it is user-only too).
  if (authStatus !== "user") return null;

  const mutate = async (fn, failureMsg) => {
    const res = await fn();
    if (!res.ok) toast.error(friendlyError(res.error, failureMsg));
    return res;
  };

  const checkoutHref = "/checkout";
  const onCheckoutClick = (e) => {
    if (authStatus !== "user") {
      e.preventDefault();
      requireAuth(checkoutHref, "check out");
    }
    // Users navigate via the Link; the pathname effect closes the drawer.
  };

  return (
    <Drawer open={open} onClose={onClose} title="Cart" mobileOnly={false}>
      <div className="flex items-center justify-between border-b border-border p-4">
        <span className="text-base font-semibold text-text">Your cart</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-subdued hover:bg-surface-subdued hover:text-text"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {authStatus !== "user" ? (
          <EmptyState
            title="Sign in to view your cart"
            description="Your cart lives in your account."
            action={<Button href="/login?next=%2Fcart">Log in</Button>}
          />
        ) : status === "loading" || status === "idle" ? (
          <p className="py-8 text-center text-sm text-text-subdued">Loading cart…</p>
        ) : status === "error" ? (
          <EmptyState
            title="Could not load cart"
            description="Try again in a moment."
            action={<Button href="/cart">View cart</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            description="Browse products to get started."
            action={<Button href="/products">Browse products</Button>}
          />
        ) : (
          <ul className="space-y-3">
            {/* Same CartLineItem as /cart page (compact styling only);
                drawer previews the first 3 lines. */}
            {items.slice(0, 3).map((item) => (
              <CartLineItem
                key={item._id || item.productId}
                item={item}
                variant="compact"
                onChange={(qty) =>
                  mutate(() => updateQty(item.productId, qty), "Could not update cart")
                }
                onRemove={() =>
                  mutate(() => removeItem(item.productId), "Could not remove item")
                }
              />
            ))}
          </ul>
        )}
      </div>
      {authStatus === "user" && items.length > 0 && (
        <div className="border-t border-border p-4">
          <CartSummary
            subtotal={subtotal}
            actionSlot={
              <div className="flex flex-col gap-2">
                <Button variant="primary" fullWidth href={checkoutHref} onClick={onCheckoutClick}>
                  Proceed to checkout
                </Button>
                <Button variant="plain" href="/cart">
                  View all ({items.length})
                </Button>
              </div>
            }
          />
        </div>
      )}
    </Drawer>
  );
}
