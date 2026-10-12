"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { ENABLE_COUPONS } from "@/lib/config";
import { listCoupons } from "@/lib/endpoints";
import { friendlyError } from "@/lib/format";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Badge from "../ui/Badge";

// Rendered ONLY when the coupon gate is on (lib/config.js ENABLE_COUPONS,
// default true now that the coupon schema is real). Full couponCode
// validation + order wiring lands with the checkout phase.
const ENABLED = ENABLE_COUPONS;

export default function CouponInput() {
  const [code, setCode] = useState("");
  const [state, setState] = useState({ status: "idle", matched: null, error: "" });

  if (!ENABLED) return null;

  const apply = async (e) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) {
      setState({ status: "error", matched: null, error: "Enter a coupon code." });
      return;
    }
    setState({ status: "loading", matched: null, error: "" });
    try {
      const res = await apiFetch(listCoupons(), {
        params: { isEnabled: true },
        auth: true,
      });
      const items = Array.isArray(res?.data) ? res.data : [];
      // Schema unknown: match if ANY string field equals the entered code.
      const hit = items.find((item) =>
        Object.values(item || {}).some(
          (v) => typeof v === "string" && v.toLowerCase() === value.toLowerCase()
        )
      );
      if (hit) {
        setState({ status: "applied", matched: value, error: "" });
      } else {
        setState({ status: "error", matched: null, error: "Coupon not found." });
      }
    } catch (err) {
      setState({ status: "error", matched: null, error: friendlyError(err, "Could not check coupon.") });
    }
  };

  return (
    <div className="mt-3">
      <form onSubmit={apply} className="flex gap-2">
        <div className="flex-1">
          <Input
            label="Coupon code"
            id="coupon-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button variant="secondary" type="submit" loading={state.status === "loading"}>
            Apply
          </Button>
        </div>
      </form>
      {state.status === "applied" && (
        <p className="mt-2">
          <Badge variant="subdued">Coupon “{state.matched}” noted — no discount applied yet</Badge>
        </p>
      )}
      {state.status === "error" && state.error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
