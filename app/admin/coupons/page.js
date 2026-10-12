"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { listCoupons } from "@/lib/endpoints";
import { adminAddCoupon } from "@/lib/admin";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useToast } from "@/hooks/useToast";
import {
  fieldErrorsFromStack,
  formatDate,
  friendlyError,
  serverFormError,
} from "@/lib/format";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

const EMPTY_FORM = {
  couponCode: "",
  couponType: "Fixed",
  couponAmount: "",
  from: "",
  till: "",
};

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Client mirror of addCouponSchema (source of truth stays server-side):
// code required; amount ≥1 (≤100 for Percentage — enforced server-side too);
// from ≥ today; till > from. Users is required-but-empty server-side, so the
// payload always sends Users: [] (per-user limits are v2).
function formErrors(values) {
  const errors = {};
  if (!values.couponCode.trim()) errors.couponCode = "Enter a coupon code.";
  const amount = Number(values.couponAmount);
  if (!values.couponAmount.trim() || !Number.isFinite(amount) || amount < 1) {
    errors.couponAmount = "Amount must be at least 1.";
  } else if (values.couponType === "Percentage" && amount > 100) {
    errors.couponAmount = "Percentage must be between 1 and 100.";
  }
  if (!values.from) errors.from = "Pick a start date.";
  else if (values.from < todayLocal()) errors.from = "Start date must be today or later.";
  if (!values.till) errors.till = "Pick an end date.";
  else if (values.from && values.till <= values.from) {
    errors.till = "End date must be after the start date.";
  }
  return errors;
}

function usageCell(c) {
  const users = Array.isArray(c.Users) ? c.Users : [];
  if (users.length === 0) return "—";
  const used = users.reduce((n, u) => n + (u.usageCount || 0), 0);
  const max = users.reduce((n, u) => n + (u.maxCount || 0), 0);
  return `${used}/${max}`;
}

const COLUMNS = [
  {
    key: "couponCode",
    label: "Code",
    render: (c) => <span className="font-mono">{c.couponCode}</span>,
  },
  {
    key: "couponType",
    label: "Type",
    render: (c) => (
      <Badge variant={c.couponType === "Percentage" ? "info" : "subdued"}>
        {c.couponType}
      </Badge>
    ),
  },
  {
    key: "couponAmount",
    label: "Amount",
    render: (c) =>
      c.couponType === "Percentage" ? `${c.couponAmount}%` : c.couponAmount,
  },
  {
    key: "window",
    label: "Valid",
    render: (c) => (
      <span>
        {c.from ? formatDate(c.from) : "—"} → {c.till ? formatDate(c.till) : "—"}
      </span>
    ),
  },
  { key: "usage", label: "Used/Max", render: (c) => usageCell(c) },
  {
    key: "isEnabled",
    label: "Enabled",
    render: (c) => (
      <Badge variant={c.isEnabled ? "success" : "subdued"}>
        {c.isEnabled ? "On" : "Off"}
      </Badge>
    ),
  },
  {
    key: "createdAt",
    label: "Created",
    render: (c) => (c.createdAt ? formatDate(c.createdAt) : "—"),
  },
];

