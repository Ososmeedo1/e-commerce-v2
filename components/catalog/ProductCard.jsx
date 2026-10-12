"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useCart } from "@/hooks/useCart";
import { useCartAction } from "@/hooks/useCartAction";
import { useToast } from "@/hooks/useToast";
import { friendlyError } from "@/lib/format";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import PriceBlock from "./PriceBlock";
import RatingStars from "./RatingStars";
import { openCartDrawer } from "../cart/CartDrawer";

function ImageFallback() {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-square w-full items-center justify-center bg-surface-subdued"
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-text-disabled">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="10" r="1.6" fill="currentColor" />
        <path d="m5 18 5-5 3 3 3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function ProductCard({ product, className = "" }) {
  const { status } = useAuth();
  const { requireAuth } = useAuthGate();
  const { addItem } = useCart();
  const cartAction = useCartAction();
  const toast = useToast();
  const detailHref = `/products/${product._id}`;
  const img = product.Images?.URLs?.[0]?.fileUrl || null;
  const inStock = (product.stock ?? 0) > 0;

  // Guest clicks never navigate: the gate opens AuthGateModal with `next`
  // preserved. `href` stays for SEO/a11y (right-click → open still works).
  // NOTE: the media+title block is the Link; the CTA sits outside it so we
  // never nest interactive elements (valid HTML, keyboard-safe).
  const gate = (e, actionLabel) => {
    if (status === "user") return true;
    e.preventDefault();
    requireAuth(detailHref, actionLabel);
    return false;
  };

  const addToCart = async (e) => {
    if (!gate(e, "add to cart")) return;
    const res = await cartAction.run(product._id, () => addItem(product._id, 1));
    if (res.ok) {
      toast.success("Added to cart");
      openCartDrawer();
    } else if (!res.busy) {
      toast.error(friendlyError(res.error, "Could not add to cart"));
    }
  };

  const adding = cartAction.isPending(product._id);

  return (
    <div
      className={[
        "flex flex-col overflow-hidden rounded-md border border-border bg-surface shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Link
        href={detailHref}
        onClick={(e) => gate(e, "view product details")}
        aria-label={product.title}
        className="block"
      >
        {img ? (
          <div className="relative aspect-square w-full bg-surface-subdued">
            <Image
              src={img}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
              className="object-cover"
            />
          </div>
        ) : (
          <ImageFallback />
        )}
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold text-text">
            {product.title}
          </h3>
          <div className="mt-1">
            <PriceBlock
              price={product.price}
              appliedPrice={product.appliedPrice}
              appliedDiscount={product.appliedDiscount}
            />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            {product.rating !== undefined && product.rating !== null ? (
              <RatingStars rating={product.rating} />
            ) : (
              <span />
            )}
            <Badge variant={inStock ? "success" : "danger"}>
              {inStock ? "In stock" : "Out of stock"}
            </Badge>
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={addToCart}
          loading={adding}
          disabled={adding}
        >
          Add to cart
        </Button>
      </div>
    </div>
  );
}
