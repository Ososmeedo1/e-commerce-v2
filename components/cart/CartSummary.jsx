"use client";

import { formatPrice } from "@/lib/format";

export default function CartSummary({ subtotal, extraRows = [], actionSlot = null }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-text-subdued">Subtotal</dt>
          <dd className="font-semibold text-text">{formatPrice(subtotal)}</dd>
        </div>
        {extraRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <dt className="text-text-subdued">{row.label}</dt>
            <dd className="font-semibold text-text">{row.value}</dd>
          </div>
        ))}
      </dl>
      {actionSlot && <div className="mt-4">{actionSlot}</div>}
    </div>
  );
}
