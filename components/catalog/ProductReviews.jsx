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

// Backend path param is a MongoDB ObjectId. The reviews route does not run a
// Joi check on it, so a malformed value reaches Mongoose and becomes a 500.
// Guard before fetching instead of blaming the server for a broken link.
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const AUTH_ERROR_PATTERN = /not logged in|unauthoriz|user not found|jwt|bearer|invalid payload/i;

function isAuthError(err) {
  return (
    err?.status === 401 ||
    err?.status === 403 ||
    (err?.status === 400 && AUTH_ERROR_PATTERN.test(String(err?.message || "")))
  );
}

// Moderation-aware status badges (business rule: approved/accepted reviews
// are public and need no label; pending/rejected reviews are flagged).
function ReviewStatusBadge({ reviewStatus }) {
  if (!reviewStatus || reviewStatus === "approved" || reviewStatus === "accepted") return null;
  if (reviewStatus === "pending") {
    return <Badge variant="warning">Pending approval</Badge>;
  }
  if (reviewStatus === "rejected" || reviewStatus === "declined") {
    return <Badge variant="danger">Not approved</Badge>;
  }
  return <Badge variant="subdued">{reviewStatus}</Badge>;
}

function ReviewItem({ review }) {
  // GET /reviews/list/:productId populates userId with {username,email}.
  const author =
    (review.userId && (review.userId.username || review.userId.email)) ||
    "Verified buyer";
  return (
    <li className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 break-words text-sm font-semibold text-text">{author}</span>
        <RatingStars rating={review.reviewRating} />
        <ReviewStatusBadge reviewStatus={review.reviewStatus} />
      </div>
      {review.reviewBody && (
        <p className="mt-2 break-words text-sm text-text">{review.reviewBody}</p>
      )}
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
  const [total, setTotal] = useState(null);
  const [status, setStatus] = useState("loading");
  // Pending reviews authored by the current user, so the detail-page header
  // can show "N pending" without exaggerating the public review count.
  const pendingMineRef = useRef(0);
  const validProductId = typeof productId === "string" && OBJECT_ID_RE.test(productId);

  const load = useCallback(async () => {
    const res = await apiFetch(listProductReviews(productId), {
      auth: true,
      // Decorative section: auth failures must render the moderated notice
      // below, never clear the session + redirect (see lib/api.js).
      noRedirect: true,
    });
    // Any 2xx that yields no array is an EMPTY result, never an error.
    return Array.isArray(res?.data) ? res.data : [];
  }, [productId]);

  const applyLoaded = useCallback(
    (data) => {
      setItems(data);
      // The current endpoint returns the full list, with no `total` field.
      setTotal(data.length);
      const mine = data.filter(
        (r) =>
          r?.reviewStatus === "pending" &&
          user?.email &&
          r?.userId?.email === user.email
      ).length;
      pendingMineRef.current = mine;
      if (onTotal) onTotal(data.length, mine);
      setStatus("ok");
    },
    [onTotal, user]
  );

  const applyFailure = useCallback(
    (err) => {
      // Backend answers 404 {"message":"No Reviews yet"} for an empty list.
      if (err?.status === 404) {
        setItems([]);
        setTotal(0);
        pendingMineRef.current = 0;
        if (onTotal) onTotal(0, 0);
        setStatus("ok");
        return;
      }
      if (isAuthError(err)) setStatus("moderated");
      else setStatus("error");
    },
    [onTotal]
  );

  // refreshKey lets the parent reload after a new review lands.
  // Guests never fetch: the section renders a sign-in notice instead.
  useEffect(() => {
    if (authStatus !== "user" || !validProductId) return undefined;
    let cancelled = false;
    load()
      .then((data) => {
        if (!cancelled) applyLoaded(data);
      })
      .catch((err) => {
        if (!cancelled) applyFailure(err);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, validProductId, load, applyLoaded, applyFailure, refreshKey]);

  const retry = () => {
    setStatus("loading");
    load().then(applyLoaded).catch(applyFailure);
  };

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

  if (!validProductId) {
    return (
      <section aria-labelledby="reviews-heading" className="mt-8">
        <h2 id="reviews-heading" className="text-lg font-semibold text-text">
          Reviews
        </h2>
        <EmptyState
          title="Reviews unavailable"
          description="This product link is invalid, so reviews can't be loaded."
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
          onRetry={retry}
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
          description="Be the first to review this product."
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
        <ul className="mt-3 space-y-3">
          {items.map((r) => (
            <ReviewItem key={r._id} review={r} />
          ))}
        </ul>
      )}
    </section>
  );
}
