"use client";

import { useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { listAllReviews, moderateReview } from "@/lib/admin";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/hooks/useToast";
import { formatDate, friendlyError } from "@/lib/format";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import RatingStars from "@/components/catalog/RatingStars";

const FILTERS = ["all", "pending", "accepted", "rejected"];

// GET /reviews/ answers 404 "No Reviews yet" on an empty collection —
// that's an empty list, not an error. Anything else rethrows.
const fetchReviews = () =>
  apiFetch(listAllReviews(), { auth: true })
    .then((res) => (Array.isArray(res?.data) ? res.data : []))
    .catch((err) => {
      if (err?.status === 404) return [];
      console.error("[admin/reviews]", err);
      throw err;
    });

const STATUS_VARIANT = { pending: "warning", accepted: "success", rejected: "danger" };

function truncId(value) {
  const s = String(value ?? "");
  return s.length > 8 ? `${s.slice(0, 8)}…` : s || "—";
}

export default function AdminReviewsPage() {
  const toast = useToast();
  const [retryKey, setRetryKey] = useState(0);
  const reviews = useAsyncData(fetchReviews, [retryKey]);
  const [filter, setFilter] = useState("all");
  const [acting, setActing] = useState(null); // { id, action } | null
  const [expanded, setExpanded] = useState(null); // review | null
  const [items, setItems] = useState(null); // local list for optimistic flips (null = use fetched)

  const list = items ?? reviews.data ?? [];
  const pendingCount = list.filter((r) => r?.reviewStatus === "pending").length;
  const visible =
    filter === "all" ? list : list.filter((r) => r?.reviewStatus === filter);

  const moderate = async (review, action) => {
    const snapshot = list;
    setActing({ id: review._id, action });
    // Optimistic flip; reverted below on failure.
    setItems(snapshot.map((r) => (r._id === review._id ? { ...r, reviewStatus: action } : r)));
    try {
      // Body matches the source exactly: { action: "accepted" | "rejected" }
      // (review.controller.js compares against ReviewStatus.Accepted/Rejected).
      await apiFetch(moderateReview(review._id), {
        method: "PATCH",
        auth: true,
        body: { action },
      });
    } catch (err) {
      setItems(snapshot);
      toast.error(friendlyError(err, "Could not update review. Try again."));
    } finally {
      setActing(null);
    }
  };

  const columns = [
    {
      key: "product",
      label: "Product",
      render: (r) => {
        const p = r.productId && typeof r.productId === "object" ? r.productId : null;
        return (
          <span className="flex items-center gap-2" title={p?.title || String(r.productId ?? "")}>
            {p?.Images?.URLs?.[0]?.fileUrl && (
              <Image
                src={p.Images.URLs[0].fileUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-sm object-cover"
              />
            )}
            <span className="font-medium">{p?.title || truncId(r.productId)}</span>
          </span>
        );
      },
    },
    {
      key: "reviewer",
      label: "Reviewer",
      render: (r) => {
        const u = r.userId && typeof r.userId === "object" ? r.userId : null;
        const name = u?.email || u?.username || u?.userName || truncId(r.userId);
        return (
          <span title={String(r.userId ?? "")}>{name}</span>
        );
      },
    },
    {
      key: "rating",
      label: "Rating",
      render: (r) => (
        <span className="inline-flex items-center gap-1">
          <RatingStars rating={r.reviewRating} />
          <span className="text-text-subdued">{r.reviewRating}</span>
        </span>
      ),
    },
    {
      key: "body",
      label: "Review",
      render: (r) => (
        <span>
          <span className="line-clamp-2 max-w-xs">{r.reviewBody}</span>
          {r.reviewBody && r.reviewBody.length > 120 && (
            <button
              type="button"
              onClick={() => setExpanded(r)}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              Read more
            </button>
          )}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge variant={STATUS_VARIANT[r.reviewStatus] || "subdued"}>
          {r.reviewStatus}
        </Badge>
      ),
    },
    {
      key: "date",
      label: "Submitted",
      render: (r) => (r.createdAt ? formatDate(r.createdAt) : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => {
        const busy = acting?.id === r._id;
        const done = r.reviewStatus !== "pending";
        return (
          <span className="inline-flex gap-2">
            <Button
              variant="secondary"
              disabled={busy || (done && r.reviewStatus === "accepted")}
              loading={busy && acting?.action === "accepted"}
              onClick={() => moderate(r, "accepted")}
            >
              Accept
            </Button>
            <Button
              variant="plain"
              disabled={busy || (done && r.reviewStatus === "rejected")}
              loading={busy && acting?.action === "rejected"}
              onClick={() => moderate(r, "rejected")}
            >
              Reject
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Reviews</h1>
      <p className="mt-1 text-sm text-text-subdued" role="status">
        {pendingCount} pending · {list.length} total
      </p>

      <div className="mt-4 flex gap-2" role="tablist" aria-label="Filter reviews by status">
        {FILTERS.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "primary" : "secondary"}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="mt-4">
        {visible.length === 0 && !reviews.loading && !reviews.error && list.length > 0 ? (
          <p className="rounded-md border border-border bg-surface px-4 py-8 text-center text-sm text-text-subdued">
            No {filter} reviews.
          </p>
        ) : (
          <DataTable
            columns={columns}
            rows={visible}
            loading={reviews.loading}
            error={reviews.error}
            emptyMessage="No reviews yet."
            onRetry={() => {
              setItems(null);
              setRetryKey((k) => k + 1);
            }}
          />
        )}
      </div>

      <Modal
        open={expanded !== null}
        onClose={() => setExpanded(null)}
        title="Review"
        description={expanded ? `By ${expanded.userId?.email || "unknown"} · ${expanded.createdAt ? formatDate(expanded.createdAt) : ""}` : ""}
      >
        <p className="text-sm text-text">{expanded?.reviewBody}</p>
      </Modal>
    </div>
  );
}
