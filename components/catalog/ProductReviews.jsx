"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { listProductReviews } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import RatingStars from "./RatingStars";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import ErrorState from "../ui/ErrorState";
import Skeleton from "../ui/Skeleton";

const PAGE_LIMIT = 10;

// Moderation-aware status badges (business rule: only APPROVED is public).
function ReviewStatusBadge({ reviewStatus }) {
  if (!reviewStatus || reviewStatus === "approved") return null;
  if (reviewStatus === "pending") {
    return <Badge variant="warning">Pending approval</Badge>;
  }
  if (reviewStatus === "rejected" || reviewStatus === "declined") {
    return <Badge variant="danger">Not approved</Badge>;
  }
  return <Badge variant="subdued">{reviewStatus}</Badge>;
}
function ReviewItem({ review }) {
  const author =
    (review.userId && review.userId.email) || "Verified buyer";
  return (
    <li className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 break-words text-sm font-semibold text-text">{author}</span>
        <RatingStars rating={review.reviewRating} />
        <ReviewStatusBadge reviewStatus={review.reviewStatus} />
      </div>
      <p className="mt-2 break-words text-sm text-text">{review.reviewBody}</p>
      {review.createdAt && (
        <p className="mt-1 text-xs text-text-subdued">{formatDate(review.createdAt)}</p>
      )}
    </li>
  );
}

export default function ProductReviews({ productId, currentPath, onTotal = null, refreshKey = 0, onWriteReview = null, canReview = null }) {
  const { requireAuth } = useAuthGate();
  const { status: authStatus, user } = useAuth();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  // Pending reviews authored by the current user, accumulated across loaded
  // pages (only non-zero if the backend returns pending entries to authors).
  const pendingMineRef = useRef(0);

  // Route failures: 401/403 (backend gates listing for buyers) → subdued
  // moderated notice, never the error state. Anything else → error + retry.
  const failWith = (err) => {
    if (err?.status === 401 || err?.status === 403) setStatus("moderated");
    else setStatus("error");
  };

  const load = useCallback(
    async (pageToLoad, append) => {
      const res = await apiFetch(listProductReviews({ productId, page: pageToLoad, limit: PAGE_LIMIT }), {
        auth: true,
        // Decorative section: auth failures must render the moderated notice
        // below, never clear the session + redirect (see lib/api.js).
        noRedirect: true,
      });
      // Any 2xx that yields zero items — [] / null / missing data — is an
      // EMPTY result, never an error.
      const data = Array.isArray(res?.data) ? res.data : [];
      if (append) setItems((prev) => [...prev, ...data]);
      else setItems(data);
      const nextTotal = typeof res?.total === "number" ? res.total : null;
      setTotal(nextTotal);
      const mine = data.filter(
        (r) => r?.reviewStatus === "pending" && user?.email && r?.userId?.email === user.email
      ).length;
      if (append) pendingMineRef.current += mine;
      else pendingMineRef.current = mine;
      if (onTotal) onTotal(nextTotal, pendingMineRef.current);
      setPage(pageToLoad);
    },
    [productId, onTotal, user]
  );

  // refreshKey lets the parent reload page 1 after a new review lands.
  // Guests never fetch: the section renders a sign-in notice instead
  // (no network call, derived during render below). Buyers fetch and land
  // on the moderated notice when the backend gates listing (see failWith).
  useEffect(() => {
    if (authStatus !== "user") return undefined;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch (sanctioned; resolutions are async)
    load(1, false)
      .then(() => {
        if (!cancelled) setStatus("ok");
      })
      .catch((err) => {
        if (!cancelled) failWith(err);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, load, refreshKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await load(page + 1, true);
    } catch {
      // Keep existing items; a retry is available via the button staying put.
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = total === null ? items.length >= page * PAGE_LIMIT : items.length < total;

  const gateReview = (e) => {
    e.preventDefault();
    // Signed-in users go straight to the review form (opened by the parent
    // detail page via onWriteReview); guests get the sign-in gate.
    if (requireAuth(currentPath, "write a review")) onWriteReview?.();
  };

  // Guest notice is render-derived (never fetched — see effect above).
  if (authStatus === "guest") {
    return (
      <section aria-labelledby="reviews-heading" className="mt-8">
        <h2 id="reviews-heading" className="text-lg font-semibold text-text">
          Reviews
        </h2>
        <EmptyState
          title="Sign in to see reviews"
          description="Reviews are shared with members. Sign in to read them — you can write your own after a purchase."
        />
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section aria-labelledby="reviews-heading" className="mt-8">
        <h2 id="reviews-heading" className="text-lg font-semibold text-text">
          Reviews
        </h2>
        <div className="mt-3 space-y-3" aria-hidden="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  if (status === "moderated") {
    return (
      <section aria-labelledby="reviews-heading" className="mt-8">
        <h2 id="reviews-heading" className="text-lg font-semibold text-text">
          Reviews
        </h2>
        <EmptyState
          title="Reviews are moderated"
          description="Approved reviews appear here once our team has reviewed them. If you've already submitted one, it may still be pending."
        />
      </section>
    );
  }

  if (status === "error") {
    return (
      <section aria-labelledby="reviews-heading" className="mt-8">
        <h2 id="reviews-heading" className="text-lg font-semibold text-text">
          Reviews
        </h2>
        <ErrorState
          title="Could not load reviews"
          description="Try again in a moment."
          onRetry={() => {
            setStatus("loading");
            load(1, false)
              .then(() => setStatus("ok"))
              .catch((err) => failWith(err));
          }}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="reviews-heading" className="mt-8">
      <h2 id="reviews-heading" className="text-lg font-semibold text-text">
        Reviews{total !== null ? ` (${total})` : ""}
      </h2>
      {items.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Be the first to review this product. Reviews appear here once approved."
          action={
            canReview === false ? (
              <div>
                <Button variant="secondary" disabled>
                  Purchase to review
                </Button>
                <p className="mt-2 text-xs text-text-subdued">
                  {authStatus === "guest"
                    ? "Sign in and buy this product to review it."
                    : "You can review this product after you've bought it."}
                </p>
              </div>
            ) : (
              <Button variant="secondary" onClick={gateReview}>
                Write a review
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {items.map((r) => (
              <ReviewItem key={r._id} review={r} />
            ))}
          </ul>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
