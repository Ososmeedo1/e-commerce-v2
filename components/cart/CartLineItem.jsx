"use client";

import Image from "next/image";
import Link from "next/link";
import QuantityStepper from "./QuantityStepper";
import { formatPrice } from "@/lib/format";

function ImageFallback({ compact = false }) {
  return (
    <div
      aria-hidden="true"
      className={[
        "flex shrink-0 items-center justify-center rounded-sm bg-surface-subdued",
        compact ? "h-16 w-16" : "h-20 w-20",
      ].join(" ")}
    >
      <svg
        width={compact ? 20 : 24}
        height={compact ? 20 : 24}
        viewBox="0 0 24 24"
        fill="none"
        className="text-text-disabled"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="10" r="1.6" fill="currentColor" />
        <path d="m5 18 5-5 3 3 3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// One line-item component for every cart surface. `variant` changes STYLE
// only (compact = drawer treatment: smaller image, tighter padding) — the
// STRUCTURE (image / title / unit price / stepper-or-fallback / line total /
// remove) and the null-product fallback are identical on all surfaces.
export default function CartLineItem({ item, onChange, onRemove, variant = "page" }) {
  const compact = variant === "compact";
  const product = item.product || null;
  const img = product?.Images?.URLs?.[0]?.fileUrl || null;
  const title = product?.title || "Product unavailable";
  const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
  const max = product?.stock ?? undefined;

  return (
    <li
      className={[
        "flex gap-3 rounded-md border border-border bg-surface shadow-sm",
        compact ? "p-2" : "p-3",
        product ? "" : "opacity-70",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {img ? (
        <div
          className={[
            "relative shrink-0 overflow-hidden rounded-sm bg-surface-subdued",
            compact ? "h-16 w-16" : "h-20 w-20",
          ].join(" ")}
        >
          <Image
            src={img}
            alt={product.title}
            fill
            sizes={compact ? "64px" : "80px"}
            className="object-cover"
          />
        </div>
      ) : (
        <ImageFallback compact={compact} />
      )}
      <div className="min-w-0 flex-1">
        {product ? (
          <Link
            href={`/products/${item.productId}`}
            className="block truncate text-sm font-semibold text-text hover:underline"
          >
            {title}
          </Link>
        ) : (
          <p className="truncate text-sm font-semibold text-text-subdued">{title}</p>
        )}
        <p className="mt-0.5 text-xs text-text-subdued">
          {formatPrice(item.price)} each
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          {product ? (
            <QuantityStepper
              value={item.quantity}
              min={1}
              max={max}
              onChange={onChange}
            />
          ) : (
            <span className="text-xs text-text-subdued">Unavailable</span>
          )}
          <p className="text-sm font-semibold text-text">{formatPrice(lineTotal)}</p>
        </div>
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${title} from cart`}
            className="text-xs font-medium text-danger hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
