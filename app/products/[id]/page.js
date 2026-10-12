"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { getProductById, listOrders } from "@/lib/endpoints";
import { friendlyError } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useCart } from "@/hooks/useCart";
import { useCartAction } from "@/hooks/useCartAction";
import { useToast } from "@/hooks/useToast";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { openCartDrawer } from "@/components/cart/CartDrawer";
import QuantityStepper from "@/components/cart/QuantityStepper";
import ReviewForm from "@/components/catalog/ReviewForm";
import ProductGallery from "@/components/catalog/ProductGallery";
import PriceBlock from "@/components/catalog/PriceBlock";
import RatingStars from "@/components/catalog/RatingStars";
import SpecsTable from "@/components/catalog/SpecsTable";
import RelatedBrands from "@/components/catalog/RelatedBrands";
import ProductReviews from "@/components/catalog/ProductReviews";
import ProductDetailSkeleton from "@/components/catalog/ProductDetailSkeleton";

function refOf(value) {
  if (!value) return { id: null, name: null };
  if (typeof value === "string") return { id: value, name: null };
  return { id: value._id || null, name: value.name || null };
}

function Crumb({ href, children, current }) {
  if (current) {
    return (
      <span aria-current="page" className="truncate text-text">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className="text-text-subdued hover:text-text hover:underline">
      {children}
    </Link>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id;
  const { status: authStatus } = useAuth();
  const { requireAuth } = useAuthGate();
  const { addItem } = useCart();
  const cartAction = useCartAction();
  const toast = useToast();
  const [state, setState] = useState({ status: "loading", product: null, forId: null });
  const [reviewTotal, setReviewTotal] = useState(null);
  const [reviewPending, setReviewPending] = useState(0);
  const [qty, setQty] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewsKey, setReviewsKey] = useState(0);
  // Purchase-gate for reviews (business rule: only buyers may review).
  // Tri-state: true = bought, false = not bought (or guest), null = unknown
  // (orders fetch failed or still loading) → fall back to backend rejection.
  const [hasBought, setHasBought] = useState(null);

  // Fetch the user's orders once per product + session; scan for this id.
  // noRedirect: a secondary check must never log the user out.
  useEffect(() => {
    if (!id) return undefined;
    if (authStatus !== "user") {
      if (authStatus === "guest") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- eligibility sync on session/id change (no loop: deps keyed)
        setHasBought(false);
      }
      return undefined;
    }
    setHasBought(null);
    setReviewPending(0);
    let cancelled = false;
    apiFetch(listOrders(), { auth: true, noRedirect: true })
      .then((res) => {
        if (cancelled) return;
        const orders = Array.isArray(res?.data) ? res.data : [];
        setHasBought(
          orders.some((order) =>
            (Array.isArray(order?.products) ? order.products : []).some((line) => {
              const pid =
                typeof line?.productId === "string"
                  ? line.productId
                  : line?.productId?._id;
              return pid === id;
            })
          )
        );
      })
      .catch(() => {
        if (!cancelled) setHasBought(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, id]);

  const detailHref = `/products/${id}`;

  const load = useCallback(
    async (signal, forId) => {
      try {
        const res = await apiFetch(getProductById(forId), { auth: true, signal });
        return { status: "ok", product: res?.data || null, forId };
      } catch (err) {
        if (err?.name === "AbortError") return null;
        if (err instanceof ApiError && err.status === 404) {
          return { status: "notfound", product: null, forId };
        }
        // 401/403: apiFetch already cleared the session and redirected to
        // /login?next=<current page>. Render the error state as interim UI.
        return { status: "error", product: null, forId };
      }
    },
    []
  );

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    let cancelled = false;
    load(ctrl.signal, id).then((next) => {
      if (next && !cancelled) setState(next);
    });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [id, load]);

  const onAddToCart = async () => {
    if (authStatus !== "user") {
      requireAuth(detailHref, "add to cart");
      return;
    }
    const res = await cartAction.run(product._id, () =>
      addItem(product._id, qty)
    );
    if (res.ok) {
      toast.success("Added to cart");
      openCartDrawer();
    } else if (!res.busy) {
      toast.error(friendlyError(res.error, "Could not add to cart"));
    }
  };

  const onWriteReview = () => {
    if (authStatus !== "user") {
      requireAuth(detailHref, "write a review");
      return;
    }
    setReviewOpen(true);
  };

  const onReviewSubmitted = () => {
    setReviewOpen(false);
    toast.success("Review submitted — pending approval");
    setReviewsKey((k) => k + 1);
  };

  // Stable identity: ProductReviews keys its fetch effect on this callback,
  // so an inline arrow would recreate `load` on every parent render and
  // refetch reviews each time. Setters are stable → empty deps.
  const onReviewTotal = useCallback((t, p) => {
    setReviewTotal(t);
    if (typeof p === "number") setReviewPending(p);
  }, []);

  // Stale product (id changed) reads as loading — no sync setState needed.
  if (state.status === "loading" || state.forId !== id) {
    return (
      <Container className="py-8">
        <ProductDetailSkeleton />
      </Container>
    );
  }

  if (state.status === "notfound" || !state.product) {
    if (state.status === "notfound") {
      return (
        <Container className="py-6">
          <EmptyState
            title="Product not found"
            titleAs="h1"
            description="This product may have been removed."
            action={<Button href="/products">Back to products</Button>}
          />
        </Container>
      );
    }
    return (
      <Container className="py-6">
        <ErrorState onRetry={() => window.location.reload()} />
      </Container>
    );
  }

  const product = state.product;
  const category = refOf(product.categoryId);
  const subCategory = refOf(product.subCategoryId);
  const brand = refOf(product.brandId);
  const inStock = (product.stock ?? 0) > 0;
  const images = product.Images?.URLs || [];

  return (
    <Container className="py-8">
      {/* Gate opens on first authed-only interaction (add-to-cart / review
          via requireAuth), never on page load — proxy.js is the route fence. */}

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          <li>
            <Crumb href="/">Home</Crumb>
          </li>
          <li aria-hidden="true" className="text-text-disabled">/</li>
          <li>
            <Crumb href="/categories">Categories</Crumb>
          </li>
          {category.name && (
            <>
              <li aria-hidden="true" className="text-text-disabled">/</li>
              <li>
                <Crumb href={`/products?categoryId=${category.id}`}>
                  {category.name}
                </Crumb>
              </li>
            </>
          )}
          {subCategory.name && (
            <>
              <li aria-hidden="true" className="text-text-disabled">/</li>
              <li>
                <Crumb href={`/products?subCategoryId=${subCategory.id}`}>
                  {subCategory.name}
                </Crumb>
              </li>
            </>
          )}
          <li aria-hidden="true" className="text-text-disabled">/</li>
          <li className="min-w-0">
            <Crumb current>{product.title}</Crumb>
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div>
          <ProductGallery images={images} title={product.title} />
          {product.overview && (
            <p className="mt-4 text-sm leading-6 text-text">{product.overview}</p>
          )}
        </div>

        <div>
          {brand.name ? (
            <Link
              href={`/products?brandId=${brand.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {brand.name}
            </Link>
          ) : (
            <span className="text-sm text-text-subdued">Masar</span>
          )}
          <h1 className="mt-1 text-2xl font-bold text-text">{product.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            {product.rating !== undefined && product.rating !== null && (
              <RatingStars rating={product.rating} />
            )}
            <a href="#reviews" className="text-sm text-primary hover:underline">
              {reviewTotal === 0
                ? "No reviews"
                : reviewTotal !== null
                  ? `${reviewTotal} reviews`
                  : "Reviews"}
              {reviewPending > 0 ? ` · ${reviewPending} pending` : ""}
            </a>
          </div>
          <div className="mt-3">
            <PriceBlock
              price={product.price}
              appliedPrice={product.appliedPrice}
              appliedDiscount={product.appliedDiscount}
            />
          </div>
          <div className="mt-3">
            <Badge variant={inStock ? "success" : "danger"}>
              {inStock ? "In stock" : "Out of stock"}
            </Badge>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <QuantityStepper
              value={qty}
              min={1}
              max={product.stock}
              onChange={setQty}
              disabled={!inStock || cartAction.isPending(product._id)}
            />
            <Button
              variant="primary"
              fullWidth
              disabled={!inStock || cartAction.isPending(product._id)}
              loading={cartAction.isPending(product._id)}
              onClick={onAddToCart}
            >
              Add to cart
            </Button>
            {hasBought === false ? (
              <>
                <Button variant="secondary" fullWidth disabled>
                  Purchase to review
                </Button>
                <p className="text-xs text-text-subdued">
                  {authStatus === "guest"
                    ? "Sign in and buy this product to review it."
                    : "You can review this product after you've bought it."}
                </p>
              </>
            ) : (
              <Button variant="secondary" fullWidth onClick={onWriteReview}>
                Write a review
              </Button>
            )}
          </div>
          <dl className="mt-4 space-y-1 text-sm">
            {product.slug && (
              <div className="flex gap-2">
                <dt className="text-text-subdued">SKU</dt>
                <dd className="text-text">{product.slug}</dd>
              </div>
            )}
            {category.name && (
              <div className="flex gap-2">
                <dt className="text-text-subdued">Category</dt>
                <dd>
                  <Link
                    href={`/products?categoryId=${category.id}`}
                    className="text-primary hover:underline"
                  >
                    {category.name}
                  </Link>
                </dd>
              </div>
            )}
            {subCategory.name && (
              <div className="flex gap-2">
                <dt className="text-text-subdued">Subcategory</dt>
                <dd>
                  <Link
                    href={`/products?subCategoryId=${subCategory.id}`}
                    className="text-primary hover:underline"
                  >
                    {subCategory.name}
                  </Link>
                </dd>
              </div>
            )}
            {brand.name && (
              <div className="flex gap-2">
                <dt className="text-text-subdued">Brand</dt>
                <dd>
                  <Link
                    href={`/products?brandId=${brand.id}`}
                    className="text-primary hover:underline"
                  >
                    {brand.name}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <SpecsTable specs={product.specs} />
      <RelatedBrands categoryId={category.id} />
      <div id="reviews" className="scroll-mt-20">
        <ProductReviews
          key={product._id}
          productId={product._id}
          currentPath={detailHref}
          onTotal={onReviewTotal}
          refreshKey={reviewsKey}
          onWriteReview={onWriteReview}
          canReview={hasBought}
        />
      </div>
      <ReviewForm
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        productId={product._id}
        onSubmitted={onReviewSubmitted}
      />
    </Container>
  );
}
