"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { listOrders } from "@/lib/endpoints";
import { formatDate, formatPrice } from "@/lib/format";
import { orderStatusVariant, shortOrderId } from "@/components/orders/orderStatus";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import Pagination from "@/components/ui/Pagination";
import CancelOrderModal from "@/components/orders/CancelOrderModal";

const LIMIT = 10;

function orderCount(order) {
  const lines = Array.isArray(order?.products) ? order.products : [];
  return lines.reduce((n, l) => n + (Number(l?.quantity) || 0), 0);
}

function OrdersListInner() {
  const searchParams = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const [state, setState] = useState({ status: "loading", items: [], total: null });
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(listOrders(), {
        auth: true,
        params: { page, limit: LIMIT },
      });
      // 401/403 + auth-shaped 400s never settle here — apiFetch redirects first.
      const items = Array.isArray(res?.data) ? res.data : [];
      setState({
        status: "ok",
        items,
        total: typeof res?.total === "number" ? res.total : null,
      });
    } catch {
      setState({ status: "error", items: [], total: null });
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- page-keyed fetch (sanctioned; resolution is async)
    load();
  }, [load]);

  if (state.status === "loading") {
    return (
      <Container className="py-8">
        <div className="h-7 w-44 skeleton-shimmer rounded-sm" aria-hidden="true" />
        <p className="sr-only">Loading orders…</p>
        <div className="mt-6 space-y-3" aria-hidden="true">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </Container>
    );
  }

  if (state.status === "error") {
    return (
      <Container className="py-6">
        <h1 className="text-2xl font-bold text-text">Your orders</h1>
        <ErrorState onRetry={load} />
      </Container>
    );
  }

  // TODO: /orders ApiFeatures unconfirmed (API_REFERENCE §4.7).
  // Paginate only when the backend reports a `total` larger than one page;
  // otherwise render everything returned and skip pagination.
  const showPagination = state.total !== null && state.total > LIMIT;

  return (
    <Container className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Your orders</h1>
        <Button variant="plain" href="/products">
          Back to products
        </Button>
      </div>

      {state.items.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Your placed orders will appear here."
          action={<Button href="/products">Browse products</Button>}
        />
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {state.items.map((order) => (
              <li key={order._id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/orders/${order._id}`}
                      className="font-mono text-sm font-semibold text-primary hover:underline"
                    >
                      Order #{shortOrderId(order._id)}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant={orderStatusVariant(order.orderStatus)}>
                        {order.orderStatus}
                      </Badge>
                      {order.createdAt && (
                        <span className="text-xs text-text-subdued">
                          {formatDate(order.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-text">
                    {orderCount(order)} item{orderCount(order) === 1 ? "" : "s"} ·{" "}
                    {formatPrice(order.total ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-text-subdued">
                    {order.paymentMethod ? `Paid via ${order.paymentMethod}` : ""}
                    {order.paymentMethod && order.estimatedDeliveryDate ? " · " : ""}
                    {order.estimatedDeliveryDate
                      ? `Estimated delivery: ${formatDate(order.estimatedDeliveryDate)}`
                      : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" href={`/orders/${order._id}`}>
                      View details
                    </Button>
                    {order.orderStatus === "placed" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCancelTarget(order)}
                      >
                        Cancel order
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          {showPagination && (
            <div className="mt-6">
              <Pagination page={page} total={state.total} limit={LIMIT} baseHref="/orders" />
            </div>
          )}
        </>
      )}

      <CancelOrderModal
        order={cancelTarget}
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onCancelled={load}
      />
    </Container>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersListInner />
    </Suspense>
  );
}
