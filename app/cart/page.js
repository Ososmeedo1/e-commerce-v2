"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { friendlyError } from "@/lib/format";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import CartLineItem from "@/components/cart/CartLineItem";
import CartSummary from "@/components/cart/CartSummary";

export default function CartPage() {
  const { items, subtotal, status, updateQty, removeItem, refresh } = useCart();
  const toast = useToast();

  const changeQty = async (productId, qty) => {
    const res = await updateQty(productId, qty);
    if (!res.ok) toast.error(friendlyError(res.error, "Could not update cart"));
  };

  const remove = async (productId) => {
    const res = await removeItem(productId);
    if (res.ok) toast.info("Removed from cart");
    else toast.error(friendlyError(res.error, "Could not remove item"));
  };

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-text">Your cart</h1>
      {(status === "loading" || status === "idle") && (
        <div className="mt-6 space-y-3" aria-hidden="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <p className="sr-only">Loading cart…</p>
        </div>
      )}
      {status === "error" && (
        <div className="mt-2">
          <ErrorState onRetry={() => refresh()} />
        </div>
      )}
      {status === "ready" && items.length === 0 && (
        <EmptyState
          title="Your cart is empty"
          description="Browse products to get started."
          action={<Button href="/products">Browse products</Button>}
        />
      )}
      {status === "ready" && items.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-3">
            {items.map((item) => (
              <CartLineItem
                key={item._id || item.productId}
                item={item}
                onChange={(qty) => changeQty(item.productId, qty)}
                onRemove={() => remove(item.productId)}
              />
            ))}
          </ul>
          <div>
            <CartSummary
              subtotal={subtotal}
              actionSlot={
                <div className="flex flex-col gap-2">
                  <Button variant="primary" fullWidth href="/checkout">
                    Proceed to checkout
                  </Button>
                  <Link
                    href="/products"
                    className="text-center text-sm font-medium text-primary hover:underline"
                  >
                    Continue shopping
                  </Link>
                </div>
              }
            />
          </div>
        </div>
      )}
    </Container>
  );
}
