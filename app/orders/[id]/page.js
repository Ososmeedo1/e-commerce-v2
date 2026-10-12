"use client";

// Phase 7: expanded detail (timeline, cancel, address block).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getOrderById } from "@/lib/endpoints";
import { formatDate, formatPrice } from "@/lib/format";
import { orderStatusVariant } from "@/components/orders/orderStatus";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card, { CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import OrderTimeline from "@/components/orders/OrderTimeline";
import CancelOrderModal from "@/components/orders/CancelOrderModal";

function lineTitle(item) {
  if (item.productId && typeof item.productId === "object") {
    return item.productId.title || "Product";
  }
  return "Product";
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [state, setState] = useState({ status: "loading", order: null });
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(getOrderById(id), { auth: true });
      // 401/403 never settles here — apiFetch redirects to login first.
      setState({ status: "ok", order: res?.data || null });
    } catch {
      setState({ status: "error", order: null });
    }
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch (sanctioned; resolutions are async)
    load();
    return undefined;
  }, [id, load]);

  if (state.status === "loading") {
    return (
      <Container className="py-8">
        <div className="h-7 w-56 skeleton-shimmer rounded-sm" aria-hidden="true" />
        <p className="sr-only">Loading order…</p>
        <div className="mt-6 space-y-3" aria-hidden="true">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Container>
    );
  }

  if (state.status === "error" || !state.order) {
    return (
      <Container className="py-6">
        {state.status === "error" ? (
          <ErrorState onRetry={load} />
        ) : (
          <EmptyState
            title="Order not found"
            titleAs="h1"
            description="This order may have been removed."
            action={<Button href="/products">Continue shopping</Button>}
          />
        )}
      </Container>
    );
  }

  const order = state.order;
  const lines = Array.isArray(order.products) ? order.products : [];

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-text">Order confirmed</h1>
      <p className="mt-1 font-mono text-xs text-text-subdued">{order._id}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={orderStatusVariant(order.orderStatus)}>{order.orderStatus}</Badge>
        {order.estimatedDeliveryDate && (
          <span className="text-text-subdued">
            Estimated delivery: {formatDate(order.estimatedDeliveryDate)}
          </span>
        )}
        {order.paymentMethod && (
          // TODO Q8: only "cash" observed — display stays "Cash on delivery".
          <span className="text-text-subdued">
            Paid via {order.paymentMethod === "cash" ? "Cash on delivery" : order.paymentMethod}
          </span>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-base font-semibold text-text">Timeline</h2>
        </CardHeader>
        <OrderTimeline order={order} />
      </Card>

      <ul className="mt-6 space-y-3">
        {lines.map((item, i) => (
          <li
            key={item._id || i}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3 shadow-sm"
          >
            <span className="truncate text-sm font-semibold text-text">
              {lineTitle(item)}
              <span className="ml-2 font-normal text-text-subdued">× {item.quantity}</span>
            </span>
            <span className="text-sm font-semibold text-text">
              {formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 0))}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 rounded-md border border-border bg-surface p-4 text-sm shadow-sm">
        {[
          ["Subtotal", order.subTotal],
          ["Shipping", order.shippingFee],
          ["VAT", order.VAT],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <dt className="text-text-subdued">{label}</dt>
            <dd className="text-text">{formatPrice(value ?? 0)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <dt className="font-semibold text-text">Total</dt>
          <dd className="font-semibold text-text">{formatPrice(order.total ?? 0)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" href="/orders">
          View all orders
        </Button>
        <Button variant="primary" href="/products">
          Continue shopping
        </Button>
        {order.orderStatus === "placed" && (
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            Cancel order
          </Button>
        )}
      </div>

      {/* TODO Q7: backend stores the free-text address string (no addressId). */}
      {(order.address || order.contactNumber) && (
        <Card className="mt-4">
          <CardHeader>
            <h2 className="text-base font-semibold text-text">Delivery details</h2>
          </CardHeader>
          {order.address && <p className="break-words text-sm text-text">{order.address}</p>}
          {order.contactNumber && (
            <p className="mt-1 text-sm text-text-subdued">{order.contactNumber}</p>
          )}
        </Card>
      )}

      <CancelOrderModal
        order={order}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={load}
      />
    </Container>
  );
}
