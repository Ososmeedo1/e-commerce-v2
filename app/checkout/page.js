"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { addOrder, getProfile, listAddresses } from "@/lib/endpoints";
import { formatPrice, serverFormError } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import CartSummary from "@/components/cart/CartSummary";
import CouponInput from "@/components/cart/CouponInput";

function composeDefaultAddress(address) {
  if (!address || typeof address !== "object") return "";
  // Q7 resolved: address sent as free text (matches POST /orders/add Bruno
  // example). Saved entries quick-fill this field; no addressId is sent.
  return [address.country, address.city, address.buildingNumber, address.addressLabel]
    .filter((part) => part !== undefined && part !== null && String(part).trim() !== "")
    .join(", ");
}

export default function CheckoutPage() {
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const { items, subtotal, status: cartStatus, clearLocal } = useCart();
  const toast = useToast();
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const touchedAddress = useRef(false);

  // Empty carts don't belong here — bounce back once cart state settles.
  useEffect(() => {
    if (cartStatus === "ready" && items.length === 0) router.replace("/cart");
  }, [cartStatus, items.length, router]);

  // Pre-fill from the default address on GET /users/profile ({ user, address }).
  // Saved address-book entries (GET /addresses) are offered as quick-fill
  // options (Q7) that populate the free-text field — the order still sends
  // a plain address string, never an addressId.
  // Never blocks checkout: failures leave the field empty for manual entry.
  useEffect(() => {
    if (authStatus !== "user") return;
    let cancelled = false;
    apiFetch(getProfile(), { auth: true })
      .then((res) => {
        if (cancelled) return;
        const composed = composeDefaultAddress(res?.data?.address);
        if (composed && !touchedAddress.current) setAddress(composed);
      })
      .catch(() => {
        // Leave the field for manual entry.
      });
    apiFetch(listAddresses(), { auth: true, noRedirect: true })
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res?.data) ? res.data : [];
        setSavedAddresses(items);
      })
      .catch(() => {
        // Quick-fill is optional — manual entry still works.
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus]);

  const quickFill = (id) => {
    if (!id) return;
    const hit = savedAddresses.find((a) => String(a?._id) === String(id));
    const composed = composeDefaultAddress(hit);
    if (composed) {
      touchedAddress.current = true;
      setAddress(composed);
    }
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setFormError("");
    if (address.trim().length < 5) {
      setFormError("Enter a delivery address (at least 5 characters).");
      return;
    }
    if (!contactNumber.trim()) {
      setFormError("Enter a contact number.");
      return;
    }
    setPending(true);
    try {
      const res = await apiFetch(addOrder(), {
        method: "POST",
        // TODO Q8: only "cash" observed; expand when other methods documented.
        // TODO Q13: shippingFee/VAT sent as 0 — confirm rules.
        body: {
          paymentMethod: "cash",
          address: address.trim(),
          contactNumber: contactNumber.trim(),
          shippingFee: 0,
          VAT: 0,
        },
        auth: true,
      });
      const orderId = res?.data?._id;
      if (!orderId) throw new Error("Order placed but no order id returned.");
      toast.success("Order placed");
      clearLocal();
      router.replace(`/orders/${orderId}`);
    } catch (err) {
      setFormError(serverFormError(err, "Could not place order. Try again."));
      toast.error(serverFormError(err, "Could not place order"));
    } finally {
      setPending(false);
    }
  };

  if (cartStatus === "loading" || cartStatus === "idle") {
    return (
      <Container className="py-8">
        <div className="h-7 w-40 skeleton-shimmer rounded-sm" aria-hidden="true" />
        <p className="sr-only">Loading checkout…</p>
        <div className="mt-6 space-y-3" aria-hidden="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Container>
    );
  }

  if (cartStatus === "error") {
    return (
      <Container className="py-6">
        <ErrorState onRetry={() => router.replace("/cart")} />
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-text">Checkout</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={placeOrder} noValidate>
          {savedAddresses.length > 0 && (
            <div className="mb-3">
              <label htmlFor="checkout-saved" className="mb-1 block text-sm font-medium text-text">
                Use a saved address
              </label>
              <select
                id="checkout-saved"
                defaultValue=""
                onChange={(e) => quickFill(e.target.value)}
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text"
              >
                <option value="">Choose…</option>
                {savedAddresses.map((a) => (
                  <option key={a?._id || composeDefaultAddress(a)} value={a?._id || ""}>
                    {composeDefaultAddress(a)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="checkout-address" className="mb-1 block text-sm font-medium text-text">
              Delivery address <span aria-hidden="true" className="text-danger"> *</span>
            </label>
            <textarea
              id="checkout-address"
              value={address}
              onChange={(e) => {
                touchedAddress.current = true;
                setAddress(e.target.value);
              }}
              required
              rows={3}
              placeholder="Country, city, building…"
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-disabled"
            />
          </div>
          <div className="mt-3">
            <Input
              label="Contact number"
              id="checkout-contact"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              required
            />
          </div>
          <div className="mt-3">
            <label htmlFor="checkout-payment" className="mb-1 block text-sm font-medium text-text">
              Payment method
            </label>
            <select
              id="checkout-payment"
              value="cash"
              disabled
              aria-disabled="true"
              className="w-full cursor-not-allowed rounded-md border border-border-strong bg-surface-subdued px-3 py-2 text-sm text-text-disabled"
            >
              <option value="cash">Cash on delivery</option>
            </select>
          </div>
          <CouponInput />
          {formError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {formError}
            </p>
          )}
          <div className="mt-4">
            <Button variant="primary" fullWidth type="submit" loading={pending}>
              Place order
            </Button>
          </div>
        </form>
        <div>
          <CartSummary
            subtotal={subtotal}
            extraRows={[
              { label: "Shipping", value: formatPrice(0) },
              { label: "VAT", value: formatPrice(0) },
              { label: "Total", value: formatPrice(subtotal) },
            ]}
          />
        </div>
      </div>
    </Container>
  );
}