export default function AdminCouponsPage() {
  const toast = useToast();
  const [showDisabled, setShowDisabled] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [values, setValues] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  // Coupon counts stay small; one capped fetch instead of a pager
  // (ApiFeatures pagination exists server-side if this ever grows).
  const coupons = useAsyncData(
    () =>
      apiFetch(listCoupons(), {
        auth: true,
        params: { limit: 100, ...(showDisabled ? {} : { isEnabled: true }) },
      })
        .then((res) => (Array.isArray(res?.data) ? res.data : []))
        .catch((err) => {
          console.error("[admin/coupons]", err);
          throw err;
        }),
    [showDisabled, retryKey]
  );
  const rows = coupons.data ?? [];

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setFieldErrors((f) => ({ ...f, [key]: undefined }));
    setFormError("");
  };

  const openModal = () => {
    setValues(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const local = formErrors(values);
    if (Object.values(local).some(Boolean)) {
      setFieldErrors(local);
      return;
    }
    setPending(true);
    setFieldErrors({});
    setFormError("");
    try {
      // NOTE: no isEnabled here — addCouponSchema rejects unknown keys and
      // the model defaults isEnabled to true. Users: [] satisfies the
      // required-but-empty array rule (verified against the schema).
      await apiFetch(adminAddCoupon(), {
        method: "POST",
        auth: true,
        body: {
          couponCode: values.couponCode.trim().toUpperCase(),
          couponType: values.couponType,
          couponAmount: Number(values.couponAmount),
          from: values.from,
          till: values.till,
          Users: [],
        },
      });
      setModalOpen(false);
      setRetryKey((k) => k + 1);
      toast.success("Coupon created");
    } catch (err) {
      // Joi details (err.data.stack) map to fields by backend path name;
      // unpathed details collapse to the form banner.
      const fields = fieldErrorsFromStack(err?.data?.stack);
      const banner = fields[""];
      delete fields[""];
      setFieldErrors(fields);
      setFormError(banner || serverFormError(err, "Could not create coupon. Try again."));
    } finally {
      setPending(false);
    }
  };

  const amountLabel =
    values.couponType === "Percentage" ? "Percentage (1–100)" : "Amount (min 1)";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Coupons</h1>
          <p className="mt-1 text-sm text-text-subdued" role="status">
            {rows.length} coupon{rows.length === 1 ? "" : "s"}
            {showDisabled ? " (including disabled)" : ""}
          </p>
        </div>
        <Button variant="primary" onClick={openModal}>
          + New coupon
        </Button>
      </div>

      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={showDisabled}
          onChange={(e) => setShowDisabled(e.target.checked)}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Show disabled coupons
      </label>

      <div className="mt-4">
        <DataTable
          columns={COLUMNS}
          rows={rows}
          loading={coupons.loading}
          error={coupons.error}
          emptyMessage={
            showDisabled ? "No coupons yet." : "No enabled coupons. Toggle the checkbox above to include disabled ones."
          }
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => (pending ? undefined : setModalOpen(false))}
        title="New coupon"
        description="Fixed or percentage discount within a date window."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending}>
              Create coupon
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div>
            <Input
              label="Coupon code"
              id="coupon-code"
              value={values.couponCode}
              onChange={set("couponCode")}
              placeholder="WELCOME10"
              disabled={pending}
              required
            />
            {fieldErrors.couponCode && (
              <p role="alert" className="mt-1 text-sm text-danger">{fieldErrors.couponCode}</p>
            )}
          </div>
          <div>
            <span id="coupon-type-label" className="mb-1 block text-sm font-medium text-text">
              Type <span aria-hidden="true" className="text-danger"> *</span>
            </span>
            <div role="radiogroup" aria-labelledby="coupon-type-label" className="flex gap-3">
              {["Fixed", "Percentage"].map((t) => (
                <label
                  key={t}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text"
                >
                  <input
                    type="radio"
                    name="couponType"
                    value={t}
                    checked={values.couponType === t}
                    onChange={set("couponType")}
                    disabled={pending}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {t}
                </label>
              ))}
            </div>
            {fieldErrors.couponType && (
              <p role="alert" className="mt-1 text-sm text-danger">{fieldErrors.couponType}</p>
            )}
          </div>
          <div>
            <Input
              label={amountLabel}
              id="coupon-amount"
              type="number"
              min="1"
              value={values.couponAmount}
              onChange={set("couponAmount")}
              disabled={pending}
              required
            />
            {fieldErrors.couponAmount && (
              <p role="alert" className="mt-1 text-sm text-danger">{fieldErrors.couponAmount}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Valid from"
                id="coupon-from"
                type="date"
                value={values.from}
                onChange={set("from")}
                disabled={pending}
                required
              />
              {fieldErrors.from && (
                <p role="alert" className="mt-1 text-sm text-danger">{fieldErrors.from}</p>
              )}
            </div>
            <div>
              <Input
                label="Valid till"
                id="coupon-till"
                type="date"
                value={values.till}
                onChange={set("till")}
                disabled={pending}
                required
              />
              {fieldErrors.till && (
                <p role="alert" className="mt-1 text-sm text-danger">{fieldErrors.till}</p>
              )}
            </div>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
